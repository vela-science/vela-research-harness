import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import {
  mkdtemp,
  readFile,
  readdir,
  rm,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";

import { canonicalJcs, sha256Bytes } from "../src/util/canonical.js";

const exec = promisify(execFile);
const repoRoot = path.resolve(process.cwd());
const fixtureRoot = path.join(
  repoRoot,
  "benchmarks",
  "fixtures",
  "v1",
  "temporal-registration",
);

type CheckProjection = {
  exit_code: number;
  signals: Array<{
    kind: string;
    severity: string;
    blocks: string[];
  }>;
  event_log_count: number | null;
  event_log_hash: string | null;
};

async function command(
  argv: string[],
  options: { cwd?: string; env?: NodeJS.ProcessEnv } = {},
): Promise<string> {
  const result = await exec(argv[0]!, argv.slice(1), {
    cwd: options.cwd,
    env: { ...process.env, ...options.env },
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });
  return result.stdout.trim();
}

async function commandResult(
  argv: string[],
  options: { cwd?: string; env?: NodeJS.ProcessEnv } = {},
): Promise<{ exitCode: number; stdout: string }> {
  try {
    return {
      exitCode: 0,
      stdout: await command(argv, options),
    };
  } catch (error: any) {
    return {
      exitCode: typeof error.code === "number" ? error.code : 1,
      stdout: error.stdout ?? "",
    };
  }
}

function sha256(bytes: Buffer): string {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

async function registration(): Promise<any> {
  return JSON.parse(
    await readFile(path.join(fixtureRoot, "registration.json"), "utf8"),
  );
}

async function cloneBundle(bundleName: string, destination: string): Promise<void> {
  await command(["git", "clone", path.join(fixtureRoot, bundleName), destination]);
}

async function projectCheck(
  vela: string,
  repo: string,
  strict: boolean,
): Promise<CheckProjection> {
  const argv = [vela, "check", "."];
  if (strict) argv.push("--strict");
  argv.push("--json");
  const result = await commandResult(argv, { cwd: repo });
  const json = JSON.parse(result.stdout);
  return {
    exit_code: result.exitCode,
    signals: json.signals
      .map((signal: any) => ({
        kind: signal.kind,
        severity: signal.severity,
        blocks: signal.blocks,
      }))
      .sort((left: any, right: any) =>
        `${left.kind}:${left.severity}`.localeCompare(
          `${right.kind}:${right.severity}`,
        ),
      ),
    event_log_count: json.event_log?.count ?? null,
    event_log_hash: json.replay?.event_log_hash
      ? `sha256:${json.replay.event_log_hash}`
      : null,
  };
}

test("temporal registration packet is frozen, key-free, and content addressed", async () => {
  const frozen = await registration();
  assert.equal(frozen.schema, "canopus.temporal-registration-fixture.v1");
  assert.equal(frozen.status, "frozen_not_executed");
  assert.equal(frozen.generated_by.model_calls, 0);
  assert.equal(frozen.released_vela.version, "0.800.22");
  assert.equal(
    frozen.released_vela.commit,
    "a5e5631d8fceb6a9a28522b7b9799adb74b9f232",
  );
  assert.equal(frozen.actor.private_key_published, false);
  assert.equal(frozen.credit.scientific, false);
  assert.equal(frozen.credit.authority, false);
  assert.equal(frozen.expected.common_event_byte_delta, 0);
  assert.equal(frozen.expected.scientific_event_delta, 0);
  assert.equal(frozen.expected.audit_event_delta, 1);
  assert.equal(frozen.frontier.common_events.length, 3);
  assert.equal(
    frozen.frontier.common_events.filter(
      (event: any) => event.signature_present === false,
    ).length,
    1,
  );
  assert.equal(
    frozen.frontier.common_events.filter(
      (event: any) => event.signature_present === true,
    ).length,
    2,
  );
  for (const [name, entry] of Object.entries<any>(frozen.bundles)) {
    const bytes = await readFile(path.join(fixtureRoot, entry.path));
    assert.equal(sha256(bytes), entry.sha256, `${name} bundle root`);
  }
});

test("both Git bundles clone offline and preserve exact matched event bytes", async () => {
  const frozen = await registration();
  const root = await mkdtemp(path.join(os.tmpdir(), "canopus-temporal-bundles-"));
  try {
    const timeless = path.join(root, "timeless");
    const temporal = path.join(root, "temporal");
    await cloneBundle("timeless.bundle", timeless);
    await cloneBundle("temporal.bundle", temporal);
    assert.equal(await command(["git", "rev-parse", "HEAD"], { cwd: timeless }), frozen.frontier.timeless_head);
    assert.equal(await command(["git", "rev-parse", "HEAD"], { cwd: temporal }), frozen.frontier.temporal_head);

    for (const event of frozen.frontier.common_events) {
      const relative = path.join(".vela", "events", `${event.id}.json`);
      const timelessBytes = await readFile(path.join(timeless, relative));
      const temporalBytes = await readFile(path.join(temporal, relative));
      assert.deepEqual(temporalBytes, timelessBytes, event.id);
      assert.equal(sha256(timelessBytes), event.byte_root, event.id);
    }

    const temporalEvents = (
      await readdir(path.join(temporal, ".vela", "events"))
    ).filter((name) => name.endsWith(".json"));
    assert.equal(
      temporalEvents.length,
      frozen.frontier.common_event_ids.length + 1,
    );
    assert.ok(
      temporalEvents.includes(`${frozen.frontier.activation_event_id}.json`),
    );

    const tracked = await command(
      ["git", "ls-tree", "-r", "--name-only", "HEAD"],
      { cwd: temporal },
    );
    assert.doesNotMatch(tracked, /(?:^|\n)\.vela\/(?:identity\.json|keys\/)/u);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("Stage A registration binds four zero-credit fresh-session cells", async () => {
  const file = path.join(
    repoRoot,
    "benchmarks",
    "registration",
    "temporal-registration-stage-a-v1.json",
  );
  const registered = JSON.parse(await readFile(file, "utf8"));
  const rootCandidate = structuredClone(registered);
  delete rootCandidate.registration_root;
  assert.equal(
    registered.registration_root,
    sha256Bytes(canonicalJcs(rootCandidate)),
  );
  assert.equal(registered.status, "registered_not_executed");
  assert.equal(registered.runner.maximum_model_calls, 4);
  assert.equal(registered.runner.cell_order.length, 4);
  assert.equal(registered.surface.exact_cli_version, "codex-cli 0.144.5");
  assert.equal(
    registered.surface.execution_isolation,
    "codex_external_sandbox_mode_inside_registered_macos_outer_profile",
  );
  assert.equal(registered.surface.request, "gpt-5.6-sol");
  assert.equal(registered.credit.scientific, false);
  assert.equal(registered.credit.independent, false);
  assert.equal(registered.credit.authority, false);
  for (const descriptor of Object.values<any>(registered.files)) {
    assert.equal(
      sha256(await readFile(path.join(repoRoot, descriptor.path))),
      descriptor.sha256,
      descriptor.path,
    );
  }
});

const releasedVela = process.env.VELA_TEMPORAL_FIXTURE_BINARY;

test(
  "released Vela reproduces every registered strict and non-strict case",
  { skip: releasedVela === undefined },
  async () => {
    assert.ok(releasedVela);
    const frozen = await registration();
    const binary = await readFile(releasedVela);
    assert.equal(
      sha256(binary),
      frozen.released_vela.macos_aarch64_sha256,
    );
    assert.equal(
      await command([releasedVela, "--version"]),
      `vela ${frozen.released_vela.version}`,
    );

    const root = await mkdtemp(path.join(os.tmpdir(), "canopus-temporal-check-"));
    try {
      const timeless = path.join(root, "timeless");
      const temporal = path.join(root, "temporal");
      await cloneBundle("timeless.bundle", timeless);
      await cloneBundle("temporal.bundle", temporal);
      assert.deepEqual(
        await projectCheck(releasedVela, timeless, true),
        frozen.expected.timeless_strict,
      );
      assert.deepEqual(
        await projectCheck(releasedVela, timeless, false),
        frozen.expected.timeless_non_strict,
      );
      assert.deepEqual(
        await projectCheck(releasedVela, temporal, true),
        frozen.expected.temporal_strict,
      );
      assert.deepEqual(
        await projectCheck(releasedVela, temporal, false),
        frozen.expected.temporal_non_strict,
      );

      for (const [branch, expected] of Object.entries<any>(
        frozen.hostile_case_checks,
      )) {
        await command(["git", "switch", "--detach", frozen.branches[branch]], {
          cwd: temporal,
        });
        assert.deepEqual(
          await projectCheck(releasedVela, temporal, true),
          expected.strict,
          `${branch} strict`,
        );
        assert.deepEqual(
          await projectCheck(releasedVela, temporal, false),
          expected.non_strict,
          `${branch} non-strict`,
        );
      }

      await command(["git", "switch", "--detach", frozen.frontier.temporal_head], {
        cwd: temporal,
      });
      const shallow = path.join(root, "shallow");
      await command([
        "git",
        "clone",
        "--depth",
        "1",
        pathToFileURL(temporal).href,
        shallow,
      ]);
      const anchor = await commandResult(
        [
          "git",
          "cat-file",
          "-e",
          `${frozen.frontier.anchor_commit}^{commit}`,
        ],
        { cwd: shallow },
      );
      assert.notEqual(anchor.exitCode, 0);
      assert.deepEqual(
        await projectCheck(releasedVela, shallow, true),
        frozen.derived_cases.missing_anchor_object.strict,
      );
      assert.deepEqual(
        await projectCheck(releasedVela, shallow, false),
        frozen.derived_cases.missing_anchor_object.non_strict,
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  },
);
