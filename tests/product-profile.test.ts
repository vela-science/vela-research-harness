import assert from "node:assert/strict";
import { mkdir, mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  loadProductProfile,
  loadProfileDraft,
  stageProfileCapsule,
} from "../src/product/profile.js";
import { selectProductOffer } from "../src/product/doctor.js";
import { contentDigest } from "../src/util/canonical.js";

test("registered product profiles stage exact distinct capsules and bounded Mission v1 drafts", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "canopus-product-profiles-"));
  const first = await loadProductProfile("erdos1056-k15-10428008-10428200");
  const adjacent = await loadProductProfile("erdos1056-k15-10428201-10428400");
  assert.equal(first.target, "erdos:1056");
  assert.equal(adjacent.target, "erdos:1056");
  assert.notEqual(first.capsule_sha256, adjacent.capsule_sha256);
  assert.notEqual(contentDigest(await loadProfileDraft(first)), contentDigest(await loadProfileDraft(adjacent)));
  for (const profile of [first, adjacent]) {
    const staging = path.join(root, profile.name);
    await mkdir(staging);
    const staged = await stageProfileCapsule({ profile, stagingRoot: staging });
    assert.equal(staged.source, "packaged");
  }
});

test("explicit targets are deliberate while the default never skips rank one", async () => {
  const profile = await loadProductProfile("erdos1056-k15-10428008-10428200");
  const offer = {
    targets: [
      { rank: 1, target_id: "erdos:124" },
      { rank: 2, target_id: "erdos:1056" },
    ],
  };
  assert.throws(() => selectProductOffer(offer, profile), /will not skip rank 1/u);
  assert.deepEqual(selectProductOffer(offer, profile, "erdos:1056"), {
    target: { rank: 2, target_id: "erdos:1056" },
    targetId: "erdos:1056",
    rank: 2,
  });
  assert.throws(
    () => selectProductOffer(offer, profile, "erdos:124"),
    /not requested target erdos:124/u,
  );
});
