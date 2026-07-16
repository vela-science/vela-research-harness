import assert from "node:assert/strict";
import test from "node:test";

import { parseCandidate } from "../src/contracts/candidate.js";
import { parseMission } from "../src/contracts/mission.js";
import { parseCandidateDraft } from "../src/candidate/validate.js";

const hex = "a".repeat(64);
const digest = `sha256:${hex}`;

function mission(): Record<string, unknown> {
  return {
    schema: "canopus.mission.v0",
    id: "mission_contract_test",
    target: "target-1",
    vela_version: "0.800.15",
    vela_sha256: digest,
    frontier: "frontier",
    actor: "agent:canopus-test",
    role: "producer",
    claim_type: "computational",
    replayability: "exact",
    objective: "Produce one bounded witness.",
    completion_condition: "The declared verifier exits zero on frozen bytes.",
    roots: {
      git_commit: "b".repeat(40),
      git_tree: "c".repeat(40),
      vela_event_log: digest,
      vela_snapshot: digest,
    },
    allowed_paths: ["proof/Main.lean", "artifacts/witness.json"],
    budgets: {
      max_research_wall_time_ms: 30_000,
      max_research_processes: 4,
      max_research_output_bytes: 1_048_576,
      max_prompt_bytes: 1_048_576,
      max_artifact_bytes: 4_194_304,
      max_attempts: 2,
      max_observed_tokens: 20_000,
    },
    verifier: {
      argv: ["frontier/verifier", "proof/Main.lean"],
      executable_sha256: digest,
      cwd: "frontier",
      timeout_ms: 20_000,
      max_output_bytes: 1_048_576,
      network: "deny",
      writes: "deny",
    },
    scientific_chain: {
      predicted_observable: "The frozen witness passes the declared finite check.",
      performed_test: "lake env lean proof/Main.lean",
    },
    landing: {
      expected_routes: ["defer"],
      max_accepted_delta: 0,
    },
  };
}

function candidate(): Record<string, unknown> {
  return {
    schema: "canopus.candidate.v0",
    mission_id: "mission_contract_test",
    status: "success",
    claim: "The frozen witness passes the declared finite verifier.",
    artifacts: [
      {
        path: "artifacts/witness.json",
        kind: "witness",
        digest,
        bytes: 128,
      },
    ],
    observations: ["The bounded search returned one candidate."],
    tests: [
      {
        argv: ["verify", "artifacts/witness.json"],
        executable_digest: digest,
        exit_code: 0,
        stdout_digest: digest,
        stderr_digest: digest,
        duration_ms: 10,
      },
    ],
    costs: {
      wall_time_ms: 100,
      attempt: 1,
      input_tokens: 20,
      output_tokens: 30,
    },
    caveats: ["This result does not establish optimality or acceptance."],
    engine: {
      name: "fake",
      version: "1",
      binary_sha256: null,
      model: null,
      configuration_sha256: digest,
    },
  };
}

test("mission v0 round-trips a bounded exact-root contract", () => {
  assert.deepEqual(parseMission(mission()), mission());
});

test("mission rejects unknown fields", () => {
  const input = mission();
  input.verdict = "accepted";
  assert.throws(() => parseMission(input), /verdict is not allowed/u);
});

test("mission rejects short roots", () => {
  const input = mission();
  input.roots = { ...(input.roots as object), vela_snapshot: "sha256:abcd" };
  assert.throws(() => parseMission(input), /vela_snapshot has an invalid format/u);
});

test("mission rejects path escape and a shell-bearing verifier executable", () => {
  const escaped = mission();
  escaped.allowed_paths = ["../human-key"];
  assert.throws(() => parseMission(escaped), /remain below its root/u);

  const shell = mission();
  (shell.verifier as { argv: string[] }).argv[0] = "vela sign";
  assert.throws(() => parseMission(shell), /relative verifier capsule without shell syntax/u);
});

test("candidate v0 round-trips frozen evidence", () => {
  assert.deepEqual(parseCandidate(candidate()), candidate());
});

test("candidate has no verdict or authority field", () => {
  const input = candidate();
  input.verdict = "accepted";
  assert.throws(() => parseCandidate(input), /verdict is not allowed/u);
});

test("candidate rejects unfrozen artifacts", () => {
  const input = candidate();
  input.artifacts = [
    { path: "artifacts/witness.json", kind: "witness", digest: "sha256:abcd", bytes: 1 },
  ];
  assert.throws(() => parseCandidate(input), /digest has an invalid format/u);
});

test("engine and frozen candidate artifact caps fit one authored Vela command", () => {
  const artifact = {
    path: "artifact.json",
    kind: "witness",
    encoding: "utf8",
    content: "{}\n",
  };
  assert.throws(
    () => parseCandidateDraft({
      schema: "canopus.engine-output.v0",
      status: "success",
      claim: "bounded",
      artifacts: Array.from({ length: 9 }, (_, index) => ({
        ...artifact,
        path: `artifact-${index}.json`,
      })),
      observations: [],
      caveats: [],
    }),
    /artifacts length must be 0\.\.8/u,
  );
  const oversized = candidate();
  oversized.artifacts = Array.from({ length: 11 }, (_, index) => ({
    path: `artifact-${index}.json`, kind: "witness", digest, bytes: 1,
  }));
  assert.throws(() => parseCandidate(oversized), /artifacts length must be 0\.\.10/u);
});

test("candidate repairs name an immutable parent", () => {
  const input = candidate();
  input.repair = { parent_candidate: digest, reason: "Verifier rejected the first form." };
  assert.deepEqual(parseCandidate(input), input);
});
