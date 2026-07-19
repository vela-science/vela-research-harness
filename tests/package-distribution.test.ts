import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import test from "node:test";

const packageRoot = fileURLToPath(new URL("../../", import.meta.url));

test("published Canopus is one self-contained inert tarball", async () => {
  const manifest = JSON.parse(
    await readFile(new URL("../../package.json", import.meta.url), "utf8"),
  ) as {
    bin?: Record<string, string>;
    engines?: Record<string, string>;
    dependencies?: Record<string, string>;
    optionalDependencies?: Record<string, string>;
    peerDependencies?: Record<string, string>;
    scripts?: Record<string, string>;
  };

  assert.equal(packageRoot.endsWith("vela-research-harness/"), true);
  assert.deepEqual(manifest.dependencies ?? {}, {});
  assert.deepEqual(manifest.optionalDependencies ?? {}, {});
  assert.deepEqual(manifest.peerDependencies ?? {}, {});
  for (const lifecycle of ["preinstall", "install", "postinstall", "prepare"] as const) {
    assert.equal(manifest.scripts?.[lifecycle], undefined, `${lifecycle} must not execute on install`);
  }
  assert.equal(manifest.bin?.canopus, "./dist/src/cli.js");
  assert.equal(manifest.engines?.node, ">=22 <23 || >=24 <25");
});
