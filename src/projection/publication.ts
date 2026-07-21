import type { Mission } from "../contracts/mission.js";
import { contentDigest } from "../util/canonical.js";
import type { RunRecord } from "./run.js";
import { projectPublicRun } from "./public-run.js";

export interface PublicationBundle {
  projection: ReturnType<typeof projectPublicRun>;
  pendingCommands: {
    schema: "canopus.pending-commands.v1";
    authority: "none";
    proposal_id: string;
    commands: Array<{ purpose: string; authority: string; command: string }>;
  };
  webImport: {
    schema: "vela-web.canopus-import.v1";
    authority: "read_only";
    run_id: string;
    projection_path: "public-run.json";
    projection_root: string;
    route: "defer";
    accepted_state_delta: 0;
  };
  manifest: {
    schema: "canopus.publication-manifest.v1";
    authority: "none";
    run_id: string;
    files: Record<string, string>;
  };
}

export function buildPublicationBundle(options: {
  record: RunRecord;
  mission: Mission;
  repository: string;
}): PublicationBundle {
  const projection = projectPublicRun(options);
  const pendingCommands: PublicationBundle["pendingCommands"] = {
    schema: "canopus.pending-commands.v1",
    authority: "none",
    proposal_id: projection.policy.proposal_id,
    commands: [
      {
        purpose: "reproduce_pending_artifact",
        authority: "read_only",
        command: `vela reproduce . --proposal ${projection.policy.proposal_id} --json`,
      },
      {
        purpose: "inspect_review_material",
        authority: "read_only",
        command: `vela review show . ${projection.policy.proposal_id} --json`,
      },
      {
        purpose: "retain_independent_verifier_evidence",
        authority: "evidence_only",
        command: `vela verify attach . <attachment.json> --proposal ${projection.policy.proposal_id} --as verifier:<actor> --json`,
      },
    ],
  };
  const webImport: PublicationBundle["webImport"] = {
    schema: "vela-web.canopus-import.v1",
    authority: "read_only",
    run_id: projection.run_id,
    projection_path: "public-run.json",
    projection_root: contentDigest(projection),
    route: "defer",
    accepted_state_delta: 0,
  };
  const manifest: PublicationBundle["manifest"] = {
    schema: "canopus.publication-manifest.v1",
    authority: "none",
    run_id: projection.run_id,
    files: {
      "pending-commands.json": contentDigest(pendingCommands),
      "public-run.json": contentDigest(projection),
      "web-import.json": contentDigest(webImport),
    },
  };
  return { projection, pendingCommands, webImport, manifest };
}
