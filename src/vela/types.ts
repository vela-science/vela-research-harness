import type { LandRoute, MissionRoots } from "../contracts/mission.js";

export interface VelaInspection {
  version: string;
  roots: MissionRoots;
  check: Record<string, unknown>;
  proof: Record<string, unknown>;
}

export interface VelaCommandResponse {
  ok: true;
  value: Record<string, unknown>;
}

export interface LandResult {
  operationId: string;
  receiptRoot: string;
  recordId: string;
  proposalId: string;
  findingId: string;
  route: LandRoute | "exact_retry";
  originalRoute: LandRoute | null;
  rawRoute: string;
  detail: string;
  acceptedEventCountBefore: number | null;
  acceptedEventCountAfter: number | null;
  acceptedEventDelta: number | null;
  publication: Record<string, unknown>;
  raw: Record<string, unknown>;
}
