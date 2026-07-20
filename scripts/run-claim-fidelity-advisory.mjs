#!/usr/bin/env node

import { lstat, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { parseCodexEvents, summarizeCodexFailure } from "../dist/src/engines/codex-events.js";
import { prepareIsolatedCodexHome, removeIsolatedCodexHome } from "../dist/src/engines/codex-home.js";
import { sandboxedToolFreeCodexExecArgv } from "../dist/src/engines/codex-tool-free.js";
import { canonicalJson, contentDigest, sha256Bytes } from "../dist/src/util/canonical.js";
import { isolatedEnvironment, runCommand } from "../dist/src/util/command.js";
import { readBoundedRegularFile } from "../dist/src/util/files.js";

const ROOT_KEYS = ["actor_registry", "artifacts", "event_log", "proposals", "snapshot"];
const METRIC_KEYS = ["range_start", "range_end", "primes_tested", "max_multiplicity", "best_p", "best_residue"];

function parseArgs(argv) {
  const values = new Map();
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!["--source", "--output", "--codex", "--codex-home"].includes(key) || value === undefined || values.has(key)) {
      throw new Error(`invalid or duplicate option near ${key ?? "end"}`);
    }
    values.set(key, value);
  }
  for (const key of ["--source", "--output", "--codex"]) {
    if (!values.has(key)) throw new Error(`${key} is required`);
  }
  return values;
}

function object(value, label) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value;
}

function exactKeys(value, expected, label) {
  const observed = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (JSON.stringify(observed) !== JSON.stringify(wanted)) {
    throw new Error(`${label} fields are not exact`);
  }
}

async function command(argv, cwd, home, timeoutMs = 30000, allowStderr = false) {
  const result = await runCommand({
    argv,
    cwd,
    env: isolatedEnvironment(home),
    timeoutMs,
    maxOutputBytes: 8 * 1024 * 1024,
  });
  if (result.exitCode !== 0 || (!allowStderr && result.stderr.length !== 0)) {
    throw new Error(`${path.basename(argv[0])} failed with exit ${result.exitCode}`);
  }
  return result.stdout.toString("utf8").trim();
}

function parseArtifact(text) {
  const result = {};
  for (const line of text.trim().split("\n")) {
    const index = line.indexOf("=");
    if (index < 1) throw new Error("source artifact is not the registered key-value format");
    result[line.slice(0, index)] = line.slice(index + 1);
  }
  if (result.schema !== "canopus.erdos1056-k15-search.v1" || result.status !== "negative") {
    throw new Error("source artifact schema or status drifted");
  }
  return Object.fromEntries(METRIC_KEYS.map((key) => {
    const parsed = Number(result[key]);
    if (!Number.isSafeInteger(parsed) || parsed < 0) throw new Error(`artifact ${key} is invalid`);
    return [key, parsed];
  }));
}

function verifyAssessment(registration, artifactMetrics, assessment) {
  const value = object(assessment, "assessment");
  exactKeys(value, ["schema", "source", "numeric_correspondence", "language", "standing", "recommendation"], "assessment");
  if (value.schema !== "canopus.claim-fidelity-assessment.v1") throw new Error("assessment schema drifted");
  const source = object(value.source, "assessment.source");
  exactKeys(source, ["run_id", "roots", "artifact_root", "reported_claim"], "assessment.source");
  if (source.run_id !== registration.source.run_id || source.artifact_root !== registration.source.artifact_root || source.reported_claim !== registration.source.reported_claim) {
    throw new Error("assessment source binding drifted");
  }
  const roots = object(source.roots, "assessment.source.roots");
  exactKeys(roots, ROOT_KEYS, "assessment.source.roots");
  for (const key of ROOT_KEYS) {
    if (roots[key] !== registration.source.roots[key]) throw new Error(`assessment root ${key} drifted`);
  }
  const comparisons = object(value.numeric_correspondence, "assessment.numeric_correspondence");
  exactKeys(comparisons, METRIC_KEYS, "assessment.numeric_correspondence");
  for (const key of METRIC_KEYS) {
    const comparison = object(comparisons[key], `assessment.numeric_correspondence.${key}`);
    exactKeys(comparison, ["reported", "artifact", "matches"], `assessment.numeric_correspondence.${key}`);
    if (comparison.reported !== registration.source.reported_metrics[key] || comparison.artifact !== artifactMetrics[key] || comparison.matches !== true || comparison.reported !== comparison.artifact) {
      throw new Error(`assessment numeric comparison ${key} drifted`);
    }
  }
  const language = object(value.language, "assessment.language");
  exactKeys(language, ["classification", "universal_claim_detected", "solved_language_detected", "flagged_phrases", "rationale"], "assessment.language");
  if (language.classification !== "model_assessment" || typeof language.universal_claim_detected !== "boolean" || typeof language.solved_language_detected !== "boolean" || !Array.isArray(language.flagged_phrases) || typeof language.rationale !== "string") {
    throw new Error("assessment semantic language fields are invalid");
  }
  const standing = object(value.standing, "assessment.standing");
  exactKeys(standing, ["verifier_success_reported", "policy_route", "accepted_state_delta", "scientific_acceptance_reported", "distinction"], "assessment.standing");
  if (standing.verifier_success_reported !== true || standing.policy_route !== "defer" || standing.accepted_state_delta !== 0 || standing.scientific_acceptance_reported !== false || typeof standing.distinction !== "string") {
    throw new Error("assessment standing confused verification with acceptance");
  }
  const recommendation = object(value.recommendation, "assessment.recommendation");
  exactKeys(recommendation, ["classification", "publishable_with_caveats", "revised_claim"], "assessment.recommendation");
  if (recommendation.classification !== "model_assessment" || typeof recommendation.publishable_with_caveats !== "boolean" || typeof recommendation.revised_claim !== "string") {
    throw new Error("assessment recommendation fields are invalid");
  }
}

function prompt(registration, artifactText) {
  return [
    "Perform one bounded claim-fidelity audit. You have no tools and must use only the immutable evidence below.",
    "Copy the source run, all five roots, artifact root, and reported claim exactly into the required schema.",
    "For every numeric field, copy the registered reported value and the frozen artifact value and set matches true only when they are equal.",
    "Assess whether the reported claim uses universal language beyond the bounded range or says the Erdős problem is solved. These are semantic judgments: keep classification exactly model_assessment.",
    "Distinguish the recorded verifier pass from scientific acceptance: route is Defer and accepted-state delta is zero.",
    "Do not claim that the advisory itself is scientific state. Return only the supplied JSON schema.",
    "Registration:",
    canonicalJson(registration),
    "Frozen artifact:",
    artifactText,
  ].join("\n");
}

const values = parseArgs(process.argv.slice(2));
const repoRoot = await realpath(new URL("../", import.meta.url).pathname);
const registrationPath = path.join(repoRoot, "advisories/erdos1056-claim-fidelity/registration.json");
const registrationBytes = await readBoundedRegularFile(registrationPath, 1024 * 1024);
const registration = JSON.parse(registrationBytes.toString("utf8"));
const source = await realpath(path.resolve(values.get("--source")));
const output = path.resolve(values.get("--output"));
const codex = await realpath(path.resolve(values.get("--codex")));
const codexHome = path.resolve(values.get("--codex-home") ?? process.env.CODEX_HOME ?? path.join(os.homedir(), ".codex"));
const schemaPath = path.join(repoRoot, registration.output_schema);
const schemaBytes = await readBoundedRegularFile(schemaPath, 1024 * 1024);
if (sha256Bytes(schemaBytes) !== registration.output_schema_sha256) throw new Error("registered output schema drifted");
try {
  await lstat(output);
  throw new Error("advisory output directory already exists");
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
await mkdir(output, { recursive: true, mode: 0o700 });
const runtime = await mkdtemp(path.join(os.tmpdir(), "canopus-claim-fidelity-"));
try {
  const head = await command(["git", "rev-parse", "HEAD"], source, runtime);
  const clean = await command(["git", "status", "--porcelain=v1", "--untracked-files=all"], source, runtime);
  if (head !== registration.source.commit || clean !== "") throw new Error("source frontier is not the exact clean registered commit");
  const status = JSON.parse(await command(["vela", "status", ".", "--json"], source, runtime));
  for (const key of ROOT_KEYS) {
    if (status.roots?.[key] !== registration.source.roots[key]) throw new Error(`source frontier root ${key} drifted`);
  }
  const artifactBytes = await readBoundedRegularFile(path.join(source, registration.source.artifact_path), 1024 * 1024);
  if (sha256Bytes(artifactBytes) !== registration.source.artifact_root) throw new Error("source artifact root drifted");
  const artifactText = artifactBytes.toString("utf8");
  const artifactMetrics = parseArtifact(artifactText);
  for (const key of METRIC_KEYS) {
    if (artifactMetrics[key] !== registration.source.reported_metrics[key]) throw new Error(`registered reported metric ${key} disagrees with the artifact`);
  }
  const version = await command([codex, "--version"], output, runtime, 30000, true);
  if (version !== registration.runner.codex_version) throw new Error("Codex version drifted");
  const work = path.join(runtime, "work");
  const home = path.join(runtime, "home");
  await mkdir(work, { mode: 0o700 });
  await mkdir(home, { mode: 0o700 });
  const finalPath = path.join(work, "assessment.json");
  const isolatedCodexHome = await prepareIsolatedCodexHome(codexHome, home);
  let result;
  try {
    const argv = await sandboxedToolFreeCodexExecArgv({
      binary: codex,
      model: registration.model,
      reasoningEffort: registration.reasoning_effort,
      outputSchema: schemaPath,
      finalPath,
      cwd: work,
      authHome: isolatedCodexHome,
    });
    result = await runCommand({
      argv,
      cwd: work,
      env: { ...isolatedEnvironment(home), CODEX_HOME: isolatedCodexHome, NO_COLOR: "1" },
      timeoutMs: registration.runner.timeout_ms,
      maxOutputBytes: registration.runner.max_output_bytes,
      stdin: prompt(registration, artifactText),
    });
  } finally {
    await removeIsolatedCodexHome(isolatedCodexHome);
  }
  if (result.exitCode !== 0) {
    throw new Error(`Codex advisory failed: ${summarizeCodexFailure(result.stdout.toString("utf8"))}`);
  }
  const events = parseCodexEvents(result.stdout.toString("utf8"));
  if (events.actionTypes.length !== 0) throw new Error("claim-fidelity advisory used tools");
  const assessment = JSON.parse((await readBoundedRegularFile(finalPath, 1024 * 1024)).toString("utf8"));
  verifyAssessment(registration, artifactMetrics, assessment);
  const verification = {
    schema: "canopus.claim-fidelity-verification.v1",
    status: "pass",
    authority: "non_authoritative_advisory",
    scientific_state_landed: false,
    model: registration.model,
    registration_root: sha256Bytes(registrationBytes),
    output_schema_root: sha256Bytes(schemaBytes),
    assessment_root: contentDigest(assessment),
    checks: {
      source_run_bound: true,
      all_five_roots_bound: true,
      artifact_root_matched: true,
      numeric_correspondence_matched: true,
      verifier_acceptance_distinction_preserved: true,
    },
    semantic_fields: [
      { path: "language", classification: "model_assessment" },
      { path: "recommendation", classification: "model_assessment" },
    ],
    usage: events.usage,
    events_root: sha256Bytes(result.stdout),
    stderr_root: sha256Bytes(result.stderr),
  };
  await writeFile(path.join(output, "assessment.json"), canonicalJson(assessment), { flag: "wx", mode: 0o644 });
  await writeFile(path.join(output, "verification.json"), canonicalJson(verification), { flag: "wx", mode: 0o644 });
  process.stdout.write(`${JSON.stringify({ ok: true, output, assessment_root: verification.assessment_root, model: registration.model, scientific_state_landed: false })}\n`);
} finally {
  await rm(runtime, { recursive: true, force: true });
}
