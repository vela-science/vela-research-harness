import path from "node:path";

import type { Mission } from "../contracts/mission.js";
import { parseCandidateDraft, assertDraftArtifactsAllowed } from "../candidate/validate.js";
import { roleInstruction } from "../roles.js";
import { canonicalJson, contentDigest, sha256Bytes } from "../util/canonical.js";
import {
  isolatedEnvironment,
  runCommand,
  type CommandRunner,
} from "../util/command.js";
import { readBoundedRegularFile } from "../util/files.js";
import { parseCodexEvents, summarizeCodexFailure } from "./codex-events.js";
import { prepareIsolatedCodexHome, removeIsolatedCodexHome } from "./codex-home.js";
import {
  CODEX_TOOL_FEATURES,
  sandboxedToolFreeCodexExecArgv,
} from "./codex-tool-free.js";
import type { Engine, EngineContext, EngineResult } from "./engine.js";

export interface CodexEngineOptions {
  binary: string;
  expectedSha256: string;
  expectedVersion: string;
  model: string;
  authHome: string;
  outputSchema: string;
  runner?: CommandRunner;
}

function prompt(mission: Mission, briefing: Record<string, unknown>): string {
  return [
    "Execute one bounded Canopus research mission.",
    roleInstruction(mission.role),
    "This is a tool-free synthesis stage. You cannot inspect the host or run commands.",
    "Use only the mission and the exact Vela work briefing supplied below.",
    "Return artifact bytes inline as UTF-8 content. The trusted harness materializes and verifies them later.",
    "Do not request tools, network access, external messages, Vela signing, human keys, or accepted-state writes.",
    "A null or failed result is valid. Do not turn verifier failure into a success claim.",
    "Return only the supplied engine-output JSON shape.",
    "Mission:",
    canonicalJson(mission),
    "Vela work briefing:",
    canonicalJson(briefing),
  ].join("\n");
}

export class CodexExecEngine implements Engine {
  public readonly name = "codex-exec";
  readonly #options: CodexEngineOptions;
  readonly #runner: CommandRunner;

  public constructor(options: CodexEngineOptions) {
    this.#options = options;
    this.#runner = options.runner ?? runCommand;
  }

  async #version(cwd: string, home: string, timeoutMs: number): Promise<string> {
    const result = await this.#runner({
      argv: [this.#options.binary, "--version"],
      cwd,
      env: isolatedEnvironment(home),
      timeoutMs,
      maxOutputBytes: 4096,
    });
    const version = result.stdout.toString("utf8").trim();
    if (result.exitCode !== 0 || result.stderr.length !== 0 || version !== this.#options.expectedVersion) {
      throw new Error(
        `expected Codex ${this.#options.expectedVersion}, observed ${JSON.stringify(version)}`,
      );
    }
    return version;
  }

  public async run(context: EngineContext): Promise<EngineResult> {
    context.budget.beginAttempt();
    const binaryBytes = await readBoundedRegularFile(this.#options.binary, 268_435_456);
    const binaryDigest = sha256Bytes(binaryBytes);
    if (binaryDigest !== this.#options.expectedSha256) {
      throw new Error(
        `Codex binary digest mismatch: expected ${this.#options.expectedSha256}, observed ${binaryDigest}`,
      );
    }
    context.budget.beginProcess();
    const finalPath = path.join(context.paths.work, ".canopus-final.json");
    const version = await this.#version(
      context.paths.work,
      context.paths.home,
      context.budget.remainingTimeMs(),
    );
    context.budget.beginProcess();
    const runtimeCodexHome = await prepareIsolatedCodexHome(
      this.#options.authHome,
      context.paths.home,
    );
    try {
      const environment = {
        ...isolatedEnvironment(context.paths.home),
        CODEX_HOME: runtimeCodexHome,
        NO_COLOR: "1",
      };
      const argv = await sandboxedToolFreeCodexExecArgv({
        binary: this.#options.binary,
        model: this.#options.model,
        outputSchema: this.#options.outputSchema,
        finalPath,
        cwd: context.paths.work,
        authHome: runtimeCodexHome,
      });
      const started = performance.now();
      const workerPrompt = prompt(context.mission, context.briefing);
      context.budget.addPrompt(Buffer.byteLength(workerPrompt));
      const result = await this.#runner({
        argv,
        cwd: context.paths.work,
        env: environment,
        timeoutMs: context.budget.remainingTimeMs(),
        maxOutputBytes: context.budget.remainingOutputBytes(),
        stdin: workerPrompt,
      });
      context.budget.addOutput(result.stdout.length + result.stderr.length);
      if (result.exitCode !== 0) {
        throw new Error(
          `codex exec exited ${result.exitCode}: ` +
            `${summarizeCodexFailure(result.stdout.toString("utf8"))}; ` +
            `stdout_sha256=${sha256Bytes(result.stdout)}; stderr_sha256=${sha256Bytes(result.stderr)}`,
        );
      }
      const events = parseCodexEvents(result.stdout.toString("utf8"));
      if (events.actionTypes.length !== 0) {
        throw new Error(`tool-free Codex worker emitted actions: ${events.actionTypes.join(",")}`);
      }
      context.budget.addTokens(events.usage.input_tokens + events.usage.output_tokens);
      const finalBytes = await readBoundedRegularFile(finalPath, 1_048_576);
      context.budget.addOutput(finalBytes.length);
      let raw: unknown;
      try {
        raw = JSON.parse(finalBytes.toString("utf8")) as unknown;
      } catch (error) {
        throw new Error(`Codex final response is not JSON: ${String(error)}`);
      }
      const draft = parseCandidateDraft(raw);
      assertDraftArtifactsAllowed(draft, context.mission.allowed_paths);
      return {
        draft,
        engine: {
          name: this.name,
          version,
          binary_sha256: binaryDigest,
          model: this.#options.model,
          configuration_sha256: contentDigest({
            binary_sha256: binaryDigest,
            codex_version: version,
            disabled_features: CODEX_TOOL_FEATURES,
            model: this.#options.model,
            output_schema_sha256: sha256Bytes(
              await readBoundedRegularFile(this.#options.outputSchema, 1_048_576),
            ),
            outer_sandbox: "macos_seatbelt_bounded_reads",
            product_sandbox: "read-only",
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
      await removeIsolatedCodexHome(runtimeCodexHome);
    }
  }
}
