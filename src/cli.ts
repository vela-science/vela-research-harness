#!/usr/bin/env node

import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import {
  loadCompositionStageA,
  runCompositionStageA,
} from "./benchmark/composition.js";
import { runPairedBenchmark } from "./benchmark/run.js";
import { parseMission } from "./contracts/mission.js";
import { CodexExecEngine } from "./engines/codex-exec.js";
import { CodexToolsContainerEngine } from "./engines/codex-tools-container.js";
import { prepareMission, validateMissionBundle } from "./mission/prepare.js";
import { parseRunRecord, projectRun } from "./projection/run.js";
import { runCanopus } from "./run.js";
import { readBoundedRegularFile } from "./util/files.js";
import { VelaClient } from "./vela/cli.js";

function usage(): string {
  return `Canopus — bounded Vela research harness

Primary workflow:
  canopus mission prepare <draft.json> --source <clean-repo> --output <new-bundle> \\
    --vela <binary> --worker-image <image> --verifier-image <image> [--docker <binary>]
  canopus mission validate <bundle/mission.json>
  canopus run <bundle/mission.json> --source <repo> --run-root <new-dir> \\
    --vela <binary> [--docker <binary>] [--codex-home <dir>]
  canopus inspect <run.json>

Use 'canopus <command> --help' for command details. Frozen Mission v0 benchmark
commands remain available as 'benchmark' and 'benchmark-composition' for
historical reproduction, but are not the primary workflow.

Canopus may land a Receipt v1 as an agent after verifier success. It cannot
sign, accept, or make a human scientific decision.`;
}

function missionUsage(): string {
  return `Usage:
  canopus mission prepare <draft.json> --source <clean-repo> --output <new-bundle> \\
    --vela <binary> --worker-image <image> --verifier-image <image> [--docker <binary>]
  canopus mission validate <bundle/mission.json>

prepare derives exact Git, Vela, packet, binary, image, Codex, capsule, and
strict-baseline roots. validate is read-only and checks the closed contract and
portable bundle bytes.`;
}

function runUsage(): string {
  return `Usage:
  canopus run <bundle/mission.json> --source <repo> --run-root <new-dir> \\
    --vela <binary> [--docker <binary>] [--codex-home <dir>]

Mission v1 runs the pinned Codex worker image and separate verifier image.
Mission v0 additionally requires --codex, --codex-version, --codex-sha256, and
--model for frozen tool-free reproduction.`;
}

function inspectUsage(): string {
  return `Usage:
  canopus inspect <run.json>

Projects one completed non-authoritative run record without mutating Vela.`;
}

function isHelp(value: string | undefined): boolean {
  return value === "--help" || value === "-h" || value === "help";
}

async function jsonFile(file: string): Promise<unknown> {
  const bytes = await readBoundedRegularFile(path.resolve(file), 8 * 1024 * 1024);
  return JSON.parse(bytes.toString("utf8")) as unknown;
}

function options(args: string[], allowed: readonly string[]): Map<string, string> {
  const result = new Map<string, string>();
  const allow = new Set(allowed);
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index];
    const value = args[index + 1];
    if (key === undefined || value === undefined || !allow.has(key) || result.has(key)) {
      throw new Error(`invalid or duplicate option near ${key ?? "end of arguments"}`);
    }
    result.set(key, value);
  }
  return result;
}

function required(values: Map<string, string>, key: string): string {
  const value = values.get(key);
  if (value === undefined || value === "") throw new Error(`${key} is required`);
  return value;
}

function authHome(values: Map<string, string>): string {
  return path.resolve(
    values.get("--codex-home") ?? process.env.CODEX_HOME ?? path.join(os.homedir(), ".codex"),
  );
}

function packagedOutputSchema(): string {
  return fileURLToPath(new URL("../../schemas/engine-output.v0.json", import.meta.url));
}

async function missionCommand(args: string[]): Promise<void> {
  const [subcommand, file, ...rest] = args;
  if (subcommand === undefined || isHelp(subcommand)) {
    process.stdout.write(`${missionUsage()}\n`);
    return;
  }
  if (isHelp(file)) {
    process.stdout.write(`${missionUsage()}\n`);
    return;
  }
  if (file === undefined) throw new Error(`mission ${subcommand} requires a JSON file`);

  if (subcommand === "validate") {
    if (rest.length !== 0) throw new Error("mission validate accepts only one mission file");
    const mission = parseMission(await jsonFile(file));
    if (mission.schema === "canopus.mission.v1") {
      await validateMissionBundle(mission, path.dirname(path.resolve(file)));
    }
    process.stdout.write(
      `${JSON.stringify({ ok: true, command: "mission validate", mission_id: mission.id, schema: mission.schema })}\n`,
    );
    return;
  }
  if (subcommand !== "prepare") throw new Error(`unknown mission command ${subcommand}`);
  const values = options(rest, [
    "--source",
    "--output",
    "--vela",
    "--worker-image",
    "--verifier-image",
    "--docker",
  ]);
  const prepared = await prepareMission({
    draft: await jsonFile(file),
    draftRoot: path.dirname(path.resolve(file)),
    sourceRepo: path.resolve(required(values, "--source")),
    outputRoot: path.resolve(required(values, "--output")),
    velaBinary: path.resolve(required(values, "--vela")),
    dockerBinary: values.get("--docker") ?? "docker",
    workerImage: required(values, "--worker-image"),
    verifierImage: required(values, "--verifier-image"),
    outputSchema: packagedOutputSchema(),
  });
  process.stdout.write(
    `${JSON.stringify({
      ok: true,
      command: "mission prepare",
      mission_id: prepared.mission.id,
      target: prepared.mission.target,
      mission: prepared.missionPath,
      manifest: prepared.manifestPath,
    })}\n`,
  );
}

async function runMission(file: string, rest: string[]): Promise<void> {
  const values = options(rest, [
    "--source",
    "--run-root",
    "--vela",
    "--docker",
    "--codex",
    "--codex-version",
    "--codex-sha256",
    "--model",
    "--codex-home",
  ]);
  const mission = parseMission(await jsonFile(file));
  const sourceRepo = path.resolve(required(values, "--source"));
  const runRoot = path.resolve(required(values, "--run-root"));
  const velaBinary = path.resolve(required(values, "--vela"));
  const outputSchema = mission.schema === "canopus.mission.v1"
    ? path.join(path.dirname(path.resolve(file)), "contract", "engine-output.v0.json")
    : packagedOutputSchema();
  const vela = new VelaClient({
    binary: velaBinary,
    expectedVersion: mission.vela_version,
    expectedSha256: mission.vela_sha256,
    home: path.join(runRoot, "vela-home"),
  });
  const engine = mission.schema === "canopus.mission.v1"
    ? new CodexToolsContainerEngine({
        dockerBinary: values.get("--docker") ?? "docker",
        authHome: authHome(values),
        outputSchema,
      })
    : new CodexExecEngine({
        binary: path.resolve(required(values, "--codex")),
        expectedSha256: required(values, "--codex-sha256"),
        expectedVersion: required(values, "--codex-version"),
        model: required(values, "--model"),
        authHome: authHome(values),
        outputSchema,
      });
  const result = await runCanopus({
    mission,
    sourceRepo,
    runRoot,
    vela,
    engine,
    bundleRoot: path.dirname(path.resolve(file)),
    dockerBinary: values.get("--docker") ?? "docker",
  });
  process.stdout.write(
    `${JSON.stringify({
      ok: true,
      command: "run",
      run_id: result.record.run_id,
      candidate_digest: result.record.candidate.digest,
      receipt_root: result.record.landing.receipt_root,
      route: result.record.landing.route,
      accepted_event_delta: result.record.landing.accepted_event_delta,
      clean_clone_reproduced: result.record.reproduction.matched,
      run_file: path.join(result.paths.root, "run.json"),
    })}\n`,
  );
}

async function benchmark(command: string, file: string, rest: string[]): Promise<void> {
  const values = options(rest, ["--repo", "--output-root", "--codex", "--codex-home"]);
  const repoRoot = path.resolve(required(values, "--repo"));
  const outputRoot = path.resolve(required(values, "--output-root"));
  const codexBinary = path.resolve(required(values, "--codex"));
  const home = authHome(values);
  if (command === "benchmark") {
    const report = await runPairedBenchmark({
      registrationPath: path.resolve(file), repoRoot, outputRoot, codexBinary, codexHome: home,
    });
    process.stdout.write(`${JSON.stringify({
      ok: true,
      command,
      directional_result: report.directional_result,
      causal_claim: false,
      model_calls: report.arms.length,
      report: path.join(outputRoot, "report.json"),
    })}\n`);
    return;
  }
  const prepared = await loadCompositionStageA({ repoRoot, registrationPath: path.resolve(file) });
  const result = await runCompositionStageA({ prepared, outputRoot, codexBinary, codexHome: home });
  process.stdout.write(`${JSON.stringify({
    ok: true,
    command,
    model_calls: result.records.length,
    completed_cells: result.report.completed_cells,
    safe_cells: result.report.safe_cells,
    hard_safety_pass: result.report.hard_safety_pass,
    report: path.join(outputRoot, "report.json"),
  })}\n`);
}

async function main(argv: string[]): Promise<void> {
  const [command, file, ...rest] = argv;
  if (command === undefined || isHelp(command)) {
    process.stdout.write(`${usage()}\n`);
    return;
  }
  if (command === "mission") {
    await missionCommand(argv.slice(1));
    return;
  }
  if (isHelp(file)) {
    process.stdout.write(`${command === "run" ? runUsage() : command === "inspect" ? inspectUsage() : usage()}\n`);
    return;
  }
  if (file === undefined) throw new Error(`${command} requires a JSON file`);
  if (command === "validate") {
    await missionCommand(["validate", file, ...rest]);
    return;
  }
  if (command === "inspect") {
    if (rest.length !== 0) throw new Error("inspect accepts only one run file");
    const record = parseRunRecord(await jsonFile(file));
    process.stdout.write(`${JSON.stringify({ ok: true, command, projection: projectRun(record) })}\n`);
    return;
  }
  if (command === "run") {
    await runMission(file, rest);
    return;
  }
  if (command === "benchmark" || command === "benchmark-composition") {
    await benchmark(command, file, rest);
    return;
  }
  throw new Error(`unknown command ${command}`);
}

main(process.argv.slice(2)).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${JSON.stringify({ ok: false, error: message })}\n`);
  process.exitCode = 1;
});
