import { constants } from "node:fs";
import { access, chmod, copyFile, mkdir, realpath } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import {
  arrayAt,
  exactKeys,
  objectAt,
  relativePathAt,
  sha256At,
  stringAt,
} from "../contracts/validation.js";
import { contentDigest, sha256Bytes } from "../util/canonical.js";
import { readBoundedRegularFile } from "../util/files.js";

export const PROFILE_V1_SCHEMA = "canopus.profile.v1" as const;
export const PROFILE_SCHEMA = "canopus.profile.v2" as const;
export const SUPPORTED_PRODUCT_PLATFORMS = ["darwin-arm64", "linux-x86_64"] as const;
export type ProductPlatform = (typeof SUPPORTED_PRODUCT_PLATFORMS)[number];

export interface PlatformCapsule {
  worker_profile: string;
  worker_profile_sha256: string;
  verifier_capsule: string;
  verifier_capsule_sha256: string;
  verifier_image: string;
}

export interface ProductProfile {
  schema: typeof PROFILE_SCHEMA;
  name: string;
  target: string;
  target_packet_schema: string;
  draft: string;
  draft_sha256: string;
  objective_sha256: string;
  completion_condition_sha256: string;
  allowed_artifacts_sha256: string;
  budgets_sha256: string;
  replay_argv_sha256: string;
  landing: { expected_routes: ["defer"]; max_accepted_delta: 0 };
  platforms: Record<ProductPlatform, PlatformCapsule>;
  platform: ProductPlatform;
  capsule_binary: string;
  capsule_sha256: string;
  permission_profile: string;
  permission_profile_sha256: string;
  verifier_image: string;
}

export interface LegacyProductProfile {
  schema: typeof PROFILE_V1_SCHEMA;
  name: string;
  target: string;
}

const DEFAULT_PROFILE = "erdos1056-k15-10428008-10428200";

export function productPackageRoot(): string {
  return fileURLToPath(new URL("../../../", import.meta.url));
}

export function currentProductPlatform(): ProductPlatform {
  if (process.platform === "darwin" && process.arch === "arm64") return "darwin-arm64";
  if (process.platform === "linux" && process.arch === "x64") return "linux-x86_64";
  // Native Windows is a read-only control surface. Its tool-using mission must
  // be launched inside WSL2, which consumes the exact Linux capsule binding.
  if (process.platform === "win32" && process.arch === "x64") return "linux-x86_64";
  throw new Error(
    `tool-using missions are unsupported on ${process.platform}-${process.arch}; ` +
      "supported workers are macOS arm64 and Linux/WSL2 x86-64; native Windows is read-only",
  );
}

async function registeredProfileNames(): Promise<string[]> {
  const root = path.join(productPackageRoot(), "profiles");
  const { readdir } = await import("node:fs/promises");
  return (await readdir(root, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => entry.name.slice(0, -5))
    .sort();
}

export function verifierImageAt(value: unknown, at = "verifier_image"): string {
  return stringAt(value, at, {
    min: 100,
    max: 200,
    pattern: /^ghcr\.io\/vela-science\/canopus-verifier@sha256:[0-9a-f]{64}$/u,
  });
}

export async function listProductProfiles(): Promise<string[]> {
  return registeredProfileNames();
}

function parsePlatformCapsule(value: unknown, at: string): PlatformCapsule {
  const object = objectAt(value, at);
  exactKeys(
    object,
    [
      "worker_profile",
      "worker_profile_sha256",
      "verifier_capsule",
      "verifier_capsule_sha256",
      "verifier_image",
    ],
    [],
    at,
  );
  return {
    worker_profile: relativePathAt(object.worker_profile, `${at}.worker_profile`),
    worker_profile_sha256: sha256At(
      object.worker_profile_sha256,
      `${at}.worker_profile_sha256`,
    ),
    verifier_capsule: relativePathAt(object.verifier_capsule, `${at}.verifier_capsule`),
    verifier_capsule_sha256: sha256At(
      object.verifier_capsule_sha256,
      `${at}.verifier_capsule_sha256`,
    ),
    verifier_image: verifierImageAt(object.verifier_image, `${at}.verifier_image`),
  };
}

function parseV2(
  value: Record<string, unknown>,
  name: string,
  platform: ProductPlatform,
): ProductProfile {
  exactKeys(
    value,
    [
      "schema",
      "name",
      "target",
      "target_packet_schema",
      "draft",
      "draft_sha256",
      "objective_sha256",
      "completion_condition_sha256",
      "allowed_artifacts_sha256",
      "budgets_sha256",
      "replay_argv_sha256",
      "landing",
      "platforms",
    ],
    [],
    "profile",
  );
  const platformsValue = objectAt(value.platforms, "profile.platforms");
  exactKeys(platformsValue, [...SUPPORTED_PRODUCT_PLATFORMS], [], "profile.platforms");
  const platforms = Object.fromEntries(
    SUPPORTED_PRODUCT_PLATFORMS.map((platform) => [
      platform,
      parsePlatformCapsule(platformsValue[platform], `profile.platforms.${platform}`),
    ]),
  ) as unknown as Record<ProductPlatform, PlatformCapsule>;
  const landingValue = objectAt(value.landing, "profile.landing");
  exactKeys(landingValue, ["expected_routes", "max_accepted_delta"], [], "profile.landing");
  const expectedRoutes = arrayAt(
    landingValue.expected_routes,
    "profile.landing.expected_routes",
    { min: 1, max: 1, unique: true },
    (item, at) => stringAt(item, at, { min: 5, max: 5, pattern: /^defer$/u }),
  );
  if (expectedRoutes[0] !== "defer" || landingValue.max_accepted_delta !== 0) {
    throw new Error("profile landing ceiling must be exactly defer with zero accepted delta");
  }
  const selected = platforms[platform];
  const parsed: ProductProfile = {
    schema: PROFILE_SCHEMA,
    name: stringAt(value.name, "profile.name", { min: 1, max: 128 }),
    target: stringAt(value.target, "profile.target", { min: 1, max: 256 }),
    target_packet_schema: stringAt(value.target_packet_schema, "profile.target_packet_schema", {
      min: 1,
      max: 128,
    }),
    draft: relativePathAt(value.draft, "profile.draft"),
    draft_sha256: sha256At(value.draft_sha256, "profile.draft_sha256"),
    objective_sha256: sha256At(value.objective_sha256, "profile.objective_sha256"),
    completion_condition_sha256: sha256At(
      value.completion_condition_sha256,
      "profile.completion_condition_sha256",
    ),
    allowed_artifacts_sha256: sha256At(
      value.allowed_artifacts_sha256,
      "profile.allowed_artifacts_sha256",
    ),
    budgets_sha256: sha256At(value.budgets_sha256, "profile.budgets_sha256"),
    replay_argv_sha256: sha256At(value.replay_argv_sha256, "profile.replay_argv_sha256"),
    landing: { expected_routes: ["defer"], max_accepted_delta: 0 },
    platforms,
    platform,
    capsule_binary: selected.verifier_capsule,
    capsule_sha256: selected.verifier_capsule_sha256,
    permission_profile: selected.worker_profile,
    permission_profile_sha256: selected.worker_profile_sha256,
    verifier_image: selected.verifier_image,
  };
  if (parsed.name !== name) throw new Error("profile filename and registered name disagree");
  return parsed;
}

export function loadProductProfile(
  name?: string,
  options?: { allowLegacy?: false; platform?: ProductPlatform },
): Promise<ProductProfile>;
export function loadProductProfile(
  name: string,
  options: { allowLegacy: true; platform?: ProductPlatform },
): Promise<ProductProfile | LegacyProductProfile>;
export async function loadProductProfile(
  name = DEFAULT_PROFILE,
  options: { allowLegacy?: boolean; platform?: ProductPlatform } = {},
): Promise<ProductProfile | LegacyProductProfile> {
  if (!(await registeredProfileNames()).includes(name)) {
    throw new Error(`unknown registered profile ${name}`);
  }
  const file = path.join(productPackageRoot(), "profiles", `${name}.json`);
  const value = objectAt(
    JSON.parse((await readBoundedRegularFile(file, 1024 * 1024)).toString("utf8")) as unknown,
    "profile",
  );
  if (value.schema === PROFILE_V1_SCHEMA) {
    if (options.allowLegacy !== true) {
      throw new Error("canopus.profile.v1 is replay-only; prepare a closed v2 profile to run work");
    }
    return {
      schema: PROFILE_V1_SCHEMA,
      name: stringAt(value.name, "profile.name", { min: 1, max: 128 }),
      target: stringAt(value.target, "profile.target", { min: 1, max: 256 }),
    };
  }
  if (value.schema !== PROFILE_SCHEMA) throw new Error("profile schema is not supported");
  return parseV2(value, name, options.platform ?? currentProductPlatform());
}

export async function packagedProfileResource(relative: string, label: string): Promise<string> {
  const root = await realpath(productPackageRoot());
  const file = await realpath(path.resolve(root, relative));
  const fromRoot = path.relative(root, file);
  if (fromRoot === "" || fromRoot === ".." || fromRoot.startsWith(`..${path.sep}`)) {
    throw new Error(`${label} escapes the Canopus package`);
  }
  return file;
}

export async function loadProfileDraft(profile: ProductProfile): Promise<unknown> {
  const file = await packagedProfileResource(profile.draft, "profile draft");
  const bytes = await readBoundedRegularFile(file, 1024 * 1024);
  if (sha256Bytes(bytes) !== profile.draft_sha256) throw new Error("profile draft root drifted");
  const draft = objectAt(JSON.parse(bytes.toString("utf8")) as unknown, "profile draft");
  const assertions: Array<[string, string, string]> = [
    [
      sha256Bytes(Buffer.from(stringAt(draft.objective, "profile draft.objective", { min: 1, max: 8192 }))),
      profile.objective_sha256,
      "objective",
    ],
    [
      sha256Bytes(Buffer.from(stringAt(draft.completion_condition, "profile draft.completion_condition", { min: 1, max: 8192 }))),
      profile.completion_condition_sha256,
      "completion condition",
    ],
    [contentDigest(draft.allowed_paths), profile.allowed_artifacts_sha256, "allowed artifacts"],
    [contentDigest(draft.budgets), profile.budgets_sha256, "budgets"],
    [
      contentDigest(objectAt(draft.verifier, "profile draft.verifier").argv),
      profile.replay_argv_sha256,
      "replay argv",
    ],
  ];
  for (const [observed, expected, label] of assertions) {
    if (observed !== expected) {
      throw new Error(`profile ${label} drifted from its frozen mission draft`);
    }
  }
  return draft;
}

export async function stageProfileCapsule(options: {
  profile: ProductProfile;
  stagingRoot: string;
}): Promise<{ capsule: string; source: "packaged" }> {
  const packaged = await packagedProfileResource(
    options.profile.capsule_binary,
    "profile capsule binary",
  );
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

export async function packagedWorkerProfile(profile: ProductProfile): Promise<string> {
  const file = await packagedProfileResource(
    profile.permission_profile,
    "worker permission profile",
  );
  const digest = sha256Bytes(await readBoundedRegularFile(file, 8 * 1024 * 1024));
  if (digest !== profile.permission_profile_sha256) {
    throw new Error("packaged worker permission profile drifted");
  }
  return file;
}
