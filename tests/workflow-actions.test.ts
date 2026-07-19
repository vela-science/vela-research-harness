import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

const workflows = new URL("../../.github/workflows/", import.meta.url);
const expectedNode24Pins = new Map([
  ["actions/checkout", "9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0"],
  ["actions/setup-node", "820762786026740c76f36085b0efc47a31fe5020"],
  ["pnpm/action-setup", "0ebf47130e4866e96fce0953f49152a61190b271"],
]);

test("workflow actions are immutable and Node tooling uses maintained runtimes", async () => {
  const files = (await readdir(workflows)).filter((file) => file.endsWith(".yml")).sort();
  const observedNodePins = new Map<string, Set<string>>();
  for (const file of files) {
    const value = await readFile(new URL(file, workflows), "utf8");
    for (const match of value.matchAll(/^\s*-?\s*uses:\s*([^\s@]+)@([^\s#]+)/gmu)) {
      const action = match[1] as string;
      const pin = match[2] as string;
      assert.match(pin, /^[0-9a-f]{40}$/u, `${file}: ${action} must use a commit SHA`);
      if (expectedNode24Pins.has(action)) {
        const pins = observedNodePins.get(action) ?? new Set<string>();
        pins.add(pin);
        observedNodePins.set(action, pins);
      }
    }
  }
  for (const [action, expected] of expectedNode24Pins) {
    assert.deepEqual(observedNodePins.get(action), new Set([expected]), `${action} pin drifted`);
  }
});
