import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { chmod, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import test from "node:test";

import { BudgetTracker } from "../src/budget/enforce.js";
import type { Mission } from "../src/contracts/mission.js";
import { CodexExecEngine } from "../src/engines/codex-exec.js";
import { parseCodexEvents, summarizeCodexFailure } from "../src/engines/codex-events.js";
import { FakeEngine } from "../src/engines/fake.js";
import type { CandidateDraft } from "../src/engines/engine.js";
import type { CommandRunner } from "../src/util/command.js";
import { sha256Bytes } from "../src/util/canonical.js";

const digest = `sha256:${"a".repeat(64)}`;
const exec = promisify(execFile);
const draft: CandidateDraft = {
  schema: "canopus.engine-output.v0",
  status: "success",
  claim: "The bounded artifact was produced.",
  artifacts: [
    { path: "result.json", kind: "witness", encoding: "utf8", content: "{\"value\":42}\n" },
  ],
  observations: ["One result was found."],
  caveats: ["Acceptance remains outside this run."],
};

function mission(): Mission {
  return {
    schema: "canopus.mission.v0",
    id: "mission_engine",
    target: "target-1",
    vela_version: "0.800.17",
    vela_sha256: digest,
    frontier: "frontier",
    actor: "agent:canopus-test",
    role: "producer",
    claim_type: "computational",
    replayability: "exact",
    objective: "Produce one result.",
    completion_condition: "A frozen verifier passes.",
    roots: {
      git_commit: "b".repeat(40),
      git_tree: "c".repeat(40),
      vela_event_log: digest,
      vela_snapshot: digest,
    },
    allowed_paths: ["result.json"],
    budgets: {
      max_research_wall_time_ms: 10_000,
      max_research_processes: 4,
      max_research_output_bytes: 1_048_576,
      max_prompt_bytes: 1_048_576,
      max_artifact_bytes: 1_048_576,
      max_attempts: 2,
      max_observed_tokens: 10_000,
    },
    verifier: {
      argv: ["frontier/verifier", "{artifact:result.json}"],
      executable_sha256: digest,
      cwd: "frontier",
      timeout_ms: 1000,
      max_output_bytes: 4096,
      network: "deny",
      writes: "deny",
    },
    scientific_chain: {
      predicted_observable: "The frozen result passes the declared verifier.",
      performed_test: "python3 frozen result",
    },
    landing: { expected_routes: ["defer"], max_accepted_delta: 0 },
  };
}

async function paths() {
  const root = await mkdtemp(path.join(os.tmpdir(), "canopus-engine-"));
  const value = {
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
  await Promise.all(Object.values(value).slice(1).map((entry) => mkdir(entry)));
  return value;
}

function events(command?: string): string {
  const stream: Array<Record<string, unknown>> = [
    { type: "thread.started", thread_id: "thread-1" },
    { type: "turn.started" },
    {
      type: "item.completed",
      item: { id: "message-1", type: "agent_message", text: "done" },
    },
    {
      type: "turn.completed",
      usage: {
        input_tokens: 100,
        cached_input_tokens: 50,
        output_tokens: 20,
        reasoning_output_tokens: 10,
      },
    },
  ];
  if (command !== undefined) {
    stream.splice(2, 0, {
      type: "item.completed",
      item: { id: "command-1", type: "command_execution", command },
    });
  }
  return stream.map((event) => JSON.stringify(event)).join("\n") + "\n";
}

test("fake engine obeys the same bounded draft contract", async () => {
  const workspace = await paths();
  const activeMission = mission();
  const result = await new FakeEngine(draft).run({
    mission: activeMission,
    briefing: {},
    paths: workspace,
    budget: new BudgetTracker(activeMission.budgets),
  });
  assert.deepEqual(result.draft, draft);
  assert.equal(result.engine.name, "fake");
});

test("Codex event parser rejects unknown, malformed, and custody actions", () => {
  assert.throws(
    () => parseCodexEvents('{"type":"future.event"}\n'),
    /unknown type/u,
  );
  assert.throws(
    () => parseCodexEvents(events("vela sign")),
    /forbidden external or custody action/u,
  );
  assert.throws(
    () => parseCodexEvents(events("python3 verify.py").replace('"command":"python3 verify.py"', '"type":"command_execution"')),
    /no command text/u,
  );
});

test("Codex failure diagnostics are structured, bounded, and secret-redacted", () => {
  const stream = [
    JSON.stringify({ type: "thread.started", thread_id: "thread-failed" }),
    JSON.stringify({
      type: "turn.failed",
      error: {
        message:
          "Provider rejected api_key=sk-example-secret-123456789 at https://example.test/run?token=private",
      },
    }),
  ].join("\n");
  const diagnostic = summarizeCodexFailure(stream);
  assert.match(diagnostic, /Provider rejected/u);
  assert.match(diagnostic, /redacted/u);
  assert.doesNotMatch(diagnostic, /sk-example/u);
  assert.doesNotMatch(diagnostic, /token=private/u);
  assert.equal(summarizeCodexFailure("not json\n"), "no structured Codex failure event");
  assert.ok(diagnostic.length <= 512);
});

test("Codex engine reports only structured failure diagnostics and output digests", async () => {
  const workspace = await paths();
  await writeFile(path.join(workspace.home, "auth.json"), "{}\n");
  const outputSchema = path.join(workspace.root, "engine-output.schema.json");
  await writeFile(outputSchema, "{}\n");
  const runner: CommandRunner = async (options) => {
    if (options.argv[1] === "--version") {
      return {
        argv: [...options.argv], exitCode: 0, signal: null,
        stdout: Buffer.from("codex-cli 0.139.0\n"), stderr: Buffer.alloc(0), durationMs: 1,
      };
    }
    return {
      argv: [...options.argv], exitCode: 1, signal: null,
      stdout: Buffer.from('{"type":"turn.failed","error":{"message":"quota unavailable"}}\n'),
      stderr: Buffer.from("Bearer should-never-appear"), durationMs: 1,
    };
  };
  await assert.rejects(
    new CodexExecEngine({
      binary: process.execPath,
      expectedSha256: sha256Bytes(await readFile(process.execPath)),
      expectedVersion: "codex-cli 0.139.0",
      model: "test",
      authHome: workspace.home,
      outputSchema,
      runner,
    }).run({
      mission: mission(),
      briefing: {},
      paths: workspace,
      budget: new BudgetTracker(mission().budgets),
    }),
    (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.match(error.message, /quota unavailable/u);
      assert.match(error.message, /stdout_sha256=sha256:/u);
      assert.match(error.message, /stderr_sha256=sha256:/u);
      assert.doesNotMatch(error.message, /should-never-appear/u);
      return true;
    },
  );
});

test("Codex engine uses ephemeral isolated config and parses the final schema", async () => {
  const workspace = await paths();
  await writeFile(path.join(workspace.home, "auth.json"), "{}\n");
  const outputSchema = path.join(workspace.root, "engine-output.schema.json");
  await writeFile(outputSchema, "{}\n");
  const activeMission = mission();
  const calls: Array<{ argv: string[]; env: NodeJS.ProcessEnv; stdin?: Uint8Array | string }> = [];
  const runner: CommandRunner = async (options) => {
    calls.push({ argv: [...options.argv], env: options.env, ...(options.stdin === undefined ? {} : { stdin: options.stdin }) });
    if (options.argv[1] === "--version") {
      return {
        argv: [...options.argv], exitCode: 0, signal: null,
        stdout: Buffer.from("codex-cli 0.139.0\n"), stderr: Buffer.alloc(0), durationMs: 1,
      };
    }
    const outputIndex = options.argv.indexOf("--output-last-message");
    const finalPath = options.argv[outputIndex + 1];
    assert.equal(typeof finalPath, "string");
    await writeFile(finalPath as string, JSON.stringify(draft));
    return {
      argv: [...options.argv], exitCode: 0, signal: null,
      stdout: Buffer.from(events()), stderr: Buffer.alloc(0), durationMs: 2,
    };
  };
  const engine = new CodexExecEngine({
    binary: process.execPath,
    expectedSha256: sha256Bytes(await readFile(process.execPath)),
    expectedVersion: "codex-cli 0.139.0",
    model: "test-model",
    authHome: workspace.home,
    outputSchema,
    runner,
  });
  const budget = new BudgetTracker(activeMission.budgets);
  const result = await engine.run({
    mission: activeMission,
    briefing: { ok: true, command: "work" },
    paths: workspace,
    budget,
  });
  assert.deepEqual(result.draft, draft);
  const command = calls[1];
  assert.ok(command?.argv.includes("--ephemeral"));
  assert.ok(command?.argv.includes("--ignore-user-config"));
  assert.ok(command?.argv.includes("--ignore-rules"));
  assert.ok(command?.argv.includes("read-only"));
  assert.ok(command?.argv.includes("shell_tool"));
  assert.equal(command?.argv.includes("--add-dir"), false);
  assert.equal(command?.argv[0], "/usr/bin/sandbox-exec");
  assert.match(command?.argv[2] ?? "", /deny default/u);
  assert.match(command?.argv[2] ?? "", /allow process-fork/u);
  assert.match(command?.argv[2] ?? "", /\/etc\/codex\/requirements\.toml/u);
  assert.match(command?.argv[2] ?? "", /com\.apple\.SystemConfiguration\.configd/u);
  assert.match(command?.argv[2] ?? "", /com\.apple\.bsd\.dirhelper/u);
  assert.match(command?.argv[2] ?? "", /com\.apple\.system\.notification_center/u);
  assert.match(command?.argv[2] ?? "", /com\.apple\.SystemConfiguration\.DNSConfiguration/u);
  assert.match(command?.argv[2] ?? "", /com\.apple\.networkd/u);
  assert.match(command?.argv[2] ?? "", /socket-domain AF_SYSTEM/u);
  assert.match(command?.argv[2] ?? "", /socket-domain AF_UNIX/u);
  assert.match(command?.argv[2] ?? "", /\/private\/var\/run\/mDNSResponder/u);
  assert.match(command?.argv[2] ?? "", /apple\.shm\.notification_center/u);
  assert.equal(
    (command?.argv[2] ?? "").includes('(control-name "com.apple.netsrc")'),
    true,
  );
  assert.match(command?.argv[2] ?? "", /remote tcp/u);
  assert.match(command?.argv[2] ?? "", /remote udp/u);
  assert.match(command?.argv[2] ?? "", /\/private\/var\/run\/resolv\.conf/u);
  assert.match(command?.argv[2] ?? "", /net\.routetable/u);
  assert.match(command?.argv[2] ?? "", /kern\.version/u);
  assert.match(command?.argv[2] ?? "", /hw\.machine/u);
  assert.equal((command?.argv[2] ?? "").includes("(allow network-outbound)"), false);
  assert.equal((command?.argv[2] ?? "").includes("remote unix-socket"), false);
  assert.match(command?.argv[2] ?? "", /\/private\/etc\/hosts/u);
  assert.match(command?.argv[2] ?? "", /com\.apple\.networkd\.plist/u);
  assert.equal((command?.argv[2] ?? "").includes('(subpath "/Library/Preferences")'), false);
  assert.equal((command?.argv[2] ?? "").includes('(subpath "/private/etc")'), false);
  assert.doesNotMatch(command?.argv[2] ?? "", /\/Users\/williamblair/u);
  const runtimeCodexHome = path.join(workspace.home, "codex-runtime");
  assert.equal(command?.env.CODEX_HOME, runtimeCodexHome);
  assert.equal(command?.env.OPENAI_API_KEY, undefined);
  assert.equal(command?.env.SSL_CERT_FILE, "/etc/ssl/cert.pem");
  assert.match(String(command?.stdin), /tool-free synthesis stage/u);
  assert.equal(budget.snapshot().research_processes, 2);
  await assert.rejects(readFile(runtimeCodexHome), /ENOENT/u);
});

test("real outer Codex sandbox permits only registered inputs and denies a host secret", async () => {
  if (process.platform !== "darwin") return;
  const workspace = await paths();
  const authHome = path.join(workspace.root, "codex-auth");
  await mkdir(authHome);
  const authFile = path.join(authHome, "auth.json");
  const isolatedAuthFile = path.join(workspace.home, "codex-runtime", "auth.json");
  const isolatedInstallationId = path.join(
    workspace.home,
    "codex-runtime",
    "installation_id",
  );
  const outputSchema = path.join(workspace.root, "engine-output.schema.json");
  await writeFile(authFile, "{\"token\":\"fixture\"}\n");
  await writeFile(outputSchema, "{}\n");
  const secretRoot = await mkdtemp(path.join(os.tmpdir(), "canopus-host-secret-"));
  const secret = path.join(secretRoot, "private.txt");
  await writeFile(secret, "must remain unreadable\n");
  const binary = path.join(workspace.root, "fake-codex");
  const source = path.join(workspace.root, "fake-codex.c");
  const finalJson = JSON.stringify(draft);
  const c = (value: string): string => JSON.stringify(value);
  await writeFile(source, `
#include <pthread.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/stat.h>
#include <sys/sysctl.h>
#include <sys/types.h>

void *thread_probe(void *unused) { return unused; }

int readable(const char *path) {
  FILE *file = fopen(path, "r");
  if (!file) return 0;
  int value = fgetc(file); fclose(file); return value != EOF;
}

int main(int argc, char **argv) {
  unsigned long stack_top = 0;
  size_t stack_top_size = sizeof(stack_top);
  if (sysctlbyname("hw.pagesize_compat", &stack_top, &stack_top_size, NULL, 0) != 0) return 67;
  pthread_t thread;
  if (pthread_create(&thread, NULL, thread_probe, NULL) != 0) return 69;
  if (pthread_join(thread, NULL) != 0) return 68;
  if (argc == 2 && strcmp(argv[1], "--version") == 0) {
    if (getenv("CODEX_HOME") != NULL) return 70;
    puts("codex-cli 0.139.0"); return 0;
  }
  const char *final_path = NULL;
  const char *schema_path = NULL;
  for (int i = 1; i + 1 < argc; i++) {
    if (strcmp(argv[i], "--output-last-message") == 0) final_path = argv[i + 1];
    if (strcmp(argv[i], "--output-schema") == 0) schema_path = argv[i + 1];
  }
  if (!final_path || !schema_path) return 71;
  if (!readable(${c(isolatedAuthFile)}) || !readable(schema_path)) return 72;
  struct stat metadata;
  if (stat(${c(authFile)}, &metadata) == 0 || readable(${c(authFile)})) return 73;
  if (stat(${c(secret)}, &metadata) == 0 || readable(${c(secret)})) return 74;
  FILE *installation = fopen(${c(isolatedInstallationId)}, "w+");
  if (!installation) return 75;
  fputs("11111111-1111-4111-8111-111111111111", installation); fclose(installation);
  FILE *output = fopen(final_path, "w");
  if (!output) return 76;
  fputs(${c(finalJson)}, output); fclose(output);
  puts("{\\\"type\\\":\\\"thread.started\\\",\\\"thread_id\\\":\\\"thread-1\\\"}");
  puts("{\\\"type\\\":\\\"turn.started\\\"}");
  puts("{\\\"type\\\":\\\"item.completed\\\",\\\"item\\\":{\\\"id\\\":\\\"message-1\\\",\\\"type\\\":\\\"agent_message\\\",\\\"text\\\":\\\"done\\\"}}");
  puts("{\\\"type\\\":\\\"turn.completed\\\",\\\"usage\\\":{\\\"input_tokens\\\":1,\\\"cached_input_tokens\\\":0,\\\"output_tokens\\\":1,\\\"reasoning_output_tokens\\\":0}}");
  return 0;
}
`);
  await exec("/usr/bin/clang", ["-Os", "-o", binary, source]);
  await chmod(binary, 0o555);
  const activeMission = mission();
  const result = await new CodexExecEngine({
    binary,
    expectedSha256: sha256Bytes(await readFile(binary)),
    expectedVersion: "codex-cli 0.139.0",
    model: "test-model",
    authHome,
    outputSchema,
  }).run({
    mission: activeMission,
    briefing: { exact: true },
    paths: workspace,
    budget: new BudgetTracker(activeMission.budgets),
  });
  assert.deepEqual(result.draft, draft);
  assert.equal(result.engine.binary_sha256, sha256Bytes(await readFile(binary)));
  assert.equal(await readFile(secret, "utf8"), "must remain unreadable\n");
  assert.equal(await readFile(authFile, "utf8"), "{\"token\":\"fixture\"}\n");
  await assert.rejects(readFile(path.dirname(isolatedAuthFile)), /ENOENT/u);
});

test("Codex engine rejects an artifact outside mission paths", async () => {
  const workspace = await paths();
  await writeFile(path.join(workspace.home, "auth.json"), "{}\n");
  const outputSchema = path.join(workspace.root, "engine-output.schema.json");
  await writeFile(outputSchema, "{}\n");
  const activeMission = mission();
  const bad = {
    ...draft,
    artifacts: [
      { path: "human-keys.json", kind: "data", encoding: "utf8" as const, content: "no" },
    ],
  };
  const runner: CommandRunner = async (options) => {
    if (options.argv[1] === "--version") {
      return { argv: [...options.argv], exitCode: 0, signal: null, stdout: Buffer.from("codex-cli 0.139.0\n"), stderr: Buffer.alloc(0), durationMs: 1 };
    }
    const outputIndex = options.argv.indexOf("--output-last-message");
    await writeFile(options.argv[outputIndex + 1] as string, JSON.stringify(bad));
    return { argv: [...options.argv], exitCode: 0, signal: null, stdout: Buffer.from(events()), stderr: Buffer.alloc(0), durationMs: 1 };
  };
  await assert.rejects(
    new CodexExecEngine({
      binary: process.execPath,
      expectedSha256: sha256Bytes(await readFile(process.execPath)),
      expectedVersion: "codex-cli 0.139.0", model: "test",
      authHome: workspace.home, outputSchema, runner,
    }).run({
      mission: activeMission,
      briefing: {},
      paths: workspace,
      budget: new BudgetTracker(activeMission.budgets),
    }),
    /non-allowlisted artifact/u,
  );
});
