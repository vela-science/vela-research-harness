import assert from "node:assert/strict";
import test from "node:test";

import type { Mission } from "../src/contracts/mission.js";
import type { EngineResult } from "../src/engines/engine.js";
import { engineManifest, verifierManifest } from "../src/evidence/manifests.js";
import { contentDigest } from "../src/util/canonical.js";

const digest = `sha256:${"a".repeat(64)}`;

test("engine and verifier manifests coexist under their full content identities", () => {
  const engine = {
    draft: {
      schema: "canopus.engine-output.v0",
      status: "success",
      claim: "fixture",
      artifacts: [],
      observations: [],
      caveats: [],
    },
    engine: {
      name: "codex-exec",
      version: "codex-cli 0.139.0",
      binary_sha256: digest,
      model: "fixture",
      configuration_sha256: digest,
    },
    usage: {
      input_tokens: 1,
      cached_input_tokens: 0,
      output_tokens: 1,
      reasoning_output_tokens: 0,
    },
    wallTimeMs: 1,
    eventTypes: ["turn.completed"],
    actionTypes: [],
    eventsDigest: digest,
    stderrDigest: digest,
  } as EngineResult;
  const mission = {
    verifier: {
      argv: ["verify/capsule", "--one"],
      executable_sha256: digest,
      cwd: "verify",
    },
  } as Mission;
  const firstEngine = engineManifest(engine);
  const firstVerifier = verifierManifest(mission);
  assert.notEqual(firstEngine.path, firstVerifier.path);
  assert.equal(firstEngine.path.includes(contentDigest(firstEngine.value).slice(7)), true);
  assert.equal(firstVerifier.path.includes(contentDigest(firstVerifier.value).slice(7)), true);

  const changedMission = structuredClone(mission);
  changedMission.verifier.argv = ["verify/capsule", "--two"];
  assert.notEqual(verifierManifest(changedMission).path, firstVerifier.path);
});
