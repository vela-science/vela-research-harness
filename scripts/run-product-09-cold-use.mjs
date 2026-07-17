#!/usr/bin/env node

import { spawn } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { chmod, copyFile, mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const preflightOnly = args.includes("--preflight-only");
const option = (name) => {
  const index = args.indexOf(name);
  return index === -1 ? undefined : args[index + 1];
};
const registrationPath = path.resolve(option("--registration") ?? path.join(root, "benchmarks/registration/product-09-cold-use-v1.json"));
const registrationBytes = await readFile(registrationPath);
const registration = JSON.parse(registrationBytes.toString("utf8"));
const output = path.resolve(option("--output") ?? path.join(root, "benchmarks/results/product-09-cold-use-2026-07-17"));

const sha256 = (bytes) => `sha256:${createHash("sha256").update(bytes).digest("hex")}`;

const disabledFeatures = [
  "apps", "artifact", "auth_elicitation", "browser_use", "browser_use_external",
  "computer_use", "enable_fanout", "enable_mcp_apps", "goals", "hooks",
  "image_generation", "in_app_browser", "memories", "multi_agent",
  "multi_agent_v2", "plugin_sharing", "plugins", "remote_plugin",
  "standalone_web_search", "tool_call_mcp_elicitation", "tool_suggest",
  "workspace_dependencies",
];

function permissionProfile(access) {
  return Buffer.from([
    'default_permissions = "canopus-worker"',
    'approval_policy = "never"',
    'allow_login_shell = false',
    '',
    '[permissions.canopus-worker.filesystem]',
    '":minimal" = "read"',
    '',
    '[permissions.canopus-worker.filesystem.":workspace_roots"]',
    `"." = "${access === "read_only" ? "read" : "write"}"`,
    '',
    '[permissions.canopus-worker.network]',
    'enabled = false',
    '',
    '[shell_environment_policy]',
    'inherit = "none"',
    'set = { PATH = ".:..:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin", HOME = ".agent-home", TMPDIR = ".tmp", LANG = "C.UTF-8", LC_ALL = "C.UTF-8", GIT_CONFIG_NOSYSTEM = "1", GIT_CONFIG_GLOBAL = "/dev/null", GIT_TERMINAL_PROMPT = "0", VELA_NO_KEY_ACCESS = "1", NO_PROXY = "*", no_proxy = "*" }',
    '',
  ].join("\n"));
}

function authSecrets(bytes) {
  const value = JSON.parse(bytes.toString("utf8"));
  const tokens = typeof value.tokens === "object" && value.tokens !== null ? value.tokens : {};
  return [value.OPENAI_API_KEY, tokens.access_token, tokens.id_token, tokens.refresh_token]
    .filter((item) => typeof item === "string" && item.length >= 16)
    .map((item) => Buffer.from(item));
}

function assertNoSecrets(buffers, secrets) {
  for (const buffer of buffers) {
    for (const secret of secrets) {
      if (buffer.includes(secret)) throw new Error("cold-use runner exposed Codex authentication material");
    }
  }
}

async function prepareRuntime(task, fixture) {
  const runtimeRoot = await mkdtemp(path.join(tmpdir(), `vela-cold-${task.role}-runtime-`));
  const codexHome = path.join(runtimeRoot, "codex-runtime");
  await mkdir(codexHome, { mode: 0o700 });
  const sourceHome = path.resolve(process.env.CODEX_HOME ?? path.join(homedir(), ".codex"));
  const auth = await readFile(path.join(sourceHome, "auth.json"));
  await writeFile(path.join(codexHome, "auth.json"), auth, { mode: 0o600 });
  const catalog = await readFile(path.join(sourceHome, "models_cache.json")).catch(() => null);
  if (catalog !== null) await writeFile(path.join(codexHome, "models_cache.json"), catalog, { mode: 0o600 });
  const profile = permissionProfile(task.access);
  await writeFile(path.join(codexHome, "config.toml"), profile, { mode: 0o600 });
  const canary = Buffer.from(`canopus-host-secret-${randomBytes(32).toString("hex")}`);
  const canaryPath = path.join(runtimeRoot, "host-secret");
  await writeFile(canaryPath, canary, { mode: 0o400 });
  const environment = {
    PATH: process.env.PATH,
    HOME: runtimeRoot,
    XDG_CONFIG_HOME: path.join(runtimeRoot, ".config"),
    XDG_CACHE_HOME: path.join(runtimeRoot, ".cache"),
    XDG_DATA_HOME: path.join(runtimeRoot, ".local/share"),
    LANG: "C.UTF-8",
    LC_ALL: "C.UTF-8",
    SSL_CERT_FILE: "/etc/ssl/cert.pem",
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_CONFIG_GLOBAL: "/dev/null",
    GIT_TERMINAL_PROMPT: "0",
    VELA_NO_KEY_ACCESS: "1",
    NO_PROXY: "*",
    no_proxy: "*",
    CODEX_HOME: codexHome,
    NO_COLOR: "1",
  };
  await mkdir(path.join(fixture, ".agent-home"), { recursive: true, mode: 0o700 });
  await mkdir(path.join(fixture, ".tmp"), { recursive: true, mode: 0o700 });
  return {
    runtimeRoot,
    codexHome,
    environment,
    profile,
    canaryPath,
    secrets: [...authSecrets(auth), canary],
  };
}

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

async function assertCustody(fixture, runtime) {
  const script = [
    "auth=false; canary=false; outside=false;",
    'if /bin/dd if="$1" of=/dev/null bs=1 count=1 2>/dev/null; then auth=true; fi;',
    'if /bin/dd if="$2" of=/dev/null bs=1 count=1 2>/dev/null; then canary=true; fi;',
    'if { printf probe > "$3"; } 2>/dev/null; then outside=true; fi;',
    'printf "%s %s %s\\n" "$auth" "$canary" "$outside";',
  ].join(" ");
  const result = await command([
    "codex", "sandbox", "-P", "canopus-worker", "-C", fixture, "--",
    "/bin/sh", "-c", script, "sh",
    path.join(runtime.codexHome, "auth.json"), runtime.canaryPath,
    path.join(runtime.runtimeRoot, "outside-write"),
  ], { cwd: fixture, env: runtime.environment, timeoutMs: 30000 });
  if (result.code !== 0 || result.stderr.length !== 0 || result.stdout.toString("utf8").trim() !== "false false false") {
    throw new Error(`custody preflight failed: exit=${result.code}; stdout=${result.stdout.toString("utf8").trim()}; stderr=${sha256(result.stderr)}`);
  }
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
    const source = process.env.CANOPUS_SITE_SOURCE ?? registration.products.site_remote;
    if (process.env.CANOPUS_SITE_SOURCE !== undefined) {
      const state = await gitState(source);
      if (state.commit !== registration.products.site_commit || state.status.length !== 0) {
        throw new Error("local site source is not the registered clean exact commit");
      }
      const remote = await checked(["git", "remote", "get-url", "origin"], { cwd: source });
      if (remote.stdout.toString("utf8").trim() !== registration.products.site_remote) {
        throw new Error("local site source remote does not match the registration");
      }
    }
    await cloneExact(source, registration.products.site_commit, site);
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

async function addFixtureExcludes(fixture, entries) {
  const exclude = path.join(fixture, ".git/info/exclude");
  const existing = await readFile(exclude, "utf8").catch(() => "");
  const lines = new Set(existing.split("\n").filter(Boolean));
  for (const entry of entries) lines.add(entry);
  await writeFile(exclude, `${[...lines].join("\n")}\n`);
}

async function installRegisteredVela(fixture) {
  const resolved = await checked(["sh", "-c", "command -v vela"]);
  const source = resolved.stdout.toString("utf8").trim();
  const bytes = await readFile(source);
  if (sha256(bytes) !== registration.products.vela_binary_sha256) {
    throw new Error("installed Vela binary does not match the registration");
  }
  const destination = path.join(fixture, "vela");
  await copyFile(source, destination);
  await chmod(destination, 0o755);
  await addFixtureExcludes(fixture, ["/vela", "/.agent-home/", "/.tmp/"]);
}

async function prepareFixture(task, workRoot) {
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
    const source = process.env.CANOPUS_ERDOS_SOURCE ?? registration.products.erdos_remote;
    if (process.env.CANOPUS_ERDOS_SOURCE !== undefined) {
      const state = await gitState(source);
      if (state.commit !== registration.products.erdos_commit || state.status.length !== 0) {
        throw new Error("local Erdős source is not the registered clean exact commit");
      }
    }
    await cloneExact(source, registration.products.erdos_commit, fixture);
  } else if (task.role === "reader") {
    await renderReaderFixture(fixture);
    await checked(["git", "init", "--quiet"], { cwd: fixture });
    await checked(["git", "config", "user.name", "Vela Cold Use"], { cwd: fixture });
    await checked(["git", "config", "user.email", "cold-use@vela.invalid"], { cwd: fixture });
    await checked(["git", "add", "."], { cwd: fixture });
    await checked(["git", "commit", "--quiet", "-m", "rendered fixture"], { cwd: fixture });
  } else {
    throw new Error(`unknown cold-use role ${task.role}`);
  }
  if (task.role === "reader") {
    await addFixtureExcludes(fixture, ["/.agent-home/", "/.tmp/"]);
  } else {
    await installRegisteredVela(fixture);
  }
  return fixture;
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
let stoppedError = null;
const fixtures = new Map();

try {
  for (const task of registration.tasks) {
    fixtures.set(task.role, await prepareFixture(task, workRoot));
  }
  for (const task of registration.tasks) {
    const fixture = fixtures.get(task.role);
    const runtime = await prepareRuntime(task, fixture);
    try {
      await assertCustody(fixture, runtime);
    } finally {
      await rm(runtime.runtimeRoot, { recursive: true, force: true });
    }
  }
  if (!preflightOnly) {
    for (const task of registration.tasks) {
      const fixture = fixtures.get(task.role);
      const runtime = await prepareRuntime(task, fixture);
      try {
      const before = await gitState(fixture);
      await assertCustody(fixture, runtime);
      const finalPath = path.join(runtime.runtimeRoot, `${task.role}.final.txt`);
      const argv = [
        "codex", "exec", "--ephemeral", "--strict-config", "--ignore-rules",
        "--model", registration.runtime.model,
        "--config", 'web_search="disabled"',
        "--config", `model_reasoning_effort=\"${registration.runtime.reasoning_effort}\"`,
        ...disabledFeatures.flatMap((feature) => ["--disable", feature]),
        "--json", "--color", "never", "--output-last-message", finalPath,
        "--cd", fixture, "-",
      ];
      const run = await command(argv, {
        cwd: fixture,
        env: runtime.environment,
        input: `${task.prompt}\n`,
        timeoutMs: registration.limits.wall_time_seconds_per_call * 1000,
      });
      const after = await gitState(fixture);
      const tracePath = path.join(output, `${task.role}.jsonl`);
      await writeFile(tracePath, run.stdout);
      await writeFile(path.join(output, `${task.role}.stderr.txt`), run.stderr);
      const final = await readFile(finalPath).catch(() => Buffer.from(""));
      assertNoSecrets([run.stdout, run.stderr, final], runtime.secrets);
      await writeFile(path.join(output, `${task.role}.final.txt`), final);
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
        permission_profile_sha256: sha256(runtime.profile),
        custody_preflight: "passed",
        trace_sha256: sha256(run.stdout),
        stderr_sha256: sha256(run.stderr),
        final_sha256: sha256(final),
        interventions: [],
        external_gate_credit: false,
      });
      if (run.code !== 0) {
        stoppedError = `role ${task.role} exited ${run.code}`;
        break;
      }
      } finally {
        await rm(runtime.runtimeRoot, { recursive: true, force: true });
      }
    }
  }
} catch (error) {
  stoppedError = error instanceof Error ? error.message : String(error);
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
  status: stoppedError !== null
    ? "stopped"
    : preflightOnly
      ? "preflight_passed"
      : records.length === registration.tasks.length ? "completed" : "stopped",
  error: stoppedError,
  external_gate_credit: false,
  scientific_result_credit: false,
};
await writeFile(path.join(output, "run.json"), `${JSON.stringify(record, null, 2)}\n`);
console.log(JSON.stringify({ output, registration_sha256: record.registration_sha256, roles: records.map((item) => item.role) }));
if (stoppedError !== null) process.exitCode = 1;
