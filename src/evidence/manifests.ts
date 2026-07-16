import type { Mission } from "../contracts/mission.js";
import type { EngineResult } from "../engines/engine.js";
import { contentDigest } from "../util/canonical.js";

export interface SupportingArtifactSpec {
  path: string;
  kind: "engine-manifest" | "verifier-manifest";
  value: Record<string, unknown>;
}

function manifestPath(kind: SupportingArtifactSpec["kind"], value: unknown): string {
  const directory = kind === "engine-manifest" ? "engine-manifests" : "verifier-manifests";
  return `canopus/${directory}/${contentDigest(value).slice("sha256:".length)}.json`;
}

export function engineManifest(engine: EngineResult): SupportingArtifactSpec {
  const value = {
    schema: "canopus.engine-manifest.v0",
    engine: engine.engine,
    usage: engine.usage,
    wall_time_ms: engine.wallTimeMs,
    event_types: engine.eventTypes,
    action_types: engine.actionTypes,
    events_sha256: engine.eventsDigest,
    stderr_sha256: engine.stderrDigest,
  };
  return { path: manifestPath("engine-manifest", value), kind: "engine-manifest", value };
}

export function verifierManifest(mission: Mission): SupportingArtifactSpec {
  const value = {
    schema: "canopus.verifier-manifest.v0",
    capsule_path: mission.verifier.argv[0],
    executable_sha256: mission.verifier.executable_sha256,
    argv_template: mission.verifier.argv,
    cwd: mission.verifier.cwd,
    sandbox: {
      backend: "macos_seatbelt",
      network: "deny",
      persistent_writes: "deny",
      process_fork: "deny",
    },
    platform: { os: "darwin", arch: process.arch },
  };
  return { path: manifestPath("verifier-manifest", value), kind: "verifier-manifest", value };
}
