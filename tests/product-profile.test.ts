import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  loadProductProfile,
  loadProfileDraft,
  stageProfileCapsule,
} from "../src/product/profile.js";
import {
  listProductProfiles,
  packProductProfile,
  validateProductProfile,
} from "../src/product/profile-bundle.js";
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

test("profile v2 binds exact platform custody and packs only portable contract resources", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "canopus-profile-pack-parent-"));
  const name = "erdos1056-k15-10428008-10428200";
  assert.deepEqual(await listProductProfiles(), [
    name,
    "erdos1056-k15-10428201-10428400",
  ]);
  const mac = await loadProductProfile(name, { platform: "darwin-arm64" });
  const linux = await loadProductProfile(name, { platform: "linux-x86_64" });
  assert.equal(mac.target_packet_schema, "erdos-frontier.problem-work.v1");
  assert.equal(mac.permission_profile, "runtime/native-worker/config.toml");
  assert.equal(linux.permission_profile, "runtime/native-worker/config-linux.toml");
  assert.notEqual(mac.capsule_sha256, linux.capsule_sha256);
  assert.equal(mac.landing.max_accepted_delta, 0);
  assert.deepEqual(mac.landing.expected_routes, ["defer"]);

  const validation = await validateProductProfile(name);
  assert.equal(validation.schema, "canopus.profile-validation.v1");
  assert.equal(validation.platforms["darwin-arm64"].verifier_capsule_sha256, mac.capsule_sha256);
  assert.equal(validation.platforms["linux-x86_64"].verifier_capsule_sha256, linux.capsule_sha256);

  const output = path.join(root, "bundle");
  const packed = await packProductProfile(name, output);
  const manifest = JSON.parse(await readFile(packed.manifest, "utf8")) as {
    schema: string;
    files: Array<{ path: string }>;
  };
  assert.equal(manifest.schema, "canopus.profile-pack.v1");
  assert.equal(packed.files, 6);
  assert.deepEqual(manifest.files.map((file) => file.path), [
    "capsules/erdos1056-k15/bin/10428008-10428200/verifier",
    "capsules/erdos1056-k15/bin/linux-x86_64/10428008-10428200/verifier",
    "missions/erdos1056-k15/mission.draft.json",
    `profiles/${name}.json`,
    "runtime/native-worker/config-linux.toml",
    "runtime/native-worker/config.toml",
  ]);
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
