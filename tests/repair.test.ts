import assert from "node:assert/strict";
import test from "node:test";

import { parseMission } from "../src/contracts/mission.js";
import { planRepair } from "../src/repair/plan.js";

const root = `sha256:${"a".repeat(64)}`;

function mission() {
  return parseMission({
    schema: "canopus.mission.v0", id: "mission_original", target: "target-1",
    vela_version: "0.800.19", vela_sha256: root,
    frontier: "frontier", actor: "agent:test", role: "producer",
    claim_type: "computational", replayability: "exact",
    objective: "Find one bounded result.", completion_condition: "Verifier passes.",
    roots: { git_commit: "b".repeat(40), git_tree: "c".repeat(40), vela_event_log: root, vela_snapshot: root },
    allowed_paths: ["result"],
    budgets: {
      max_research_wall_time_ms: 1000, max_research_processes: 2,
      max_research_output_bytes: 4096, max_prompt_bytes: 4096,
      max_artifact_bytes: 4096, max_attempts: 3, max_observed_tokens: 1000,
    },
    verifier: { argv: ["frontier/verifier", "{artifact:result}"], executable_sha256: root, cwd: "frontier", timeout_ms: 1000, max_output_bytes: 4096, network: "deny", writes: "deny" },
    scientific_chain: { predicted_observable: "The verifier passes.", performed_test: "verify frozen result" },
    landing: { expected_routes: ["defer"], max_accepted_delta: 0 },
  });
}

test("repair is a new bounded mission with immutable lineage", () => {
  const repair = planRepair(mission(), root, "Verifier exposed an encoding error.", 2);
  assert.match(repair.id, /^mission_repair_[0-9a-f]{12}$/u);
  assert.equal(repair.parent_candidate, root);
  assert.equal(repair.repair_reason, "Verifier exposed an encoding error.");
  assert.equal(repair.budgets.max_attempts, 2);
  assert.equal(mission().parent_candidate, undefined);
});

test("repair cannot silently reset an exhausted budget", () => {
  assert.throws(() => planRepair(mission(), root, "again", 0), /remaining attempt/u);
});
