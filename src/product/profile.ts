import { constants } from "node:fs";
import { access, chmod, copyFile, mkdir, realpath } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { objectAt, sha256At, stringAt } from "../contracts/validation.js";
import { sha256Bytes } from "../util/canonical.js";
import { readBoundedRegularFile } from "../util/files.js";

export const PROFILE_SCHEMA = "canopus.profile.v1" as const;

export interface ProductProfile {
  schema: typeof PROFILE_SCHEMA;
  name: string;
  target: string;
  draft: string;
  capsule_binary: string;
  capsule_sha256: string;
  range_start: number;
  range_end: number;
  verifier_image: string;
}

const DEFAULT_PROFILE = "erdos1056-k15-10428008-10428200";
const REGISTERED = new Set([
  DEFAULT_PROFILE,
  "erdos1056-k15-10428201-10428400",
]);

function packageRoot(): string {
  return fileURLToPath(new URL("../../../", import.meta.url));
}

function finiteInteger(value: unknown, at: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 2) {
    throw new Error(`${at} must be an integer of at least two`);
  }
  return value;
}

export async function loadProductProfile(name = DEFAULT_PROFILE): Promise<ProductProfile> {
  if (!REGISTERED.has(name)) throw new Error(`unknown registered profile ${name}`);
  const file = path.join(packageRoot(), "profiles", `${name}.json`);
  const value = objectAt(
    JSON.parse((await readBoundedRegularFile(file, 1024 * 1024)).toString("utf8")) as unknown,
    "profile",
  );
  if (value.schema !== PROFILE_SCHEMA) throw new Error("profile schema is not supported");
  const rangeStart = finiteInteger(value.range_start, "profile.range_start");
  const rangeEnd = finiteInteger(value.range_end, "profile.range_end");
  if (rangeEnd < rangeStart || rangeEnd - rangeStart > 10_000) {
    throw new Error("profile range is invalid or unbounded");
  }
  const profile: ProductProfile = {
    schema: PROFILE_SCHEMA,
    name: stringAt(value.name, "profile.name", { min: 1, max: 128 }),
    target: stringAt(value.target, "profile.target", { min: 1, max: 256 }),
    draft: stringAt(value.draft, "profile.draft", { min: 1, max: 512 }),
    capsule_binary: stringAt(value.capsule_binary, "profile.capsule_binary", { min: 1, max: 512 }),
    capsule_sha256: sha256At(value.capsule_sha256, "profile.capsule_sha256"),
    range_start: rangeStart,
    range_end: rangeEnd,
    verifier_image: sha256At(value.verifier_image, "profile.verifier_image"),
  };
  if (profile.name !== name) throw new Error("profile filename and registered name disagree");
  return profile;
}

async function packageFile(relative: string, label: string): Promise<string> {
  const root = await realpath(packageRoot());
  const file = await realpath(path.resolve(root, relative));
  const fromRoot = path.relative(root, file);
  if (fromRoot === "" || fromRoot === ".." || fromRoot.startsWith(`..${path.sep}`)) {
    throw new Error(`${label} escapes the Canopus package`);
  }
  return file;
}

export async function loadProfileDraft(profile: ProductProfile): Promise<unknown> {
  const file = await packageFile(profile.draft, "profile draft");
  return JSON.parse((await readBoundedRegularFile(file, 1024 * 1024)).toString("utf8")) as unknown;
}

export async function stageProfileCapsule(options: {
  profile: ProductProfile;
  stagingRoot: string;
}): Promise<{ capsule: string; source: "packaged" }> {
  const packaged = await packageFile(options.profile.capsule_binary, "profile capsule binary");
  await access(packaged, constants.R_OK);
  const packagedDigest = sha256Bytes(await readBoundedRegularFile(packaged, 268_435_456));
  if (packagedDigest !== options.profile.capsule_sha256) {
    throw new Error(
      `packaged capsule drifted: expected ${options.profile.capsule_sha256}, observed ${packagedDigest}`,
    );
  }
  const capsule = path.join(options.stagingRoot, "capsule", "verifier");
  await mkdir(path.dirname(capsule), { recursive: true, mode: 0o700 });
  await copyFile(packaged, capsule, constants.COPYFILE_EXCL);
  await chmod(capsule, 0o555);
  const digest = sha256Bytes(await readBoundedRegularFile(capsule, 268_435_456));
  if (digest !== options.profile.capsule_sha256) {
    throw new Error(`staged capsule drifted: expected ${options.profile.capsule_sha256}, observed ${digest}`);
  }
  return { capsule, source: "packaged" };
}
