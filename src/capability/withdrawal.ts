import os from "node:os";
import path from "node:path";
import {
  createPrivateKey,
  createPublicKey,
  verify as verifyEd25519,
} from "node:crypto";
import { chmod, lstat, mkdir, rename, rm, writeFile } from "node:fs/promises";

import type { Mission, MissionRoots, StrictBaseline } from "../contracts/mission.js";
import {
  AGENT_RE,
  exactKeys,
  gitObjectAt,
  objectAt,
  relativePathAt,
  sha256At,
  stringAt,
} from "../contracts/validation.js";
import type { LandResult } from "../vela/types.js";
import {
  canonicalJcs,
  canonicalJson,
  contentDigest,
  protocolDigest,
  sha256Bytes,
} from "../util/canonical.js";
import { readBoundedRegularFile } from "../util/files.js";

export const WITHDRAWAL_CAPABILITY_SCHEMA = "canopus.withdrawal-capability.v1" as const;

export interface WithdrawalCapabilityManifest {
  schema: typeof WITHDRAWAL_CAPABILITY_SCHEMA;
  state: "available" | "consumed";
  proposal_id: string;
  proposal_root: string;
  receipt_root: string;
  identity_binding_id: string;
  actor: string;
  public_key: string;
  frontier: string;
  final_roots: MissionRoots;
  strict_baseline: StrictBaseline;
  vela: { binary: string; version: string; sha256: string };
  created_at: string;
  consumed_at?: string;
  consumed_reason?: "withdrawn" | "human_decision_observed";
}

function capabilityBase(storeRoot?: string): string {
  return path.resolve(storeRoot ?? path.join(os.homedir(), ".canopus", "capabilities"));
}

export function capabilityDirectory(proposalId: string, storeRoot?: string): string {
  if (!/^vpr_[0-9a-f]{16}$/u.test(proposalId)) {
    throw new Error("withdrawal capability requires a full vpr_<16 lowercase hex> proposal id");
  }
  return path.join(capabilityBase(storeRoot), proposalId);
}

function agentKeyPath(velaHome: string, actor: string): string {
  const safe = [...actor]
    .map((character) => /[A-Za-z0-9_-]/u.test(character) ? character : "-")
    .join("");
  return path.join(velaHome, ".vela", "agents", safe, "private.key");
}

function object(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

function text(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0) throw new Error(`${label} must be a string`);
  return value;
}

const RFC3339_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/u;
const HEX_SEED_BYTES = 64;
const PRIVATE_KEY_MAX_BYTES = HEX_SEED_BYTES + 1;

function timestampAt(value: unknown, at: string): string {
  const parsed = stringAt(value, at, { min: 20, max: 64, pattern: RFC3339_RE });
  if (!Number.isFinite(Date.parse(parsed))) throw new Error(`${at} is not a valid RFC3339 timestamp`);
  return parsed;
}

function frontierAt(value: unknown, at: string): string {
  if (value === ".") return ".";
  return relativePathAt(value, at);
}

function parseRoots(value: unknown, at: string): MissionRoots {
  const roots = objectAt(value, at);
  exactKeys(
    roots,
    ["git_commit", "git_tree", "vela_event_log", "vela_snapshot"],
    [],
    at,
  );
  return {
    git_commit: gitObjectAt(roots.git_commit, `${at}.git_commit`),
    git_tree: gitObjectAt(roots.git_tree, `${at}.git_tree`),
    vela_event_log: sha256At(roots.vela_event_log, `${at}.vela_event_log`),
    vela_snapshot: sha256At(roots.vela_snapshot, `${at}.vela_snapshot`),
  };
}

function parseStrictBaseline(value: unknown, at: string): StrictBaseline {
  const baseline = objectAt(value, at);
  exactKeys(baseline, ["status", "blocker_count", "blockers_root", "rule_counts"], [], at);
  if (baseline.status !== "pass" && baseline.status !== "fail") {
    throw new Error(`${at}.status must be pass or fail`);
  }
  if (
    typeof baseline.blocker_count !== "number" ||
    !Number.isSafeInteger(baseline.blocker_count) ||
    baseline.blocker_count < 0
  ) {
    throw new Error(`${at}.blocker_count must be a nonnegative integer`);
  }
  if (!Array.isArray(baseline.rule_counts) || baseline.rule_counts.length > 512) {
    throw new Error(`${at}.rule_counts must be a bounded array`);
  }
  const seen = new Set<string>();
  let total = 0;
  const ruleCounts = baseline.rule_counts.map((value, index) => {
    const ruleCount = objectAt(value, `${at}.rule_counts[${index}]`);
    exactKeys(ruleCount, ["rule", "count"], [], `${at}.rule_counts[${index}]`);
    const rule = stringAt(ruleCount.rule, `${at}.rule_counts[${index}].rule`, {
      min: 1,
      max: 128,
      pattern: /^[a-z][a-z0-9_]*$/u,
    });
    if (seen.has(rule)) throw new Error(`${at}.rule_counts contains duplicate rules`);
    seen.add(rule);
    if (
      typeof ruleCount.count !== "number" ||
      !Number.isSafeInteger(ruleCount.count) ||
      ruleCount.count < 1
    ) {
      throw new Error(`${at}.rule_counts[${index}].count must be a positive integer`);
    }
    total += ruleCount.count;
    return { rule, count: ruleCount.count };
  });
  if (
    total !== baseline.blocker_count ||
    (baseline.status === "pass") !== (baseline.blocker_count === 0)
  ) {
    throw new Error(`${at} status, count, and per-rule totals disagree`);
  }
  const sorted = [...ruleCounts].sort((left, right) => left.rule.localeCompare(right.rule));
  if (canonicalJcs(sorted) !== canonicalJcs(ruleCounts)) {
    throw new Error(`${at}.rule_counts must be sorted by rule`);
  }
  return {
    status: baseline.status,
    blocker_count: baseline.blocker_count,
    blockers_root: sha256At(baseline.blockers_root, `${at}.blockers_root`),
    rule_counts: ruleCounts,
  };
}

function parseManifest(value: unknown, proposalId: string): WithdrawalCapabilityManifest {
  const manifest = objectAt(value, "withdrawal capability manifest");
  exactKeys(
    manifest,
    [
      "schema",
      "state",
      "proposal_id",
      "proposal_root",
      "receipt_root",
      "identity_binding_id",
      "actor",
      "public_key",
      "frontier",
      "final_roots",
      "strict_baseline",
      "vela",
      "created_at",
    ],
    ["consumed_at", "consumed_reason"],
    "withdrawal capability manifest",
  );
  if (manifest.schema !== WITHDRAWAL_CAPABILITY_SCHEMA) {
    throw new Error(`withdrawal capability schema must be ${WITHDRAWAL_CAPABILITY_SCHEMA}`);
  }
  if (manifest.proposal_id !== proposalId) {
    throw new Error("withdrawal capability manifest does not match its directory");
  }
  const state = manifest.state;
  if (state !== "available" && state !== "consumed") {
    throw new Error("withdrawal capability state must be available or consumed");
  }
  const vela = objectAt(manifest.vela, "withdrawal capability manifest.vela");
  exactKeys(vela, ["binary", "version", "sha256"], [], "withdrawal capability manifest.vela");
  const binary = stringAt(vela.binary, "withdrawal capability manifest.vela.binary", {
    min: 1,
    max: 4096,
  });
  if (!path.isAbsolute(binary) || binary.includes("\0")) {
    throw new Error("withdrawal capability Vela binary must be an absolute path");
  }
  const consumedAt = manifest.consumed_at === undefined
    ? undefined
    : timestampAt(manifest.consumed_at, "withdrawal capability manifest.consumed_at");
  const consumedReason = manifest.consumed_reason;
  if (
    consumedReason !== undefined &&
    consumedReason !== "withdrawn" &&
    consumedReason !== "human_decision_observed"
  ) {
    throw new Error("withdrawal capability consumed_reason is invalid");
  }
  if (
    (state === "available" && (consumedAt !== undefined || consumedReason !== undefined)) ||
    (state === "consumed" && (consumedAt === undefined || consumedReason === undefined))
  ) {
    throw new Error("withdrawal capability consumption fields disagree with state");
  }
  return {
    schema: WITHDRAWAL_CAPABILITY_SCHEMA,
    state,
    proposal_id: stringAt(manifest.proposal_id, "withdrawal capability manifest.proposal_id", {
      max: 20,
      pattern: /^vpr_[0-9a-f]{16}$/u,
    }),
    proposal_root: sha256At(manifest.proposal_root, "withdrawal capability manifest.proposal_root"),
    receipt_root: sha256At(manifest.receipt_root, "withdrawal capability manifest.receipt_root"),
    identity_binding_id: stringAt(
      manifest.identity_binding_id,
      "withdrawal capability manifest.identity_binding_id",
      { max: 20, pattern: /^vib_[0-9a-f]{16}$/u },
    ),
    actor: stringAt(manifest.actor, "withdrawal capability manifest.actor", {
      max: 69,
      pattern: AGENT_RE,
    }),
    public_key: stringAt(manifest.public_key, "withdrawal capability manifest.public_key", {
      max: 64,
      pattern: /^[0-9a-f]{64}$/u,
    }),
    frontier: frontierAt(manifest.frontier, "withdrawal capability manifest.frontier"),
    final_roots: parseRoots(manifest.final_roots, "withdrawal capability manifest.final_roots"),
    strict_baseline: parseStrictBaseline(
      manifest.strict_baseline,
      "withdrawal capability manifest.strict_baseline",
    ),
    vela: {
      binary,
      version: stringAt(vela.version, "withdrawal capability manifest.vela.version", {
        min: 1,
        max: 64,
        pattern: /^[0-9]+\.[0-9]+\.[0-9]+(?:[-+][0-9A-Za-z.-]+)?$/u,
      }),
      sha256: sha256At(vela.sha256, "withdrawal capability manifest.vela.sha256"),
    },
    created_at: timestampAt(manifest.created_at, "withdrawal capability manifest.created_at"),
    ...(consumedAt === undefined ? {} : { consumed_at: consumedAt }),
    ...(consumedReason === undefined ? {} : { consumed_reason: consumedReason }),
  };
}

function hexNibble(byte: number): number {
  if (byte >= 48 && byte <= 57) return byte - 48;
  if (byte >= 97 && byte <= 102) return byte - 87;
  return -1;
}

function decodeSeed(keyBytes: Buffer): Buffer {
  const length = keyBytes.length;
  if (
    (length !== HEX_SEED_BYTES && length !== PRIVATE_KEY_MAX_BYTES) ||
    (length === PRIVATE_KEY_MAX_BYTES && keyBytes[HEX_SEED_BYTES] !== 10)
  ) {
    throw new Error("producer session key must contain one 32-byte lowercase hex seed");
  }
  const seed = Buffer.alloc(32);
  for (let index = 0; index < HEX_SEED_BYTES; index += 2) {
    const high = hexNibble(keyBytes[index] ?? -1);
    const low = hexNibble(keyBytes[index + 1] ?? -1);
    if (high < 0 || low < 0) {
      seed.fill(0);
      throw new Error("producer session key must contain one 32-byte lowercase hex seed");
    }
    seed[index / 2] = (high << 4) | low;
  }
  return seed;
}

function derivePublicKey(seed: Buffer): string {
  const privateDer = Buffer.concat([
    Buffer.from("302e020100300506032b657004220420", "hex"),
    seed,
  ]);
  try {
    const derivedPublicDer = createPublicKey(
      createPrivateKey({ key: privateDer, format: "der", type: "pkcs8" }),
    ).export({ format: "der", type: "spki" });
    return Buffer.from(derivedPublicDer).subarray(-32).toString("hex");
  } finally {
    privateDer.fill(0);
  }
}

function verifyIdentityBinding(value: unknown): {
  actor: string;
  bindingId: string;
  publicKey: string;
} {
  const binding = objectAt(value, "Receipt identity binding");
  exactKeys(
    binding,
    [
      "schema",
      "binding_id",
      "actor_id",
      "actor_class",
      "public_key_hex",
      "created_at",
      "signature",
    ],
    [],
    "Receipt identity binding",
  );
  if (binding.schema !== "vela.identity_binding.v0.1" || binding.actor_class !== "agent") {
    throw new Error("Receipt identity binding must be a Vela agent binding");
  }
  const actor = stringAt(binding.actor_id, "Receipt identity binding.actor_id", {
    max: 69,
    pattern: AGENT_RE,
  });
  const bindingId = stringAt(binding.binding_id, "Receipt identity binding.binding_id", {
    max: 20,
    pattern: /^vib_[0-9a-f]{16}$/u,
  });
  const publicKey = stringAt(binding.public_key_hex, "Receipt identity binding.public_key_hex", {
    max: 64,
    pattern: /^[0-9a-f]{64}$/u,
  });
  const createdAt = timestampAt(binding.created_at, "Receipt identity binding.created_at");
  const signatureHex = stringAt(binding.signature, "Receipt identity binding.signature", {
    max: 128,
    pattern: /^[0-9a-f]{128}$/u,
  });
  const preimage = {
    schema: "vela.identity_binding.v0.1",
    binding_id: "",
    actor_id: actor,
    actor_class: "agent",
    public_key_hex: publicKey,
    created_at: createdAt,
    signature: "",
  };
  const preimageBytes = Buffer.from(canonicalJcs(preimage));
  const expectedId = `vib_${sha256Bytes(preimageBytes).slice("sha256:".length, "sha256:".length + 16)}`;
  if (bindingId !== expectedId) throw new Error("Receipt identity binding id does not rederive");
  const publicDer = Buffer.concat([
    Buffer.from("302a300506032b6570032100", "hex"),
    Buffer.from(publicKey, "hex"),
  ]);
  const signature = Buffer.from(signatureHex, "hex");
  try {
    const key = createPublicKey({ key: publicDer, format: "der", type: "spki" });
    if (!verifyEd25519(null, preimageBytes, key, signature)) {
      throw new Error("Receipt identity binding has no valid proof of possession");
    }
  } finally {
    publicDer.fill(0);
    signature.fill(0);
  }
  return { actor, bindingId, publicKey };
}

async function checkedCapabilityDirectory(
  proposalId: string,
  storeRoot?: string,
): Promise<{ base: string; directory: string }> {
  const base = capabilityBase(storeRoot);
  const directory = capabilityDirectory(proposalId, storeRoot);
  const [baseMetadata, directoryMetadata] = await Promise.all([lstat(base), lstat(directory)]);
  if (!baseMetadata.isDirectory() || baseMetadata.isSymbolicLink() || (baseMetadata.mode & 0o777) !== 0o700) {
    throw new Error("withdrawal capability store must be one mode-0700 directory");
  }
  if (
    !directoryMetadata.isDirectory() ||
    directoryMetadata.isSymbolicLink() ||
    (directoryMetadata.mode & 0o777) !== 0o700
  ) {
    throw new Error("withdrawal capability directory must be one mode-0700 directory");
  }
  return { base, directory };
}

export async function retainWithdrawalCapability(options: {
  velaHome: string;
  landingRepo: string;
  mission: Mission;
  landing: LandResult;
  finalRoots: MissionRoots;
  velaBinary: string;
  storeRoot?: string;
}): Promise<{ directory: string; manifest: WithdrawalCapabilityManifest; manifest_root: string }> {
  if (options.landing.route !== "defer" && options.landing.originalRoute !== "defer") {
    throw new Error("only a pending deferred proposal may retain a withdrawal capability");
  }
  const frontier = frontierAt(options.mission.frontier, "mission.frontier");
  const frontierRoot = path.resolve(options.landingRepo, frontier);
  const proposalPath = path.join(frontierRoot, ".vela", "proposals", `${options.landing.proposalId}.json`);
  const proposal = object(
    JSON.parse((await readBoundedRegularFile(proposalPath, 8 * 1024 * 1024)).toString("utf8")) as unknown,
    "proposal",
  );
  if (text(proposal.id, "proposal.id") !== options.landing.proposalId) {
    throw new Error("landed proposal id does not match its canonical file");
  }
  if (text(proposal.status, "proposal.status") !== "pending_review") {
    throw new Error("landed proposal is not pending_review");
  }
  const proposalRoot = protocolDigest(proposal);
  const payload = object(proposal.payload, "proposal.payload");
  const submission = object(payload.vela_submission, "proposal.payload.vela_submission");
  const receiptRoot = text(submission.receipt_root, "vela_submission.receipt_root");
  if (receiptRoot !== options.landing.receiptRoot) throw new Error("landed Receipt root drifted");
  const receiptPath = relativePathAt(submission.receipt_path, "vela_submission.receipt_path");
  const receipt = object(
    JSON.parse((await readBoundedRegularFile(path.join(frontierRoot, receiptPath), 16 * 1024 * 1024)).toString("utf8")) as unknown,
    "Receipt",
  );
  if (protocolDigest(receipt) !== receiptRoot) throw new Error("bound Receipt bytes do not match their root");
  const environment = object(receipt.environment, "Receipt.environment");
  const producer = object(environment["vela:producer_context"], "Receipt producer context");
  const binding = verifyIdentityBinding(producer.identity_binding);
  const actor = binding.actor;
  if (actor !== options.mission.actor || actor !== object(proposal.actor, "proposal.actor").id) {
    throw new Error("Receipt identity actor does not match the mission and proposal");
  }
  const identityBindingId = binding.bindingId;
  const publicKey = binding.publicKey;

  const sourceKey = agentKeyPath(options.velaHome, actor);
  const sourceMetadata = await lstat(sourceKey);
  if (!sourceMetadata.isFile() || sourceMetadata.isSymbolicLink() || sourceMetadata.nlink !== 1 || (sourceMetadata.mode & 0o777) !== 0o600) {
    throw new Error("producer session key must be one singly-linked mode-0600 regular file");
  }
  const keyBytes = await readBoundedRegularFile(sourceKey, PRIVATE_KEY_MAX_BYTES);
  let seed: Buffer | undefined;
  let directory: string | undefined;
  try {
    seed = decodeSeed(keyBytes);
    if (derivePublicKey(seed) !== publicKey) {
      throw new Error("producer session key does not derive the Receipt-bound public key");
    }
    directory = capabilityDirectory(options.landing.proposalId, options.storeRoot);
    await mkdir(capabilityBase(options.storeRoot), { recursive: true, mode: 0o700 });
    await chmod(capabilityBase(options.storeRoot), 0o700);
    await mkdir(directory, { mode: 0o700 });
    const manifest: WithdrawalCapabilityManifest = {
      schema: WITHDRAWAL_CAPABILITY_SCHEMA,
      state: "available",
      proposal_id: options.landing.proposalId,
      proposal_root: proposalRoot,
      receipt_root: receiptRoot,
      identity_binding_id: identityBindingId,
      actor,
      public_key: publicKey,
      frontier,
      final_roots: options.finalRoots,
      strict_baseline: options.mission.schema === "canopus.mission.v1"
        ? options.mission.strict_baseline
        : {
            status: "pass",
            blocker_count: 0,
            blockers_root: sha256Bytes(canonicalJcs([])),
            rule_counts: [],
          },
      vela: {
        binary: path.resolve(options.velaBinary),
        version: options.mission.vela_version,
        sha256: options.mission.vela_sha256,
      },
      created_at: new Date().toISOString(),
    };
    await writeFile(path.join(directory, "manifest.json"), canonicalJson(manifest), { flag: "wx", mode: 0o600 });
    // Publish the secret last: an interruption before this point can leave at
    // most a public, unavailable manifest rather than an orphaned key.
    await writeFile(path.join(directory, "private.key"), keyBytes, { flag: "wx", mode: 0o600 });
    await chmod(path.join(directory, "private.key"), 0o600);
    return { directory, manifest, manifest_root: contentDigest(manifest) };
  } catch (error) {
    if (directory !== undefined) await rm(directory, { recursive: true, force: true });
    throw error;
  } finally {
    seed?.fill(0);
    keyBytes.fill(0);
  }
}

export async function loadWithdrawalCapability(
  proposalId: string,
  storeRoot?: string,
): Promise<{ directory: string; manifest: WithdrawalCapabilityManifest; manifest_root: string; secret_available: boolean }> {
  const { directory } = await checkedCapabilityDirectory(proposalId, storeRoot);
  const manifestBytes = await readBoundedRegularFile(path.join(directory, "manifest.json"), 1024 * 1024);
  const manifestMetadata = await lstat(path.join(directory, "manifest.json"));
  if ((manifestMetadata.mode & 0o777) !== 0o600) {
    throw new Error("withdrawal capability manifest must be mode 0600");
  }
  const raw = parseManifest(JSON.parse(manifestBytes.toString("utf8")) as unknown, proposalId);
  let secretAvailable = false;
  try {
    const metadata = await lstat(path.join(directory, "private.key"));
    if (
      !metadata.isFile() ||
      metadata.isSymbolicLink() ||
      metadata.nlink !== 1 ||
      (metadata.mode & 0o777) !== 0o600 ||
      (metadata.size !== HEX_SEED_BYTES && metadata.size !== PRIVATE_KEY_MAX_BYTES)
    ) {
      throw new Error("withdrawal secret must be one singly-linked mode-0600 seed file");
    }
    secretAvailable = true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  if (raw.state === "available" && !secretAvailable) {
    throw new Error("withdrawal capability state disagrees with secret presence");
  }
  return { directory, manifest: raw, manifest_root: contentDigest(raw), secret_available: secretAvailable };
}

export async function installWithdrawalCapabilitySecret(
  proposalId: string,
  target: string,
  storeRoot?: string,
): Promise<void> {
  const loaded = await loadWithdrawalCapability(proposalId, storeRoot);
  if (loaded.manifest.state !== "available" || !loaded.secret_available) {
    throw new Error("withdrawal capability is not available");
  }
  const bytes = await readBoundedRegularFile(path.join(loaded.directory, "private.key"), PRIVATE_KEY_MAX_BYTES);
  let seed: Buffer | undefined;
  try {
    seed = decodeSeed(bytes);
    if (derivePublicKey(seed) !== loaded.manifest.public_key) {
      throw new Error("withdrawal secret does not match the capability public key");
    }
    await writeFile(target, bytes, { flag: "wx", mode: 0o600 });
    await chmod(target, 0o600);
  } finally {
    seed?.fill(0);
    bytes.fill(0);
  }
}

export async function withdrawalCapabilityStatus(
  proposalId: string,
  storeRoot?: string,
): Promise<Record<string, unknown>> {
  try {
    const loaded = await loadWithdrawalCapability(proposalId, storeRoot);
    return {
      proposal_id: proposalId,
      state: loaded.manifest.state,
      available: loaded.manifest.state === "available" && loaded.secret_available,
      cleanup_required: loaded.manifest.state === "consumed" && loaded.secret_available,
      manifest_root: loaded.manifest_root,
      consumed_at: loaded.manifest.consumed_at ?? null,
      consumed_reason: loaded.manifest.consumed_reason ?? null,
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { proposal_id: proposalId, state: "absent", available: false };
    }
    throw error;
  }
}

export async function consumeWithdrawalCapability(
  proposalId: string,
  reason: "withdrawn" | "human_decision_observed",
  storeRoot?: string,
): Promise<WithdrawalCapabilityManifest> {
  const loaded = await loadWithdrawalCapability(proposalId, storeRoot);
  if (loaded.manifest.state === "consumed") {
    if (loaded.secret_available) {
      await rm(path.join(loaded.directory, "private.key"), { force: true });
    }
    return loaded.manifest;
  }
  const consumed: WithdrawalCapabilityManifest = {
    ...loaded.manifest,
    state: "consumed",
    consumed_at: new Date().toISOString(),
    consumed_reason: reason,
  };
  const temporary = path.join(loaded.directory, `.manifest.${process.pid}.tmp`);
  await writeFile(temporary, canonicalJson(consumed), { flag: "wx", mode: 0o600 });
  await rename(temporary, path.join(loaded.directory, "manifest.json"));
  await rm(path.join(loaded.directory, "private.key"), { force: true });
  return consumed;
}
