import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import type { Mission } from "../src/contracts/mission.js";
import { projectPublicRun } from "../src/projection/public-run.js";
import { buildPublicationBundle } from "../src/projection/publication.js";
import type { RunRecord } from "../src/projection/run.js";
import { contentDigest, sha256Bytes } from "../src/util/canonical.js";

const sha = (character: string): string => `sha256:${character.repeat(64)}`;
const commit = (character: string): string => character.repeat(40);

function fixture(): { mission: Mission; record: RunRecord } {
  const mission: Mission = {
    schema: "canopus.mission.v1",
    id: "mission_formal_erdos_505_test_dim_one_gpt56_native1",
    target: "formal:erdos-505-test-dim-one",
    vela_version: "0.910.0",
    vela_sha256: sha("1"),
    frontier: ".",
    actor: "agent:canopus-local",
    role: "producer",
    claim_type: "theoretical",
    replayability: "exact",
    objective: "Produce one bounded proof term.",
    completion_condition: "The frozen Lean verifier passes.",
    roots: {
      git_commit: commit("1"),
      git_tree: commit("2"),
      vela_event_log: sha("2"),
      vela_snapshot: sha("3"),
    },
    allowed_paths: ["artifacts/proof.lean"],
    budgets: {
      max_research_wall_time_ms: 1000,
      max_research_processes: 1,
      max_research_output_bytes: 1024,
      max_prompt_bytes: 1024,
      max_artifact_bytes: 1024,
      max_attempts: 1,
      max_observed_tokens: 1000,
    },
    target_packet: { path: "target-packet.json", sha256: sha("4") },
    profile: { name: "formal-erdos-505-test-dim-one-gpt56", root: sha("5") },
    strict_baseline: { status: "pass", blocker_count: 0, blockers_root: sha("6"), rule_counts: [] },
    worker: {
      kind: "codex_tools_native",
      platform: "darwin",
      codex_version: "codex-cli 0.144.6",
      codex_sha256: sha("7"),
      permission_profile_path: "runtime/config.toml",
      permission_profile_sha256: sha("8"),
      workspace: "target_packet_only",
      output_schema_sha256: sha("9"),
      model: "gpt-5.6-sol",
      network: "provider_only",
      tools: ["shell", "apply_patch"],
    },
    verifier: {
      argv: ["capsule/verifier", "{artifact:artifacts/proof.lean}"],
      executable_sha256: sha("a"),
      cwd: "targets",
      timeout_ms: 1000,
      max_output_bytes: 1024,
      network: "deny",
      writes: "deny",
      capsule_path: "capsule/verifier",
      capsule_sha256: sha("b"),
      image: sha("c"),
    },
    execution_binding: {
      schema: "vela.execution-binding.v1",
      packet_root: sha("4"),
      profile_root: sha("5"),
      verifier_capsule_root: sha("b"),
      result_contract_root: sha("0"),
    },
    scientific_chain: {
      predicted_observable: "Lean accepts the proof term.",
      performed_test: "capsule/verifier artifacts/proof.lean",
    },
    landing: { expected_routes: ["defer"], max_accepted_delta: 0 },
  };
  const record: RunRecord = {
    schema: "canopus.run.v0",
    run_id: "run_public_fixture",
    status: "completed",
    authority: "non_authoritative",
    external_gate_credit: false,
    mission: {
      id: mission.id,
      target: mission.target,
      digest: contentDigest(mission),
      starting_roots: mission.roots,
    },
    candidate: {
      digest: sha("d"),
      status: "success",
      claim: "The frozen one-dimensional category test has a Lean proof term.",
      artifacts: [{ path: "artifacts/proof.lean", kind: "proof-term", digest: sha("e"), bytes: 42 }],
      caveats: ["This does not prove the general Erdős 505 statement."],
    },
    verifier: {
      status: "passed",
      sandbox: "container_network_denied",
      record: {
        argv: ["capsule/verifier", "candidate.lean"],
        executable_digest: sha("a"),
        exit_code: 0,
        stdout_digest: sha("f"),
        stderr_digest: sha("0"),
        duration_ms: 10,
      },
    },
    landing: {
      operation_id: "operation_public_fixture",
      receipt_root: sha("1"),
      proposal_id: "vpr_public_fixture",
      route: "defer",
      original_route: null,
      accepted_event_delta: 0,
      publication_state: "committed_local",
    },
    final_roots: {
      git_commit: commit("3"),
      git_tree: commit("4"),
      vela_event_log: sha("2"),
      vela_snapshot: sha("3"),
    },
    reproduction: {
      matched: true,
      roots: {
        git_commit: commit("3"),
        git_tree: commit("4"),
        vela_event_log: sha("2"),
        vela_snapshot: sha("3"),
      },
      verifier_status: "passed",
      stdout_digest: sha("f"),
      stderr_digest: sha("0"),
    },
    budget: {
      research_elapsed_ms: 500,
      research_processes: 1,
      research_output_bytes: 100,
      prompt_bytes: 100,
      artifact_bytes: 42,
      attempts: 1,
      observed_tokens: 500,
    },
  };
  return { mission, record };
}

test("public run projection exports only the bounded submission evidence", () => {
  const { mission, record } = fixture();
  const projection = projectPublicRun({
    mission,
    record,
    repository: "https://github.com/vela-science/formal-conjectures-frontier",
  });
  assert.equal(projection.schema, "canopus.public-run.v1");
  assert.equal(projection.mission.model, "gpt-5.6-sol");
  assert.equal(projection.policy.route, "defer");
  assert.equal(projection.policy.accepted_state_delta, 0);
  assert.deepEqual(projection.artifact_roots, [sha("e")]);
  assert.equal(
    projection.reproduction.commands.at(-1),
    "vela reproduce 'artifacts/proof.lean'",
  );
  assert.equal(projection.reproduction.commands.includes("vela reproduce ."), false);
  assert.match(projection.nonclaims[1] ?? "", /does not establish maximality/u);
  const bytes = JSON.stringify(projection);
  for (const forbidden of ["worker-events", "worker-final", "authentication", "/Users/", "private.key"]) {
    assert.doesNotMatch(bytes, new RegExp(forbidden, "u"));
  }
});

test("public run projection resolves worker-time verifier-pending language", () => {
  const { mission, record } = fixture();
  record.candidate.caveats = [
    "Verification by the separate frozen verifier remains pending after producer exit.",
  ];
  const projection = projectPublicRun({
    mission,
    record,
    repository: "https://github.com/vela-science/formal-conjectures-frontier",
  });
  assert.deepEqual(projection.caveats, [
    "The worker handed off without verifier authority; Canopus subsequently recorded the separate verifier pass shown in this projection.",
  ]);
});

test("public run projection fails closed on a non-Defer result", () => {
  const { mission, record } = fixture();
  record.landing.route = "permit";
  record.landing.accepted_event_delta = 1;
  assert.throws(
    () => projectPublicRun({ mission, record, repository: "https://github.com/vela-science/formal-conjectures-frontier" }),
    /requires Defer with zero accepted-state delta/u,
  );
});

test("publication bundle emits only rooted read-only evidence and pending commands", () => {
  const { mission, record } = fixture();
  const bundle = buildPublicationBundle({
    mission,
    record,
    repository: "https://github.com/vela-science/formal-conjectures-frontier",
  });
  assert.equal(bundle.manifest.schema, "canopus.publication-manifest.v1");
  assert.equal(bundle.webImport.projection_root, contentDigest(bundle.projection));
  assert.equal(bundle.webImport.authority, "read_only");
  assert.equal(bundle.pendingCommands.authority, "none");
  assert.match(bundle.pendingCommands.commands[0]?.command ?? "", /--proposal vpr_public_fixture/u);
  assert.match(bundle.pendingCommands.commands[2]?.command ?? "", /vela verify attach/u);
  assert.equal(bundle.manifest.files["public-run.json"], contentDigest(bundle.projection));
  assert.doesNotMatch(JSON.stringify(bundle), /\/Users\/|private\.key|worker-events/u);
});

test("the GPT-5.4 registration preserves the exact v0.4.3 bytes and roots", async () => {
  const root = new URL("../../registrations/historical/formal-erdos-505-test-dim-one-gpt54-v0.4.3/", import.meta.url);
  const profile = await readFile(new URL("profile.json", root));
  const mission = await readFile(new URL("mission.draft.json", root));
  const manifest = JSON.parse(await readFile(new URL("manifest.json", root), "utf8")) as {
    profile_sha256: string;
    mission_sha256: string;
    source_tag: string;
  };
  assert.equal(manifest.source_tag, "v0.4.3");
  assert.equal(sha256Bytes(profile), manifest.profile_sha256);
  assert.equal(sha256Bytes(mission), manifest.mission_sha256);
});
