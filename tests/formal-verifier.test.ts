import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmod, mkdtemp, readFile, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const verifier = path.resolve("capsules/formal-erdos-505-test-dim-one/verifier");

async function candidate(root: string, name: string, contents: string): Promise<string> {
  const file = path.join(root, name);
  await writeFile(file, contents, { encoding: "utf8", flag: "wx", mode: 0o600 });
  return file;
}

function run(file: string): ReturnType<typeof spawnSync> {
  return spawnSync(verifier, [file], { encoding: "utf8" });
}

test(
  "formal capsule rejects malformed and trust-bypassing proof artifacts before Lean",
  { skip: process.platform === "win32" },
  async () => {
    await chmod(verifier, 0o755);
    const verifierSource = await readFile(verifier, "utf8");
    assert.match(verifierSource, /\$toolchain\/lake" env lean --stdin/u);
    assert.doesNotMatch(verifierSource, /lean \/dev\/stdin/u);
    const root = await mkdtemp(path.join(os.tmpdir(), "canopus-formal-verifier-"));

    const empty = run(await candidate(root, "empty.lean", ""));
    assert.equal(empty.status, 2);
    assert.match(String(empty.stderr), /must contain 1\.\.131072 bytes/u);

    const imports = run(await candidate(root, "imports.lean", "import Mathlib\nby trivial\n"));
    assert.equal(imports.status, 2);
    assert.match(String(imports.stderr), /must begin with a Lean 'by' term/u);

    for (const token of ["sorry", "admit", "axiom", "unsafe"]) {
      const result = run(await candidate(root, `${token}.lean`, `by\n  ${token}\n`));
      assert.equal(result.status, 2);
      assert.match(String(result.stderr), /forbidden trust-bypassing token/u);
    }

    const ordinary = await candidate(root, "ordinary.lean", "by\n  exact True.intro\n");
    const link = path.join(root, "link.lean");
    await symlink(ordinary, link);
    const linked = run(link);
    assert.equal(linked.status, 2);
    assert.match(String(linked.stderr), /must be one regular file/u);
  },
);
