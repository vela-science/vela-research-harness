import assert from "node:assert/strict";
import test from "node:test";

import { ROLES } from "../src/contracts/mission.js";
import { roleInstruction } from "../src/roles.js";

test("the four mission roles have distinct bounded scientific jobs", () => {
  const instructions = ROLES.map((role) => roleInstruction(role));
  assert.equal(new Set(instructions).size, ROLES.length);
  assert.match(roleInstruction("producer"), /null result/u);
  assert.match(roleInstruction("adversary"), /falsify|counterexample/u);
  assert.match(roleInstruction("verifier"), /do not issue an acceptance verdict/u);
  assert.match(roleInstruction("fidelity"), /says no more/u);
});
