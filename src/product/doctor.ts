import { mkdir, mkdtemp, realpath, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { objectAt, sha256At, stringAt } from "../contracts/validation.js";
import { isolatedEnvironment, runCommand, type CommandRunner } from "../util/command.js";
import { sha256Bytes } from "../util/canonical.js";
import {
  listProductProfiles,
  loadProductProfile,
  stageProfileCapsule,
  type ProductProfile,
} from "./profile.js";
import { runtimeIdentity, type RuntimeIdentity } from "./runtime.js";

export interface ProductDoctorResult {
  schema: "canopus.doctor.v1";
  ok: boolean;
  authority: "read_only_diagnostic";
  frontier: {
    path: string;
    git_commit: string;
    git_tree: string;
    event_log_root: string;
    snapshot_root: string;
    clean: boolean;
    strict_blockers: number;
  };
  offer: { target: string; rank: number; profile: string };
  runtimes: {
    vela: RuntimeIdentity;
    codex: RuntimeIdentity;
    git: RuntimeIdentity;
    docker: RuntimeIdentity & { daemon: "ready"; verifier_image: string };
  };
  capsule: { sha256: string; source: "packaged" };
  next_action: string;
}

async function jsonCommand(options: {
  runner: CommandRunner;
  argv: readonly string[];
  cwd: string;
  home: string;
  label: string;
}): Promise<Record<string, unknown>> {
  const result = await options.runner({
    argv: options.argv,
    cwd: options.cwd,
    env: isolatedEnvironment(options.home),
    timeoutMs: 120_000,
    maxOutputBytes: 16 * 1024 * 1024,
  });
  if (result.exitCode !== 0) {
    throw new Error(
      `${options.label} failed: stdout_sha256=${sha256Bytes(result.stdout)}; ` +
      `stderr_sha256=${sha256Bytes(result.stderr)}`,
    );
  }
  return objectAt(JSON.parse(result.stdout.toString("utf8")) as unknown, options.label);
}

function nonnegative(value: unknown, at: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${at} must be a nonnegative integer`);
  }
  return value;
}

export function selectProductOffer(
  offer: Record<string, unknown>,
  profile: ProductProfile,
  requestedTarget?: string,
): { target: Record<string, unknown>; targetId: string; rank: number } {
  const targets = offer.targets;
  if (!Array.isArray(targets) || targets.length === 0) {
    throw new Error("vela next returned no producer target");
  }
  if (requestedTarget !== undefined && requestedTarget !== profile.target) {
    throw new Error(
      `registered profile ${profile.name} targets ${profile.target}, not requested target ${requestedTarget}`,
    );
  }
  const candidates = requestedTarget === undefined
    ? [objectAt(targets[0], "vela next.targets[0]")]
    : targets
        .map((value, index) => objectAt(value, `vela next.targets[${index}]`))
        .filter((value) => value.target_id === requestedTarget);
  if (candidates.length !== 1) {
    throw new Error(
      `requested target ${requestedTarget ?? profile.target} must appear exactly once in the ranked producer offers; ` +
      `observed ${candidates.length}`,
    );
  }
  const target = candidates[0] as Record<string, unknown>;
  const targetId = stringAt(target.target_id, "vela next target_id", { min: 1, max: 256 });
  if (targetId !== profile.target) {
    throw new Error(
      `first ranked target is ${targetId}, but registered profile ${profile.name} targets ` +
      `${profile.target}; Canopus will not skip rank 1, so freeze a verifier profile for ${targetId} before running`,
    );
  }
  return {
    target,
    targetId,
    rank: nonnegative(target.rank, "vela next target rank"),
  };
}

export async function resolveProductProfile(
  offer: Record<string, unknown>,
  profileName?: string,
  requestedTarget?: string,
): Promise<ProductProfile> {
  if (profileName !== undefined) return loadProductProfile(profileName);
  const targets = offer.targets;
  if (!Array.isArray(targets) || targets.length === 0) {
    throw new Error("vela next returned no producer target");
  }
  const selectedOffer = requestedTarget === undefined
    ? objectAt(targets[0], "vela next.targets[0]")
    : targets
        .map((value, index) => objectAt(value, `vela next.targets[${index}]`))
        .find((value) => value.target_id === requestedTarget);
  if (selectedOffer === undefined) {
    throw new Error(`requested target ${requestedTarget} is not a current producer offer`);
  }
  const target = stringAt(selectedOffer.target_id, "vela next target_id", { min: 1, max: 256 });
  const matches: ProductProfile[] = [];
  for (const name of await listProductProfiles()) {
    try {
      const candidate = await loadProductProfile(name);
      if (candidate.target === target) matches.push(candidate);
    } catch (error) {
      if (!(error instanceof Error) || !/replay-only/u.test(error.message)) throw error;
    }
  }
  if (matches.length === 0) {
    throw new Error(`no runnable profile is registered for producer target ${target}`);
  }
  if (matches.length !== 1) {
    throw new Error(
      `multiple runnable profiles are registered for producer target ${target}: ` +
      `${matches.map((profile) => profile.name).sort().join(", ")}; select one with --profile`,
    );
  }
  return matches[0]!;
}

export async function doctorProduct(options: {
  frontier: string;
  profileName?: string;
  requestedTarget?: string;
  runner?: CommandRunner;
}): Promise<{ public: ProductDoctorResult; profile: ProductProfile }> {
  const runner = options.runner ?? runCommand;
  const frontier = await realpath(options.frontier);
  const runtime = await mkdtemp(path.join(os.tmpdir(), "canopus-doctor-"));
  try {
    const [vela, codex, git, docker] = await Promise.all([
      runtimeIdentity({ name: "vela", cwd: frontier, home: runtime, runner }),
      runtimeIdentity({ name: "codex", cwd: frontier, home: runtime, runner }),
      runtimeIdentity({ name: "git", cwd: frontier, home: runtime, runner }),
      runtimeIdentity({ name: "docker", cwd: frontier, home: runtime, runner }),
    ]);
    if (vela.version !== "vela 0.901.0") {
      throw new Error(`Canopus v0.3.0 requires vela 0.901.0, observed ${vela.version}`);
    }
    if (codex.version !== "codex-cli 0.144.6") {
      throw new Error(`registered worker requires codex-cli 0.144.6, observed ${codex.version}`);
    }
    const [status, offer, gitStatus, daemon] = await Promise.all([
      jsonCommand({ runner, argv: [vela.binary, "status", ".", "--json"], cwd: frontier, home: runtime, label: "vela status" }),
      jsonCommand({ runner, argv: [vela.binary, "next", ".", "--limit", "128", "--json"], cwd: frontier, home: runtime, label: "vela next" }),
      runner({ argv: [git.binary, "status", "--porcelain=v1", "--untracked-files=all"], cwd: frontier, env: isolatedEnvironment(runtime), timeoutMs: 30_000, maxOutputBytes: 8 * 1024 * 1024 }),
      runner({ argv: [docker.binary, "info", "--format={{.ServerVersion}}"], cwd: frontier, env: isolatedEnvironment(runtime), timeoutMs: 30_000, maxOutputBytes: 64 * 1024 }),
    ]);
    if (gitStatus.exitCode !== 0 || gitStatus.stderr.length !== 0) throw new Error("git status failed");
    const clean = gitStatus.stdout.length === 0;
    if (!clean) throw new Error("frontier checkout must be clean before Canopus runs");
    if (daemon.exitCode !== 0 || daemon.stdout.toString("utf8").trim() === "") {
      throw new Error("Docker daemon is not ready");
    }
    if (status.schema !== "vela.status.v1" || offer.schema !== "vela.offer.v1") {
      throw new Error("frontier did not return the Vela 0.9 compact contracts");
    }
    const profile = await resolveProductProfile(offer, options.profileName, options.requestedTarget);
    const image = await runner({
      argv: [docker.binary, "image", "inspect", "--format={{.Id}}", profile.verifier_image],
      cwd: frontier,
      env: isolatedEnvironment(runtime),
      timeoutMs: 30_000,
      maxOutputBytes: 64 * 1024,
    });
    const imageId = image.stdout.toString("utf8").trim();
    if (image.exitCode !== 0 || image.stderr.length !== 0 || imageId !== profile.verifier_image) {
      throw new Error("registered verifier image is unavailable or drifted");
    }
    const selected = selectProductOffer(offer, profile, options.requestedTarget);
    const roots = objectAt(status.roots, "vela status.roots");
    const gitState = objectAt(status.git, "vela status.git");
    const integrity = objectAt(status.integrity, "vela status.integrity");
    const staging = path.join(runtime, "capsule-build");
    await mkdir(staging, { mode: 0o700 });
    const capsule = await stageProfileCapsule({ profile, stagingRoot: staging });
    return {
      profile,
      public: {
        schema: "canopus.doctor.v1",
        ok: true,
        authority: "read_only_diagnostic",
        frontier: {
          path: frontier,
          git_commit: stringAt(gitState.commit, "vela status.git.commit", { min: 40, max: 64 }),
          git_tree: stringAt(gitState.tree, "vela status.git.tree", { min: 40, max: 64 }),
          event_log_root: sha256At(roots.event_log, "vela status.roots.event_log"),
          snapshot_root: sha256At(roots.snapshot, "vela status.roots.snapshot"),
          clean,
          strict_blockers: nonnegative(integrity.blocker_count, "vela status.integrity.blocker_count"),
        },
        offer: {
          target: selected.targetId,
          rank: selected.rank,
          profile: profile.name,
        },
        runtimes: {
          vela,
          codex,
          git,
          docker: { ...docker, daemon: "ready", verifier_image: imageId },
        },
        capsule: {
          sha256: profile.capsule_sha256,
          source: capsule.source,
        },
        next_action: options.requestedTarget === undefined
          ? `canopus run ${frontier} --first`
          : `canopus run ${frontier} --target ${selected.targetId}`,
      },
    };
  } finally {
    await rm(runtime, { recursive: true, force: true });
  }
}
