import type { Mission } from "../contracts/mission.js";
import { contentDigest } from "../util/canonical.js";
import type { RunRecord } from "./run.js";

export const PUBLIC_RUN_SCHEMA = "canopus.public-run.v1" as const;

export interface PublicRunProjection {
  schema: typeof PUBLIC_RUN_SCHEMA;
  authority: "read_only_projection";
  run_id: string;
  mission: {
    id: string;
    target: string;
    digest: string;
    registration_kind: "profile" | "mission_bundle";
    registration_name: string;
    registration_root: string;
    target_packet_root: string;
    model: string;
  };
  activity: {
    worker: "success";
    verifier: "pass";
    clean_clone_replay: "matched";
  };
  claim: string;
  caveats: string[];
  artifact_roots: string[];
  verifier_root: string;
  receipt_root: string;
  policy: {
    route: "defer";
    proposal_id: string;
    accepted_state_delta: 0;
  };
  usage: {
    research_elapsed_ms: number;
    research_processes: number;
    observed_tokens: number;
    attempts: number;
  };
  source: {
    repository: string;
    commit: string;
    event_log_root: string;
    snapshot_root: string;
  };
  final: {
    commit: string;
    event_log_root: string;
    snapshot_root: string;
  };
  reproduction: {
    commands: string[];
  };
  nonclaims: string[];
}

function publicRepository(value: string): { url: string; directory: string } {
  if (!/^https:\/\/github\.com\/vela-science\/[a-z0-9-]+(?:\.git)?$/u.test(value)) {
    throw new Error("public run repository must be a public vela-science GitHub URL");
  }
  const url = value.endsWith(".git") ? value.slice(0, -4) : value;
  const directory = new URL(url).pathname.split("/").at(-1);
  if (directory === undefined || directory === "") throw new Error("public run repository is invalid");
  return { url, directory };
}

function publicCaveat(value: string): string {
  if (/verif(?:y|ication|ier).*(?:pending|has not run)|pending.*verif(?:y|ication|ier)/iu.test(value)) {
    return "The worker handed off without verifier authority; Canopus subsequently recorded the separate verifier pass shown in this projection.";
  }
  return value;
}

function shellArgument(value: string): string {
  return `'${value.replaceAll("'", `'"'"'`)}'`;
}

export function projectPublicRun(options: {
  record: RunRecord;
  mission: Mission;
  repository: string;
}): PublicRunProjection {
  const { record, mission } = options;
  if (mission.schema !== "canopus.mission.v1") {
    throw new Error("public run export requires a closed Mission v1 bundle");
  }
  if (contentDigest(mission) !== record.mission.digest) {
    throw new Error("public run mission bytes do not match the completed run");
  }
  if (mission.id !== record.mission.id || mission.target !== record.mission.target) {
    throw new Error("public run mission identity does not match the completed run");
  }
  if (record.candidate.status !== "success" || record.candidate.artifacts.length < 1) {
    throw new Error("public run export requires at least one successful bounded artifact");
  }
  if (record.verifier.status !== "passed" || record.reproduction.verifier_status !== "passed") {
    throw new Error("public run export requires verifier pass in both landing and replay");
  }
  if (!record.reproduction.matched) {
    throw new Error("public run export requires matched clean-clone replay");
  }
  if (record.landing.route !== "defer" || record.landing.accepted_event_delta !== 0) {
    throw new Error("public run export requires Defer with zero accepted-state delta");
  }
  const repository = publicRepository(options.repository);
  return {
    schema: PUBLIC_RUN_SCHEMA,
    authority: "read_only_projection",
    run_id: record.run_id,
    mission: {
      id: mission.id,
      target: mission.target,
      digest: record.mission.digest,
      registration_kind: mission.profile === undefined ? "mission_bundle" : "profile",
      registration_name: mission.profile?.name ?? mission.id,
      registration_root: mission.profile?.root ?? record.mission.digest,
      target_packet_root: mission.target_packet.sha256,
      model: mission.worker.model,
    },
    activity: {
      worker: "success",
      verifier: "pass",
      clean_clone_replay: "matched",
    },
    claim: record.candidate.claim,
    caveats: [...new Set(record.candidate.caveats.map(publicCaveat))],
    artifact_roots: record.candidate.artifacts.map((artifact) => artifact.digest).sort(),
    verifier_root: contentDigest(record.verifier),
    receipt_root: record.landing.receipt_root,
    policy: {
      route: "defer",
      proposal_id: record.landing.proposal_id,
      accepted_state_delta: 0,
    },
    usage: {
      research_elapsed_ms: record.budget.research_elapsed_ms,
      research_processes: record.budget.research_processes,
      observed_tokens: record.budget.observed_tokens,
      attempts: record.budget.attempts,
    },
    source: {
      repository: repository.url,
      commit: record.mission.starting_roots.git_commit,
      event_log_root: record.mission.starting_roots.vela_event_log,
      snapshot_root: record.mission.starting_roots.vela_snapshot,
    },
    final: {
      commit: record.final_roots.git_commit,
      event_log_root: record.final_roots.vela_event_log,
      snapshot_root: record.final_roots.vela_snapshot,
    },
    reproduction: {
      commands: [
        `git clone ${repository.url}.git`,
        `cd ${repository.directory}`,
        `git checkout ${record.final_roots.git_commit}`,
        ...mission.allowed_paths.map((artifact) => `vela reproduce ${shellArgument(artifact)}`),
      ],
    },
    nonclaims: [
      "Verifier success is not scientific acceptance.",
      "The bounded result does not establish maximality or settle the broader scientific problem.",
      "Canopus did not sign or perform a human decision.",
    ],
  };
}
