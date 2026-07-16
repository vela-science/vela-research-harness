import type { Mission } from "../contracts/mission.js";
import { parseMission } from "../contracts/mission.js";
import { sha256At, stringAt } from "../contracts/validation.js";
import { contentDigest } from "../util/canonical.js";

export function planRepair(
  mission: Mission,
  parentCandidate: string,
  reason: string,
  remainingAttempts: number,
): Mission {
  const parent = sha256At(parentCandidate, "parent_candidate");
  const repairReason = stringAt(reason, "repair_reason", { min: 1, max: 4096 });
  if (!Number.isSafeInteger(remainingAttempts) || remainingAttempts < 1) {
    throw new Error("repair requires at least one remaining attempt");
  }
  const suffix = contentDigest({ mission: mission.id, parent, repairReason }).slice(7, 19);
  return parseMission({
    ...mission,
    id: `mission_repair_${suffix}`,
    objective: `Repair candidate ${parent}: ${repairReason}`.slice(0, 8192),
    budgets: {
      ...mission.budgets,
      max_attempts: Math.min(mission.budgets.max_attempts, remainingAttempts),
    },
    parent_candidate: parent,
    repair_reason: repairReason,
  });
}

