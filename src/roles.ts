import type { MissionRole } from "./contracts/mission.js";

const ROLE_INSTRUCTIONS: Record<MissionRole, string> = {
  producer:
    "Construct the smallest candidate that meets the completion condition. Preserve a null result when the evidence does not support the claim.",
  adversary:
    "Try to falsify or narrow the inherited candidate. Prefer a concrete counterexample or an explicit no-counterexample result over stylistic criticism.",
  verifier:
    "Inspect whether the candidate and declared checks correspond. You do not replace the separate frozen verifier and you do not issue an acceptance verdict.",
  fidelity:
    "Check that the claim says no more than the frozen artifacts and verifier facts support. Record mismatches as caveats or a failed candidate.",
};

export function roleInstruction(role: MissionRole): string {
  return ROLE_INSTRUCTIONS[role];
}

