import { randomUUID } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { ActivityStore } from "./activity/store.js";
import {
  freezeArtifact,
  sealArtifactStore,
  type FrozenArtifactLocation,
} from "./artifact/freeze.js";
import { materializeDraftArtifacts } from "./artifact/materialize.js";
import { BudgetTracker } from "./budget/enforce.js";
import type { Mission, MissionRoots } from "./contracts/mission.js";
import type { FrozenArtifact } from "./contracts/candidate.js";
import type { Engine } from "./engines/engine.js";
import { engineManifest, verifierManifest } from "./evidence/manifests.js";
import { projectRun, RUN_RECORD_SCHEMA, type RunProjection, type RunRecord } from "./projection/run.js";
import {
  finalizeCandidate,
  installFrozenArtifacts,
  mapCandidateToReceipt,
} from "./receipt/map.js";
import { canonicalJson, contentDigest } from "./util/canonical.js";
import type { CommandRunner } from "./util/command.js";
import type {
  AuthoredReceiptInput,
  VelaClient,
  VelaLandCommandObservation,
} from "./vela/cli.js";
import { retainedArtifactPath } from "./vela/cli.js";
import type { LandResult, VelaCommandResponse, VelaInspection } from "./vela/types.js";
import { runVerifier } from "./verifier/run.js";
import { cleanupWorkspace, prepareWorkspace, type WorkspacePaths } from "./workspace/prepare.js";

export interface VelaPort {
  assertRoots(repoRoot: string, frontier: string, expected: MissionRoots): Promise<VelaInspection>;
  inspect(repoRoot: string, frontier: string): Promise<VelaInspection>;
  work(
    mission: Mission,
    repoRoot: string,
    target: string,
    expected: MissionRoots,
  ): Promise<VelaCommandResponse>;
  landAuthoredCommand(
    mission: Mission,
    repoRoot: string,
    input: AuthoredReceiptInput,
    expected: MissionRoots,
  ): Promise<VelaLandCommandObservation>;
  parseLandCommand(observation: VelaLandCommandObservation): Record<string, unknown>;
  validateLandResult(mission: Mission, raw: Record<string, unknown>): LandResult;
  verifyReceiptBinding(
    mission: Mission,
    repoRoot: string,
    landing: LandResult,
    input: AuthoredReceiptInput,
    artifacts: readonly FrozenArtifact[],
  ): Promise<void>;
}

export interface CanopusRunOptions {
  mission: Mission;
  sourceRepo: string;
  runRoot: string;
  vela: VelaPort | VelaClient;
  engine: Engine;
  verifierRunner?: CommandRunner;
}

export interface CanopusRunResult {
  record: RunRecord;
  projection: RunProjection;
  paths: WorkspacePaths;
}

function sameRoots(left: MissionRoots, right: MissionRoots): boolean {
  return (
    left.git_commit === right.git_commit &&
    left.git_tree === right.git_tree &&
    left.vela_event_log === right.vela_event_log &&
    left.vela_snapshot === right.vela_snapshot
  );
}

function recordField(
  value: Record<string, unknown>,
  key: string,
  at: string,
): Record<string, unknown> {
  const field = value[key];
  if (typeof field !== "object" || field === null || Array.isArray(field)) {
    throw new Error(`${at}.${key} is not an object`);
  }
  return field as Record<string, unknown>;
}

function exactText(value: unknown, expected: string, at: string): void {
  if (value !== expected) {
    throw new Error(`${at} mismatch: expected ${expected}, observed ${String(value)}`);
  }
}

function assertWorkBinding(
  mission: Mission,
  response: VelaCommandResponse,
  postWork: VelaInspection,
): void {
  const claim = recordField(response.value, "claim", "vela work");
  const session = recordField(response.value, "session", "vela work");
  const publication = recordField(claim, "publication", "vela work.claim");
  exactText(response.value.command, "work", "vela work.command");
  exactText(claim.state_root_before, mission.roots.vela_event_log, "vela work.claim.state_root_before");
  exactText(session.base_event_log_root, mission.roots.vela_event_log, "vela work.session.base_event_log_root");
  exactText(session.source_git_commit_oid, mission.roots.git_commit, "vela work.session.source_git_commit_oid");
  exactText(claim.state_root_after, postWork.roots.vela_event_log, "vela work.claim.state_root_after");
  const publicationState = publication.state;
  if (
    publicationState !== "committed_local" &&
    publicationState !== "pushed" &&
    publicationState !== "unchanged"
  ) {
    throw new Error(`vela work lease was not published: ${String(publicationState)}`);
  }
  exactText(publication.commit, postWork.roots.git_commit, "vela work publication commit");
  if (
    postWork.roots.git_commit === mission.roots.git_commit ||
    postWork.roots.git_tree === mission.roots.git_tree
  ) {
    throw new Error("vela work did not publish an exact lease delta");
  }
}

function publicationState(land: LandResult): string {
  const value = land.publication.state;
  return typeof value === "string" ? value : "unknown";
}

async function writeExclusive(file: string, value: unknown): Promise<void> {
  await writeFile(file, canonicalJson(value), { flag: "wx", mode: 0o600 });
}

export async function runCanopus(options: CanopusRunOptions): Promise<CanopusRunResult> {
  const runId = `run_${randomUUID()}`;
  const paths = await prepareWorkspace({
    sourceRepo: options.sourceRepo,
    runRoot: options.runRoot,
    gitCommit: options.mission.roots.git_commit,
    gitTree: options.mission.roots.git_tree,
  });
  const activity = await ActivityStore.open(path.join(paths.root, "activity.jsonl"), runId);
  const budget = new BudgetTracker(options.mission.budgets);
  let phase = "initializing";
  let landingCommand: VelaLandCommandObservation | undefined;
  let rawLanding: Record<string, unknown> | undefined;
  let parsedLanding: LandResult | undefined;

  try {
    await activity.append("run.started", {
      mission_id: options.mission.id,
      mission_digest: contentDigest(options.mission),
    });
    await activity.append("workspace.prepared", {
      input: "input",
      landing: "landing",
      output: "output",
      artifacts: "artifacts",
    });

    await Promise.all([
      options.vela.assertRoots(paths.input, options.mission.frontier, options.mission.roots),
      options.vela.assertRoots(paths.landing, options.mission.frontier, options.mission.roots),
    ]);
    await activity.append("roots.verified", { roots: options.mission.roots });

    const work = await options.vela.work(
      options.mission,
      paths.landing,
      options.mission.target,
      options.mission.roots,
    );
    const postWork = await options.vela.inspect(paths.landing, options.mission.frontier);
    assertWorkBinding(options.mission, work, postWork);
    await activity.append("work.claimed", {
      target: options.mission.target,
      roots: postWork.roots,
    });

    await activity.append("engine.started", {
      engine: options.engine.name,
      role: options.mission.role,
    });
    const engine = await options.engine.run({
      mission: options.mission,
      briefing: work.value,
      paths,
      budget,
    });
    await activity.append("engine.completed", {
      status: engine.draft.status,
      engine: engine.engine,
      usage: engine.usage,
      events_digest: engine.eventsDigest,
      action_types: engine.actionTypes,
    });

    await materializeDraftArtifacts({
      draft: engine.draft,
      outputRoot: paths.output,
      maxTotalBytes: options.mission.budgets.max_artifact_bytes,
    });
    const frozen: FrozenArtifactLocation[] = [];
    for (const artifact of engine.draft.artifacts) {
      const entry = await freezeArtifact({
        sourceRoot: paths.output,
        artifactRoot: paths.artifacts,
        path: artifact.path,
        kind: artifact.kind,
        maxBytes: budget.remainingArtifactBytes(),
      });
      budget.addArtifact(entry.artifact.bytes);
      frozen.push(entry);
      await activity.append("artifact.frozen", { artifact: entry.artifact });
    }
    const supporting = [engineManifest(engine), verifierManifest(options.mission)];
    for (const manifest of supporting) {
      const source = path.join(paths.output, manifest.path);
      await mkdir(path.dirname(source), { recursive: true, mode: 0o700 });
      await writeExclusive(source, manifest.value);
      const entry = await freezeArtifact({
        sourceRoot: paths.output,
        artifactRoot: paths.artifacts,
        path: manifest.path,
        kind: manifest.kind,
        maxBytes: budget.remainingArtifactBytes(),
      });
      budget.addArtifact(entry.artifact.bytes);
      frozen.push(entry);
      await activity.append("artifact.frozen", { artifact: entry.artifact });
    }
    await sealArtifactStore(paths.artifacts);

    const verifier = await runVerifier({
      mission: options.mission,
      paths,
      artifacts: frozen,
      budget,
      ...(options.verifierRunner === undefined ? {} : { runner: options.verifierRunner }),
    });
    await activity.append("verifier.completed", {
      status: verifier.status,
      record: verifier.record,
      sandbox: verifier.sandbox,
      ...(verifier.error === undefined ? {} : { error: verifier.error }),
    });

    const candidate = finalizeCandidate({
      mission: options.mission,
      engine,
      frozen,
      verifier,
      budget: budget.snapshot(),
      supportingArtifacts: supporting,
    });
    const candidateDigest = contentDigest(candidate);
    await activity.append("candidate.finalized", {
      candidate_digest: candidateDigest,
      status: candidate.status,
    });

    await installFrozenArtifacts({
      landingRepo: paths.landing,
      frontier: options.mission.frontier,
      frozen,
      maxBytes: options.mission.budgets.max_artifact_bytes,
    });
    const preLand = await options.vela.assertRoots(
      paths.landing,
      options.mission.frontier,
      postWork.roots,
    );
    const receipt = mapCandidateToReceipt(
      options.mission,
      candidate,
      verifier,
      options.mission.target,
    );
    await activity.append("receipt.mapped", {
      candidate_digest: candidateDigest,
      evidence: receipt.evidence,
      counterevidence: receipt.counterevidence,
    });
    phase = "landing_command";
    landingCommand = await options.vela.landAuthoredCommand(
      options.mission,
      paths.landing,
      receipt,
      preLand.roots,
    );
    await writeExclusive(path.join(paths.root, "landing-command.json"), {
      schema: "canopus.landing-command.v0",
      authority: "observed_process_effect",
      ...landingCommand,
    });
    rawLanding = options.vela.parseLandCommand(landingCommand);
    const rawLandingDigest = contentDigest(rawLanding);
    await writeExclusive(path.join(paths.root, "landing-observation.json"), {
      schema: "canopus.landing-observation.v0",
      authority: "observed_vela_effect",
      raw_digest: rawLandingDigest,
      raw: rawLanding,
    });
    await activity.append("landing.observed", {
      raw_digest: rawLandingDigest,
      observation: "landing-observation.json",
    });
    phase = "landing_validation";
    const landing = options.vela.validateLandResult(options.mission, rawLanding);
    parsedLanding = landing;
    phase = "receipt_binding";
    await options.vela.verifyReceiptBinding(
      options.mission,
      paths.landing,
      landing,
      receipt,
      candidate.artifacts,
    );
    await activity.append("landing.bound", {
      receipt_root: landing.receiptRoot,
      raw_digest: rawLandingDigest,
    });
    await activity.append("landing.completed", {
      receipt_root: landing.receiptRoot,
      proposal_id: landing.proposalId,
      route: landing.route,
      original_route: landing.originalRoute,
      accepted_event_delta: landing.acceptedEventDelta,
      publication_state: publicationState(landing),
    });

    const final = await options.vela.inspect(paths.landing, options.mission.frontier);
    phase = "clean_clone_reproduction";
    const reproductionRoot = `${paths.root}-reproduce`;
    const reproductionPaths = await prepareWorkspace({
      sourceRepo: paths.landing,
      runRoot: reproductionRoot,
      gitCommit: final.roots.git_commit,
      gitTree: final.roots.git_tree,
    });
    let reproductionVerifier;
    let reproductionInspection;
    try {
      reproductionInspection = await options.vela.assertRoots(
        reproductionPaths.input,
        options.mission.frontier,
        final.roots,
      );
      await options.vela.verifyReceiptBinding(
        options.mission,
        reproductionPaths.input,
        landing,
        receipt,
        candidate.artifacts,
      );
      const reproducedArtifacts = candidate.artifacts.map((artifact) => ({
        artifact,
        frozenPath: retainedArtifactPath(
          reproductionPaths.input,
          options.mission.frontier,
          artifact.digest,
        ),
      }));
      reproductionVerifier = await runVerifier({
        mission: options.mission,
        paths: reproductionPaths,
        artifacts: reproducedArtifacts,
        budget,
        ...(options.verifierRunner === undefined ? {} : { runner: options.verifierRunner }),
      });
    } finally {
      await cleanupWorkspace(reproductionPaths);
    }
    const reproduced =
      sameRoots(reproductionInspection.roots, final.roots) &&
      reproductionVerifier.status === verifier.status &&
      reproductionVerifier.record.stdout_digest === verifier.record.stdout_digest &&
      reproductionVerifier.record.stderr_digest === verifier.record.stderr_digest;
    if (!reproduced) {
      throw new Error("clean-clone reproduction did not match the landed run");
    }
    await activity.append("reproduction.completed", {
      matched: true,
      roots: reproductionInspection.roots,
      verifier_status: reproductionVerifier.status,
    });
    await rm(paths.velaHome, { recursive: true, force: true });
    const record: RunRecord = {
      schema: RUN_RECORD_SCHEMA,
      run_id: runId,
      status: "completed",
      authority: "non_authoritative",
      external_gate_credit: false,
      mission: {
        id: options.mission.id,
        target: options.mission.target,
        digest: contentDigest(options.mission),
        starting_roots: options.mission.roots,
      },
      candidate: {
        digest: candidateDigest,
        status: candidate.status,
        claim: candidate.claim,
        artifacts: candidate.artifacts,
        caveats: candidate.caveats,
      },
      verifier: {
        status: verifier.status,
        sandbox: verifier.sandbox,
        record: verifier.record,
      },
      landing: {
        operation_id: landing.operationId,
        receipt_root: landing.receiptRoot,
        proposal_id: landing.proposalId,
        route: landing.route,
        original_route: landing.originalRoute,
        accepted_event_delta: landing.acceptedEventDelta,
        publication_state: publicationState(landing),
      },
      final_roots: final.roots,
      reproduction: {
        matched: reproduced,
        roots: reproductionInspection.roots,
        verifier_status: reproductionVerifier.status,
        stdout_digest: reproductionVerifier.record.stdout_digest,
        stderr_digest: reproductionVerifier.record.stderr_digest,
      },
      budget: budget.snapshot(),
    };
    const projection = projectRun(record);
    phase = "record_finalization";
    await writeExclusive(path.join(paths.root, "candidate.json"), candidate);
    await writeExclusive(path.join(paths.root, "projection.json"), projection);
    await writeExclusive(path.join(paths.root, "run.json"), record);
    await activity.append("projection.written", {
      candidate_digest: candidateDigest,
      run_digest: contentDigest(record),
      projection_digest: contentDigest(projection),
    });
    await activity.append("run.completed", {
      receipt_root: landing.receiptRoot,
      candidate_digest: candidateDigest,
    });
    return { record, projection, paths };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    let recovery: Record<string, unknown> | undefined;
    if (phase.startsWith("landing_") || phase === "receipt_binding" || phase === "clean_clone_reproduction" || phase === "record_finalization") {
      let observedRoots: MissionRoots | null = null;
      let inspectionError: string | null = null;
      try {
        observedRoots = (await options.vela.inspect(paths.landing, options.mission.frontier)).roots;
      } catch (inspectionFailure) {
        inspectionError =
          inspectionFailure instanceof Error ? inspectionFailure.message : String(inspectionFailure);
      }
      recovery = {
        schema: "canopus.landing-recovery.v0",
        authority: "observed_vela_effect",
        phase,
        command: landingCommand ?? null,
        raw_digest: rawLanding === undefined ? null : contentDigest(rawLanding),
        raw: rawLanding ?? null,
        parsed:
          parsedLanding === undefined
            ? null
            : {
                operation_id: parsedLanding.operationId,
                receipt_root: parsedLanding.receiptRoot,
                proposal_id: parsedLanding.proposalId,
                route: parsedLanding.route,
                original_route: parsedLanding.originalRoute,
                accepted_event_delta: parsedLanding.acceptedEventDelta,
                publication: parsedLanding.publication,
              },
        observed_roots: observedRoots,
        inspection_error: inspectionError,
      };
      await writeExclusive(path.join(paths.root, "landing-recovery.json"), recovery).catch(
        () => undefined,
      );
    }
    await activity.append("run.failed", {
      error: message,
      phase,
      landing_observed: landingCommand !== undefined,
    }).catch(() => undefined);
    await writeExclusive(path.join(paths.root, "failure.json"), {
      schema: "canopus.failure.v0",
      run_id: runId,
      error: message,
      phase,
      landing_observed: landingCommand !== undefined,
      landing_recovery: recovery === undefined ? null : "landing-recovery.json",
      activity_tip: activity.tip,
      authority: "non_authoritative",
    }).catch(() => undefined);
    throw error;
  }
}
