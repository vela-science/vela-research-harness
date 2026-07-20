import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { contentDigest, sha256Bytes } from "../src/util/canonical.js";

const root = new URL("../../advisories/erdos1056-claim-fidelity/", import.meta.url);

test("GPT-5.6 claim-fidelity advisory binds immutable evidence without scientific landing", async () => {
  const registrationBytes = await readFile(new URL("registration.json", root));
  const schemaBytes = await readFile(new URL("output.schema.json", root));
  const assessment = JSON.parse(await readFile(new URL("results/assessment.json", root), "utf8")) as {
    source: { roots: Record<string, string>; run_id: string };
    numeric_correspondence: Record<string, { matches: boolean; reported: number; artifact: number }>;
    language: { classification: string };
    recommendation: { classification: string };
    standing: { verifier_success_reported: boolean; scientific_acceptance_reported: boolean; accepted_state_delta: number };
  };
  const registration = JSON.parse(registrationBytes.toString("utf8")) as {
    model: string;
    output_schema_sha256: string;
    source: { run_id: string; roots: Record<string, string> };
  };
  const verification = JSON.parse(await readFile(new URL("results/verification.json", root), "utf8")) as {
    registration_root: string;
    output_schema_root: string;
    assessment_root: string;
    scientific_state_landed: boolean;
    semantic_fields: Array<{ classification: string }>;
  };
  assert.equal(registration.model, "gpt-5.6-sol");
  assert.equal(sha256Bytes(registrationBytes), verification.registration_root);
  assert.equal(sha256Bytes(schemaBytes), registration.output_schema_sha256);
  assert.equal(sha256Bytes(schemaBytes), verification.output_schema_root);
  assert.equal(contentDigest(assessment), verification.assessment_root);
  assert.equal(assessment.source.run_id, registration.source.run_id);
  assert.deepEqual(assessment.source.roots, registration.source.roots);
  assert.equal(Object.keys(assessment.source.roots).length, 5);
  for (const comparison of Object.values(assessment.numeric_correspondence)) {
    assert.equal(comparison.matches, true);
    assert.equal(comparison.reported, comparison.artifact);
  }
  assert.equal(assessment.language.classification, "model_assessment");
  assert.equal(assessment.recommendation.classification, "model_assessment");
  assert.equal(assessment.standing.verifier_success_reported, true);
  assert.equal(assessment.standing.scientific_acceptance_reported, false);
  assert.equal(assessment.standing.accepted_state_delta, 0);
  assert.equal(verification.scientific_state_landed, false);
  assert.ok(verification.semantic_fields.every((field) => field.classification === "model_assessment"));
});

test("advisory runner has no Vela landing or human decision surface", async () => {
  const runner = await readFile(new URL("../../scripts/run-claim-fidelity-advisory.mjs", import.meta.url), "utf8");
  assert.doesNotMatch(runner, /vela(?:",\s*|s+)land/u);
  assert.doesNotMatch(runner, /review(?:",\s*|s+)decide/u);
  assert.doesNotMatch(runner, /human.*key/iu);
});
