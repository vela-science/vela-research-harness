import {
  AGENT_RE,
  ContractError,
  MISSION_ID_RE,
  arrayAt,
  enumAt,
  exactKeys,
  gitObjectAt,
  integerAt,
  objectAt,
  relativePathAt,
  sha256At,
  stringAt,
} from "./validation.js";

export const MISSION_SCHEMA = "canopus.mission.v0" as const;
export const ROLES = ["producer", "adversary", "verifier", "fidelity"] as const;
// Vela Deny is deliberately error-shaped and therefore cannot be a successful
// Canopus landing outcome. Missions register only success-shaped routes.
export const LAND_ROUTES = ["permit", "defer"] as const;
export const CLAIM_TYPES = [
  "computational",
  "theoretical",
  "empirical",
  "negative",
  "contradiction",
] as const;
export const REPLAYABILITY = [
  "exact",
  "bounded",
  "approximate",
  "unavailable",
  "unknown",
] as const;
export type MissionRole = (typeof ROLES)[number];
export type LandRoute = (typeof LAND_ROUTES)[number];
export type ClaimType = (typeof CLAIM_TYPES)[number];
export type Replayability = (typeof REPLAYABILITY)[number];

export interface MissionRoots {
  git_commit: string;
  git_tree: string;
  vela_event_log: string;
  vela_snapshot: string;
}

export interface MissionBudgets {
  max_research_wall_time_ms: number;
  max_research_processes: number;
  max_research_output_bytes: number;
  max_prompt_bytes: number;
  max_artifact_bytes: number;
  max_attempts: number;
  max_observed_tokens: number;
}

export interface VerifierSpec {
  argv: string[];
  executable_sha256: string;
  cwd: string;
  timeout_ms: number;
  max_output_bytes: number;
  network: "deny";
  writes: "deny";
}

export interface LandingSpec {
  expected_routes: LandRoute[];
  max_accepted_delta: number;
}

export type ScientificChainSpec =
  | { predicted_observable: string; performed_test: string }
  | { not_applicable: true; performed_test: string };

export interface Mission {
  schema: typeof MISSION_SCHEMA;
  id: string;
  target: string;
  vela_version: string;
  vela_sha256: string;
  frontier: string;
  actor: string;
  role: MissionRole;
  claim_type: ClaimType;
  replayability: Replayability;
  objective: string;
  completion_condition: string;
  roots: MissionRoots;
  allowed_paths: string[];
  budgets: MissionBudgets;
  verifier: VerifierSpec;
  scientific_chain: ScientificChainSpec;
  landing: LandingSpec;
  parent_candidate?: string;
  repair_reason?: string;
}

function parseRoots(value: unknown): MissionRoots {
  const object = objectAt(value, "mission.roots");
  exactKeys(
    object,
    ["git_commit", "git_tree", "vela_event_log", "vela_snapshot"],
    [],
    "mission.roots",
  );
  return {
    git_commit: gitObjectAt(object.git_commit, "mission.roots.git_commit"),
    git_tree: gitObjectAt(object.git_tree, "mission.roots.git_tree"),
    vela_event_log: sha256At(object.vela_event_log, "mission.roots.vela_event_log"),
    vela_snapshot: sha256At(object.vela_snapshot, "mission.roots.vela_snapshot"),
  };
}

function frontierPathAt(value: unknown): string {
  return value === "." ? "." : relativePathAt(value, "mission.frontier");
}

function parseBudgets(value: unknown): MissionBudgets {
  const object = objectAt(value, "mission.budgets");
  exactKeys(
    object,
    [
      "max_research_wall_time_ms",
      "max_research_processes",
      "max_research_output_bytes",
      "max_prompt_bytes",
      "max_artifact_bytes",
      "max_attempts",
      "max_observed_tokens",
    ],
    [],
    "mission.budgets",
  );
  return {
    max_research_wall_time_ms: integerAt(
      object.max_research_wall_time_ms,
      "mission.budgets.max_research_wall_time_ms",
      100,
      3_600_000,
    ),
    max_research_processes: integerAt(
      object.max_research_processes,
      "mission.budgets.max_research_processes",
      1,
      64,
    ),
    max_research_output_bytes: integerAt(
      object.max_research_output_bytes,
      "mission.budgets.max_research_output_bytes",
      1024,
      67_108_864,
    ),
    max_prompt_bytes: integerAt(
      object.max_prompt_bytes,
      "mission.budgets.max_prompt_bytes",
      1024,
      8_388_608,
    ),
    max_artifact_bytes: integerAt(
      object.max_artifact_bytes,
      "mission.budgets.max_artifact_bytes",
      1,
      1_073_741_824,
    ),
    max_attempts: integerAt(object.max_attempts, "mission.budgets.max_attempts", 1, 8),
    max_observed_tokens: integerAt(
      object.max_observed_tokens,
      "mission.budgets.max_observed_tokens",
      1,
      1_000_000,
    ),
  };
}

function parseVerifier(value: unknown): VerifierSpec {
  const object = objectAt(value, "mission.verifier");
  exactKeys(
    object,
    ["argv", "executable_sha256", "cwd", "timeout_ms", "max_output_bytes", "network", "writes"],
    [],
    "mission.verifier",
  );
  return {
    argv: arrayAt(
      object.argv,
      "mission.verifier.argv",
      { min: 1, max: 64 },
      (item, at) => stringAt(item, at, { max: 4096 }),
    ),
    executable_sha256: sha256At(
      object.executable_sha256,
      "mission.verifier.executable_sha256",
    ),
    cwd: relativePathAt(object.cwd, "mission.verifier.cwd"),
    timeout_ms: integerAt(object.timeout_ms, "mission.verifier.timeout_ms", 100, 3_600_000),
    max_output_bytes: integerAt(
      object.max_output_bytes,
      "mission.verifier.max_output_bytes",
      1024,
      67_108_864,
    ),
    network: enumAt(object.network, "mission.verifier.network", ["deny"] as const),
    writes: enumAt(object.writes, "mission.verifier.writes", ["deny"] as const),
  };
}

function parseLanding(value: unknown): LandingSpec {
  const object = objectAt(value, "mission.landing");
  exactKeys(object, ["expected_routes", "max_accepted_delta"], [], "mission.landing");
  return {
    expected_routes: arrayAt(
      object.expected_routes,
      "mission.landing.expected_routes",
      { min: 1, max: 3, unique: true },
      (item, at) => enumAt(item, at, LAND_ROUTES),
    ),
    max_accepted_delta: integerAt(
      object.max_accepted_delta,
      "mission.landing.max_accepted_delta",
      0,
      1,
    ),
  };
}

function parseScientificChain(value: unknown): ScientificChainSpec {
  const object = objectAt(value, "mission.scientific_chain");
  exactKeys(
    object,
    ["performed_test"],
    ["predicted_observable", "not_applicable"],
    "mission.scientific_chain",
  );
  const performed_test = stringAt(
    object.performed_test,
    "mission.scientific_chain.performed_test",
    { min: 1, max: 16_384 },
  );
  const hasPrediction = object.predicted_observable !== undefined;
  const hasNotApplicable = object.not_applicable !== undefined;
  if (hasPrediction === hasNotApplicable) {
    throw new ContractError(
      "mission.scientific_chain requires exactly one of predicted_observable or not_applicable",
    );
  }
  if (hasPrediction) {
    return {
      predicted_observable: stringAt(
        object.predicted_observable,
        "mission.scientific_chain.predicted_observable",
        { min: 1, max: 16_384 },
      ),
      performed_test,
    };
  }
  if (object.not_applicable !== true) {
    throw new ContractError("mission.scientific_chain.not_applicable must be true");
  }
  return { not_applicable: true, performed_test };
}

export function parseMission(value: unknown): Mission {
  const object = objectAt(value, "mission");
  exactKeys(
    object,
    [
      "schema",
      "id",
      "target",
      "vela_version",
      "vela_sha256",
      "frontier",
      "actor",
      "role",
      "claim_type",
      "replayability",
      "objective",
      "completion_condition",
      "roots",
      "allowed_paths",
      "budgets",
      "verifier",
      "scientific_chain",
      "landing",
    ],
    ["parent_candidate", "repair_reason"],
    "mission",
  );

  const replayability = enumAt(object.replayability, "mission.replayability", REPLAYABILITY);
  if (replayability !== "exact") {
    throw new ContractError("Canopus v0 requires replayability exact");
  }
  const verifier = parseVerifier(object.verifier);
  const verifierExecutable = relativePathAt(verifier.argv[0], "mission.verifier.argv[0]");
  if (!/^(?:[A-Za-z0-9_+.-]+\/)*[A-Za-z0-9_+.-]+$/u.test(verifierExecutable)) {
    throw new ContractError(
      "mission.verifier.argv[0] must name one relative verifier capsule without shell syntax",
    );
  }
  verifier.argv[0] = verifierExecutable;
  const landing = parseLanding(object.landing);
  const requiredDelta = landing.expected_routes.includes("permit") ? 1 : 0;
  if (landing.max_accepted_delta !== requiredDelta) {
    throw new ContractError(
      `mission.landing.max_accepted_delta must be ${requiredDelta} for the registered routes`,
    );
  }

  const base = {
    schema: enumAt(object.schema, "mission.schema", [MISSION_SCHEMA] as const),
    id: stringAt(object.id, "mission.id", { max: 134, pattern: MISSION_ID_RE }),
    target: stringAt(object.target, "mission.target", { min: 1, max: 256 }),
    vela_version: stringAt(object.vela_version, "mission.vela_version", {
      min: 5,
      max: 32,
      pattern: /^0\.[0-9]+\.[0-9]+$/u,
    }),
    vela_sha256: sha256At(object.vela_sha256, "mission.vela_sha256"),
    frontier: frontierPathAt(object.frontier),
    actor: stringAt(object.actor, "mission.actor", { max: 69, pattern: AGENT_RE }),
    role: enumAt(object.role, "mission.role", ROLES),
    claim_type: enumAt(object.claim_type, "mission.claim_type", CLAIM_TYPES),
    replayability,
    objective: stringAt(object.objective, "mission.objective", { min: 1, max: 8192 }),
    completion_condition: stringAt(object.completion_condition, "mission.completion_condition", {
      min: 1,
      max: 4096,
    }),
    roots: parseRoots(object.roots),
    allowed_paths: arrayAt(
      object.allowed_paths,
      "mission.allowed_paths",
      { min: 1, max: 64, unique: true },
      (item, at) => {
        const allowed = relativePathAt(item, at);
        if (allowed === "canopus" || allowed.startsWith("canopus/")) {
          throw new ContractError(`${at} uses the reserved Canopus evidence namespace`);
        }
        return allowed;
      },
    ),
    budgets: parseBudgets(object.budgets),
    verifier,
    scientific_chain: parseScientificChain(object.scientific_chain),
    landing,
  };

  if ((object.parent_candidate === undefined) !== (object.repair_reason === undefined)) {
    throw new ContractError("mission repair requires both parent_candidate and repair_reason");
  }
  if (object.parent_candidate === undefined || object.repair_reason === undefined) {
    return base;
  }
  return {
    ...base,
    parent_candidate: sha256At(object.parent_candidate, "mission.parent_candidate"),
    repair_reason: stringAt(object.repair_reason, "mission.repair_reason", {
      min: 1,
      max: 4096,
    }),
  };
}
