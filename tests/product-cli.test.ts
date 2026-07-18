import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import test from "node:test";

const execute = promisify(execFile);
const cli = fileURLToPath(new URL("../src/cli.js", import.meta.url));

async function help(...args: string[]): Promise<string> {
  const result = await execute(process.execPath, [cli, ...args], {
    encoding: "utf8",
    timeout: 30_000,
    maxBuffer: 1024 * 1024,
  });
  assert.equal(result.stderr, "");
  return result.stdout;
}

test("primary help presents only the compact product workflow", async () => {
  const output = await help("--help");
  for (const command of ["doctor", "run", "inspect", "replay", "withdraw"]) {
    assert.match(output, new RegExp(`canopus ${command}\\b`, "u"));
  }
  assert.doesNotMatch(output, /^\s*canopus (?:benchmark|benchmark-composition|validate)\b/mu);
  assert.match(output, /Mission v1 prepare\/validate.+advanced help/su);
  assert.match(output, /cannot\s+sign, accept, or make a human scientific decision/su);
});

test("every compact product subcommand has focused help", async () => {
  for (const command of ["doctor", "run", "inspect", "replay", "withdraw"]) {
    const output = await help(command, "--help");
    assert.match(output, new RegExp(`canopus ${command}\\b`, "u"));
    assert.doesNotMatch(output, /Primary workflow:/u);
  }
});

test("mission help retains the advanced portable interface", async () => {
  const output = await help("mission", "--help");
  assert.match(output, /canopus mission prepare/u);
  assert.match(output, /canopus mission validate/u);
});

test("profile help and validation retain the advanced closed interface", async () => {
  const output = await help("profile", "--help");
  assert.match(output, /canopus profile list/u);
  assert.match(output, /canopus profile validate/u);
  assert.match(output, /canopus profile pack/u);

  const list = JSON.parse(await help("profile", "list")) as { profiles: string[] };
  assert.deepEqual(list.profiles, [
    "erdos1056-k15-10428008-10428200",
    "erdos1056-k15-10428201-10428400",
    "quantum-10-1-4-stabilizer",
    "quantum-10-1-4-stabilizer-retry",
  ]);
  const validation = JSON.parse(
    await help("profile", "validate", "erdos1056-k15-10428008-10428200"),
  ) as { validation: { schema: string } };
  assert.equal(validation.validation.schema, "canopus.profile-validation.v1");
});
