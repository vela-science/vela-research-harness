import { access, realpath } from "node:fs/promises";
import path from "node:path";

export const CODEX_TOOL_FEATURES = [
  "apply_patch_freeform",
  "apply_patch_streaming_events",
  "apps",
  "artifact",
  "browser_use",
  "browser_use_external",
  "computer_use",
  "enable_mcp_apps",
  "goals",
  "hooks",
  "image_generation",
  "in_app_browser",
  "memories",
  "multi_agent",
  "plugin_sharing",
  "remote_plugin",
  "shell_snapshot",
  "shell_tool",
  "tool_suggest",
  "unified_exec",
  "workspace_dependencies",
] as const;

export interface ToolFreeCodexArgs {
  binary: string;
  model: string;
  outputSchema: string;
  finalPath: string;
  cwd: string;
  reasoningEffort?: string;
}

export interface SandboxedToolFreeCodexArgs extends ToolFreeCodexArgs {
  authHome: string;
}

function sbpl(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}

function metadataLiterals(paths: readonly string[]): string {
  const values = new Set<string>(["/"]);
  for (const value of paths) {
    for (let current = value; current !== "/"; current = path.dirname(current)) {
      values.add(current);
    }
  }
  return [...values]
    .sort()
    .map((value) => `(literal "${sbpl(value)}")`)
    .join(" ");
}

async function optionalRealpath(candidate: string): Promise<string | undefined> {
  try {
    await access(candidate);
    return await realpath(candidate);
  } catch {
    return undefined;
  }
}

/**
 * Wrap Codex itself in a host read boundary. Codex 0.139 always registers
 * view_image even when every feature-backed tool is disabled, so this outer
 * sandbox is the control that makes an arbitrary host image unreadable.
 */
export async function sandboxedToolFreeCodexExecArgv(
  options: SandboxedToolFreeCodexArgs,
): Promise<string[]> {
  if (process.platform !== "darwin") {
    throw new Error("Canopus v0 requires the macOS outer Codex sandbox");
  }
  const lexical = {
    binary: path.resolve(options.binary),
    cwd: path.resolve(options.cwd),
    outputSchema: path.resolve(options.outputSchema),
    finalParent: path.resolve(path.dirname(options.finalPath)),
    authFile: path.resolve(options.authHome, "auth.json"),
    modelCatalog: path.resolve(options.authHome, "models_cache.json"),
  };
  const managedRequirements = [
    "/etc/codex/requirements.toml",
    "/private/etc/codex/requirements.toml",
  ];
  const [binary, cwd, outputSchema, finalParent, authFile, modelCatalog] = await Promise.all([
    realpath(lexical.binary),
    realpath(lexical.cwd),
    realpath(lexical.outputSchema),
    realpath(lexical.finalParent),
    optionalRealpath(lexical.authFile),
    optionalRealpath(lexical.modelCatalog),
  ]);
  if (authFile === undefined) {
    throw new Error("Codex auth home has no readable auth.json");
  }
  const finalPath = path.join(finalParent, path.basename(options.finalPath));
  const inner = toolFreeCodexExecArgv({
    ...options,
    binary,
    cwd,
    outputSchema,
    finalPath,
  });
  const readableFiles = [
    binary,
    lexical.binary,
    outputSchema,
    lexical.outputSchema,
    authFile,
    lexical.authFile,
    modelCatalog,
    ...(modelCatalog === undefined ? [] : [lexical.modelCatalog]),
  ]
    .filter((item): item is string => item !== undefined)
    .filter((item, index, values) => values.indexOf(item) === index)
    .map((item) => `(literal "${sbpl(item)}")`)
    .join(" ");
  const metadata = metadataLiterals([
    binary,
    cwd,
    outputSchema,
    finalPath,
    authFile,
    lexical.binary,
    lexical.cwd,
    lexical.outputSchema,
    lexical.finalParent,
    lexical.authFile,
    ...managedRequirements,
    ...(modelCatalog === undefined ? [] : [modelCatalog]),
  ]);
  const profile = [
    "(version 1)",
    "(deny default)",
    '(import "dyld-support.sb")',
    "(deny file-link file-clone)",
    // Native Codex creates runtime threads after entering Seatbelt. macOS
    // classifies that operation under process-fork; process-exec remains
    // restricted to the checksum-pinned Codex binary below.
    "(allow process-fork)",
    "(allow process-info* (target same-sandbox))",
    "(allow signal (target same-sandbox))",
    `(allow file-read-metadata ${metadata})`,
    `(allow process-exec (literal "${sbpl(binary)}"))`,
    `(allow file-map-executable (literal "${sbpl(binary)}"))`,
    '(allow sysctl-read (sysctl-name "hw.activecpu") (sysctl-name "hw.logicalcpu") (sysctl-name "hw.ncpu") (sysctl-name "hw.pagesize") (sysctl-name "hw.pagesize_compat") (sysctl-name "kern.argmax") (sysctl-name "kern.osproductversion") (sysctl-name "kern.osrelease") (sysctl-name "kern.ostype") (sysctl-name "kern.usrstack64"))',
    '(allow mach-lookup (global-name "com.apple.cfprefsd.agent") (global-name "com.apple.system.opendirectoryd.libinfo") (global-name "com.apple.trustd") (global-name "com.apple.trustd.agent"))',
    '(allow ipc-posix-shm-read* (ipc-posix-name-prefix "apple.cfprefs."))',
    '(allow file-read* (subpath "/Library/Apple") (subpath "/System") (subpath "/usr/lib") (subpath "/usr/share") (subpath "/private/etc/ssl") (subpath "/private/var/db/timezone") (literal "/dev/null") (literal "/dev/urandom"))',
    `(allow file-read* (subpath "${sbpl(cwd)}") (subpath "${sbpl(lexical.cwd)}") ${readableFiles})`,
    `(allow file-write* (literal "${sbpl(finalPath)}") (literal "/dev/null"))`,
    "(allow network-outbound)",
  ].join(" ");
  return ["/usr/bin/sandbox-exec", "-p", profile, "--", ...inner];
}

/**
 * Build the complete, pinned Codex lane used for untrusted synthesis.
 *
 * Read-only sandboxing alone still permits host reads. This lane registers no
 * shell, patch, browser, app, MCP, memory, or computer-use surface at all.
 * The only accepted product is the final response constrained by outputSchema.
 */
export function toolFreeCodexExecArgv(options: ToolFreeCodexArgs): string[] {
  return [
    options.binary,
    "exec",
    "--ephemeral",
    "--skip-git-repo-check",
    "--ignore-user-config",
    "--ignore-rules",
    "--strict-config",
    "--sandbox",
    "read-only",
    "--model",
    options.model,
    "--output-schema",
    options.outputSchema,
    "--output-last-message",
    options.finalPath,
    "--json",
    "--color",
    "never",
    "--cd",
    options.cwd,
    "--config",
    "shell_environment_policy.inherit=none",
    "--config",
    "approval_policy=\"never\"",
    "--config",
    "web_search=\"disabled\"",
    ...(options.reasoningEffort === undefined
      ? []
      : ["--config", `model_reasoning_effort=\"${options.reasoningEffort}\"`]),
    ...CODEX_TOOL_FEATURES.flatMap((feature) => ["--disable", feature]),
    "-",
  ];
}
