import { mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { parseCodexEvents } from "../engines/codex-events.js";
import { sandboxedToolFreeCodexExecArgv } from "../engines/codex-tool-free.js";
import { canonicalJson, contentDigest, sha256Bytes } from "../util/canonical.js";
import { isolatedEnvironment, runCommand, type CommandRunner } from "../util/command.js";
import { readBoundedRegularFile } from "../util/files.js";

export type BenchmarkArm = "baseline" | "treatment";

interface CandidateFact {
  id: "alpha" | "beta" | "gamma";
  claim: string;
  base_root: string;
  verifier: string;
  receipt_state: string;
  accepted_event: string | null;
}

interface BenchmarkFacts {
  schema: "canopus.benchmark-facts.v0";
  case_id: string;
  question: string;
  current_accepted_root: string;
  candidates: CandidateFact[];
  accepted_event_effect: {
    event_id: string;
    candidate_id: string;
    resulting_root: string;
  };
  rule: string;
}

interface Registration {
  schema: "canopus.benchmark-registration.v0";
  case: {
    id: string;
    facts_path: string;
    facts_sha256: string;
    answer_schema_path: string;
    answer_schema_sha256: string;
  };
  runner: {
    path: string;
    sha256: string;
    arms: BenchmarkArm[];
    runs_per_arm: number;
    maximum_model_calls: number;
    timeout_ms: number;
    max_output_bytes: number;
    sandbox: "read-only";
    ephemeral: true;
    tools_allowed: false;
  };
  model: {
    provider_surface: "codex-cli";
    request: string;
    reasoning_effort: "low";
    exact_cli_version: string;
    binary_sha256: string;
    dollar_price: string;
  };
  rubric: {
    total: number;
    selected_base: string;
    base_state: string;
    next_action: string;
    must_not_claim: string;
    required_rejected_routes: string[];
  };
  external_gate_credit: false;
}

export interface BenchmarkAnswer {
  selected_base: string;
  base_state: string;
  next_action: string;
  must_not_claim: string;
  rejected_routes: string[];
  explanation: string;
}

export interface ArmResult {
  arm: BenchmarkArm;
  answer: BenchmarkAnswer;
  metrics: {
    score: number;
    defects: number;
    review_items: number;
    dead_route: number;
    downstream_reuse: number;
    input_tokens: number;
    output_tokens: number;
    response_bytes: number;
    wall_time_ms: number;
  };
  prompt_sha256: string;
  events_sha256: string;
  stderr_sha256: string;
  final_sha256: string;
}

export interface BenchmarkReport {
  schema: "canopus.benchmark-report.v0";
  registration_sha256: string;
  runner_sha256: string;
  model: Registration["model"];
  arms: ArmResult[];
  directional_result: "treatment_useful" | "no_advantage" | "treatment_worse";
  causal_claim: false;
  external_gate_credit: false;
}

function asFacts(value: unknown): BenchmarkFacts {
  const facts = value as BenchmarkFacts;
  if (
    typeof facts !== "object" ||
    facts === null ||
    facts.schema !== "canopus.benchmark-facts.v0" ||
    !Array.isArray(facts.candidates) ||
    facts.candidates.length !== 3
  ) {
    throw new Error("benchmark facts are malformed");
  }
  return facts;
}

function repoFile(repoRoot: string, relative: unknown, label: string): string {
  if (typeof relative !== "string" || relative === "" || path.isAbsolute(relative)) {
    throw new Error(`benchmark ${label} must be a relative repository path`);
  }
  const normalized = path.posix.normalize(relative);
  if (normalized !== relative || normalized === ".." || normalized.startsWith("../")) {
    throw new Error(`benchmark ${label} escapes the repository`);
  }
  const resolved = path.resolve(repoRoot, relative);
  if (!resolved.startsWith(`${repoRoot}${path.sep}`)) {
    throw new Error(`benchmark ${label} escapes the repository`);
  }
  return resolved;
}

function promptFor(arm: BenchmarkArm, facts: BenchmarkFacts): string {
  const shared = [
    "Do not use tools or inspect files. Answer only the supplied JSON schema.",
    facts.question,
    `Rule: ${facts.rule}`,
  ];
  if (arm === "baseline") {
    return [
      ...shared,
      "Raw records (intentionally unordered):",
      ...[facts.candidates[2], facts.candidates[0], facts.candidates[1]].map(
        (candidate) => JSON.stringify(candidate),
      ),
      `accepted-event.json=${JSON.stringify(facts.accepted_event_effect)}`,
      `frontier-current-root.txt=${facts.current_accepted_root}`,
    ].join("\n");
  }
  const alpha = facts.candidates.find((candidate) => candidate.id === "alpha");
  const beta = facts.candidates.find((candidate) => candidate.id === "beta");
  const gamma = facts.candidates.find((candidate) => candidate.id === "gamma");
  return [
    ...shared,
    "Vela inherited-state briefing:",
    `CURRENT ACCEPTED ROOT: ${facts.current_accepted_root}`,
    `ACCEPTED BASE: ${JSON.stringify(beta)}`,
    `PENDING, NOT INHERITABLE: ${JSON.stringify(alpha)}`,
    `FAILED VERIFIER, DEAD ROUTE: ${JSON.stringify(gamma)}`,
    `ACCEPTED EVENT EFFECT: ${JSON.stringify(facts.accepted_event_effect)}`,
  ].join("\n");
}

function asAnswer(value: unknown): BenchmarkAnswer {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("benchmark answer is not an object");
  }
  const answer = value as Record<string, unknown>;
  const fields = [
    "selected_base",
    "base_state",
    "next_action",
    "must_not_claim",
    "rejected_routes",
    "explanation",
  ];
  if (Object.keys(answer).sort().join("\n") !== [...fields].sort().join("\n")) {
    throw new Error("benchmark answer field set is invalid");
  }
  if (
    typeof answer.selected_base !== "string" ||
    typeof answer.base_state !== "string" ||
    typeof answer.next_action !== "string" ||
    typeof answer.must_not_claim !== "string" ||
    !Array.isArray(answer.rejected_routes) ||
    answer.rejected_routes.some((item) => typeof item !== "string") ||
    typeof answer.explanation !== "string"
  ) {
    throw new Error("benchmark answer is malformed");
  }
  return answer as unknown as BenchmarkAnswer;
}

function grade(
  arm: BenchmarkArm,
  answer: BenchmarkAnswer,
  registration: Registration,
  usage: { input_tokens: number; output_tokens: number },
  responseBytes: number,
  wallTimeMs: number,
): ArmResult["metrics"] {
  const checks = [
    answer.selected_base === registration.rubric.selected_base,
    answer.base_state === registration.rubric.base_state,
    answer.next_action === registration.rubric.next_action,
    answer.must_not_claim === registration.rubric.must_not_claim,
    ...registration.rubric.required_rejected_routes.map((route) =>
      answer.rejected_routes.includes(route),
    ),
  ];
  const score = checks.filter(Boolean).length;
  return {
    score,
    defects: registration.rubric.total - score,
    review_items: registration.rubric.total - score,
    dead_route: answer.selected_base === "beta" ? 0 : 1,
    downstream_reuse:
      answer.selected_base === "beta" && answer.next_action === "extend_beta" ? 1 : 0,
    input_tokens: usage.input_tokens,
    output_tokens: usage.output_tokens,
    response_bytes: responseBytes,
    wall_time_ms: wallTimeMs,
  };
}

async function armRun(options: {
  arm: BenchmarkArm;
  facts: BenchmarkFacts;
  registration: Registration;
  repoRoot: string;
  outputRoot: string;
  codexBinary: string;
  codexHome: string;
  runner: CommandRunner;
}): Promise<ArmResult> {
  const armRoot = path.join(options.outputRoot, options.arm);
  const empty = path.join(armRoot, "empty");
  const home = path.join(armRoot, "home");
  await Promise.all([mkdir(empty, { recursive: true }), mkdir(home, { recursive: true })]);
  const finalPath = path.join(armRoot, "final.json");
  const schemaPath = path.join(options.repoRoot, options.registration.case.answer_schema_path);
  const prompt = promptFor(options.arm, options.facts);
  const environment = {
    ...isolatedEnvironment(home),
    CODEX_HOME: options.codexHome,
    NO_COLOR: "1",
  };
  const argv = await sandboxedToolFreeCodexExecArgv({
    binary: options.codexBinary,
    model: options.registration.model.request,
    outputSchema: schemaPath,
    finalPath,
    cwd: empty,
    reasoningEffort: options.registration.model.reasoning_effort,
    authHome: options.codexHome,
  });
  const result = await options.runner({
    argv,
    cwd: empty,
    env: environment,
    timeoutMs: options.registration.runner.timeout_ms,
    maxOutputBytes: options.registration.runner.max_output_bytes,
    stdin: prompt,
  });
  if (result.exitCode !== 0) {
    throw new Error(`${options.arm} Codex run exited ${result.exitCode}: ${result.stderr.toString("utf8")}`);
  }
  const events = parseCodexEvents(result.stdout.toString("utf8"));
  if (events.actionTypes.length !== 0) {
    throw new Error(`${options.arm} benchmark used tools: ${events.actionTypes.join(",")}`);
  }
  const final = await readBoundedRegularFile(finalPath, options.registration.runner.max_output_bytes);
  const answer = asAnswer(JSON.parse(final.toString("utf8")) as unknown);
  await Promise.all([
    writeFile(path.join(armRoot, "prompt.txt"), prompt, { flag: "wx", mode: 0o600 }),
    writeFile(path.join(armRoot, "events.jsonl"), result.stdout, { flag: "wx", mode: 0o600 }),
    writeFile(path.join(armRoot, "stderr.txt"), result.stderr, { flag: "wx", mode: 0o600 }),
  ]);
  return {
    arm: options.arm,
    answer,
    metrics: grade(
      options.arm,
      answer,
      options.registration,
      events.usage,
      final.length,
      result.durationMs,
    ),
    prompt_sha256: sha256Bytes(prompt),
    events_sha256: sha256Bytes(result.stdout),
    stderr_sha256: sha256Bytes(result.stderr),
    final_sha256: sha256Bytes(final),
  };
}

export async function runPairedBenchmark(options: {
  registrationPath: string;
  repoRoot: string;
  outputRoot: string;
  codexBinary: string;
  codexHome: string;
  runner?: CommandRunner;
}): Promise<BenchmarkReport> {
  const repoRoot = path.resolve(options.repoRoot);
  const outputRoot = path.resolve(options.outputRoot);
  const relativeOutput = path.relative(repoRoot, outputRoot);
  if (relativeOutput === "" || (!relativeOutput.startsWith("..") && !path.isAbsolute(relativeOutput))) {
    throw new Error("benchmark output must be outside the repository");
  }
  try {
    if ((await readdir(outputRoot)).length !== 0) throw new Error("benchmark output is not empty");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    await mkdir(outputRoot, { recursive: true, mode: 0o700 });
  }
  const registrationBytes = await readBoundedRegularFile(options.registrationPath, 1_048_576);
  const registration = JSON.parse(registrationBytes.toString("utf8")) as Registration;
  if (
    registration.schema !== "canopus.benchmark-registration.v0" ||
    registration.runner.maximum_model_calls !== 2 ||
    registration.runner.runs_per_arm !== 1 ||
    registration.external_gate_credit !== false ||
    JSON.stringify(registration.runner.arms) !== JSON.stringify(["baseline", "treatment"])
  ) {
    throw new Error("benchmark registration is invalid");
  }
  const factsPath = repoFile(repoRoot, registration.case.facts_path, "facts_path");
  const schemaPath = repoFile(repoRoot, registration.case.answer_schema_path, "answer_schema_path");
  const runnerPath = repoFile(repoRoot, registration.runner.path, "runner.path");
  const [factsBytes, schemaBytes, runnerBytes] = await Promise.all([
    readBoundedRegularFile(factsPath, 1_048_576),
    readBoundedRegularFile(schemaPath, 1_048_576),
    readBoundedRegularFile(runnerPath, 1_048_576),
  ]);
  for (const [observed, expected, label] of [
    [sha256Bytes(factsBytes), registration.case.facts_sha256, "facts"],
    [sha256Bytes(schemaBytes), registration.case.answer_schema_sha256, "answer schema"],
    [sha256Bytes(runnerBytes), registration.runner.sha256, "runner"],
  ]) {
    if (observed !== expected) throw new Error(`registered ${label} digest mismatch`);
  }
  const version = await (options.runner ?? runCommand)({
    argv: [options.codexBinary, "--version"],
    cwd: outputRoot,
    env: isolatedEnvironment(outputRoot),
    timeoutMs: 10_000,
    maxOutputBytes: 4096,
  });
  if (
    sha256Bytes(await readBoundedRegularFile(options.codexBinary, 268_435_456)) !==
      registration.model.binary_sha256 ||
    version.exitCode !== 0 ||
    version.stderr.length !== 0 ||
    version.stdout.toString("utf8").trim() !== registration.model.exact_cli_version
  ) {
    throw new Error("Codex CLI version does not match the registration");
  }
  const facts = asFacts(JSON.parse(factsBytes.toString("utf8")) as unknown);
  const runner = options.runner ?? runCommand;
  const arms: ArmResult[] = [];
  let modelCalls = 0;
  for (const arm of registration.runner.arms) {
    modelCalls += 1;
    if (modelCalls > registration.runner.maximum_model_calls) {
      throw new Error("benchmark model-call cap would be exceeded");
    }
    arms.push(
      await armRun({
        arm,
        facts,
        registration,
        repoRoot,
        outputRoot,
        codexBinary: options.codexBinary,
        codexHome: options.codexHome,
        runner,
      }),
    );
  }
  if (modelCalls !== registration.runner.maximum_model_calls) {
    throw new Error("benchmark did not consume its exact registered model-call count");
  }
  const baseline = arms.find((arm) => arm.arm === "baseline");
  const treatment = arms.find((arm) => arm.arm === "treatment");
  if (baseline === undefined || treatment === undefined) throw new Error("benchmark arms are incomplete");
  const useful =
    treatment.metrics.dead_route === 0 &&
    treatment.metrics.downstream_reuse === 1 &&
    treatment.metrics.score >= baseline.metrics.score &&
    treatment.metrics.review_items <= baseline.metrics.review_items;
  const directionalResult = useful
    ? treatment.metrics.score > baseline.metrics.score ||
      treatment.metrics.review_items < baseline.metrics.review_items ||
      treatment.metrics.dead_route < baseline.metrics.dead_route
      ? "treatment_useful"
      : "no_advantage"
    : "treatment_worse";
  const report: BenchmarkReport = {
    schema: "canopus.benchmark-report.v0",
    registration_sha256: sha256Bytes(registrationBytes),
    runner_sha256: sha256Bytes(runnerBytes),
    model: registration.model,
    arms,
    directional_result: directionalResult,
    causal_claim: false,
    external_gate_credit: false,
  };
  await writeFile(path.join(outputRoot, "report.json"), canonicalJson(report), {
    flag: "wx",
    mode: 0o600,
  });
  return report;
}

export function benchmarkPrompts(facts: BenchmarkFacts): Record<BenchmarkArm, string> {
  return { baseline: promptFor("baseline", facts), treatment: promptFor("treatment", facts) };
}

export function benchmarkRegistrationDigest(value: unknown): string {
  return contentDigest(value);
}
