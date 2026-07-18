import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { BudgetTracker } from "../src/budget/enforce.js";
import type { MissionV1 } from "../src/contracts/mission.js";
import { CodexToolsNativeEngine } from "../src/engines/codex-tools-native.js";
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
  if (process.platform !== "darwin" && process.platform !== "linux") {
    throw new Error(`native worker contract fixture does not support ${process.platform}`);
  }
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
      kind: "codex_tools_native",
      platform: process.platform,
      codex_version: "codex-cli 0.144.5",
      codex_sha256: digest,
      permission_profile_path: "contract/native-worker.config.toml",
      permission_profile_sha256: digest,
      workspace: "target_packet_only",
      output_schema_sha256: digest,
      model: "gpt-test",
      network: "provider_only",
      tools: ["shell", "apply_patch"],
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

test("native tool worker pins Codex and permission-profile identities", async () => {
  const paths = await workspace();
  await writeFile(path.join(paths.input, "packet.json"), "{}\n");
  await mkdir(path.join(paths.landing, ".git"));
  await writeFile(path.join(paths.landing, ".git", "HEAD"), "ref: refs/heads/main\n");
  const authHome = path.join(paths.root, "source-auth");
  await mkdir(authHome);
  await writeFile(path.join(authHome, "auth.json"), JSON.stringify({
    OPENAI_API_KEY: null,
    tokens: { access_token: "access-secret-000000", id_token: "id-secret-000000000", refresh_token: "refresh-secret-0000" },
  }), { mode: 0o600 });
  const binary = path.join(paths.root, "codex");
  await writeFile(binary, "native-codex\n", { mode: 0o700 });
  const binaryLink = path.join(paths.root, "codex-link");
  await symlink(binary, binaryLink);
  const outputSchema = path.join(paths.root, "engine-output.json");
  await writeFile(outputSchema, "{}\n");
  const permissionProfile = path.join(paths.root, "native-worker.config.toml");
  await writeFile(permissionProfile, [
    'default_permissions = "canopus-worker"',
    '[permissions.canopus-worker.filesystem]',
    '":minimal" = "read"',
    '[permissions.canopus-worker.filesystem.":workspace_roots"]',
    '"." = "write"',
    '[permissions.canopus-worker.network]',
    'enabled = false',
  ].join("\n") + "\n");
  const calls: string[][] = [];
  const runner: CommandRunner = async (options) => {
    calls.push([...options.argv]);
    if (options.argv[1] === "--version") {
      return {
        argv: [...options.argv], exitCode: 0, signal: null,
        stdout: Buffer.from("codex-cli 0.144.5\n"), stderr: Buffer.alloc(0), durationMs: 1,
      };
    }
    if (options.argv[1] === "sandbox") {
      return {
        argv: [...options.argv], exitCode: 0, signal: null,
        stdout: Buffer.from(
          "true false false false false false false false false false\n",
        ),
        stderr: Buffer.alloc(0), durationMs: 1,
      };
    }
    assert.equal(options.argv[1], "exec");
    const outputIndex = options.argv.indexOf("--output-last-message");
    const finalPath = options.argv[outputIndex + 1];
    assert.ok(finalPath);
    assert.equal((await readFile(path.join(options.cwd, "packet.json"), "utf8")), "{}\n");
    const prompt = String(options.stdin);
    assert.match(prompt, /packet\.json/u);
    assert.doesNotMatch(prompt, /WORK_BRIEFING_MUST_NOT_ENTER_MODEL_CONTEXT/u);
    const runtimeConfig = await readFile(path.join(options.env.CODEX_HOME ?? "", "config.toml"));
    assert.deepEqual(runtimeConfig, await readFile(permissionProfile));
    await writeFile(finalPath, JSON.stringify(draft));
    return {
      argv: [...options.argv], exitCode: 0, signal: null,
      stdout: Buffer.from(events()), stderr: Buffer.alloc(0), durationMs: 2,
    };
  };
  const active = mission();
  active.target_packet.sha256 = sha256Bytes(await readFile(path.join(paths.input, "packet.json")));
  active.worker.codex_sha256 = sha256Bytes(await readFile(binary));
  active.worker.output_schema_sha256 = sha256Bytes(await readFile(outputSchema));
  active.worker.permission_profile_sha256 = sha256Bytes(await readFile(permissionProfile));
  const result = await new CodexToolsNativeEngine({
    binary: binaryLink,
    authHome,
    outputSchema,
    permissionProfile,
    runner,
  }).run({
    mission: active,
    briefing: { sentinel: "WORK_BRIEFING_MUST_NOT_ENTER_MODEL_CONTEXT" },
    paths,
    budget: new BudgetTracker(active.budgets),
  });
  assert.deepEqual(result.draft, draft);
  assert.deepEqual(result.actionTypes, ["command_execution"]);
  assert.equal(result.engine.binary_sha256, active.worker.codex_sha256);
  const preflight = calls[1] ?? [];
  assert.equal(preflight[1], "sandbox");
  assert.ok(preflight.includes(path.join(authHome, "auth.json")));
  assert.ok(preflight.includes(path.join(paths.input, "packet.json")));
  assert.ok(preflight.includes(path.join(paths.landing, ".git", "HEAD")));
  assert.equal(preflight.includes(paths.input), false);
  const run = calls[2] ?? [];
  assert.ok(run.includes("--strict-config"));
  assert.equal(run.includes("--sandbox"), false);
  assert.equal(run.includes("--ignore-user-config"), false);
  assert.equal(run.some((item) => item.includes(authHome)), false);
});
