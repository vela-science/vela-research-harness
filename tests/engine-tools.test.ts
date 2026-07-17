import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { BudgetTracker } from "../src/budget/enforce.js";
import type { MissionV1 } from "../src/contracts/mission.js";
import {
  CodexToolsContainerEngine,
  containerWorkerArgv,
} from "../src/engines/codex-tools-container.js";
import type { CommandRunner } from "../src/util/command.js";
import { sha256Bytes } from "../src/util/canonical.js";

const digest = `sha256:${"a".repeat(64)}`;
const draft = {
  schema: "canopus.engine-output.v0",
  status: "success",
  claim: "The bounded worker produced one candidate.",
  artifacts: [
    { path: "result.json", kind: "witness", encoding: "utf8", content: "{\"ok\":true}\n" },
  ],
  observations: ["The worker used one bounded local command."],
  caveats: ["Independent verification and human review remain separate."],
};

function mission(): MissionV1 {
  return {
    schema: "canopus.mission.v1",
    id: "mission_engine_tools",
    target: "attack-1",
    vela_version: "0.800.23",
    vela_sha256: digest,
    frontier: ".",
    actor: "agent:canopus-test",
    role: "producer",
    claim_type: "computational",
    replayability: "exact",
    objective: "Produce one bounded artifact.",
    completion_condition: "The frozen verifier exits zero.",
    roots: {
      git_commit: "b".repeat(40),
      git_tree: "c".repeat(40),
      vela_event_log: digest,
      vela_snapshot: digest,
    },
    target_packet: { path: "packet.json", sha256: digest },
    strict_baseline: {
      status: "fail",
      blocker_count: 1,
      blockers_root: digest,
      rule_counts: [{ rule: "missing_conditions", count: 1 }],
    },
    allowed_paths: ["result.json"],
    budgets: {
      max_research_wall_time_ms: 10_000,
      max_research_processes: 4,
      max_research_output_bytes: 1_048_576,
      max_prompt_bytes: 1_048_576,
      max_artifact_bytes: 1_048_576,
      max_attempts: 1,
      max_observed_tokens: 10_000,
    },
    worker: {
      kind: "codex_tools_container",
      image: digest,
      codex_version: "codex-cli 0.144.5",
      codex_sha256: digest,
      output_schema_sha256: digest,
      model: "gpt-test",
      network: "provider",
      tools: ["shell", "apply_patch"],
      memory_mb: 1024,
      cpu_count: 1,
      pids_limit: 64,
    },
    verifier: {
      argv: ["capsule/verifier", "{artifact:result.json}"],
      executable_sha256: digest,
      cwd: ".",
      timeout_ms: 1000,
      max_output_bytes: 4096,
      network: "deny",
      writes: "deny",
      capsule_path: "capsule",
      capsule_sha256: digest,
      image: digest,
    },
    scientific_chain: {
      predicted_observable: "The exact verifier exits zero.",
      performed_test: "capsule/verifier result.json",
    },
    landing: { expected_routes: ["defer"], max_accepted_delta: 0 },
  };
}

async function workspace() {
  const root = await mkdtemp(path.join(os.tmpdir(), "canopus-tools-"));
  const paths = {
    root,
    input: path.join(root, "input"),
    landing: path.join(root, "landing"),
    work: path.join(root, "work"),
    output: path.join(root, "output"),
    artifacts: path.join(root, "artifacts"),
    home: path.join(root, "home"),
    velaHome: path.join(root, "vela-home"),
    verifierHome: path.join(root, "verifier-home"),
  };
  await Promise.all(Object.values(paths).slice(1).map((entry) => mkdir(entry)));
  return paths;
}

function events(): string {
  return [
    { type: "thread.started", thread_id: "thread-tools" },
    { type: "turn.started" },
    {
      type: "item.completed",
      item: { id: "command-1", type: "command_execution", command: "rg objective packet.json" },
    },
    { type: "item.completed", item: { id: "message-1", type: "agent_message", text: "done" } },
    {
      type: "turn.completed",
      usage: {
        input_tokens: 100,
        cached_input_tokens: 0,
        output_tokens: 20,
        reasoning_output_tokens: 10,
      },
    },
  ].map((entry) => JSON.stringify(entry)).join("\n") + "\n";
}

test("tool worker argv exposes only bounded mounts and drops container privilege", () => {
  const active = mission();
  const argv = containerWorkerArgv({
    dockerBinary: "/usr/bin/docker",
    mission: active,
    source: "/bounded/source",
    credentials: "/bounded/runtime-auth",
    outputSchema: "/bounded/schema.json",
    output: "/bounded/output",
    canary: "/bounded/canary",
    uid: 501,
    gid: 20,
  });
  assert.ok(argv.includes("--read-only"));
  assert.ok(argv.includes("--interactive"));
  assert.ok(argv.includes("--cap-drop=ALL"));
  assert.ok(argv.includes("--security-opt=no-new-privileges"));
  assert.ok(argv.includes("--network=bridge"));
  assert.ok(argv.some((item) => item === "type=bind,src=/bounded/source,dst=/source,readonly"));
  assert.ok(argv.some((item) => item === "type=bind,src=/bounded/output,dst=/out"));
  assert.equal(argv.some((item) => item.includes("docker.sock")), false);
  assert.equal(argv.some((item) => item.includes("/.vela/keys")), false);
  assert.equal(argv.some((item) => item === "/Users" || item === "/home"), false);
});

test("tool worker pins image and Codex identity and parses bounded output", async () => {
  const paths = await workspace();
  const authHome = path.join(paths.root, "source-auth");
  await mkdir(authHome);
  await writeFile(path.join(authHome, "auth.json"), "{}\n", { mode: 0o600 });
  const outputSchema = path.join(paths.root, "engine-output.json");
  await writeFile(outputSchema, "{}\n");
  const calls: string[][] = [];
  const runner: CommandRunner = async (options) => {
    calls.push([...options.argv]);
    if (options.argv[1] === "image") {
      return {
        argv: [...options.argv], exitCode: 0, signal: null,
        stdout: Buffer.from(`${digest}\n`), stderr: Buffer.alloc(0), durationMs: 1,
      };
    }
    const outputMount = options.argv.find((item) => item.includes("dst=/out"));
    assert.ok(outputMount);
    const source = /(?:^|,)src=([^,]+),dst=\/out(?:,|$)/u.exec(outputMount)?.[1];
    assert.ok(source);
    await writeFile(path.join(source, "final.json"), JSON.stringify(draft));
    return {
      argv: [...options.argv], exitCode: 0, signal: null,
      stdout: Buffer.from(events()), stderr: Buffer.alloc(0), durationMs: 2,
    };
  };
  const active = mission();
  active.worker.output_schema_sha256 = sha256Bytes(await readFile(outputSchema));
  const result = await new CodexToolsContainerEngine({
    dockerBinary: "/usr/bin/docker",
    authHome,
    outputSchema,
    runner,
  }).run({
    mission: active,
    briefing: { ok: true, command: "work" },
    paths,
    budget: new BudgetTracker(active.budgets),
  });
  assert.deepEqual(result.draft, draft);
  assert.deepEqual(result.actionTypes, ["command_execution"]);
  assert.equal(result.engine.binary_sha256, digest);
  const run = calls[1] ?? [];
  assert.ok(run.includes(digest));
  assert.equal(run.some((item) => item.includes(authHome)), false);
  assert.ok(run.some((item) => item.includes("codex-runtime")));
});
