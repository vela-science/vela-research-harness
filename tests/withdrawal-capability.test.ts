import assert from "node:assert/strict";
import { createPrivateKey, createPublicKey, sign } from "node:crypto";
import { chmod, mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  consumeWithdrawalCapability,
  installWithdrawalCapabilitySecret,
  loadWithdrawalCapability,
  retainWithdrawalCapability,
  withdrawalCapabilityStatus,
} from "../src/capability/withdrawal.js";
import type { MissionV1 } from "../src/contracts/mission.js";
import {
  canonicalJcs,
  canonicalJson,
  protocolDigest,
  sha256Bytes,
} from "../src/util/canonical.js";
import type { LandResult } from "../src/vela/types.js";

const digest = `sha256:${"a".repeat(64)}`;

function identityBinding(actor: string, seedHex: string): Record<string, unknown> {
  const privateDer = Buffer.concat([
    Buffer.from("302e020100300506032b657004220420", "hex"),
    Buffer.from(seedHex, "hex"),
  ]);
  const privateKey = createPrivateKey({ key: privateDer, format: "der", type: "pkcs8" });
  const publicKey = Buffer.from(
    createPublicKey(privateKey).export({ format: "der", type: "spki" }),
  ).subarray(-32).toString("hex");
  privateDer.fill(0);
  const preimage = {
    schema: "vela.identity_binding.v0.1",
    binding_id: "",
    actor_id: actor,
    actor_class: "agent",
    public_key_hex: publicKey,
    created_at: "2026-07-17T00:00:00Z",
    signature: "",
  };
  const bytes = Buffer.from(canonicalJcs(preimage));
  return {
    ...preimage,
    binding_id: `vib_${sha256Bytes(bytes).slice(7, 23)}`,
    signature: sign(null, bytes, privateKey).toString("hex"),
  };
}

function mission(): MissionV1 {
  return {
    schema: "canopus.mission.v1",
    id: "mission_withdrawal",
    target: "attack-1",
    vela_version: "0.901.0",
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
    strict_baseline: { status: "pass", blocker_count: 0, blockers_root: digest, rule_counts: [] },
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
      platform: "darwin",
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

test("withdrawal capability retains only an exact proposal-scoped producer key", async (context) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "canopus-withdrawal-capability-"));
  context.after(async () => await rm(root, { recursive: true, force: true }));
  const landing = path.join(root, "landing");
  const velaHome = path.join(root, "vela-home");
  const storeRoot = path.join(root, "capabilities");
  const proposalId = "vpr_0123456789abcdef";
  const actor = "agent:canopus-test";
  const seed = "3".repeat(64);
  const binding = identityBinding(actor, seed);
  const receipt = { environment: { "vela:producer_context": { identity_binding: binding } } };
  const receiptRoot = protocolDigest(receipt);
  const receiptRelative = `records/receipts/sha256/${receiptRoot.slice(7)}.json`;
  const proposal = {
    id: proposalId,
    status: "pending_review",
    actor: { id: actor, type: "agent" },
    payload: { vela_submission: { receipt_root: receiptRoot, receipt_path: receiptRelative } },
  };
  await Promise.all([
    mkdir(path.join(landing, ".vela", "proposals"), { recursive: true }),
    mkdir(path.join(landing, "records", "receipts", "sha256"), { recursive: true }),
    mkdir(path.join(velaHome, ".vela", "agents", "agent-canopus-test"), { recursive: true }),
  ]);
  await writeFile(path.join(landing, ".vela", "proposals", `${proposalId}.json`), canonicalJson(proposal));
  await writeFile(path.join(landing, receiptRelative), canonicalJson(receipt));
  await writeFile(
    path.join(velaHome, ".vela", "agents", "agent-canopus-test", "private.key"),
    `${seed}\n`,
    { mode: 0o600 },
  );
  const land: LandResult = {
    operationId: `vop_${"4".repeat(64)}`,
    receiptRoot,
    recordId: "vrc_test",
    proposalId,
    findingId: "vf_test",
    route: "defer",
    originalRoute: null,
    rawRoute: "deferred",
    detail: "pending review",
    acceptedEventCountBefore: 0,
    acceptedEventCountAfter: 0,
    acceptedEventDelta: 0,
    publication: { state: "committed_local" },
    raw: {},
  };
  const retained = await retainWithdrawalCapability({
    velaHome,
    landingRepo: landing,
    mission: mission(),
    landing: land,
    finalRoots: mission().roots,
    velaBinary: "/usr/local/bin/vela",
    storeRoot,
  });
  assert.equal(retained.manifest.proposal_root, protocolDigest(proposal));
  assert.equal(retained.manifest.receipt_root, receiptRoot);
  assert.equal(retained.manifest.identity_binding_id, binding.binding_id);
  assert.equal((await stat(path.join(retained.directory, "private.key"))).mode & 0o777, 0o600);
  assert.equal((await readFile(path.join(retained.directory, "private.key"), "utf8")).trim(), seed);
  assert.equal((await withdrawalCapabilityStatus(proposalId, storeRoot)).available, true);

  const manifestPath = path.join(retained.directory, "manifest.json");
  await chmod(manifestPath, 0o644);
  await assert.rejects(loadWithdrawalCapability(proposalId, storeRoot), /mode 0600/u);
  await chmod(manifestPath, 0o600);
  const manifestWithUnknownField = { ...retained.manifest, authority: "forged" };
  await writeFile(manifestPath, canonicalJson(manifestWithUnknownField));
  await assert.rejects(loadWithdrawalCapability(proposalId, storeRoot), /authority is not allowed/u);
  await writeFile(manifestPath, canonicalJson(retained.manifest));

  const secretPath = path.join(retained.directory, "private.key");
  await writeFile(secretPath, `${"4".repeat(64)}\n`);
  await assert.rejects(
    installWithdrawalCapabilitySecret(proposalId, path.join(root, "installed.key"), storeRoot),
    /does not match the capability public key/u,
  );
  await writeFile(secretPath, `${seed}\n`);

  const consumed = await consumeWithdrawalCapability(proposalId, "withdrawn", storeRoot);
  assert.equal(consumed.state, "consumed");
  const loaded = await loadWithdrawalCapability(proposalId, storeRoot);
  assert.equal(loaded.secret_available, false);
  assert.equal((await withdrawalCapabilityStatus(proposalId, storeRoot)).available, false);
});

test("withdrawal capability refuses a Receipt binding without proof of possession", async (context) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "canopus-withdrawal-binding-"));
  context.after(async () => await rm(root, { recursive: true, force: true }));
  const landing = path.join(root, "landing");
  const velaHome = path.join(root, "vela-home");
  const proposalId = "vpr_fedcba9876543210";
  const actor = "agent:canopus-test";
  const seed = "4".repeat(64);
  const binding = identityBinding(actor, seed);
  binding.signature = "0".repeat(128);
  const receipt = { environment: { "vela:producer_context": { identity_binding: binding } } };
  const receiptRoot = protocolDigest(receipt);
  const receiptRelative = `records/receipts/sha256/${receiptRoot.slice(7)}.json`;
  const proposal = {
    id: proposalId,
    status: "pending_review",
    actor: { id: actor, type: "agent" },
    payload: { vela_submission: { receipt_root: receiptRoot, receipt_path: receiptRelative } },
  };
  await Promise.all([
    mkdir(path.join(landing, ".vela", "proposals"), { recursive: true }),
    mkdir(path.join(landing, "records", "receipts", "sha256"), { recursive: true }),
    mkdir(path.join(velaHome, ".vela", "agents", "agent-canopus-test"), { recursive: true }),
  ]);
  await writeFile(path.join(landing, ".vela", "proposals", `${proposalId}.json`), canonicalJson(proposal));
  await writeFile(path.join(landing, receiptRelative), canonicalJson(receipt));
  await writeFile(
    path.join(velaHome, ".vela", "agents", "agent-canopus-test", "private.key"),
    `${seed}\n`,
    { mode: 0o600 },
  );
  const landingResult: LandResult = {
    operationId: `vop_${"5".repeat(64)}`,
    receiptRoot,
    recordId: "vrc_test",
    proposalId,
    findingId: "vf_test",
    route: "defer",
    originalRoute: null,
    rawRoute: "deferred",
    detail: "pending review",
    acceptedEventCountBefore: 0,
    acceptedEventCountAfter: 0,
    acceptedEventDelta: 0,
    publication: { state: "committed_local" },
    raw: {},
  };
  await assert.rejects(
    retainWithdrawalCapability({
      velaHome,
      landingRepo: landing,
      mission: mission(),
      landing: landingResult,
      finalRoots: mission().roots,
      velaBinary: "/usr/local/bin/vela",
      storeRoot: path.join(root, "capabilities"),
    }),
    /proof of possession/u,
  );
});
