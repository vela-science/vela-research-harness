import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const repoRoot = path.resolve(process.cwd());
const runner = path.join(repoRoot, "scripts/run-product-09-cold-use.mjs");

test("cold-use runner documents and requires a fresh output directory", () => {
  const help = spawnSync(process.execPath, [runner, "--help"], { encoding: "utf8" });
  assert.equal(help.status, 0);
  assert.match(help.stdout, /--output <path>\s+Required fresh output directory/u);

  const missing = spawnSync(process.execPath, [runner, "--preflight-only"], {
    encoding: "utf8",
  });
  assert.notEqual(missing.status, 0);
  assert.match(missing.stderr, /--output <new-directory> is required/u);
});

test("cold-use runner refuses an existing output path without changing it", async () => {
  const parent = await mkdtemp(path.join(os.tmpdir(), "canopus-cold-use-output-"));
  const output = path.join(parent, "existing");
  await mkdir(output);
  const sentinel = path.join(output, "sentinel.txt");
  await writeFile(sentinel, "historical evidence\n");

  const result = spawnSync(
    process.execPath,
    [runner, "--preflight-only", "--output", output],
    { encoding: "utf8" },
  );
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /output path already exists/u);
  assert.equal(await readFile(sentinel, "utf8"), "historical evidence\n");
});
