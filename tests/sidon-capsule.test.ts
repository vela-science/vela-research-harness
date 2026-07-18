import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const image = "alpine@sha256:4bcff63911fcb4448bd4fdacec207030997caf25e9bea4045fa6c8c44de311d1";
const packageRoot = fileURLToPath(new URL("../../", import.meta.url));

function docker(platform: string, capsule: string, candidate: string, claim: string) {
  return spawnSync(
    "docker",
    [
      "run",
      "--rm",
      "--network=none",
      `--platform=${platform}`,
      "--read-only",
      "--cap-drop=ALL",
      "--security-opt=no-new-privileges",
      "--memory=1024m",
      "--cpus=1",
      "--pids-limit=64",
      "-v",
      `${capsule}:/verifier:ro`,
      "-v",
      `${candidate}:/candidate:ro`,
      image,
      "/verifier",
      "--claim",
      claim,
      "/candidate",
    ],
    { encoding: "utf8", maxBuffer: 1024 * 1024 },
  );
}

test("Vela-native Sidon capsule binds the exact claim and rejects collisions", async (t) => {
  const inspect = spawnSync("docker", ["image", "inspect", image], { encoding: "utf8" });
  if (inspect.status !== 0) {
    t.skip("pinned Alpine test image is unavailable");
    return;
  }
  const platform = process.arch === "arm64" ? "linux/arm64" : "linux/amd64";
  const architecture = process.arch === "arm64" ? "linux-arm64" : "linux-x86_64";
  const capsule = path.join(packageRoot, "capsules", "sidon-a24", "bin", architecture, "verifier");

  const root = await mkdtemp(path.join(os.tmpdir(), "canopus-sidon-capsule-"));
  const candidate = path.join(root, "small.witness.json");
  await writeFile(candidate, JSON.stringify({
    kind: "sidon",
    n: 3,
    points: [[0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1]],
    claimed_size: 4,
  }));
  const exact = docker(
    platform,
    capsule,
    candidate,
    "There exists a Sidon subset of {0,1}^3 with at least 4 elements.",
  );
  assert.equal(exact.status, 0, exact.stderr);
  assert.match(exact.stdout, /"ok":true/u);

  const inflated = docker(
    platform,
    capsule,
    candidate,
    "There exists a Sidon subset of {0,1}^3 with at least 5 elements.",
  );
  assert.notEqual(inflated.status, 0);
  assert.match(inflated.stdout, /"ok":false/u);

  const collision = path.join(root, "collision.witness.json");
  await writeFile(collision, JSON.stringify({
    kind: "sidon",
    n: 3,
    points: [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0]],
    claimed_size: 4,
  }));
  const duplicate = docker(
    platform,
    capsule,
    collision,
    "There exists a Sidon subset of {0,1}^3 with at least 4 elements.",
  );
  assert.notEqual(duplicate.status, 0);
  assert.match(duplicate.stdout, /pairwise-sum collision/u);
});
