import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { benchmarkPrompts, runPairedBenchmark } from "../src/benchmark/run.js";
import type { CommandRunner } from "../src/util/command.js";
import { sha256Bytes } from "../src/util/canonical.js";

// Tests execute from compiled dist/tests, while benchmark registrations bind
// source-tree bytes. Keep the fixture boundary rooted at the package checkout.
const repoRoot = path.resolve(process.cwd());

test("benchmark arms are rendered from one facts object", async () => {
  const facts = JSON.parse(
    await readFile(path.join(repoRoot, "benchmarks/fixtures/v0/inheritance/facts.json"), "utf8"),
  );
  const prompts = benchmarkPrompts(facts);
  for (const token of ["alpha", "beta", "gamma", "vev_beta_accepted", facts.current_accepted_root]) {
    assert.match(prompts.baseline, new RegExp(token, "u"));
    assert.match(prompts.treatment, new RegExp(token, "u"));
  }
  assert.match(prompts.treatment, /PENDING, NOT INHERITABLE/u);
  assert.doesNotMatch(prompts.baseline, /PENDING, NOT INHERITABLE/u);
});

test("paired runner rejects output inside the repository before model execution", async () => {
  let calls = 0;
  const runner: CommandRunner = async () => {
    calls += 1;
    throw new Error("must not run");
  };
  await assert.rejects(
    runPairedBenchmark({
      registrationPath: path.join(repoRoot, "benchmarks/registration/v0.json"),
      repoRoot,
      outputRoot: path.join(repoRoot, ".runs/benchmark"),
      codexBinary: "/codex",
      codexHome: "/auth",
      runner,
    }),
    /outside the repository/u,
  );
  assert.equal(calls, 0);
});

test("benchmark executes through the shared tool-free Codex lane", async () => {
  const outputRoot = await mkdtemp(path.join(os.tmpdir(), "canopus-benchmark-safe-"));
  const registrationRoot = await mkdtemp(
    path.join(os.tmpdir(), "canopus-benchmark-registration-"),
  );
  const authHome = await mkdtemp(path.join(os.tmpdir(), "canopus-benchmark-auth-"));
  await writeFile(path.join(authHome, "auth.json"), "{}\n");
  const registration = JSON.parse(
    await readFile(path.join(repoRoot, "benchmarks/registration/v0.json"), "utf8"),
  );
  registration.model.binary_sha256 = sha256Bytes(await readFile(process.execPath));
  const registrationPath = path.join(registrationRoot, "registration.json");
  await writeFile(registrationPath, `${JSON.stringify(registration)}\n`);
  const calls: string[][] = [];
  const runner: CommandRunner = async (options) => {
    const argv = [...options.argv];
    calls.push(argv);
    if (argv[1] === "--version") {
      return {
        argv,
        exitCode: 0,
        signal: null,
        stdout: Buffer.from("codex-cli 0.139.0\n"),
        stderr: Buffer.alloc(0),
        durationMs: 1,
      };
    }
    const finalIndex = argv.indexOf("--output-last-message");
    const finalPath = argv[finalIndex + 1];
    assert.equal(typeof finalPath, "string");
    await writeFile(
      finalPath as string,
      JSON.stringify({
        selected_base: "beta",
        base_state: "accepted",
        next_action: "extend_beta",
        must_not_claim: "alpha_is_accepted",
        rejected_routes: ["alpha_pending", "gamma_verifier_failed"],
        explanation: "Only beta has an accepted event at the current root.",
      }),
    );
    const events = [
      { type: "thread.started", thread_id: "thread-benchmark" },
      { type: "turn.started" },
      {
        type: "item.completed",
        item: { id: "message-1", type: "agent_message", text: "done" },
      },
      {
        type: "turn.completed",
        usage: {
          input_tokens: 10,
          cached_input_tokens: 0,
          output_tokens: 5,
          reasoning_output_tokens: 0,
        },
      },
    ].map((event) => JSON.stringify(event)).join("\n") + "\n";
    return {
      argv,
      exitCode: 0,
      signal: null,
      stdout: Buffer.from(events),
      stderr: Buffer.alloc(0),
      durationMs: 2,
    };
  };
  const report = await runPairedBenchmark({
    registrationPath,
    repoRoot,
    outputRoot,
    codexBinary: process.execPath,
    codexHome: authHome,
    runner,
  });
  assert.equal(report.arms.length, 2);
  assert.equal(calls.length, 3);
  for (const arm of ["baseline", "treatment"]) {
    await assert.rejects(
      readFile(path.join(outputRoot, arm, "home", "codex-runtime", "auth.json")),
      /ENOENT/u,
    );
  }
  const commands = calls.filter((argv) => argv[0] === "/usr/bin/sandbox-exec");
  assert.equal(commands.length, 2);
  for (const command of commands) {
    assert.ok(command.includes("--ignore-user-config"));
    assert.ok(command.includes("--ignore-rules"));
    assert.ok(command.includes("read-only"));
    assert.ok(command.includes("shell_tool"));
    assert.ok(command.includes("apply_patch_freeform"));
    assert.ok(command.includes("apps"));
    assert.ok(command.includes("approval_policy=\"never\""));
    assert.ok(command.includes("web_search=\"disabled\""));
    assert.equal(command[0], "/usr/bin/sandbox-exec");
    assert.match(command[2] ?? "", /deny default/u);
  }
});
