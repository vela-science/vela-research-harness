#!/usr/bin/env node

import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const registrationPath = path.join(root, "benchmarks/registration/product-09-cold-use-v1.json");
const registrationBytes = await readFile(registrationPath);
const registration = JSON.parse(registrationBytes.toString("utf8"));
const output = path.resolve(process.argv[2] ?? path.join(root, "benchmarks/results/product-09-cold-use-2026-07-17"));

const sha256 = (bytes) => `sha256:${createHash("sha256").update(bytes).digest("hex")}`;

async function command(argv, options = {}) {
  const started = Date.now();
  return await new Promise((resolve, reject) => {
    const child = spawn(argv[0], argv.slice(1), {
      cwd: options.cwd,
      env: options.env ?? process.env,
      stdio: [options.input === undefined ? "ignore" : "pipe", "pipe", "pipe"],
    });
    const stdout = [];
    const stderr = [];
    child.stdout.on("data", (chunk) => stdout.push(chunk));
    child.stderr.on("data", (chunk) => stderr.push(chunk));
    child.on("error", reject);
    child.on("close", (code, signal) => resolve({
      argv,
      code,
      signal,
      stdout: Buffer.concat(stdout),
      stderr: Buffer.concat(stderr),
      wall_time_ms: Date.now() - started,
    }));
    if (options.input !== undefined) {
      child.stdin.end(options.input);
    }
    if (options.timeoutMs !== undefined) {
      const timer = setTimeout(() => child.kill("SIGTERM"), options.timeoutMs);
      timer.unref();
      child.on("close", () => clearTimeout(timer));
    }
  });
}

async function checked(argv, options = {}) {
  const result = await command(argv, options);
  if (result.code !== 0) {
    throw new Error(`${argv.join(" ")} failed (${result.code}): ${result.stderr.toString("utf8").slice(0, 2000)}`);
  }
  return result;
}

async function gitState(cwd) {
  const [head, tree, status] = await Promise.all([
    checked(["git", "rev-parse", "HEAD"], { cwd }),
    checked(["git", "rev-parse", "HEAD^{tree}"], { cwd }),
    checked(["git", "status", "--porcelain=v1", "--untracked-files=all"], { cwd }),
  ]);
  return {
    commit: head.stdout.toString("utf8").trim(),
    tree: tree.stdout.toString("utf8").trim(),
    status: status.stdout.toString("utf8").trim().split("\n").filter(Boolean),
  };
}

async function cloneExact(remote, commit, target) {
  await checked(["git", "clone", "--quiet", "--no-hardlinks", remote, target]);
  await checked(["git", "checkout", "--quiet", commit], { cwd: target });
}

async function renderReaderFixture(target) {
  const site = await mkdtemp(path.join(tmpdir(), "vela-site-cold-use-"));
  try {
    await cloneExact(registration.products.site_remote, registration.products.site_commit, site);
    await checked(["bun", "install", "--frozen-lockfile"], { cwd: site });
    await checked(["bun", "run", "build"], { cwd: site, timeoutMs: 300000 });
    const port = 33117;
    const server = spawn("bun", ["run", "start", "--", "-p", String(port)], {
      cwd: site,
      stdio: ["ignore", "pipe", "pipe"],
    });
    try {
      let ready = false;
      for (let attempt = 0; attempt < 60; attempt += 1) {
        const response = await fetch(`http://127.0.0.1:${port}/`).catch(() => null);
        if (response?.ok) {
          ready = true;
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
      if (!ready) throw new Error("site server did not become ready");
      for (const [name, route] of [["home.html", "/"], ["erdos-reproduce.html", "/frontiers/erdos/reproduce"]]) {
        const response = await fetch(`http://127.0.0.1:${port}${route}`);
        if (!response.ok) throw new Error(`${route} returned ${response.status}`);
        await writeFile(path.join(target, name), await response.text());
      }
    } finally {
      server.kill("SIGTERM");
      await new Promise((resolve) => server.once("close", resolve));
    }
  } finally {
    await rm(site, { recursive: true, force: true });
  }
}

function parseTrace(bytes) {
  const events = bytes.toString("utf8").trim().split("\n").filter(Boolean).flatMap((line) => {
    try { return [JSON.parse(line)]; } catch { return []; }
  });
  const commands = [];
  let usage = null;
  let sessionId = null;
  for (const event of events) {
    if (event.type === "thread.started") sessionId = event.thread_id ?? null;
    if (event.type === "turn.completed") usage = event.usage ?? null;
    if (event.type === "item.completed" && event.item?.type === "command_execution") {
      commands.push({ command: event.item.command, exit_code: event.item.exit_code, status: event.item.status });
    }
  }
  return { session_id: sessionId, usage, observed_commands: commands };
}

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
const workRoot = await mkdtemp(path.join(tmpdir(), "vela-product-09-cold-use-"));
const records = [];

try {
  for (const task of registration.tasks) {
    const fixture = path.join(workRoot, task.role);
    await mkdir(fixture, { recursive: true });
    if (task.role === "operator") {
      await checked(["git", "init", "--quiet"], { cwd: fixture });
      await checked(["git", "config", "user.name", "Vela Cold Use"], { cwd: fixture });
      await checked(["git", "config", "user.email", "cold-use@vela.invalid"], { cwd: fixture });
      await writeFile(path.join(fixture, ".gitignore"), "\n");
      await checked(["git", "add", ".gitignore"], { cwd: fixture });
      await checked(["git", "commit", "--quiet", "-m", "fixture"], { cwd: fixture });
    } else if (task.role === "producer" || task.role === "reviewer") {
      await rm(fixture, { recursive: true, force: true });
      await cloneExact(registration.products.erdos_remote, registration.products.erdos_commit, fixture);
    } else if (task.role === "reader") {
      await renderReaderFixture(fixture);
      await checked(["git", "init", "--quiet"], { cwd: fixture });
      await checked(["git", "config", "user.name", "Vela Cold Use"], { cwd: fixture });
      await checked(["git", "config", "user.email", "cold-use@vela.invalid"], { cwd: fixture });
      await checked(["git", "add", "."], { cwd: fixture });
      await checked(["git", "commit", "--quiet", "-m", "rendered fixture"], { cwd: fixture });
    }

    const before = await gitState(fixture);
    const finalPath = path.join(output, `${task.role}.final.txt`);
    const argv = [
      "codex", "exec", "--ephemeral", "--ignore-user-config", "--ignore-rules",
      "--sandbox", task.access === "read_only" ? "read-only" : "workspace-write",
      "--model", registration.runtime.model,
      "--config", `model_reasoning_effort=\"${registration.runtime.reasoning_effort}\"`,
      "--json", "--color", "never", "--output-last-message", finalPath,
      "--cd", fixture, "-",
    ];
    const run = await command(argv, {
      cwd: fixture,
      input: `${task.prompt}\n`,
      timeoutMs: registration.limits.wall_time_seconds_per_call * 1000,
    });
    const after = await gitState(fixture);
    const tracePath = path.join(output, `${task.role}.jsonl`);
    await writeFile(tracePath, run.stdout);
    await writeFile(path.join(output, `${task.role}.stderr.txt`), run.stderr);
    const final = await readFile(finalPath).catch(() => Buffer.from(""));
    const parsed = parseTrace(run.stdout);
    records.push({
      role: task.role,
      prompt: task.prompt,
      access: task.access,
      exit_code: run.code,
      signal: run.signal,
      wall_time_ms: run.wall_time_ms,
      session_id: parsed.session_id,
      usage: parsed.usage,
      observed_commands: parsed.observed_commands,
      fixture_before: before,
      fixture_after: after,
      trace_sha256: sha256(run.stdout),
      stderr_sha256: sha256(run.stderr),
      final_sha256: sha256(final),
      interventions: [],
      external_gate_credit: false,
    });
    if (run.code !== 0) break;
  }
} finally {
  await rm(workRoot, { recursive: true, force: true });
}

const record = {
  schema: "canopus.product-09-cold-use-run.v1",
  registration_sha256: sha256(registrationBytes),
  registration: path.relative(root, registrationPath),
  completed_at: new Date().toISOString(),
  products: registration.products,
  runtime: registration.runtime,
  records,
  external_gate_credit: false,
  scientific_result_credit: false,
};
await writeFile(path.join(output, "run.json"), `${JSON.stringify(record, null, 2)}\n`);
console.log(JSON.stringify({ output, registration_sha256: record.registration_sha256, roles: records.map((item) => item.role) }));
