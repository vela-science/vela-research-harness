import os from "node:os";
import path from "node:path";
import { mkdir, mkdtemp, readdir, realpath, rm } from "node:fs/promises";

import {
  consumeWithdrawalCapability,
  installWithdrawalCapabilitySecret,
  loadWithdrawalCapability,
} from "../capability/withdrawal.js";
import { parseRunRecord } from "../projection/run.js";
import {
  canonicalJcs,
  contentDigest,
  protocolDigest,
  sha256Bytes,
} from "../util/canonical.js";
import { isolatedEnvironment, runCommand, type CommandRunner } from "../util/command.js";
import { readBoundedRegularFile } from "../util/files.js";
import { VelaClient } from "../vela/cli.js";

async function gitText(
  runner: CommandRunner,
  cwd: string,
  home: string,
  argv: readonly string[],
): Promise<string> {
  const result = await runner({
    argv: ["git", ...argv],
    cwd,
    env: isolatedEnvironment(home),
    timeoutMs: 120_000,
    maxOutputBytes: 8 * 1024 * 1024,
  });
  if (result.exitCode !== 0 || result.stderr.length !== 0) {
    throw new Error(`git ${argv.join(" ")} failed: stdout=${sha256Bytes(result.stdout)} stderr=${sha256Bytes(result.stderr)}`);
  }
  return result.stdout.toString("utf8").trim();
}

function safeActor(actor: string): string {
  return [...actor].map((character) => /[A-Za-z0-9_-]/u.test(character) ? character : "-").join("");
}

async function scientificProjectionRoot(frontierRoot: string): Promise<string> {
  const project = JSON.parse(
    (await readBoundedRegularFile(path.join(frontierRoot, "frontier.json"), 128 * 1024 * 1024))
      .toString("utf8"),
  ) as Record<string, unknown>;
  const fields = [
    "actors",
    "anchor_links",
    "artifacts",
    "condition_records",
    "evidence_atoms",
    "findings",
    "frontier",
    "frontier_id",
    "released_diff_packs",
    "sources",
    "statement_attestations",
    "verifier_attachments",
  ] as const;
  return contentDigest(Object.fromEntries(fields.map((field) => [field, project[field] ?? null])));
}

type ProposalStanding =
  | "pending_review"
  | "accepted"
  | "applied"
  | "rejected"
  | "revision_requested"
  | "needs_revision"
  | "withdrawn";

type TerminalDecision = "accepted" | "rejected" | "revision_requested" | "withdrawn";

function jsonObject(value: unknown, at: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${at} must be an object`);
  }
  return value as Record<string, unknown>;
}

function proposalStanding(value: unknown): ProposalStanding {
  if (
    value !== "pending_review" &&
    value !== "accepted" &&
    value !== "applied" &&
    value !== "rejected" &&
    value !== "revision_requested" &&
    value !== "needs_revision" &&
    value !== "withdrawn"
  ) {
    throw new Error(`proposal has unrecognized standing ${JSON.stringify(value)}`);
  }
  return value;
}

async function frontierWithin(repo: string, frontier: string): Promise<string> {
  const resolved = await realpath(path.resolve(repo, frontier));
  if (resolved !== repo && !resolved.startsWith(`${repo}${path.sep}`)) {
    throw new Error("capability frontier resolves outside the selected source repository");
  }
  return resolved;
}

async function terminalProposalEvent(
  frontierRoot: string,
  proposalId: string,
): Promise<{ event_id: string; decision: TerminalDecision } | null> {
  const directory = path.join(frontierRoot, ".vela", "events");
  const entries = await readdir(directory, { withFileTypes: true });
  if (entries.length > 1_000_000) throw new Error("frontier event directory exceeds the supported audit bound");
  const matches: Array<{ event_id: string; decision: TerminalDecision }> = [];
  const decisionByKind = new Map<string, TerminalDecision>([
    ["review.accepted", "accepted"],
    ["review.rejected", "rejected"],
    ["review.revision_requested", "revision_requested"],
    ["proposal.withdrawn", "withdrawn"],
  ]);
  for (const entry of entries) {
    if (!entry.isFile() || !/^vev_[0-9a-f]{16}\.json$/u.test(entry.name)) continue;
    const event = jsonObject(
      JSON.parse(
        (await readBoundedRegularFile(path.join(directory, entry.name), 8 * 1024 * 1024)).toString("utf8"),
      ) as unknown,
      `event ${entry.name}`,
    );
    const decision = typeof event.kind === "string" ? decisionByKind.get(event.kind) : undefined;
    if (decision === undefined) continue;
    const target = jsonObject(event.target, `event ${entry.name}.target`);
    if (target.type !== "proposal" || target.id !== proposalId) continue;
    const eventId = entry.name.slice(0, -".json".length);
    if (event.id !== eventId || typeof event.signature !== "string" || event.signature.length === 0) {
      throw new Error(`terminal proposal event ${entry.name} is not a signed canonical event file`);
    }
    const payload = jsonObject(event.payload, `event ${entry.name}.payload`);
    if (payload.proposal_id !== proposalId) {
      throw new Error(`terminal proposal event ${entry.name} payload targets another proposal`);
    }
    if (decision === "withdrawn") {
      if (payload.schema !== "vela.proposal-withdrawal.v1") {
        throw new Error(`withdrawal event ${entry.name} has the wrong payload schema`);
      }
    } else if (payload.verdict !== decision) {
      throw new Error(`review event ${entry.name} verdict disagrees with its kind`);
    }
    matches.push({ event_id: eventId, decision });
  }
  if (matches.length > 1) throw new Error("proposal has conflicting terminal events");
  return matches[0] ?? null;
}

function terminalDecisionMatchesStanding(
  decision: TerminalDecision,
  standing: Exclude<ProposalStanding, "pending_review">,
): boolean {
  return decision === "accepted"
    ? standing === "accepted" || standing === "applied"
    : decision === "revision_requested"
      ? standing === "revision_requested" || standing === "needs_revision"
      : decision === standing;
}

export async function withdrawProduct(options: {
  frontier: string;
  runFile: string;
  reason: string;
  storeRoot?: string;
  runner?: CommandRunner;
}): Promise<Record<string, unknown>> {
  if (options.reason.trim().length === 0) throw new Error("withdrawal reason must not be empty");
  const runner = options.runner ?? runCommand;
  const source = await realpath(options.frontier);
  const runFile = path.resolve(options.runFile);
  const record = parseRunRecord(JSON.parse((await readBoundedRegularFile(runFile, 8 * 1024 * 1024)).toString("utf8")) as unknown);
  const capability = await loadWithdrawalCapability(record.landing.proposal_id, options.storeRoot);
  if (capability.manifest.state !== "available" || !capability.secret_available) {
    throw new Error("withdrawal capability is not available");
  }
  if (
    capability.manifest.receipt_root !== record.landing.receipt_root ||
    canonicalJcs(capability.manifest.final_roots) !== canonicalJcs(record.final_roots)
  ) {
    throw new Error("withdrawal capability does not match the selected run");
  }
  const controlRoot = await mkdtemp(path.join(os.tmpdir(), "canopus-withdraw-"));
  const controlHome = path.join(controlRoot, "home");
  const clone = path.join(controlRoot, "candidate");
  const replay = path.join(controlRoot, "replay");
  await mkdir(path.join(controlHome, ".vela", "agents", safeActor(capability.manifest.actor)), {
    recursive: true,
    mode: 0o700,
  });
  try {
    const sourceHead = await gitText(runner, source, controlHome, ["rev-parse", "--verify", "HEAD^{commit}"]);
    const sourceStatus = await gitText(runner, source, controlHome, ["status", "--porcelain=v1", "--untracked-files=all"]);
    if (sourceStatus !== "") throw new Error("source frontier must be clean before withdrawal");
    const client = new VelaClient({
      binary: capability.manifest.vela.binary,
      expectedVersion: capability.manifest.vela.version,
      expectedSha256: capability.manifest.vela.sha256,
      home: controlHome,
      runner,
    });
    const strictBaseline = capability.manifest.strict_baseline;
    const sourceInspection = await client.inspect(source, capability.manifest.frontier, strictBaseline);
    const frontierRoot = await frontierWithin(source, capability.manifest.frontier);
    const proposalPath = path.join(frontierRoot, ".vela", "proposals", `${record.landing.proposal_id}.json`);
    const proposal = jsonObject(
      JSON.parse((await readBoundedRegularFile(proposalPath, 8 * 1024 * 1024)).toString("utf8")) as unknown,
      "proposal",
    );
    if (proposal.id !== record.landing.proposal_id) throw new Error("proposal file id disagrees with the run");
    const standing = proposalStanding(proposal.status);
    const terminalEvent = await terminalProposalEvent(frontierRoot, record.landing.proposal_id);
    const stableHead = await gitText(runner, source, controlHome, ["rev-parse", "--verify", "HEAD^{commit}"]);
    const stableStatus = await gitText(runner, source, controlHome, ["status", "--porcelain=v1", "--untracked-files=all"]);
    if (stableHead !== sourceHead || stableStatus !== "") {
      throw new Error("source frontier changed during proposal verification");
    }
    if (standing !== "pending_review") {
      if (terminalEvent === null || !terminalDecisionMatchesStanding(terminalEvent.decision, standing)) {
        throw new Error("terminal proposal standing is not backed by exactly one matching signed event");
      }
      await consumeWithdrawalCapability(
        record.landing.proposal_id,
        terminalEvent.decision === "withdrawn" ? "withdrawn" : "human_decision_observed",
        options.storeRoot,
      );
      return {
        ok: true,
        command: "withdraw",
        proposal_id: record.landing.proposal_id,
        terminal_event_id: terminalEvent.event_id,
        state: terminalEvent.decision === "withdrawn" ? "already_withdrawn" : "human_decision_observed",
        frontier_mutated: false,
        capability_consumed: true,
      };
    }
    if (terminalEvent !== null) throw new Error("pending proposal already has a terminal event");
    if (protocolDigest(proposal) !== capability.manifest.proposal_root) {
      throw new Error("pending proposal bytes drifted from the retained withdrawal capability");
    }
    await gitText(runner, controlRoot, controlHome, ["clone", "--quiet", "--no-local", source, clone]);
    const before = await client.inspect(clone, capability.manifest.frontier, strictBaseline);
    if (canonicalJcs(before.roots) !== canonicalJcs(sourceInspection.roots)) {
      throw new Error("disposable withdrawal clone does not match the selected source head");
    }
    await installWithdrawalCapabilitySecret(
      record.landing.proposal_id,
      path.join(controlHome, ".vela", "agents", safeActor(capability.manifest.actor), "private.key"),
      options.storeRoot,
    );
    const scientificRootBefore = await scientificProjectionRoot(
      path.resolve(clone, capability.manifest.frontier),
    );
    const withdrawal = await client.withdraw(
      clone,
      capability.manifest.frontier,
      record.landing.proposal_id,
      capability.manifest.actor,
      options.reason,
    );
    const after = await client.inspect(clone, capability.manifest.frontier, strictBaseline);
    const scientificRootAfter = await scientificProjectionRoot(
      path.resolve(clone, capability.manifest.frontier),
    );
    if (after.roots.git_commit === before.roots.git_commit || after.roots.vela_event_log === before.roots.vela_event_log) {
      throw new Error("withdrawal did not append and publish one event");
    }
    if (
      withdrawal.publication_commit !== after.roots.git_commit ||
      withdrawal.state_root_before !== before.roots.vela_event_log ||
      withdrawal.state_root_after !== after.roots.vela_event_log
    ) {
      throw new Error("withdrawal response does not bind the verified Git and event-log roots");
    }
    if (scientificRootAfter !== scientificRootBefore) {
      throw new Error("withdrawal changed the accepted scientific projection");
    }
    const withdrawnFrontier = await frontierWithin(await realpath(clone), capability.manifest.frontier);
    const withdrawnProposal = jsonObject(
      JSON.parse(
        (await readBoundedRegularFile(
          path.join(withdrawnFrontier, ".vela", "proposals", `${record.landing.proposal_id}.json`),
          8 * 1024 * 1024,
        )).toString("utf8"),
      ) as unknown,
      "withdrawn proposal",
    );
    const withdrawnEvent = await terminalProposalEvent(withdrawnFrontier, record.landing.proposal_id);
    if (
      withdrawnProposal.status !== "withdrawn" ||
      withdrawnEvent?.decision !== "withdrawn" ||
      withdrawnEvent.event_id !== withdrawal.withdrawal_event_id
    ) {
      throw new Error("withdrawal output is not backed by the exact materialized terminal event");
    }
    await gitText(runner, controlRoot, controlHome, ["clone", "--quiet", "--no-local", clone, replay]);
    const reproduced = await client.inspect(replay, capability.manifest.frontier, strictBaseline);
    if (canonicalJcs(reproduced.roots) !== canonicalJcs(after.roots)) {
      throw new Error("clean-clone withdrawal replay drifted");
    }
    const unchangedHead = await gitText(runner, source, controlHome, ["rev-parse", "--verify", "HEAD^{commit}"]);
    const unchangedStatus = await gitText(runner, source, controlHome, ["status", "--porcelain=v1", "--untracked-files=all"]);
    if (unchangedHead !== sourceHead || unchangedStatus !== "") {
      throw new Error("source frontier changed during withdrawal");
    }
    await gitText(runner, source, controlHome, ["fetch", "--quiet", "--no-tags", clone, "HEAD"]);
    await gitText(runner, source, controlHome, ["merge", "--ff-only", "--no-edit", "FETCH_HEAD"]);
    const installed = await client.inspect(source, capability.manifest.frontier, strictBaseline);
    if (canonicalJcs(installed.roots) !== canonicalJcs(after.roots)) {
      throw new Error("fast-forwarded source does not match the verified withdrawal clone");
    }
    const installedStatus = await gitText(runner, source, controlHome, ["status", "--porcelain=v1", "--untracked-files=all"]);
    if (installedStatus !== "") throw new Error("fast-forwarded source is not clean");
    await consumeWithdrawalCapability(record.landing.proposal_id, "withdrawn", options.storeRoot);
    return {
      ok: true,
      command: "withdraw",
      proposal_id: record.landing.proposal_id,
      withdrawal_event_id: withdrawal.withdrawal_event_id,
      roots: after.roots,
      scientific_state_root_before: scientificRootBefore,
      scientific_state_root_after: scientificRootAfter,
      accepted_state_changed: false,
      clean_clone_reproduced: true,
      capability_consumed: true,
    };
  } finally {
    await rm(controlRoot, { recursive: true, force: true });
  }
}
