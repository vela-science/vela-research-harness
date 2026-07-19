#!/usr/bin/env node

import { createHash, randomBytes } from "node:crypto";
import {
  chmod,
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertNativeRuntimeProfile } from "../dist/src/engines/codex-tools-native.js";
import { isolatedEnvironment, runCommand } from "../dist/src/util/command.js";

function digest(bytes) {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

const args = process.argv.slice(2);
if (args.length !== 2 || args[0] !== "--codex") {
  throw new Error("usage: run-native-sandbox-preflight.mjs --codex BIN");
}
if (process.platform !== "darwin" && process.platform !== "linux") {
  throw new Error(`native sandbox preflight does not support ${process.platform}`);
}

const binary = await realpath(args[1]);
const profile = fileURLToPath(new URL(
  process.platform === "linux"
    ? "../runtime/native-worker/config-linux.toml"
    : "../runtime/native-worker/config.toml",
  import.meta.url,
));
const runtime = await mkdtemp(path.join(os.tmpdir(), "canopus-native-preflight-"));

try {
  const codexHome = path.join(runtime, "codex-home");
  const home = path.join(runtime, "home");
  const workspace = path.join(runtime, "workspace");
  const sourceHome = path.join(runtime, "source-auth");
  const sealedInput = path.join(runtime, "sealed-input");
  const unrelated = path.join(runtime, "unrelated-repository");
  await Promise.all([
    mkdir(codexHome, { mode: 0o700 }),
    mkdir(home, { mode: 0o700 }),
    mkdir(workspace, { mode: 0o700 }),
    mkdir(sourceHome, { mode: 0o700 }),
    mkdir(sealedInput, { mode: 0o700 }),
    mkdir(unrelated, { mode: 0o700 }),
  ]);

  const authBytes = Buffer.from(JSON.stringify({
    OPENAI_API_KEY: `preflight-${randomBytes(32).toString("hex")}`,
  }) + "\n");
  const sourceAuth = path.join(sourceHome, "auth.json");
  const runtimeAuth = path.join(codexHome, "auth.json");
  const inputFile = path.join(sealedInput, "packet.json");
  const unrelatedFile = path.join(unrelated, "private.txt");
  const canary = path.join(runtime, "host-secret");
  await Promise.all([
    writeFile(sourceAuth, authBytes, { flag: "wx", mode: 0o600 }),
    writeFile(runtimeAuth, authBytes, { flag: "wx", mode: 0o600 }),
    writeFile(inputFile, "sealed input\n", { flag: "wx", mode: 0o400 }),
    writeFile(unrelatedFile, "unrelated repository\n", { flag: "wx", mode: 0o400 }),
    writeFile(canary, `host-secret-${randomBytes(32).toString("hex")}\n`, {
      flag: "wx",
      mode: 0o400,
    }),
  ]);
  await copyFile(profile, path.join(codexHome, "config.toml"));
  await chmod(path.join(codexHome, "config.toml"), 0o600);

  const environment = {
    ...isolatedEnvironment(home),
    CODEX_HOME: codexHome,
    CANOPUS_AUTH: "canopus-preflight-environment-canary",
    NO_COLOR: "1",
  };
  await assertNativeRuntimeProfile({
    binary,
    runner: runCommand,
    environment,
    cwd: workspace,
    sourceAuth,
    runtimeAuth,
    inaccessibleInput: inputFile,
    unrelatedFile,
    canary,
    outsideWrite: path.join(runtime, "outside-write"),
    timeoutMs: 30_000,
    // This fixture uses generated canaries only. Bounded printable stderr is
    // safe to expose so hosted platform failures remain actionable.
    includeSafeDiagnostics: true,
  });
  const version = await runCommand({
    argv: [binary, "--version"],
    cwd: workspace,
    env: environment,
    timeoutMs: 30_000,
    maxOutputBytes: 4096,
  });
  if (version.exitCode !== 0 || version.stderr.length !== 0) {
    throw new Error("Codex version check failed after native sandbox preflight");
  }
  process.stdout.write(`${JSON.stringify({
    ok: true,
    fixture: "native-sandbox-preflight.v1",
    platform: `${process.platform}-${process.arch}`,
    codex_version: version.stdout.toString("utf8").trim(),
    codex_sha256: digest(await readFile(binary)),
    permission_profile_sha256: digest(await readFile(profile)),
    verdict: {
      curl_available: true,
      source_auth_readable: false,
      runtime_auth_readable: false,
      sealed_input_readable: false,
      unrelated_repo_readable: false,
      canary_readable: false,
      outside_workspace_writable: false,
      command_network_reachable: false,
      environment_contains_auth: false,
      proc_environ_contains_auth: false,
    },
  })}\n`);
} finally {
  await rm(runtime, { recursive: true, force: true });
}
