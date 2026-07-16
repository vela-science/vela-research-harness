export const ACTIVITY_SCHEMA = "canopus.activity.v0" as const;

export const ACTIVITY_TYPES = [
  "run.started",
  "workspace.prepared",
  "roots.verified",
  "target.offered",
  "work.claimed",
  "engine.started",
  "engine.completed",
  "artifact.frozen",
  "verifier.completed",
  "candidate.finalized",
  "receipt.mapped",
  "landing.observed",
  "landing.bound",
  "landing.completed",
  "reproduction.completed",
  "projection.written",
  "run.completed",
  "run.failed",
] as const;

export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export interface ActivityEventBody {
  schema: typeof ACTIVITY_SCHEMA;
  run_id: string;
  sequence: number;
  at: string;
  type: ActivityType;
  previous: string | null;
  payload: Record<string, unknown>;
}

export interface ActivityEvent extends ActivityEventBody {
  event_digest: string;
}
