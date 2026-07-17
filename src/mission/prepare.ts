import { constants } from "node:fs";
import {
  access,
  chmod,
  copyFile,
  lstat,
  mkdir,
  mkdtemp,
  realpath,
  rm,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { parseMission, type MissionV1 } from "../contracts/mission.js";
import {
  objectAt,
  relativePathAt,
  sha256At,
  stringAt,
} from "../contracts/validation.js";
import { canonicalJson, contentDigest, sha256Bytes } from "../util/canonical.js";
import { isolatedEnvironment, runCommand, type CommandRunner } from "../util/command.js";
import { readBoundedRegularFile } from "../util/files.js";
import { VelaClient } from "../vela/cli.js";

export interface PrepareMissionOptions {
  draft: unknown;
  draftRoot: string;
  sourceRepo: string;
  outputRoot: string;
  velaBinary: string;
  dockerBinary: string;
  workerImage: string;
  verifierImage: string;
  outputSchema: string;
  runner?: CommandRunner;
}

export interface PreparedMission {
  mission: MissionV1;
  bundleRoot: string;
  missionPath: string;
  manifestPath: string;
}

export async function validateMissionBundle(
  mission: MissionV1,
  bundleRoot: string,
): Promise<void> {
  const root = await realpath(bundleRoot);
  const capsule = await sourceFile(root, mission.verifier.capsule_path, "verifier capsule");
  await access(capsule, constants.X_OK);
  const capsuleDigest = sha256Bytes(await readBoundedRegularFile(capsule, 268_435_456));
  if (
    capsuleDigest !== mission.verifier.capsule_sha256 ||
    capsuleDigest !== mission.verifier.executable_sha256
  ) {
    throw new Error("mission bundle verifier capsule drifted");
  }
  const packet = await sourceFile(root, "packet/target.json", "bundled target packet");
  if (sha256Bytes(await readBoundedRegularFile(packet, 64 * 1024 * 1024)) !== mission.target_packet.sha256) {
    throw new Error("mission bundle target packet drifted");
  }
  const outputSchema = await sourceFile(
    root,
    "contract/engine-output.v0.json",
    "bundled engine output schema",
  );
  if (
    sha256Bytes(await readBoundedRegularFile(outputSchema, 8 * 1024 * 1024)) !==
    mission.worker.output_schema_sha256
  ) {
    throw new Error("mission bundle engine output schema drifted");
  }
  const manifestBytes = await readBoundedRegularFile(
    path.join(root, "bundle-manifest.json"),
    8 * 1024 * 1024,
  );
  let manifestValue: unknown;
  try {
    manifestValue = JSON.parse(manifestBytes.toString("utf8")) as unknown;
  } catch (error) {
    throw new Error(`mission bundle manifest is invalid JSON: ${String(error)}`);
  }
  const manifest = objectAt(manifestValue, "mission bundle manifest");
  if (
    manifest.schema !== "canopus.mission-bundle.v1" ||
    manifest.authority !== "non_authoritative" ||
    manifest.mission_sha256 !== contentDigest(mission)
  ) {
    throw new Error("mission bundle manifest does not bind the mission");
  }
}

async function commandText(
  runner: CommandRunner,
  argv: readonly string[],
  cwd: string,
  home: string,
  allowStderr = false,
): Promise<string> {
  const result = await runner({
    argv,
    cwd,
    env: isolatedEnvironment(home),
    timeoutMs: 120_000,
    maxOutputBytes: 8 * 1024 * 1024,
  });
  if (result.exitCode !== 0 || (!allowStderr && result.stderr.length !== 0)) {
    throw new Error(`${argv[0]} ${argv.slice(1).join(" ")} failed`);
  }
  return result.stdout.toString("utf8").trim();
}

async function assertFreshOutput(outputRoot: string): Promise<void> {
  try {
    await lstat(outputRoot);
    throw new Error("mission output root already exists");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}

function below(child: string, parent: string): boolean {
  const relative = path.relative(parent, child);
  return relative !== "" && relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

async function sourceFile(root: string, relative: string, label: string): Promise<string> {
  const parent = await realpath(root);
  const resolved = await realpath(path.resolve(parent, relative));
  if (!below(resolved, parent)) throw new Error(`${label} escapes its registered root`);
  const stat = await lstat(resolved);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1) {
    throw new Error(`${label} must be one regular, singly linked file`);
  }
  return resolved;
}

function boundedObjective(value: unknown): string {
  const objective = stringAt(value, "mission.objective", { min: 1, max: 8192 });
  const universal = /\b(?:settle|solve|prove|establish)\b[^.]{0,160}\b(?:for all|for every|unbounded|universally)\b/iu;
  const finite = /\b(?:bounded|exact|finite|range|through|up to|k\s*=\s*\d+|witness|counterexample|exhaust)\b/iu;
  if (universal.test(objective) || !finite.test(objective)) {
    throw new Error("mission objective must name a finite or exactly checkable obligation");
  }
  return objective;
}

function firstAttack(offer: Record<string, unknown>): Record<string, unknown> {
  if (!Array.isArray(offer.targets)) throw new Error("vela next omitted targets");
  for (const [index, raw] of offer.targets.entries()) {
    const target = objectAt(raw, `vela next.targets[${index}]`);
    if (target.lane === "attack") return target;
  }
  throw new Error("vela next returned no non-review attack target in the first 128 offers");
}

function packetFromTarget(target: Record<string, unknown>): { path: string; sha256: string } {
  const task = objectAt(target.task, "vela next attack.task");
  const packet = objectAt(task.packet_ref, "vela next attack.task.packet_ref");
  if (packet.schema !== "erdos-frontier.problem-work.v1") {
    throw new Error("selected attack target has no supported exact problem packet");
  }
  return {
    path: relativePathAt(packet.path, "vela next attack.task.packet_ref.path"),
    sha256: sha256At(packet.sha256, "vela next attack.task.packet_ref.sha256"),
  };
}

async function imageId(
  runner: CommandRunner,
  dockerBinary: string,
  image: string,
  cwd: string,
  home: string,
): Promise<string> {
  const observed = await commandText(
    runner,
    [dockerBinary, "image", "inspect", "--format={{.Id}}", image],
    cwd,
    home,
  );
  return sha256At(observed, "Docker image ID");
}

async function workerIdentity(
  runner: CommandRunner,
  dockerBinary: string,
  image: string,
  cwd: string,
  home: string,
): Promise<{ codex_version: string; codex_sha256: string }> {
  const output = await commandText(
    runner,
    [
      dockerBinary,
      "run",
      "--rm",
      "--read-only",
      "--cap-drop=ALL",
      "--security-opt=no-new-privileges",
      image,
      "identity",
    ],
    cwd,
    home,
    true,
  );
  const lines = output.split("\n");
  if (lines.length !== 2) throw new Error("worker image returned an invalid identity record");
  const version = stringAt(lines[0], "worker Codex version", {
    min: 10,
    max: 64,
    pattern: /^codex-cli [0-9]+\.[0-9]+\.[0-9]+(?:[-+][A-Za-z0-9.-]+)?$/u,
  });
  const digest = /^(?<hex>[0-9a-f]{64})\s+/u.exec(lines[1] ?? "")?.groups?.hex;
  if (digest === undefined) throw new Error("worker image returned no full Codex digest");
  return { codex_version: version, codex_sha256: `sha256:${digest}` };
}

export async function prepareMission(options: PrepareMissionOptions): Promise<PreparedMission> {
  const runner = options.runner ?? runCommand;
  const sourceRepo = await realpath(options.sourceRepo);
  const draftRoot = await realpath(options.draftRoot);
  const outputRoot = path.resolve(options.outputRoot);
  await assertFreshOutput(outputRoot);
  const runtimeHome = await mkdtemp(path.join(os.tmpdir(), "canopus-prepare-"));
  try {
    const status = await commandText(
      runner,
      ["git", "status", "--porcelain=v1", "--untracked-files=all"],
      sourceRepo,
      runtimeHome,
    );
    if (status !== "") throw new Error("mission source checkout must be clean");

    const raw = objectAt(options.draft, "mission draft");
    const frontier = raw.frontier === "."
      ? "."
      : relativePathAt(raw.frontier, "mission.frontier");
    const velaBinary = await realpath(options.velaBinary);
    const velaSha256 = sha256Bytes(await readBoundedRegularFile(velaBinary, 268_435_456));
    const versionText = await commandText(
      runner,
      [velaBinary, "--version"],
      sourceRepo,
      runtimeHome,
    );
    const versionMatch = /^vela (0\.[0-9]+\.[0-9]+)$/u.exec(versionText);
    if (versionMatch?.[1] === undefined) throw new Error("Vela returned an invalid version");
    const velaVersion = versionMatch[1];
    const vela = new VelaClient({
      binary: velaBinary,
      expectedVersion: velaVersion,
      expectedSha256: velaSha256,
      home: path.join(runtimeHome, "vela"),
      runner,
    });
    const strictBaseline = await vela.observeStrictBaseline(sourceRepo, frontier);
    const inspection = await vela.inspect(sourceRepo, frontier, strictBaseline);
    const offer = await vela.offer(
      sourceRepo,
      frontier,
      inspection.roots,
      strictBaseline,
      128,
    );
    const target = firstAttack(offer.value);
    const targetId = stringAt(target.id, "vela next attack.id", { min: 1, max: 256 });
    if (raw.target !== undefined && raw.target !== "auto" && raw.target !== targetId) {
      throw new Error(`mission target ${String(raw.target)} is not the first ranked attack ${targetId}`);
    }
    const packet = packetFromTarget(target);
    const packetSource = await sourceFile(sourceRepo, packet.path, "target packet");
    const packetBytes = await readBoundedRegularFile(packetSource, 64 * 1024 * 1024);
    if (sha256Bytes(packetBytes) !== packet.sha256) {
      throw new Error("selected target packet digest does not match vela next");
    }
    const tracked = await commandText(
      runner,
      ["git", "ls-files", "--error-unmatch", "--", packet.path],
      sourceRepo,
      runtimeHome,
    );
    if (tracked !== packet.path) throw new Error("target packet is not an exact tracked source file");

    const verifierDraft = objectAt(raw.verifier, "mission.verifier");
    const sourceCapsuleRelative = relativePathAt(
      verifierDraft.capsule_path,
      "mission.verifier.capsule_path",
    );
    const sourceCapsule = await sourceFile(draftRoot, sourceCapsuleRelative, "verifier capsule");
    await access(sourceCapsule, constants.X_OK);
    const capsuleBytes = await readBoundedRegularFile(sourceCapsule, 268_435_456);
    const capsuleDigest = sha256Bytes(capsuleBytes);

    const workerDraft = objectAt(raw.worker, "mission.worker");
    const outputSchemaSource = await sourceFile(
      path.dirname(await realpath(options.outputSchema)),
      path.basename(options.outputSchema),
      "engine output schema",
    );
    const outputSchemaBytes = await readBoundedRegularFile(outputSchemaSource, 8 * 1024 * 1024);
    const outputSchemaDigest = sha256Bytes(outputSchemaBytes);
    const [workerImage, verifierImage] = await Promise.all([
      imageId(runner, options.dockerBinary, options.workerImage, sourceRepo, runtimeHome),
      imageId(runner, options.dockerBinary, options.verifierImage, sourceRepo, runtimeHome),
    ]);
    const identity = await workerIdentity(
      runner,
      options.dockerBinary,
      workerImage,
      sourceRepo,
      runtimeHome,
    );
    const verifierArgv = Array.isArray(verifierDraft.argv)
      ? [...verifierDraft.argv]
      : verifierDraft.argv;
    if (!Array.isArray(verifierArgv) || verifierArgv.length === 0) {
      throw new Error("mission verifier argv is required");
    }
    verifierArgv[0] = "capsule/verifier";

    const prepared = parseMission({
      ...raw,
      schema: "canopus.mission.v1",
      target: targetId,
      vela_version: velaVersion,
      vela_sha256: velaSha256,
      objective: boundedObjective(raw.objective),
      roots: inspection.roots,
      target_packet: packet,
      strict_baseline: strictBaseline,
      worker: {
        ...workerDraft,
        kind: "codex_tools_container",
        image: workerImage,
        ...identity,
        output_schema_sha256: outputSchemaDigest,
        network: "provider",
        tools: ["shell", "apply_patch"],
      },
      verifier: {
        ...verifierDraft,
        argv: verifierArgv,
        executable_sha256: capsuleDigest,
        capsule_path: "capsule/verifier",
        capsule_sha256: capsuleDigest,
        image: verifierImage,
        network: "deny",
        writes: "deny",
      },
      landing: { expected_routes: ["defer"], max_accepted_delta: 0 },
    });
    if (prepared.schema !== "canopus.mission.v1") {
      throw new Error("prepared mission did not produce mission v1");
    }

    const capsuleTarget = path.join(outputRoot, "capsule", "verifier");
    const packetTarget = path.join(outputRoot, "packet", "target.json");
    const outputSchemaTarget = path.join(outputRoot, "contract", "engine-output.v0.json");
    await Promise.all([
      mkdir(path.dirname(capsuleTarget), { recursive: true, mode: 0o700 }),
      mkdir(path.dirname(packetTarget), { recursive: true, mode: 0o700 }),
      mkdir(path.dirname(outputSchemaTarget), { recursive: true, mode: 0o700 }),
    ]);
    await Promise.all([
      copyFile(sourceCapsule, capsuleTarget),
      copyFile(packetSource, packetTarget),
      copyFile(outputSchemaSource, outputSchemaTarget),
    ]);
    await chmod(capsuleTarget, 0o555);
    const missionPath = path.join(outputRoot, "mission.json");
    const manifestPath = path.join(outputRoot, "bundle-manifest.json");
    const manifest = {
      schema: "canopus.mission-bundle.v1",
      authority: "non_authoritative",
      mission_sha256: contentDigest(prepared),
      source: {
        git_commit: prepared.roots.git_commit,
        git_tree: prepared.roots.git_tree,
      },
      packet: {
        source_path: packet.path,
        bundle_path: "packet/target.json",
        sha256: packet.sha256,
      },
      verifier: {
        bundle_path: "capsule/verifier",
        sha256: capsuleDigest,
        image: verifierImage,
      },
      worker: {
        image: workerImage,
        codex_version: identity.codex_version,
        codex_sha256: identity.codex_sha256,
        output_schema_sha256: outputSchemaDigest,
      },
    };
    await Promise.all([
      writeFile(missionPath, canonicalJson(prepared), { flag: "wx", mode: 0o600 }),
      writeFile(manifestPath, canonicalJson(manifest), { flag: "wx", mode: 0o600 }),
    ]);
    return { mission: prepared, bundleRoot: outputRoot, missionPath, manifestPath };
  } catch (error) {
    await rm(outputRoot, { recursive: true, force: true });
    throw error;
  } finally {
    await rm(runtimeHome, { recursive: true, force: true });
  }
}
