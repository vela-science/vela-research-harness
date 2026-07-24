#!/usr/bin/env node

import { spawn } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { chmod, copyFile, mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
if (args.includes("--help")) {
  process.stdout.write([
    "Usage: node scripts/run-product-09-cold-use.mjs --output <new-directory> [options]",
    "",
    "Options:",
    "  --registration <path>  Registration JSON (defaults to product-09-cold-use-v1.json)",
    "  --output <path>        Required fresh output directory; existing paths are refused",
    "  --preflight-only       Check fixtures and custody without making model calls",
    "  --help                 Show this help",
    "",
  ].join("\n"));
  process.exit(0);
}
const preflightOnly = args.includes("--preflight-only");
const option = (name) => {
  const index = args.indexOf(name);
  if (index === -1) return undefined;
  const value = args[index + 1];
  if (value === undefined || value.startsWith("--")) {
    throw new Error(`${name} requires a value`);
  }
  return value;
};
const allowedArguments = new Set(["--help", "--preflight-only", "--registration", "--output"]);
for (const argument of args) {
  if (argument.startsWith("--") && !allowedArguments.has(argument)) {
    throw new Error(`unknown option: ${argument}`);
  }
}
const registrationPath = path.resolve(option("--registration") ?? path.join(root, "benchmarks/registration/product-09-cold-use-v1.json"));
const registrationBytes = await readFile(registrationPath);
const registration = JSON.parse(registrationBytes.toString("utf8"));
const outputArgument = option("--output");
if (outputArgument === undefined) {
  throw new Error("--output <new-directory> is required; benchmark evidence is never overwritten");
}
const output = path.resolve(outputArgument);

const sha256 = (bytes) => `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
const supportedFixtures = new Set([
  "empty_disposable_git_repository",
  "exact_disposable_erdos_checkout",
  "rendered_site_pages_at_exact_commit",
]);

function validateRegistration(value) {
  if (value?.schema !== "canopus.product-09-cold-use-registration.v1") {
    throw new Error("unsupported cold-use registration schema");
  }
  if (!Array.isArray(value.tasks) || value.tasks.length === 0) {
    throw new Error("cold-use registration must contain at least one task");
  }
  if (value.limits?.model_calls !== value.tasks.length) {
    throw new Error("registered model-call count must equal the number of tasks");
  }
  const roles = new Set();
  for (const task of value.tasks) {
    if (typeof task.role !== "string" || task.role.length === 0 || roles.has(task.role)) {
      throw new Error("cold-use task roles must be unique non-empty strings");
    }
    roles.add(task.role);
    if (!supportedFixtures.has(task.fixture)) {
      throw new Error(`unsupported cold-use fixture: ${task.fixture}`);
    }
    if (task.access !== "read_only" && task.access !== "writable") {
      throw new Error(`unsupported cold-use access mode: ${task.access}`);
    }
    if (task.fixture === "rendered_site_pages_at_exact_commit" && task.access !== "read_only") {
      throw new Error("rendered site fixtures must be read-only");
    }
    if (typeof task.prompt !== "string" || task.prompt.trim().length === 0) {
      throw new Error(`cold-use task ${task.role} has no prompt`);
    }
  }
}

validateRegistration(registration);

const disabledFeatures = [
  "apps", "artifact", "auth_elicitation", "browser_use", "browser_use_external",
  "computer_use", "enable_fanout", "enable_mcp_apps", "goals", "hooks",
  "image_generation", "in_app_browser", "memories", "multi_agent",
  "multi_agent_v2", "plugin_sharing", "plugins", "remote_plugin",
  "standalone_web_search", "tool_call_mcp_elicitation", "tool_suggest",
  "workspace_dependencies",
];

function permissionProfile(access) {
  return Buffer.from([
    'default_permissions = "canopus-worker"',
    'approval_policy = "never"',
    'allow_login_shell = false',
    '',
    '[permissions.canopus-worker.filesystem]',
    '":minimal" = "read"',
    '',
    '[permissions.canopus-worker.filesystem.":workspace_roots"]',
    `"." = "${access === "read_only" ? "read" : "write"}"`,
    '',
    '[permissions.canopus-worker.network]',
    'enabled = false',
    '',
    '[shell_environment_policy]',
    'inherit = "none"',
    'set = { PATH = ".:..:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin", HOME = ".agent-home", TMPDIR = ".tmp", LANG = "C.UTF-8", LC_ALL = "C.UTF-8", GIT_CONFIG_NOSYSTEM = "1", GIT_CONFIG_GLOBAL = "/dev/null", GIT_TERMINAL_PROMPT = "0", VELA_NO_KEY_ACCESS = "1", NO_PROXY = "*", no_proxy = "*" }',
    '',
  ].join("\n"));
}

function authSecrets(bytes) {
  const value = JSON.parse(bytes.toString("utf8"));
  const tokens = typeof value.tokens === "object" && value.tokens !== null ? value.tokens : {};
  return [value.OPENAI_API_KEY, tokens.access_token, tokens.id_token, tokens.refresh_token]
    .filter((item) => typeof item === "string" && item.length >= 16)
    .map((item) => Buffer.from(item));
}

function assertNoSecrets(buffers, secrets) {
  for (const buffer of buffers) {
    for (const secret of secrets) {
      if (buffer.includes(secret)) throw new Error("cold-use runner exposed Codex authentication material");
    }
  }
}

async function prepareRuntime(task, fixture) {
  const runtimeRoot = await mkdtemp(path.join(tmpdir(), `vela-cold-${task.role}-runtime-`));
  const codexHome = path.join(runtimeRoot, "codex-runtime");
  await mkdir(codexHome, { mode: 0o700 });
  const sourceHome = path.resolve(process.env.CODEX_HOME ?? path.join(homedir(), ".codex"));
  const auth = await readFile(path.join(sourceHome, "auth.json"));
  await writeFile(path.join(codexHome, "auth.json"), auth, { mode: 0o600 });
  const catalog = await readFile(path.join(sourceHome, "models_cache.json")).catch(() => null);
  if (catalog !== null) await writeFile(path.join(codexHome, "models_cache.json"), catalog, { mode: 0o600 });
  const profile = permissionProfile(task.access);
  await writeFile(path.join(codexHome, "config.toml"), profile, { mode: 0o600 });
  const canary = Buffer.from(`canopus-host-secret-${randomBytes(32).toString("hex")}`);
  const canaryPath = path.join(runtimeRoot, "host-secret");
  await writeFile(canaryPath, canary, { mode: 0o400 });
  const environment = {
    PATH: process.env.PATH,
    HOME: runtimeRoot,
    XDG_CONFIG_HOME: path.join(runtimeRoot, ".config"),
    XDG_CACHE_HOME: path.join(runtimeRoot, ".cache"),
    XDG_DATA_HOME: path.join(runtimeRoot, ".local/share"),
    LANG: "C.UTF-8",
    LC_ALL: "C.UTF-8",
    SSL_CERT_FILE: "/etc/ssl/cert.pem",
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_CONFIG_GLOBAL: "/dev/null",
    GIT_TERMINAL_PROMPT: "0",
    VELA_NO_KEY_ACCESS: "1",
    NO_PROXY: "*",
    no_proxy: "*",
    CODEX_HOME: codexHome,
    NO_COLOR: "1",
  };
  await mkdir(path.join(fixture, ".agent-home"), { recursive: true, mode: 0o700 });
  await mkdir(path.join(fixture, ".tmp"), { recursive: true, mode: 0o700 });
  return {
    runtimeRoot,
    codexHome,
    environment,
    profile,
    canaryPath,
    secrets: [...authSecrets(auth), canary],
  };
}

async function command(argv, options = {}) {
  const started = Date.now();
  return await new Promise((resolve, reject) => {
    let timedOut = false;
    let terminateTimer;
    const child = spawn(argv[0], argv.slice(1), {
      cwd: options.cwd,
      env: options.env ?? process.env,
      stdio: [options.input === undefined ? "ignore" : "pipe", "pipe", "pipe"],
      detached: process.platform !== "win32",
    });
    const kill = (signal) => {
      try {
        if (process.platform !== "win32" && child.pid !== undefined) {
          process.kill(-child.pid, signal);
        } else {
          child.kill(signal);
        }
      } catch {
        child.kill(signal);
      }
    };
    const stdout = [];
    const stderr = [];
    child.stdout.on("data", (chunk) => stdout.push(chunk));
    child.stderr.on("data", (chunk) => stderr.push(chunk));
    child.on("error", reject);
    child.on("close", (code, signal) => {
      if (terminateTimer !== undefined) clearTimeout(terminateTimer);
      resolve({
        argv,
        code,
        signal,
        timed_out: timedOut,
        stdout: Buffer.concat(stdout),
        stderr: Buffer.concat(stderr),
        wall_time_ms: Date.now() - started,
      });
    });
    if (options.input !== undefined) {
      child.stdin.end(options.input);
    }
    if (options.timeoutMs !== undefined) {
      const timer = setTimeout(() => {
        timedOut = true;
        kill("SIGTERM");
        terminateTimer = setTimeout(() => kill("SIGKILL"), 5000);
        terminateTimer.unref();
      }, options.timeoutMs);
      timer.unref();
      child.on("close", () => clearTimeout(timer));
    }
  });
}

async function checked(argv, options = {}) {
  const result = await command(argv, options);
  if (result.code !== 0) {
    throw new Error(`${argv.join(" ")} failed (${result.code}): ${result.stderr.toString("utf8").slice(0, 2000)}`);
  }
  return result;
}

async function assertCustody(fixture, runtime) {
  const script = [
    "auth=false; canary=false; outside=false;",
    'if /bin/dd if="$1" of=/dev/null bs=1 count=1 2>/dev/null; then auth=true; fi;',
    'if /bin/dd if="$2" of=/dev/null bs=1 count=1 2>/dev/null; then canary=true; fi;',
    'if { printf probe > "$3"; } 2>/dev/null; then outside=true; fi;',
    'printf "%s %s %s\\n" "$auth" "$canary" "$outside";',
  ].join(" ");
  const result = await command([
    "codex", "sandbox", "-P", "canopus-worker", "-C", fixture, "--",
    "/bin/sh", "-c", script, "sh",
    path.join(runtime.codexHome, "auth.json"), runtime.canaryPath,
    path.join(runtime.runtimeRoot, "outside-write"),
  ], { cwd: fixture, env: runtime.environment, timeoutMs: 30000 });
  if (result.code !== 0 || result.stderr.length !== 0 || result.stdout.toString("utf8").trim() !== "false false false") {
    throw new Error(`custody preflight failed: exit=${result.code}; stdout=${result.stdout.toString("utf8").trim()}; stderr=${sha256(result.stderr)}`);
  }
}

async function gitState(cwd) {
  const [head, tree, status] = await Promise.all([
    checked(["git", "rev-parse", "HEAD"], { cwd }),
    checked(["git", "rev-parse", "HEAD^{tree}"], { cwd }),
    checked(["git", "status", "--porcelain=v1", "--untracked-files=all"], { cwd }),
  ]);
  return {
    commit: head.stdout.toString("utf8").trim(),
    tree: tree.stdout.toString("utf8").trim(),
    status: status.stdout.toString("utf8").trim().split("\n").filter(Boolean),
  };
}

async function cloneExact(remote, commit, target) {
  await checked(["git", "clone", "--quiet", "--no-hardlinks", remote, target]);
  await checked(["git", "checkout", "--quiet", commit], { cwd: target });
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: { accept: "application/json", "user-agent": "canopus-cold-use-fixture/1" },
  });
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  return { bytes, value: JSON.parse(bytes.toString("utf8")) };
}

let liveManifestPromise;
async function validateLiveManifests() {
  if (liveManifestPromise !== undefined) return await liveManifestPromise;
  liveManifestPromise = (async () => {
    const [editorialResult, observatoryResult] = await Promise.all([
      fetchJson(registration.products.editorial_manifest_url),
      fetchJson(registration.products.observatory_manifest_url),
    ]);
    const editorial = editorialResult.value;
    const observatory = observatoryResult.value;
    const expected = registration.products.web;
    if (
      editorial.schema !== "vela.web-deployment.v2"
      || editorial.web?.version !== expected.version
      || editorial.web?.tag !== expected.tag
      || editorial.web?.commit !== expected.commit
      || editorial.web?.brand?.root !== expected.brand_root
    ) {
      throw new Error("live editorial manifest does not match the registered Web release");
    }
    if (
      observatory.schema !== "vela.site-deployment.v3"
      || observatory.site?.version !== expected.version
      || observatory.site?.tag !== expected.tag
      || observatory.site?.commit !== expected.commit
      || observatory.site?.brand?.root !== expected.brand_root
      || observatory.projection?.release_root !== expected.projection_root
      || observatory.projection?.vela_version !== registration.products.vela_version
    ) {
      throw new Error("live Observatory manifest does not match the registered Web and projection release");
    }
    const erdos = observatory.projection?.source_frontiers?.find((item) => item.slug === "erdos");
    if (
      erdos?.commit !== registration.products.erdos_commit
      || erdos?.tree !== registration.products.erdos_tree
      || erdos?.event_log_root !== registration.products.erdos_event_log_root
      || erdos?.proposal_root !== registration.products.erdos_proposal_root
    ) {
      throw new Error("live Observatory Erdős source does not match the registered canonical checkout");
    }
    return {
      editorial,
      observatory,
      editorial_manifest_sha256: sha256(editorialResult.bytes),
      observatory_manifest_sha256: sha256(observatoryResult.bytes),
    };
  })();
  return await liveManifestPromise;
}

async function renderReaderFixture(target, task) {
  if (!Array.isArray(task.routes) || task.routes.length === 0) {
    throw new Error(`rendered fixture ${task.role} has no registered routes`);
  }
  const manifests = await validateLiveManifests();
  const pages = [];
  for (const route of task.routes) {
    if (
      typeof route.file !== "string"
      || !/^[a-z0-9][a-z0-9.-]*\.html$/u.test(route.file)
      || typeof route.url !== "string"
    ) {
      throw new Error(`rendered fixture ${task.role} has an invalid route`);
    }
    const url = new URL(route.url);
    if (
      url.protocol !== "https:"
      || (url.origin !== "https://www.vela.space" && url.origin !== "https://app.vela.space")
    ) {
      throw new Error(`rendered fixture ${task.role} has an untrusted route origin`);
    }
    const response = await fetch(url, {
      headers: { accept: "text/html", "user-agent": "canopus-cold-use-fixture/1" },
    });
    if (!response.ok) throw new Error(`${url} returned ${response.status}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    const htmlPath = path.join(target, route.file);
    await writeFile(htmlPath, bytes);
    const textResult = await checked([
      "xmllint",
      "--html",
      "--xpath",
      "//body//*[not(self::script) and not(*)]/text()",
      htmlPath,
    ]);
    const text = `${textResult.stdout.toString("utf8")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .join("\n")}\n`;
    const textFile = route.file.replace(/\.html$/u, ".txt");
    const textBytes = Buffer.from(text);
    await writeFile(path.join(target, textFile), textBytes);
    pages.push({
      file: route.file,
      url: url.toString(),
      sha256: sha256(bytes),
      accessibility_text_file: textFile,
      accessibility_text_sha256: sha256(textBytes),
      accessibility_text_transform: "xmllint --html --xpath //body//*[not(self::script) and not(*)]/text()",
    });
  }
  await writeFile(path.join(target, "fixture-manifest.json"), `${JSON.stringify({
    schema: "canopus.rendered-cold-use-fixture.v1",
    web: registration.products.web,
    editorial_manifest_sha256: manifests.editorial_manifest_sha256,
    observatory_manifest_sha256: manifests.observatory_manifest_sha256,
    pages,
  }, null, 2)}\n`);
}

async function addFixtureExcludes(fixture, entries) {
  const exclude = path.join(fixture, ".git/info/exclude");
  const existing = await readFile(exclude, "utf8").catch(() => "");
  const lines = new Set(existing.split("\n").filter(Boolean));
  for (const entry of entries) lines.add(entry);
  await writeFile(exclude, `${[...lines].join("\n")}\n`);
}

async function installRegisteredVela(fixture) {
  const resolved = await checked(["sh", "-c", "command -v vela"]);
  const source = resolved.stdout.toString("utf8").trim();
  const bytes = await readFile(source);
  if (sha256(bytes) !== registration.products.vela_binary_sha256) {
    throw new Error("installed Vela binary does not match the registration");
  }
  const version = await checked([source, "--version"]);
  if (version.stdout.toString("utf8").trim() !== registration.products.vela_version) {
    throw new Error("installed Vela version does not match the registration");
  }
  const destination = path.join(fixture, "vela");
  await copyFile(source, destination);
  await chmod(destination, 0o755);
  await addFixtureExcludes(fixture, ["/vela", "/.agent-home/", "/.tmp/"]);
}

async function assertRegisteredRuntime() {
  const runnerBytes = await readFile(fileURLToPath(import.meta.url));
  if (sha256(runnerBytes) !== registration.runner.sha256) {
    throw new Error("cold-use runner bytes do not match the registration");
  }
  const resolved = await checked(["sh", "-c", "command -v codex"]);
  const codexPath = resolved.stdout.toString("utf8").trim();
  const [codexBytes, version] = await Promise.all([
    readFile(codexPath),
    checked([codexPath, "--version"]),
  ]);
  if (version.stdout.toString("utf8").trim() !== registration.runtime.codex_version) {
    throw new Error("installed Codex version does not match the registration");
  }
  if (sha256(codexBytes) !== registration.runtime.codex_binary_sha256) {
    throw new Error("installed Codex binary does not match the registration");
  }
  return {
    runner_sha256: sha256(runnerBytes),
    codex_version: version.stdout.toString("utf8").trim(),
    codex_binary_sha256: sha256(codexBytes),
  };
}

async function prepareFixture(task, workRoot) {
  const fixture = path.join(workRoot, task.role);
  await mkdir(fixture, { recursive: true });
  if (task.fixture === "empty_disposable_git_repository") {
    await checked(["git", "init", "--quiet"], { cwd: fixture });
    await checked(["git", "config", "user.name", "Vela Cold Use"], { cwd: fixture });
    await checked(["git", "config", "user.email", "cold-use@vela.invalid"], { cwd: fixture });
    await writeFile(path.join(fixture, ".gitignore"), "\n");
    await checked(["git", "add", ".gitignore"], { cwd: fixture });
    await checked(["git", "commit", "--quiet", "-m", "fixture"], { cwd: fixture });
  } else if (task.fixture === "exact_disposable_erdos_checkout") {
    await rm(fixture, { recursive: true, force: true });
    const source = process.env.CANOPUS_ERDOS_SOURCE ?? registration.products.erdos_remote;
    if (process.env.CANOPUS_ERDOS_SOURCE !== undefined) {
      const state = await gitState(source);
      const remote = await checked(["git", "remote", "get-url", "origin"], { cwd: source });
      if (
        state.commit !== registration.products.erdos_commit
        || state.tree !== registration.products.erdos_tree
        || state.status.length !== 0
        || remote.stdout.toString("utf8").trim() !== registration.products.erdos_remote
      ) {
        throw new Error("local Erdős source is not the registered clean exact commit");
      }
    }
    await cloneExact(source, registration.products.erdos_commit, fixture);
    const state = await gitState(fixture);
    if (state.commit !== registration.products.erdos_commit || state.tree !== registration.products.erdos_tree) {
      throw new Error("cloned Erdős fixture does not match the registered commit and tree");
    }
  } else if (task.fixture === "rendered_site_pages_at_exact_commit") {
    await renderReaderFixture(fixture, task);
    await checked(["git", "init", "--quiet"], { cwd: fixture });
    await checked(["git", "config", "user.name", "Vela Cold Use"], { cwd: fixture });
    await checked(["git", "config", "user.email", "cold-use@vela.invalid"], { cwd: fixture });
    await checked(["git", "add", "."], { cwd: fixture });
    await checked(["git", "commit", "--quiet", "-m", "rendered fixture"], { cwd: fixture });
  } else {
    throw new Error(`unknown cold-use fixture ${task.fixture}`);
  }
  if (task.fixture === "rendered_site_pages_at_exact_commit") {
    await addFixtureExcludes(fixture, ["/.agent-home/", "/.tmp/"]);
  } else {
    await installRegisteredVela(fixture);
  }
  return fixture;
}

function parseTrace(bytes) {
  const events = bytes.toString("utf8").trim().split("\n").filter(Boolean).flatMap((line) => {
    try { return [JSON.parse(line)]; } catch { return []; }
  });
  const commands = [];
  let usage = null;
  let sessionId = null;
  for (const event of events) {
    if (event.type === "thread.started") sessionId = event.thread_id ?? null;
    if (event.type === "turn.completed") usage = event.usage ?? null;
    if (event.type === "item.completed" && event.item?.type === "command_execution") {
      commands.push({ command: event.item.command, exit_code: event.item.exit_code, status: event.item.status });
    }
  }
  return { session_id: sessionId, usage, observed_commands: commands };
}

await mkdir(path.dirname(output), { recursive: true });
try {
  await mkdir(output, { recursive: false, mode: 0o700 });
} catch (error) {
  if (error instanceof Error && "code" in error && error.code === "EEXIST") {
    throw new Error(`cold-use output path already exists; choose a fresh --output path: ${output}`);
  }
  throw error;
}
const workRoot = await mkdtemp(path.join(tmpdir(), "vela-product-09-cold-use-"));
const records = [];
let stoppedError = null;
let runtimeIdentity = null;
const fixtures = new Map();

try {
  runtimeIdentity = await assertRegisteredRuntime();
  for (const task of registration.tasks) {
    fixtures.set(task.role, await prepareFixture(task, workRoot));
  }
  for (const task of registration.tasks) {
    const fixture = fixtures.get(task.role);
    const runtime = await prepareRuntime(task, fixture);
    try {
      await assertCustody(fixture, runtime);
    } finally {
      await rm(runtime.runtimeRoot, { recursive: true, force: true });
    }
  }
  if (!preflightOnly) {
    for (const task of registration.tasks) {
      const fixture = fixtures.get(task.role);
      const runtime = await prepareRuntime(task, fixture);
      try {
      const before = await gitState(fixture);
      await assertCustody(fixture, runtime);
      const finalPath = path.join(runtime.runtimeRoot, `${task.role}.final.txt`);
      const argv = [
        "codex", "exec", "--ephemeral", "--strict-config", "--ignore-rules",
        "--model", registration.runtime.model,
        "--config", 'web_search="disabled"',
        "--config", `model_reasoning_effort=\"${registration.runtime.reasoning_effort}\"`,
        ...disabledFeatures.flatMap((feature) => ["--disable", feature]),
        "--json", "--color", "never", "--output-last-message", finalPath,
        "--cd", fixture, "-",
      ];
      const run = await command(argv, {
        cwd: fixture,
        env: runtime.environment,
        input: `${task.prompt}\n`,
        timeoutMs: registration.limits.wall_time_seconds_per_call * 1000,
      });
      const after = await gitState(fixture);
      const fixtureManifest = await readFile(path.join(fixture, "fixture-manifest.json"), "utf8")
        .then((bytes) => JSON.parse(bytes))
        .catch(() => null);
      const tracePath = path.join(output, `${task.role}.jsonl`);
      await writeFile(tracePath, run.stdout);
      await writeFile(path.join(output, `${task.role}.stderr.txt`), run.stderr);
      const final = await readFile(finalPath).catch(() => Buffer.from(""));
      assertNoSecrets([run.stdout, run.stderr, final], runtime.secrets);
      await writeFile(path.join(output, `${task.role}.final.txt`), final);
      const parsed = parseTrace(run.stdout);
      const observedTokens = parsed.usage === null
        ? null
        : (parsed.usage.input_tokens ?? 0) + (parsed.usage.output_tokens ?? 0);
      const tokenBudgetPassed = observedTokens !== null
        && observedTokens <= registration.limits.max_observed_tokens_per_call;
      records.push({
        role: task.role,
        fixture: task.fixture,
        prompt: task.prompt,
        prompt_sha256: sha256(Buffer.from(task.prompt)),
        access: task.access,
        exit_code: run.code,
        signal: run.signal,
        timed_out: run.timed_out,
        wall_time_ms: run.wall_time_ms,
        session_id: parsed.session_id,
        usage: parsed.usage,
        observed_tokens: observedTokens,
        token_budget_passed: tokenBudgetPassed,
        observed_commands: parsed.observed_commands,
        fixture_before: before,
        fixture_after: after,
        fixture_manifest: fixtureManifest,
        permission_profile_sha256: sha256(runtime.profile),
        custody_preflight: "passed",
        trace_sha256: sha256(run.stdout),
        stderr_sha256: sha256(run.stderr),
        final_sha256: sha256(final),
        interventions: [],
        external_gate_credit: false,
      });
      if (run.code !== 0) {
        stoppedError = run.timed_out
          ? `role ${task.role} exceeded the registered wall-time limit`
          : `role ${task.role} exited ${run.code}`;
        break;
      }
      if (!tokenBudgetPassed) {
        stoppedError = observedTokens === null
          ? `role ${task.role} produced no token-usage record`
          : `role ${task.role} exceeded the registered token limit`;
        break;
      }
      } finally {
        await rm(runtime.runtimeRoot, { recursive: true, force: true });
      }
    }
  }
} catch (error) {
  stoppedError = error instanceof Error ? error.message : String(error);
} finally {
  await rm(workRoot, { recursive: true, force: true });
}

const record = {
  schema: "canopus.product-09-cold-use-run.v1",
  registration_sha256: sha256(registrationBytes),
  registration: path.relative(root, registrationPath),
  completed_at: new Date().toISOString(),
  products: registration.products,
  runtime: registration.runtime,
  runtime_identity: runtimeIdentity,
  records,
  status: stoppedError !== null
    ? "stopped"
    : preflightOnly
      ? "preflight_passed"
      : records.length === registration.tasks.length ? "completed" : "stopped",
  error: stoppedError,
  external_gate_credit: false,
  scientific_result_credit: false,
};
await writeFile(path.join(output, "run.json"), `${JSON.stringify(record, null, 2)}\n`);
console.log(JSON.stringify({ output, registration_sha256: record.registration_sha256, roles: records.map((item) => item.role) }));
if (stoppedError !== null) process.exitCode = 1;
