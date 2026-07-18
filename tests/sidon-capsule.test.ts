import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const image = "alpine@sha256:4bcff63911fcb4448bd4fdacec207030997caf25e9bea4045fa6c8c44de311d1";
const packageRoot = fileURLToPath(new URL("../../", import.meta.url));

function docker(platform: string, capsule: string, args: string[]) {
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
      ...args.flatMap((argument, index) =>
        index === 0 && argument.startsWith("/") ? ["-v", `${argument}:/candidate:ro`] : []),
      image,
      "/verifier",
      ...args.map((argument, index) =>
        index === 0 && argument.startsWith("/") ? "/candidate" : argument),
    ],
    { encoding: "utf8", maxBuffer: 1024 * 1024 },
  );
}

test("Sidon capsule self-checks its exact pair-sum encoding and rejects duplicate points", async (t) => {
  const inspect = spawnSync("docker", ["image", "inspect", image], { encoding: "utf8" });
  if (inspect.status !== 0) {
    t.skip("pinned Alpine test image is unavailable");
    return;
  }
  const platform = process.arch === "arm64" ? "linux/arm64" : "linux/amd64";
  const architecture = process.arch === "arm64" ? "linux-arm64" : "linux-x86_64";
  const capsule = path.join(packageRoot, "capsules", "sidon-a24", "bin", architecture, "verifier");

  const selfTest = docker(platform, capsule, ["--self-test"]);
  assert.equal(selfTest.status, 0, selfTest.stderr);
  assert.equal(selfTest.stdout, "sidon verifier self-test: passed\n");

  const root = await mkdtemp(path.join(os.tmpdir(), "canopus-sidon-capsule-"));
  const candidate = path.join(root, "duplicate.txt");
  await writeFile(candidate, [
    "schema=canopus.sidon-a24-witness.v1",
    "target=sidon:a24-improve",
    "n=24",
    "baseline_size=7192",
    "claimed_size=7193",
    `points=${Array.from({ length: 7193 }, () => "000000").join(",")}`,
    "",
  ].join("\n"));
  const duplicate = docker(platform, capsule, [candidate]);
  assert.notEqual(duplicate.status, 0);
  assert.match(duplicate.stderr, /points must be distinct/u);
});
