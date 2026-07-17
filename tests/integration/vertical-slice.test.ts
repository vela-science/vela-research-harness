import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { chmod, copyFile, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import test from "node:test";

import {
  ROLES,
  type Mission,
  type MissionRole,
  type MissionRoots,
} from "../../src/contracts/mission.js";
import type { FrozenArtifact } from "../../src/contracts/candidate.js";
import { FakeEngine } from "../../src/engines/fake.js";
import { projectRun } from "../../src/projection/run.js";
import { runCanopus, validateTargetOffer, type VelaPort } from "../../src/run.js";
import type { CommandRunner } from "../../src/util/command.js";
import { sha256Bytes } from "../../src/util/canonical.js";
import {
  validateLandResult,
  type AuthoredReceiptInput,
  type VelaLandCommandObservation,
} from "../../src/vela/cli.js";
import type { LandResult, VelaCommandResponse, VelaInspection } from "../../src/vela/types.js";

const exec = promisify(execFile);
const scientificRoot = `sha256:${"a".repeat(64)}`;

async function git(cwd: string, ...args: string[]): Promise<string> {
  const result = await exec("git", args, { cwd, encoding: "utf8" });
  return result.stdout.trim();
}

async function sourceRepository(): Promise<{
  parent: string;
  repo: string;
  roots: MissionRoots;
  verifierDigest: string;
}> {
  const parent = await mkdtemp(path.join(os.tmpdir(), "canopus-vertical-"));
  const repo = path.join(parent, "source");
  await mkdir(path.join(repo, "frontier"), { recursive: true });
  await git(repo, "init", "-b", "main");
  await git(repo, "config", "user.name", "Canopus Test");
  await git(repo, "config", "user.email", "canopus@example.invalid");
  await writeFile(path.join(repo, "frontier/base.txt"), "accepted base\n");
  const verifier = path.join(repo, "frontier", "verifier");
  await copyFile("/usr/bin/true", verifier);
  await chmod(verifier, 0o555);
  const verifierDigest = sha256Bytes(await readFile(verifier));
  await git(repo, "add", "frontier/base.txt", "frontier/verifier");
  await git(repo, "commit", "--no-gpg-sign", "-m", "accepted base");
  return {
    parent,
    repo,
    verifierDigest,
    roots: {
      git_commit: await git(repo, "rev-parse", "HEAD^{commit}"),
      git_tree: await git(repo, "rev-parse", "HEAD^{tree}"),
      vela_event_log: scientificRoot,
      vela_snapshot: scientificRoot,
    },
  };
}

class FakeVela implements VelaPort {
  public authored: AuthoredReceiptInput | undefined;
  public nextCalls = 0;
  public nextRoot: string | undefined;
  readonly #failBinding: boolean;

  public constructor(failBinding = false) {
    this.#failBinding = failBinding;
  }

  public async inspect(repoRoot: string): Promise<VelaInspection> {
    return {
      version: "0.800.19",
      roots: {
        git_commit: await git(repoRoot, "rev-parse", "HEAD^{commit}"),
        git_tree: await git(repoRoot, "rev-parse", "HEAD^{tree}"),
        vela_event_log: scientificRoot,
        vela_snapshot: scientificRoot,
      },
      check: { ok: true },
      proof: { ok: true },
    };
  }

  public async assertRoots(
    repoRoot: string,
    _frontier: string,
    expected: MissionRoots,
  ): Promise<VelaInspection> {
    const observed = await this.inspect(repoRoot);
    assert.deepEqual(observed.roots, expected);
    return observed;
  }

  public async next(mission: Mission, repoRoot: string): Promise<VelaCommandResponse> {
    this.nextCalls += 1;
    this.nextRoot = repoRoot;
    return {
      ok: true,
      value: {
        ok: true,
        command: "next",
        targets: [
          {
            id: mission.target,
            lane: "attack",
            next_command: `vela work ${mission.target}`,
          },
        ],
      },
    };
  }

  public async work(
    mission: Mission,
    repoRoot: string,
    target: string,
    _expected: MissionRoots,
  ): Promise<VelaCommandResponse> {
    await writeFile(path.join(repoRoot, "frontier/.fake-work-lease"), `${target}\n`);
    await git(repoRoot, "add", "frontier/.fake-work-lease");
    await git(
      repoRoot,
      "-c",
      "user.name=Canopus Test",
      "-c",
      "user.email=canopus@example.invalid",
      "commit",
      "--no-gpg-sign",
      "-m",
      "publish fake work lease",
    );
    const commit = await git(repoRoot, "rev-parse", "HEAD^{commit}");
    return {
      ok: true,
      value: {
        ok: true,
        command: "work",
        target,
        claim: {
          state_root_before: mission.roots.vela_event_log,
          state_root_after: mission.roots.vela_event_log,
          publication: { state: "committed_local", commit },
        },
        session: {
          base_event_log_root: mission.roots.vela_event_log,
          source_git_commit_oid: mission.roots.git_commit,
        },
      },
    };
  }

  public async landAuthoredCommand(
    _mission: Mission,
    repoRoot: string,
    input: AuthoredReceiptInput,
    _expected: MissionRoots,
  ): Promise<VelaLandCommandObservation> {
    this.authored = input;
    assert.equal(await readFile(path.join(repoRoot, "frontier/result.json"), "utf8"), "{\"value\":42}\n");
    for (const artifact of input.artifacts) {
      const bytes = await readFile(path.join(repoRoot, "frontier", artifact.path));
      const digest = sha256Bytes(bytes).slice("sha256:".length);
      const blob = path.join(
        repoRoot,
        "frontier/records/artifacts/sha256",
        digest,
      );
      await mkdir(path.dirname(blob), { recursive: true });
      await writeFile(blob, bytes);
    }
    await git(
      repoRoot,
      "add",
      "frontier/result.json",
      "frontier/canopus",
      "frontier/records/artifacts",
    );
    await git(
      repoRoot,
      "-c",
      "user.name=Canopus Test",
      "-c",
      "user.email=canopus@example.invalid",
      "commit",
      "--no-gpg-sign",
      "-m",
      "land pending receipt fixture",
    );
    const raw = {
      ok: true,
      command: "land",
      operation_id: "vop_vertical",
      receipt_root: scientificRoot,
      record_id: "vrr_vertical",
      proposal_id: "vpr_vertical",
      finding_id: "vf_vertical",
      route: "deferred",
      original_route: null,
      detail: "human scientific judgment",
      accepted_event_count_before: 1,
      accepted_event_count_after: 1,
      accepted_event_delta: 0,
      publication: {
        state: "committed_local",
        commit: await git(repoRoot, "rev-parse", "HEAD^{commit}"),
      },
    };
    const stdout = `${JSON.stringify(raw)}\n`;
    return {
      argv: ["vela", "land"],
      exit_code: 0,
      stdout,
      stderr: "",
      stdout_digest: sha256Bytes(stdout),
      stderr_digest: sha256Bytes(""),
    };
  }

  public parseLandCommand(observation: VelaLandCommandObservation): Record<string, unknown> {
    return JSON.parse(observation.stdout) as Record<string, unknown>;
  }

  public validateLandResult(mission: Mission, raw: Record<string, unknown>): LandResult {
    return validateLandResult(mission, raw);
  }

  public async verifyReceiptBinding(
    _mission: Mission,
    _repoRoot: string,
    landing: LandResult,
    input: AuthoredReceiptInput,
    artifacts: readonly FrozenArtifact[],
  ): Promise<void> {
    assert.equal(landing.route, "defer");
    assert.equal(input.claim.length > 0, true);
    if (!this.#failBinding) assert.equal(input.claim, "The bounded result has value 42.");
    assert.equal(artifacts.length, 3);
    assert.equal(artifacts.some((artifact) => artifact.kind === "engine-manifest"), true);
    assert.equal(artifacts.some((artifact) => artifact.kind === "verifier-manifest"), true);
    if (this.#failBinding) throw new Error("injected post-land binding failure");
  }
}

test("target offer validation requires one exact released-Vela offer", () => {
  const offered = (ids: string[]): VelaCommandResponse => ({
    ok: true,
    value: {
      ok: true,
      command: "next",
      targets: ids.map((id) => ({ id })),
    },
  });
  assert.deepEqual(validateTargetOffer("finite:42", offered(["other", "finite:42"])), {
    index: 1,
    id: "finite:42",
  });
  assert.throws(
    () => validateTargetOffer("finite:42", offered(["other"])),
    /appear exactly once/u,
  );
  assert.throws(
    () => validateTargetOffer("finite:42", offered(["finite:42", "finite:42"])),
    /observed 2/u,
  );
});

test("bounded vertical slice lands pending and reproduces from a clean clone", async () => {
  const source = await sourceRepository();
  const mission: Mission = {
    schema: "canopus.mission.v0",
    id: "mission_vertical_slice",
    target: "finite:42",
    vela_version: "0.800.19",
    vela_sha256: scientificRoot,
    frontier: "frontier",
    actor: "agent:canopus-test",
    role: "producer",
    claim_type: "computational",
    replayability: "exact",
    objective: "Produce the bounded value 42.",
    completion_condition: "The frozen result contains value 42.",
    roots: source.roots,
    allowed_paths: ["result.json"],
    budgets: {
      max_research_wall_time_ms: 30_000,
      max_research_processes: 4,
      max_research_output_bytes: 1_048_576,
      max_prompt_bytes: 1_048_576,
      max_artifact_bytes: 1_048_576,
      max_attempts: 1,
      max_observed_tokens: 1000,
    },
    verifier: {
      argv: ["frontier/verifier", "{artifact:result.json}"],
      executable_sha256: source.verifierDigest,
      cwd: "frontier",
      timeout_ms: 1000,
      max_output_bytes: 4096,
      network: "deny",
      writes: "deny",
    },
    scientific_chain: {
      predicted_observable: "The frozen JSON object has value 42.",
      performed_test: "verify frozen result.json",
    },
    landing: { expected_routes: ["defer"], max_accepted_delta: 0 },
  };
  const engine = new FakeEngine(async () => {
    return {
      schema: "canopus.engine-output.v0",
      status: "success",
      claim: "The bounded result has value 42.",
      artifacts: [
        { path: "result.json", kind: "witness", encoding: "utf8", content: "{\"value\":42}\n" },
      ],
      observations: ["The finite construction completed."],
      caveats: ["This is a bounded fixture, not a general theorem."],
    };
  });
  const verifierRunner: CommandRunner = async (options) => ({
    argv: [...options.argv],
    exitCode: 0,
    signal: null,
    stdout: Buffer.from("value=42\n"),
    stderr: Buffer.alloc(0),
    durationMs: 1,
  });
  const vela = new FakeVela();
  const result = await runCanopus({
    mission,
    sourceRepo: source.repo,
    runRoot: path.join(source.parent, "run"),
    vela,
    engine,
    verifierRunner,
  });

  assert.equal(result.record.landing.route, "defer");
  assert.equal(result.record.landing.accepted_event_delta, 0);
  assert.equal(result.record.reproduction.matched, true);
  assert.equal(result.record.external_gate_credit, false);
  assert.equal(result.projection.accepted_state_effect, "unchanged_pending");
  assert.equal(vela.authored?.predictedObservable, "The frozen JSON object has value 42.");
  assert.equal(vela.nextCalls, 1);
  assert.equal(vela.nextRoot, result.paths.landing);
  assert.match(await readFile(path.join(result.paths.root, "activity.jsonl"), "utf8"), /target\.offered/u);
  assert.deepEqual(projectRun(result.record), result.projection);
  assert.equal(
    JSON.parse(await readFile(path.join(result.paths.root, "run.json"), "utf8")).authority,
    "non_authoritative",
  );
  assert.equal(
    JSON.parse(await readFile(path.join(result.paths.root, "projection.json"), "utf8")).authority,
    "read_only_projection",
  );
});

test("null and failed workers retain bounded evidence without verifier or landing", async () => {
  const source = await sourceRepository();
  const mission: Mission = {
    schema: "canopus.mission.v0",
    id: "mission_safe_worker_failure",
    target: "finite:42",
    vela_version: "0.800.19",
    vela_sha256: scientificRoot,
    frontier: "frontier",
    actor: "agent:canopus-failure",
    role: "producer",
    claim_type: "computational",
    replayability: "exact",
    objective: "Attempt one bounded computation.",
    completion_condition: "A failed worker stops before verification and landing.",
    roots: source.roots,
    allowed_paths: ["result.json"],
    budgets: {
      max_research_wall_time_ms: 30_000,
      max_research_processes: 4,
      max_research_output_bytes: 1_048_576,
      max_prompt_bytes: 1_048_576,
      max_artifact_bytes: 1_048_576,
      max_attempts: 1,
      max_observed_tokens: 1000,
    },
    verifier: {
      argv: ["frontier/verifier", "{artifact:result.json}"],
      executable_sha256: source.verifierDigest,
      cwd: "frontier",
      timeout_ms: 1000,
      max_output_bytes: 4096,
      network: "deny",
      writes: "deny",
    },
    scientific_chain: {
      predicted_observable: "The worker either supplies exact bytes or stops.",
      performed_test: "observe the bounded worker result",
    },
    landing: { expected_routes: ["defer"], max_accepted_delta: 0 },
  };
  const vela = new FakeVela();
  let verifierCalls = 0;
  const runRoot = path.join(source.parent, "worker-failure-run");
  await assert.rejects(
    runCanopus({
      mission,
      sourceRepo: source.repo,
      runRoot,
      vela,
      engine: new FakeEngine({
        schema: "canopus.engine-output.v0",
        status: "failed",
        claim: "The bounded computation could not execute.",
        artifacts: [],
        observations: ["No candidate bytes were produced."],
        caveats: ["This is not a negative scientific result."],
      }),
      verifierRunner: async (options) => {
        verifierCalls += 1;
        return {
          argv: [...options.argv], exitCode: 0, signal: null,
          stdout: Buffer.alloc(0), stderr: Buffer.alloc(0), durationMs: 1,
        };
      },
    }),
    /worker returned failed; verifier and landing were not run/u,
  );
  const evidence = JSON.parse(await readFile(path.join(runRoot, "engine-result.json"), "utf8"));
  const failure = JSON.parse(await readFile(path.join(runRoot, "failure.json"), "utf8"));
  assert.equal(evidence.authority, "non_authoritative");
  assert.equal(evidence.draft.status, "failed");
  assert.equal(verifierCalls, 0);
  assert.equal(vela.authored, undefined);
  assert.equal(failure.phase, "engine_non_success");
  assert.equal(failure.landing_observed, false);
});

test("all four bounded roles traverse freeze, verifier, Receipt, Defer, and reproduction", async () => {
  const source = await sourceRepository();
  const verifierRunner: CommandRunner = async (options) => ({
    argv: [...options.argv],
    exitCode: 0,
    signal: null,
    stdout: Buffer.from("value=42\n"),
    stderr: Buffer.alloc(0),
    durationMs: 1,
  });

  for (const role of ROLES) {
    const mission: Mission = {
      schema: "canopus.mission.v0",
      id: `mission_role_${role}`,
      target: "finite:42",
      vela_version: "0.800.19",
      vela_sha256: scientificRoot,
      frontier: "frontier",
      actor: `agent:canopus-${role}`,
      role,
      claim_type: "computational",
      replayability: "exact",
      objective: `Exercise the bounded ${role} mission lane.`,
      completion_condition: "The frozen result contains value 42.",
      roots: source.roots,
      allowed_paths: ["result.json"],
      budgets: {
        max_research_wall_time_ms: 30_000,
        max_research_processes: 4,
        max_research_output_bytes: 1_048_576,
        max_prompt_bytes: 1_048_576,
        max_artifact_bytes: 1_048_576,
        max_attempts: 1,
        max_observed_tokens: 1000,
      },
      verifier: {
        argv: ["frontier/verifier", "{artifact:result.json}"],
        executable_sha256: source.verifierDigest,
        cwd: "frontier",
        timeout_ms: 1000,
        max_output_bytes: 4096,
        network: "deny",
        writes: "deny",
      },
      scientific_chain: {
        predicted_observable: `The ${role} lane freezes the exact JSON object with value 42.`,
        performed_test: "verify frozen result.json",
      },
      landing: { expected_routes: ["defer"], max_accepted_delta: 0 },
    };
    const engine = new FakeEngine(async ({ mission: observed }) => {
      assert.equal(observed.role, role as MissionRole);
      return {
        schema: "canopus.engine-output.v0",
        status: "success",
        claim: "The bounded result has value 42.",
        artifacts: [
          {
            path: "result.json",
            kind: "witness",
            encoding: "utf8",
            content: "{\"value\":42}\n",
          },
        ],
        observations: [`The ${role} lane completed its bounded job.`],
        caveats: [`role=${role}; internal fixture only`],
      };
    });
    const vela = new FakeVela();
    const result = await runCanopus({
      mission,
      sourceRepo: source.repo,
      runRoot: path.join(source.parent, `run-${role}`),
      vela,
      engine,
      verifierRunner,
    });

    assert.equal(result.record.landing.route, "defer");
    assert.equal(result.record.landing.accepted_event_delta, 0);
    assert.equal(result.record.reproduction.matched, true);
    assert.equal(result.projection.accepted_state_effect, "unchanged_pending");
    assert.equal(result.record.candidate.caveats.includes(`role=${role}; internal fixture only`), true);
    assert.equal(vela.nextCalls, 1);
    assert.match(
      await readFile(path.join(result.paths.root, "activity.jsonl"), "utf8"),
      new RegExp(`"role":"${role}"`, "u"),
    );
  }
});

test("post-land failure retains raw Vela effect and recovery roots", async () => {
  const source = await sourceRepository();
  const mission: Mission = {
    schema: "canopus.mission.v0",
    id: "mission_landing_recovery",
    target: "finite:42",
    vela_version: "0.800.19",
    vela_sha256: scientificRoot,
    frontier: "frontier",
    actor: "agent:canopus-recovery",
    role: "producer",
    claim_type: "computational",
    replayability: "exact",
    objective: "Exercise the post-land recovery boundary.",
    completion_condition: "The injected binding failure is durably observable.",
    roots: source.roots,
    allowed_paths: ["result.json"],
    budgets: {
      max_research_wall_time_ms: 30_000,
      max_research_processes: 4,
      max_research_output_bytes: 1_048_576,
      max_prompt_bytes: 1_048_576,
      max_artifact_bytes: 1_048_576,
      max_attempts: 1,
      max_observed_tokens: 1000,
    },
    verifier: {
      argv: ["frontier/verifier", "{artifact:result.json}"],
      executable_sha256: source.verifierDigest,
      cwd: "frontier",
      timeout_ms: 1000,
      max_output_bytes: 4096,
      network: "deny",
      writes: "deny",
    },
    scientific_chain: {
      predicted_observable: "The raw landing remains observable after binding fails.",
      performed_test: "inject a post-land binding failure",
    },
    landing: { expected_routes: ["defer"], max_accepted_delta: 0 },
  };
  const engine = new FakeEngine({
    schema: "canopus.engine-output.v0",
    status: "success",
    claim: "The landing command completed before binding failed.",
    artifacts: [
      { path: "result.json", kind: "witness", encoding: "utf8", content: "{\"value\":42}\n" },
    ],
    observations: ["The Vela effect occurred."],
    caveats: ["Binding was deliberately failed."],
  });
  const runRoot = path.join(source.parent, "recovery-run");
  await assert.rejects(
    runCanopus({
      mission,
      sourceRepo: source.repo,
      runRoot,
      vela: new FakeVela(true),
      engine,
      verifierRunner: async (options) => ({
        argv: [...options.argv], exitCode: 0, signal: null,
        stdout: Buffer.from("value=42\n"), stderr: Buffer.alloc(0), durationMs: 1,
      }),
    }),
    /injected post-land binding failure/u,
  );
  const observation = JSON.parse(await readFile(path.join(runRoot, "landing-observation.json"), "utf8"));
  const recovery = JSON.parse(await readFile(path.join(runRoot, "landing-recovery.json"), "utf8"));
  const failure = JSON.parse(await readFile(path.join(runRoot, "failure.json"), "utf8"));
  assert.equal(observation.raw.route, "deferred");
  assert.equal(recovery.parsed.route, "defer");
  assert.equal(recovery.observed_roots.git_commit.length, 40);
  assert.equal(failure.phase, "receipt_binding");
  assert.equal(failure.landing_observed, true);
});
