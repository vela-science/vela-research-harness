import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  loadProductProfile,
  loadProfileDraft,
  loadProfileResultContract,
  stageProfileCapsule,
  verifierImageAt,
} from "../src/product/profile.js";
import {
  listProductProfiles,
  packProductProfile,
  validateProductProfile,
} from "../src/product/profile-bundle.js";
import { resolveProductProfile, selectProductOffer } from "../src/product/doctor.js";
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

test("portable verifier images require the exact public repository and full digest", () => {
  assert.throws(() => verifierImageAt(`sha256:${"a".repeat(64)}`), /length|invalid format/u);
  assert.throws(
    () => verifierImageAt(`ghcr.io/other/canopus-verifier@sha256:${"a".repeat(64)}`),
    /length|invalid format/u,
  );
  assert.throws(
    () => verifierImageAt("ghcr.io/vela-science/canopus-verifier:latest"),
    /length|invalid format/u,
  );
});

test("profile v2 binds exact platform custody and packs only portable contract resources", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "canopus-profile-pack-parent-"));
  const name = "erdos1056-k15-10428008-10428200";
  assert.deepEqual(await listProductProfiles(), [
    name,
    "erdos1056-k15-10428201-10428400",
    "quantum-10-1-4-stabilizer-retry",
    "sidon-a24-improve",
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
    "capsules/erdos1056-k15/bin/linux-arm64/10428008-10428200/verifier",
    "capsules/erdos1056-k15/bin/linux-x86_64/10428008-10428200/verifier",
    "missions/erdos1056-k15/mission.draft.json",
    `profiles/${name}.json`,
    "runtime/native-worker/config-linux.toml",
    "runtime/native-worker/config.toml",
  ]);
});

test("Linux custody denies host roots and reopens only the exact workspace", async () => {
  const config = await readFile(
    path.resolve("runtime/native-worker/config-linux.toml"),
    "utf8",
  );
  assert.match(config, /^"\/home" = "deny"$/mu);
  assert.match(config, /^"\/root" = "deny"$/mu);
  assert.match(config, /^"\/tmp" = "deny"$/mu);
  assert.match(
    config,
    /\[permissions\.canopus-worker\.filesystem\.":workspace_roots"\]\n"\." = "write"\n"\.canopus-runtime" = "read"/u,
  );
  assert.doesNotMatch(config, /^"\/" = "write"$/mu);
});

test("Sidon Permit profile binds one positive result contract and two portable capsules", async () => {
  const mac = await loadProductProfile("sidon-a24-improve", { platform: "darwin-arm64" });
  const linux = await loadProductProfile("sidon-a24-improve", { platform: "linux-x86_64" });
  assert.equal(mac.target, "sidon:a24-improve");
  assert.equal(mac.target_packet_schema, "sidon-frontier.a24-improvement-work.v1");
  assert.deepEqual(mac.landing, { expected_routes: ["permit"], max_accepted_delta: 1 });
  assert.notEqual(mac.capsule_sha256, linux.capsule_sha256);
  assert.deepEqual(await loadProfileResultContract(mac), {
    schema: "canopus.result-contract.v1",
    target: "sidon:a24-improve",
    claim_exact: "There exists a Sidon subset of {0,1}^24 with at least 7,193 elements.",
    claim_type: "computational",
    replayability: "exact",
    candidate_status: "success",
    verifier_status: "passed",
    required_artifact_kinds: ["vela-witness"],
  });
  const validation = await validateProductProfile(mac.name);
  assert.equal(validation.platforms["darwin-arm64"].verifier_capsule_sha256, mac.capsule_sha256);
  assert.equal(validation.platforms["linux-x86_64"].verifier_capsule_sha256, linux.capsule_sha256);
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

test("ordinary profile discovery selects the unique first-offer profile", async () => {
  const profile = await resolveProductProfile({
    targets: [{ rank: 1, target_id: "quantum:[[10,1,4]]" }],
  });
  assert.equal(profile.name, "quantum-10-1-4-stabilizer-retry");
  await assert.rejects(
    resolveProductProfile({ targets: [{ rank: 1, target_id: "unknown:target" }] }),
    /no runnable profile is registered/u,
  );
});
