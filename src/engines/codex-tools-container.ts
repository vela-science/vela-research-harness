import { randomBytes } from "node:crypto";
import { chmod, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { assertDraftArtifactsAllowed, parseCandidateDraft } from "../candidate/validate.js";
import type { MissionV1 } from "../contracts/mission.js";
import { canonicalJson, contentDigest, sha256Bytes } from "../util/canonical.js";
import { isolatedEnvironment, runCommand, type CommandRunner } from "../util/command.js";
import { readBoundedRegularFile } from "../util/files.js";
import { parseCodexEvents, summarizeCodexFailure } from "./codex-events.js";
import { prepareIsolatedCodexHome, removeIsolatedCodexHome } from "./codex-home.js";
import type { Engine, EngineContext, EngineResult } from "./engine.js";

export interface CodexToolsContainerOptions {
  dockerBinary: string;
  authHome: string;
  outputSchema: string;
  runner?: CommandRunner;
}

function safeMountPath(value: string, label: string): string {
  const resolved = path.resolve(value);
  if (resolved.includes(",") || resolved.includes("\n") || resolved.includes("\0")) {
    throw new Error(`${label} cannot be represented as a Docker mount`);
  }
  return resolved;
}

function bindMount(source: string, target: string, readonly = true): string {
  return [
    "type=bind",
    `src=${safeMountPath(source, target)}`,
    `dst=${target}`,
    ...(readonly ? ["readonly"] : []),
  ].join(",");
}

export function containerWorkerArgv(options: {
  dockerBinary: string;
  mission: MissionV1;
  source: string;
  credentials: string;
  outputSchema: string;
  output: string;
  canary: string;
  uid: number;
  gid: number;
}): string[] {
  const worker = options.mission.worker;
  return [
    options.dockerBinary,
    "run",
    "--interactive",
    "--rm",
    "--init",
    "--read-only",
    "--cap-drop=ALL",
    "--security-opt=no-new-privileges",
    `--memory=${worker.memory_mb}m`,
    `--cpus=${worker.cpu_count}`,
    `--pids-limit=${worker.pids_limit}`,
    "--network=bridge",
    `--user=${options.uid}:${options.gid}`,
    `--tmpfs=/tmp:rw,nosuid,nodev,noexec,size=64m,uid=${options.uid},gid=${options.gid},mode=0700`,
    `--tmpfs=/runtime:rw,nosuid,nodev,size=64m,uid=${options.uid},gid=${options.gid},mode=0700`,
    `--tmpfs=/workspace:rw,nosuid,nodev,size=2g,uid=${options.uid},gid=${options.gid},mode=0700`,
    "--mount",
    bindMount(options.source, "/source"),
    "--mount",
    bindMount(options.credentials, "/credentials"),
    "--mount",
    bindMount(options.outputSchema, "/contract/engine-output.v0.json"),
    "--mount",
    bindMount(options.output, "/out", false),
    "--mount",
    bindMount(options.canary, "/canary/host-secret"),
    "--env",
    `CANOPUS_MODEL=${worker.model}`,
    "--env",
    `CANOPUS_EXPECTED_CODEX_VERSION=${worker.codex_version}`,
    "--env",
    `CANOPUS_EXPECTED_CODEX_SHA256=${worker.codex_sha256}`,
    worker.image,
  ];
}

function prompt(mission: MissionV1, briefing: Record<string, unknown>): string {
  return [
    "Execute one bounded Canopus research mission inside the supplied writable copy of the exact source checkout.",
    "Use shell and apply_patch only when useful. Browser, web search, MCP, apps, memories, computer use, delegation, signing, and human keys are forbidden.",
    "Do not inspect /credentials, /runtime, /canary, /proc, Docker state, or paths outside /workspace.",
    "Do not invoke Vela as an authority oracle. The separate harness invokes the frozen verifier only after you finish.",
    "Keep tool output narrow. Do not print whole materialized pages, frontier.json, event logs, or other large files; query only the exact fields needed for this bounded computation.",
    "A null or failed result is valid. Never turn a bounded negative search into universal nonexistence, verifier failure into success, or Git publication into scientific acceptance.",
    "Return only the supplied engine-output JSON shape. Artifact bytes must be inline UTF-8 content at mission.allowed_paths.",
    "Mission:",
    canonicalJson(mission),
    "Exact Vela work briefing:",
    canonicalJson(briefing),
  ].join("\n");
}

function requireV1(context: EngineContext): MissionV1 {
  if (context.mission.schema !== "canopus.mission.v1") {
    throw new Error("the tool container accepts only canopus.mission.v1");
  }
  return context.mission;
}

export class CodexToolsContainerEngine implements Engine {
  public readonly name = "codex-tools-container";
  readonly #options: CodexToolsContainerOptions;
  readonly #runner: CommandRunner;

  public constructor(options: CodexToolsContainerOptions) {
    this.#options = options;
    this.#runner = options.runner ?? runCommand;
  }

  public async run(context: EngineContext): Promise<EngineResult> {
    const mission = requireV1(context);
    context.budget.beginAttempt();
    context.budget.beginProcess();

    const output = path.join(context.paths.work, "container-output");
    const canaryDirectory = path.join(context.paths.work, "custody-canary");
    const canary = path.join(canaryDirectory, "host-secret");
    await Promise.all([
      mkdir(output, { mode: 0o700 }),
      mkdir(canaryDirectory, { mode: 0o700 }),
    ]);
    // Docker Desktop maps bind mounts through the host UID. The output
    // directory contains only this run's final response and is removed with
    // the run workspace.
    await chmod(output, 0o700);
    const canaryBytes = Buffer.from(`canopus-host-secret-${randomBytes(32).toString("hex")}\n`);
    await writeFile(canary, canaryBytes, { flag: "wx", mode: 0o400 });

    const credentials = await prepareIsolatedCodexHome(
      this.#options.authHome,
      context.paths.home,
    );
    try {
      const image = await this.#runner({
        argv: [
          this.#options.dockerBinary,
          "image",
          "inspect",
          "--format={{.Id}}",
          mission.worker.image,
        ],
        cwd: context.paths.work,
        env: isolatedEnvironment(context.paths.home),
        timeoutMs: Math.min(30_000, context.budget.remainingTimeMs()),
        maxOutputBytes: 4096,
      });
      if (image.exitCode !== 0 || image.stderr.length !== 0) {
        throw new Error("pinned Canopus worker image is unavailable");
      }
      const imageId = image.stdout.toString("utf8").trim();
      if (imageId !== mission.worker.image) {
        throw new Error(`worker image mismatch: expected ${mission.worker.image}, observed ${imageId}`);
      }

      const workerPrompt = prompt(mission, context.briefing);
      context.budget.addPrompt(Buffer.byteLength(workerPrompt));
      const outputSchemaDigest = sha256Bytes(
        await readBoundedRegularFile(this.#options.outputSchema, 8 * 1024 * 1024),
      );
      if (outputSchemaDigest !== mission.worker.output_schema_sha256) {
        throw new Error("worker engine-output schema does not match the prepared mission");
      }
      const argv = containerWorkerArgv({
        dockerBinary: this.#options.dockerBinary,
        mission,
        source: context.paths.input,
        credentials,
        outputSchema: this.#options.outputSchema,
        output,
        canary,
        uid: process.getuid?.() ?? 1000,
        gid: process.getgid?.() ?? 1000,
      });
      const started = performance.now();
      const result = await this.#runner({
        argv,
        cwd: context.paths.work,
        env: isolatedEnvironment(context.paths.home),
        timeoutMs: context.budget.remainingTimeMs(),
        maxOutputBytes: context.budget.remainingOutputBytes(),
        stdin: workerPrompt,
      });
      context.budget.addOutput(result.stdout.length + result.stderr.length);
      if (
        result.stdout.indexOf(canaryBytes.subarray(0, canaryBytes.length - 1)) !== -1 ||
        result.stderr.indexOf(canaryBytes.subarray(0, canaryBytes.length - 1)) !== -1
      ) {
        throw new Error("worker exposed the host-secret canary");
      }
      if (result.exitCode !== 0) {
        throw new Error(
          `containerized codex exec exited ${result.exitCode}: ` +
          `${summarizeCodexFailure(result.stdout.toString("utf8"))}; ` +
          `stdout_sha256=${sha256Bytes(result.stdout)}; stderr_sha256=${sha256Bytes(result.stderr)}`,
        );
      }
      const events = parseCodexEvents(result.stdout.toString("utf8"));
      try {
        context.budget.addTokens(events.usage.input_tokens + events.usage.output_tokens);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(
          `${message}; event_stream_sha256=${sha256Bytes(result.stdout)}; ` +
          `stderr_sha256=${sha256Bytes(result.stderr)}`,
        );
      }
      const finalPath = path.join(output, "final.json");
      const finalBytes = await readBoundedRegularFile(finalPath, 1_048_576);
      context.budget.addOutput(finalBytes.length);
      if (finalBytes.indexOf(canaryBytes.subarray(0, canaryBytes.length - 1)) !== -1) {
        throw new Error("worker returned the host-secret canary");
      }
      let raw: unknown;
      try {
        raw = JSON.parse(finalBytes.toString("utf8")) as unknown;
      } catch (error) {
        throw new Error(`containerized Codex final response is not JSON: ${String(error)}`);
      }
      const draft = parseCandidateDraft(raw);
      assertDraftArtifactsAllowed(draft, mission.allowed_paths);
      return {
        draft,
        engine: {
          name: this.name,
          version: mission.worker.codex_version,
          binary_sha256: mission.worker.codex_sha256,
          model: mission.worker.model,
          configuration_sha256: contentDigest({
            worker: mission.worker,
            image: mission.worker.image,
            output_schema_sha256: outputSchemaDigest,
            outer: {
              read_only: true,
              cap_drop: "ALL",
              no_new_privileges: true,
              source: "read_only",
              docker_socket: "absent",
              host_home: "absent",
              vela_keys: "absent",
            },
            inner: {
              sandbox: "workspace-write",
              approvals: "never",
              shell_environment: "inherit_none",
            },
            canary_sha256: sha256Bytes(canaryBytes),
          }),
        },
        usage: events.usage,
        wallTimeMs: Math.max(0, Math.round(performance.now() - started)),
        eventTypes: events.eventTypes,
        actionTypes: events.actionTypes,
        eventsDigest: sha256Bytes(result.stdout),
        stderrDigest: sha256Bytes(result.stderr),
      };
    } finally {
      await removeIsolatedCodexHome(credentials);
      await rm(canaryDirectory, { recursive: true, force: true });
      // The final response has already been parsed into bounded values.
      await rm(output, { recursive: true, force: true });
    }
  }
}
