import { constants } from "node:fs";
import { chmod, copyFile, mkdir } from "node:fs/promises";
import path from "node:path";

import {
  hashRegularFile,
  type FrozenArtifactLocation,
} from "../artifact/freeze.js";
import type { BudgetSnapshot } from "../budget/enforce.js";
import { parseCandidate, type Candidate } from "../contracts/candidate.js";
import type { Mission } from "../contracts/mission.js";
import type { EngineResult } from "../engines/engine.js";
import type { VerifierOutcome } from "../verifier/run.js";
import type { AuthoredReceiptInput } from "../vela/cli.js";

function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}

export function finalizeCandidate(options: {
  mission: Mission;
  engine: EngineResult;
  frozen: readonly FrozenArtifactLocation[];
  verifier: VerifierOutcome;
  budget: BudgetSnapshot;
  supportingArtifacts?: ReadonlyArray<{ path: string; kind: string }>;
}): Candidate {
  const draftPaths = options.engine.draft.artifacts.map((artifact) => `${artifact.path}:${artifact.kind}`).sort();
  const supporting = new Map(
    (options.supportingArtifacts ?? []).map((entry) => [entry.path, entry.kind]),
  );
  const frozenPaths = options.frozen
    .filter((entry) => !supporting.has(entry.artifact.path))
    .map((entry) => `${entry.artifact.path}:${entry.artifact.kind}`)
    .sort();
  if (JSON.stringify(draftPaths) !== JSON.stringify(frozenPaths)) {
    throw new Error("frozen artifacts do not exactly match the engine declaration");
  }
  for (const [path, kind] of supporting) {
    const entry = options.frozen.find((candidate) => candidate.artifact.path === path);
    if (entry === undefined || entry.artifact.kind !== kind) {
      throw new Error(`supporting artifact ${path} is absent or misclassified`);
    }
  }
  const verifierFailed =
    options.engine.draft.status === "success" && options.verifier.status !== "passed";
  const status = verifierFailed ? "failed" : options.engine.draft.status;
  const claim = verifierFailed
    ? `The engine proposed a candidate, but the declared verifier did not pass: ${options.engine.draft.claim}`
    : options.engine.draft.claim;
  const caveats = unique([
    ...options.engine.draft.caveats,
    `Declared verifier outcome: ${options.verifier.status}.`,
    "Canopus produced this record; it is not a human acceptance decision.",
  ]);
  const base = {
    schema: "canopus.candidate.v0" as const,
    mission_id: options.mission.id,
    status,
    claim,
    artifacts: options.frozen.map((entry) => entry.artifact),
    observations: options.engine.draft.observations,
    tests: [options.verifier.record],
    costs: {
      wall_time_ms: options.budget.research_elapsed_ms,
      attempt: options.budget.attempts,
      input_tokens: options.engine.usage.input_tokens,
      output_tokens: options.engine.usage.output_tokens,
    },
    caveats,
    engine: options.engine.engine,
  };
  return parseCandidate(
    options.mission.parent_candidate === undefined
      ? base
      : {
          ...base,
          repair: {
            parent_candidate: options.mission.parent_candidate,
            reason: options.mission.repair_reason ?? "Bounded repair of the named candidate.",
          },
        },
  );
}

export function mapCandidateToReceipt(
  mission: Mission,
  candidate: Candidate,
  verifier: VerifierOutcome,
  work?: string,
): AuthoredReceiptInput {
  if (candidate.mission_id !== mission.id) {
    throw new Error("candidate belongs to a different mission");
  }
  if (candidate.artifacts.length === 0) {
    throw new Error("Receipt v1 requires at least one frozen artifact");
  }
  if (candidate.status === "success" && verifier.status !== "passed") {
    throw new Error("a success candidate requires a passing declared verifier");
  }
  if (mission.schema === "canopus.mission.v1" && mission.result_contract !== undefined) {
    const contract = mission.result_contract;
    if (
      candidate.status !== contract.candidate_status ||
      verifier.status !== contract.verifier_status ||
      mission.target !== contract.target ||
      mission.claim_type !== contract.claim_type ||
      mission.replayability !== contract.replayability
    ) {
      throw new Error("candidate does not satisfy the exact positive result contract");
    }
    const artifactKinds = new Set(candidate.artifacts.map((artifact) => artifact.kind));
    for (const kind of contract.required_artifact_kinds) {
      if (!artifactKinds.has(kind)) {
        throw new Error(`candidate is missing result-contract artifact kind ${kind}`);
      }
    }
  }
  const result =
    verifier.status === "passed"
      ? "The declared verifier exited zero on the frozen artifact set."
      : verifier.status === "failed"
        ? `The declared verifier returned nonzero exit ${verifier.record.exit_code}.`
        : `The declared verifier could not complete: ${verifier.error ?? "unspecified error"}.`;
  const evidence = [
    ...candidate.artifacts.map((artifact) => `artifact:${artifact.digest}`),
    `verifier_executable:${verifier.record.executable_digest}`,
    `verifier_stdout:${verifier.record.stdout_digest}`,
    `verifier_stderr:${verifier.record.stderr_digest}`,
  ];
  const counterevidence =
    verifier.status === "passed"
      ? []
      : [
          `verifier_outcome:${verifier.status}`,
        ];
  const prediction =
    "predicted_observable" in mission.scientific_chain
      ? { predictedObservable: mission.scientific_chain.predicted_observable }
      : { notApplicable: true as const };
  return {
    claim: candidate.claim,
    claimType: mission.claim_type,
    replayability: mission.replayability,
    artifacts: candidate.artifacts.map((artifact) => ({
      path: artifact.path,
      kind: artifact.kind,
    })),
    caveats: unique(candidate.caveats),
    ...prediction,
    performedTest: mission.scientific_chain.performed_test,
    result,
    evidence,
    counterevidence,
    ...(mission.schema === "canopus.mission.v1" && mission.execution_binding !== undefined
      ? { executionBinding: mission.execution_binding }
      : {}),
    ...(work === undefined ? {} : { work }),
  };
}

export async function installFrozenArtifacts(options: {
  landingRepo: string;
  frontier: string;
  frozen: readonly FrozenArtifactLocation[];
  maxBytes: number;
}): Promise<string[]> {
  const frontierRoot = path.resolve(options.landingRepo, options.frontier);
  const installed: string[] = [];
  for (const entry of options.frozen) {
    const target = path.resolve(frontierRoot, entry.artifact.path);
    const relative = path.relative(frontierRoot, target);
    if (
      relative === "" ||
      relative === ".." ||
      relative.startsWith(`..${path.sep}`) ||
      path.isAbsolute(relative)
    ) {
      throw new Error(`artifact path escapes the landing frontier: ${entry.artifact.path}`);
    }
    await mkdir(path.dirname(target), { recursive: true, mode: 0o700 });
    try {
      await copyFile(entry.frozenPath, target, constants.COPYFILE_EXCL);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    }
    const observed = await hashRegularFile(target, options.maxBytes);
    if (observed.digest !== entry.artifact.digest || observed.bytes !== entry.artifact.bytes) {
      throw new Error(`installed artifact ${entry.artifact.path} does not match frozen bytes`);
    }
    await chmod(target, 0o444);
    installed.push(target);
  }
  return installed;
}
