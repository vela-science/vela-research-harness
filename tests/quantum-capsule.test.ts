import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import test from "node:test";

const exec = promisify(execFile);
const verifier = fileURLToPath(
  new URL("../../capsules/quantum-10-1-4/verifier.py", import.meta.url),
);
const lowDistance = fileURLToPath(
  new URL("../../tests/fixtures/quantum-10-1-4/low-distance.json", import.meta.url),
);

test("quantum capsule rejects an undetectable Pauli below weight four", async () => {
  await assert.rejects(
    exec("python3", [verifier, lowDistance], {
      encoding: "utf8",
      timeout: 30_000,
      maxBuffer: 1024 * 1024,
    }),
    (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.match(
        (error as Error & { stderr?: string }).stderr ?? "",
        /undetectable non-stabilizer Pauli below weight four/u,
      );
      return true;
    },
  );
});
