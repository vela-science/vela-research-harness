#!/usr/bin/env node

import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { runPairedBenchmark } from "./benchmark/run.js";
import { parseMission } from "./contracts/mission.js";
import { CodexExecEngine } from "./engines/codex-exec.js";
import { parseRunRecord, projectRun } from "./projection/run.js";
import { runCanopus } from "./run.js";
import { readBoundedRegularFile } from "./util/files.js";
import { VelaClient } from "./vela/cli.js";

function usage(): string {
  return `Canopus — Vela Research Harness

Usage:
  canopus validate <mission.json>
  canopus inspect <run.json>
  canopus benchmark <registration.json> --repo <canopus-repo> --output-root <empty-dir> \\
    --codex <binary> [--codex-home <dir>]
  canopus run <mission.json> --source <repo> --run-root <dir> \\
    --vela <binary> --codex <binary> --codex-version <exact> \\
    --codex-sha256 <sha256:hex> --model <model> \\
    [--codex-home <dir>]

The run command may land a Receipt v1 as an agent actor. It cannot sign or
make a human decision; an already signed policy may route the landing.`;
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

async function main(argv: string[]): Promise<void> {
  const [command, file, ...rest] = argv;
  if (command === undefined || command === "help" || command === "--help" || command === "-h") {
    process.stdout.write(`${usage()}\n`);
    return;
  }
  if (file === undefined) throw new Error(`${command} requires a JSON file`);

  if (command === "validate") {
    if (rest.length !== 0) throw new Error("validate accepts only one mission file");
    const mission = parseMission(await jsonFile(file));
    process.stdout.write(`${JSON.stringify({ ok: true, command, mission_id: mission.id })}\n`);
    return;
  }
  if (command === "inspect") {
    if (rest.length !== 0) throw new Error("inspect accepts only one run file");
    const record = parseRunRecord(await jsonFile(file));
    process.stdout.write(`${JSON.stringify({ ok: true, command, projection: projectRun(record) })}\n`);
    return;
  }
  if (command === "benchmark") {
    const values = options(rest, ["--repo", "--output-root", "--codex", "--codex-home"]);
    const repoRoot = path.resolve(required(values, "--repo"));
    const outputRoot = path.resolve(required(values, "--output-root"));
    const codexBinary = path.resolve(required(values, "--codex"));
    const codexHome = path.resolve(
      values.get("--codex-home") ?? process.env.CODEX_HOME ?? path.join(os.homedir(), ".codex"),
    );
    const report = await runPairedBenchmark({
      registrationPath: path.resolve(file),
      repoRoot,
      outputRoot,
      codexBinary,
      codexHome,
    });
    process.stdout.write(
      `${JSON.stringify({
        ok: true,
        command,
        directional_result: report.directional_result,
        causal_claim: false,
        model_calls: report.arms.length,
        report: path.join(outputRoot, "report.json"),
      })}\n`,
    );
    return;
  }
  if (command !== "run") throw new Error(`unknown command ${command}`);

  const values = options(rest, [
    "--source",
    "--run-root",
    "--vela",
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
  const codexBinary = path.resolve(required(values, "--codex"));
  const codexVersion = required(values, "--codex-version");
  const codexSha256 = required(values, "--codex-sha256");
  const model = required(values, "--model");
  const authHome = path.resolve(
    values.get("--codex-home") ?? process.env.CODEX_HOME ?? path.join(os.homedir(), ".codex"),
  );
  const outputSchema = fileURLToPath(
    new URL("../../schemas/engine-output.v0.json", import.meta.url),
  );
  const vela = new VelaClient({
    binary: velaBinary,
    expectedVersion: mission.vela_version,
    expectedSha256: mission.vela_sha256,
    home: path.join(runRoot, "vela-home"),
  });
  const engine = new CodexExecEngine({
    binary: codexBinary,
    expectedSha256: codexSha256,
    expectedVersion: codexVersion,
    model,
    authHome,
    outputSchema,
  });
  const result = await runCanopus({ mission, sourceRepo, runRoot, vela, engine });
  process.stdout.write(
    `${JSON.stringify({
      ok: true,
      command,
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

main(process.argv.slice(2)).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${JSON.stringify({ ok: false, error: message })}\n`);
  process.exitCode = 1;
});
