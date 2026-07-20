import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import type { WithdrawalCapabilityManifest } from "../src/capability/withdrawal.js";
import { canonicalJson, sha256Bytes } from "../src/util/canonical.js";
import { withdrawProduct } from "../src/product/withdraw.js";
import type { RunRecord } from "../src/projection/run.js";
import type { CommandRunner } from "../src/util/command.js";

const digest = `sha256:${"a".repeat(64)}`;
const roots = {
  git_commit: "b".repeat(40),
  git_tree: "c".repeat(40),
  vela_event_log: digest,
  vela_snapshot: digest,
};

test("product withdraw consumes the producer secret after observing a human decision", async (context) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "canopus-product-withdraw-"));
  context.after(async () => await rm(root, { recursive: true, force: true }));
  const source = path.join(root, "source");
  const runFile = path.join(root, "run.json");
  const storeRoot = path.join(root, "capabilities");
  const proposalId = "vpr_0123456789abcdef";
  const capabilityDir = path.join(storeRoot, proposalId);
  const velaBinary = path.join(root, "vela");
  const velaBytes = Buffer.from("headless vela fixture\n");
  await Promise.all([
    mkdir(path.join(source, ".vela", "proposals"), { recursive: true }),
    mkdir(path.join(source, ".vela", "events"), { recursive: true }),
    mkdir(storeRoot, { recursive: true, mode: 0o700 }),
    mkdir(capabilityDir, { recursive: true, mode: 0o700 }),
  ]);
  await writeFile(velaBinary, velaBytes, { mode: 0o700 });
  await writeFile(
    path.join(source, ".vela", "proposals", `${proposalId}.json`),
    canonicalJson({ id: proposalId, status: "rejected" }),
  );
  const manifest: WithdrawalCapabilityManifest = {
    schema: "canopus.withdrawal-capability.v1",
    state: "available",
    proposal_id: proposalId,
    proposal_root: digest,
    receipt_root: digest,
    identity_binding_id: "vib_0123456789abcdef",
    actor: "agent:canopus-test",
    public_key: "1".repeat(64),
    frontier: ".",
    final_roots: roots,
    strict_baseline: {
      status: "pass",
      blocker_count: 0,
      blockers_root: sha256Bytes("[]"),
      rule_counts: [],
    },
    vela: { binary: velaBinary, version: "0.910.0", sha256: sha256Bytes(velaBytes) },
    created_at: "2026-07-17T00:00:00Z",
  };
  await writeFile(path.join(capabilityDir, "manifest.json"), canonicalJson(manifest), { mode: 0o600 });
  await writeFile(path.join(capabilityDir, "private.key"), `${"2".repeat(64)}\n`, { mode: 0o600 });
  const record: RunRecord = {
    schema: "canopus.run.v0",
    run_id: "run_12345678",
    status: "completed",
    authority: "non_authoritative",
    external_gate_credit: false,
    mission: { id: "mission_test", target: "target-1", digest, starting_roots: roots },
    candidate: {
      digest,
      status: "success",
      claim: "Bounded result.",
      caveats: ["Pending."],
      artifacts: [{ path: "result", kind: "witness", digest, bytes: 1 }],
    },
    verifier: {
      status: "passed",
      sandbox: "macos_sandbox",
      record: {
        argv: ["verify"],
        executable_digest: digest,
        exit_code: 0,
        stdout_digest: digest,
        stderr_digest: digest,
        duration_ms: 1,
      },
    },
    landing: {
      operation_id: "op",
      receipt_root: digest,
      proposal_id: proposalId,
      route: "defer",
      original_route: null,
      accepted_event_delta: 0,
      publication_state: "committed_local",
    },
    final_roots: roots,
    reproduction: {
      matched: true,
      roots,
      verifier_status: "passed",
      stdout_digest: digest,
      stderr_digest: digest,
    },
    budget: {
      research_elapsed_ms: 1,
      research_processes: 1,
      research_output_bytes: 1,
      prompt_bytes: 1,
      artifact_bytes: 1,
      attempts: 1,
      observed_tokens: 1,
    },
  };
  await writeFile(runFile, canonicalJson(record));
  const check = {
    ok: true,
    summary: { strict: true, status: "pass", errors: 0, invalid_findings: 0 },
    checks: [{ id: "signals", status: "pass", failed: 0, blockers: [] }],
    state_integrity: {
      replay: {
        event_log_hash: roots.vela_event_log,
        current_hash: roots.vela_snapshot,
        replayed_hash: roots.vela_snapshot,
        source_hash: roots.vela_snapshot,
      },
    },
  };
  let currentCheck: Record<string, unknown> = check;
  const runner: CommandRunner = async ({ argv }) => {
    const result = (stdout: Buffer, exitCode = 0) => ({
      argv: [...argv],
      exitCode,
      signal: null,
      stdout,
      stderr: Buffer.alloc(0),
      durationMs: 1,
    });
    if (argv[0] === "git" && argv[1] === "rev-parse") {
      return result(Buffer.from(`${argv.at(-1) === "HEAD^{tree}" ? roots.git_tree : roots.git_commit}\n`));
    }
    if (argv[0] === "git" && argv[1] === "status") {
      return result(Buffer.alloc(0));
    }
    if (argv[0] === velaBinary && argv[1] === "--version") {
      return result(Buffer.from("vela 0.910.0\n"));
    }
    if (argv[0] === velaBinary && argv[1] === "check") {
      return result(
        Buffer.from(JSON.stringify(currentCheck)),
        currentCheck.ok === false ? 1 : 0,
      );
    }
    throw new Error(`unexpected fixture command: ${argv.join(" ")}`);
  };
  await assert.rejects(
    withdrawProduct({ frontier: source, runFile, reason: "superseded", storeRoot, runner }),
    /not backed by exactly one matching signed event/u,
  );
  assert.equal((await stat(path.join(capabilityDir, "private.key"))).isFile(), true);
  const eventId = "vev_0123456789abcdef";
  await writeFile(
    path.join(source, ".vela", "events", `${eventId}.json`),
    canonicalJson({
      schema: "vela.event.v0.1",
      id: eventId,
      kind: "review.rejected",
      target: { type: "proposal", id: proposalId },
      actor: { id: "reviewer:test", type: "human" },
      payload: { proposal_id: proposalId, proposal_kind: "finding.add", verdict: "rejected" },
      signature: `v1:${"3".repeat(128)}`,
    }),
  );
  currentCheck = {
    ...check,
    ok: false,
    summary: { strict: true, status: "fail", errors: 0, invalid_findings: 0 },
    checks: [{
      id: "signals",
      status: "fail",
      failed: 1,
      blockers: [{ kind: "invalid_event_signature", event_id: eventId }],
    }],
  };
  await assert.rejects(
    withdrawProduct({ frontier: source, runFile, reason: "superseded", storeRoot, runner }),
    /strict baseline mismatch/u,
  );
  assert.equal((await stat(path.join(capabilityDir, "private.key"))).isFile(), true);
  currentCheck = check;
  const result = await withdrawProduct({
    frontier: source,
    runFile,
    reason: "superseded",
    storeRoot,
    runner,
  });
  assert.equal(result.state, "human_decision_observed");
  assert.equal(result.terminal_event_id, eventId);
  assert.equal(result.frontier_mutated, false);
  await assert.rejects(stat(path.join(capabilityDir, "private.key")), /ENOENT/u);
  const consumed = JSON.parse(await readFile(path.join(capabilityDir, "manifest.json"), "utf8")) as Record<string, unknown>;
  assert.equal(consumed.state, "consumed");
  assert.equal(consumed.consumed_reason, "human_decision_observed");
});
