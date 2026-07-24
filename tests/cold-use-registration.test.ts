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
