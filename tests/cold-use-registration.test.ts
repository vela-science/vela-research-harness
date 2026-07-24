import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const repoRoot = path.resolve(process.cwd());
const registrationPath = path.join(
  repoRoot,
  "benchmarks/registration/adoption-0.914-six-role-v1.json",
);
const retryRegistrationPath = path.join(
  repoRoot,
  "benchmarks/registration/adoption-0.914-six-role-reader-retry-v1.json",
);
const repairedRegistrationPath = path.join(
  repoRoot,
  "benchmarks/registration/adoption-0.914-repaired-three-role-v1.json",
);
const repairedV2RegistrationPath = path.join(
  repoRoot,
  "benchmarks/registration/adoption-0.914-repaired-three-role-v2.json",
);
const repairedV3RegistrationPath = path.join(
  repoRoot,
  "benchmarks/registration/adoption-0.914-repaired-three-role-v3.json",
);
const preflightPath = path.join(
  repoRoot,
  "benchmarks/results/adoption-0.914-six-role-preflight-2026-07-23/run.json",
);

const sha256 = (bytes: Buffer) =>
  `sha256:${createHash("sha256").update(bytes).digest("hex")}`;

test("six-role adoption registration binds the exact runner and product identities", async () => {
  const registrationBytes = await readFile(registrationPath);
  const registration = JSON.parse(registrationBytes.toString("utf8"));
  const runnerBytes = execFileSync(
    "git",
    ["show", `${registration.runner.source_commit}:${registration.runner.path}`],
    { cwd: repoRoot },
  );

  assert.equal(registration.schema, "canopus.product-09-cold-use-registration.v1");
  assert.equal(registration.limits.model_calls, 6);
  assert.deepEqual(
    registration.tasks.map((task: { role: string }) => task.role),
    [
      "operator",
      "producer",
      "reviewer",
      "reader",
      "correction_reader",
      "downstream_consumer",
    ],
  );
  assert.equal(new Set(registration.tasks.map((task: { role: string }) => task.role)).size, 6);
  assert.equal(sha256(runnerBytes), registration.runner.sha256);
  assert.equal(registration.runtime.codex_version, "codex-cli 0.145.0");
  assert.equal(registration.products.vela_version, "vela 0.914.0");
  assert.equal(registration.products.web.version, "0.420.1");
  assert.equal(
    registration.products.web.projection_root,
    "sha256:667e895477dfd1543200371e859afc6dc6a2cce706d58ae7fe1c7372db5ab983",
  );
});

test("rendered cold-use fixtures use only registered canonical product hosts", async () => {
  const registration = JSON.parse(await readFile(registrationPath, "utf8"));
  const renderedTasks = registration.tasks.filter(
    (task: { fixture: string }) => task.fixture === "rendered_site_pages_at_exact_commit",
  );

  assert.equal(renderedTasks.length, 2);
  for (const task of renderedTasks) {
    assert.equal(task.access, "read_only");
    assert.ok(task.routes.length > 0);
    for (const route of task.routes) {
      const url = new URL(route.url);
      assert.equal(url.protocol, "https:");
      assert.ok(
        url.origin === "https://www.vela.space" || url.origin === "https://app.vela.space",
      );
      assert.match(route.file, /^[a-z0-9][a-z0-9.-]*\.html$/u);
    }
  }
});

test("reader retry is bounded to unfinished roles and the hardened runner", async () => {
  const registration = JSON.parse(await readFile(retryRegistrationPath, "utf8"));
  const runnerBytes = execFileSync(
    "git",
    ["show", `${registration.runner.source_commit}:${registration.runner.path}`],
    { cwd: repoRoot },
  );

  assert.deepEqual(
    registration.tasks.map((task: { role: string }) => task.role),
    ["reader", "correction_reader", "downstream_consumer"],
  );
  assert.deepEqual(
    registration.continuation.carried_forward_roles,
    ["operator", "producer", "reviewer"],
  );
  assert.equal(registration.continuation.unscored_interrupted_role, "reader");
  assert.equal(registration.limits.model_calls, 3);
  assert.equal(sha256(runnerBytes), registration.runner.sha256);
});

test("repaired adoption gate binds only the three reproduced gaps", async () => {
  const registration = JSON.parse(await readFile(repairedRegistrationPath, "utf8"));
  const runnerBytes = execFileSync(
    "git",
    ["show", `${registration.runner.source_commit}:${registration.runner.path}`],
    { cwd: repoRoot },
  );

  assert.deepEqual(
    registration.tasks.map((task: { role: string }) => task.role),
    ["producer", "correction_reader", "downstream_consumer"],
  );
  assert.equal(registration.limits.model_calls, 3);
  assert.equal(registration.limits.max_observed_tokens_per_call, 100000);
  assert.equal(registration.products.web.fixture_mode, "verified_local_candidate");
  assert.equal(new URL(registration.products.web.fixture_origin).hostname, "127.0.0.1");
  assert.equal(registration.products.first_ranked_target.target_id, "erdos:1056");
  assert.equal(
    registration.products.erdos_event_log_root,
    "sha256:12daf8cc1e4f2777629ca953e081c99b2931a60b8245273b9085a5c0add53c3b",
  );
  assert.equal(sha256(runnerBytes), registration.runner.sha256);
});

test("second repaired gate binds the exact public pin and text-only reader fixture", async () => {
  const registration = JSON.parse(await readFile(repairedV2RegistrationPath, "utf8"));
  const runnerBytes = execFileSync(
    "git",
    ["show", `${registration.runner.source_commit}:${registration.runner.path}`],
    { cwd: repoRoot },
  );

  assert.deepEqual(
    registration.tasks.map((task: { role: string }) => task.role),
    ["producer", "correction_reader", "downstream_consumer"],
  );
  assert.equal(
    registration.products.erdos_trust_anchor.file_sha256,
    "sha256:87f7c68eb113686642850a41cde35e381727fc15502ef00357844bc16c3d1dd3",
  );
  assert.match(registration.runner.reader_transport, /outside the model workspace/u);
  assert.equal(registration.products.web.commit, "5942756bcd7879b5a5f44200b2de9397ef26d2dc");
  assert.equal(sha256(runnerBytes), registration.runner.sha256);
});

test("third repaired gate pins the sandbox Git runtime", async () => {
  const registration = JSON.parse(await readFile(repairedV3RegistrationPath, "utf8"));
  const runnerBytes = execFileSync(
    "git",
    ["show", `${registration.runner.source_commit}:${registration.runner.path}`],
    { cwd: repoRoot },
  );

  assert.equal(registration.runtime.git.path, "/opt/homebrew/bin/git");
  assert.equal(registration.runtime.git.read_root, "/opt/homebrew");
  assert.equal(registration.runtime.git.version, "git version 2.53.0");
  assert.equal(
    registration.runtime.git.binary_sha256,
    "sha256:eae3993b7ab5616f0c16da4fa2b13e195cd30b542a7cc4bb265c4a46c934e4c4",
  );
  assert.equal(sha256(runnerBytes), registration.runner.sha256);
});

test("recorded six-role preflight binds the immutable registration", async () => {
  const registrationBytes = await readFile(registrationPath);
  const preflight = JSON.parse(await readFile(preflightPath, "utf8"));

  assert.equal(preflight.registration_sha256, sha256(registrationBytes));
  assert.equal(preflight.status, "preflight_passed");
  assert.equal(preflight.error, null);
  assert.deepEqual(preflight.records, []);
  assert.equal(preflight.external_gate_credit, false);
  assert.equal(preflight.scientific_result_credit, false);
});
