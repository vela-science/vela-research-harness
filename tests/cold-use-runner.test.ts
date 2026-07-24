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

test("cold-use runner enforces registered wall-time and token limits", async () => {
  const source = await readFile(runner, "utf8");

  assert.match(source, /kill\("SIGKILL"\)/u);
  assert.match(source, /exceeded the registered wall-time limit/u);
  assert.match(source, /token_budget_passed/u);
  assert.match(source, /exceeded the registered token limit/u);
});

test("cold-use runner grants only the registered public trust anchor", async () => {
  const source = await readFile(runner, "utf8");

  assert.match(source, /registeredTrustAnchorPath/u);
  assert.match(source, /file_sha256/u);
  assert.match(source, /must be private to the OS account/u);
  assert.match(source, /registeredGitRuntime/u);
  assert.match(source, /\[\.\.\.readablePaths, git\.read_root\]/u);
  assert.match(source, /permissionProfile\(\s*task\.access,/u);
  assert.doesNotMatch(source, /":root"\]?\s*=\s*"read"/u);
});

test("raw rendered HTML is retained as evidence outside the model fixture", async () => {
  const source = await readFile(runner, "utf8");

  assert.match(source, /const htmlPath = path\.join\(output, evidenceFile\)/u);
  assert.match(source, /accessibility_text_file/u);
  assert.match(source, /retained_evidence_file/u);
  assert.doesNotMatch(source, /const htmlPath = path\.join\(target, route\.file\)/u);
});
