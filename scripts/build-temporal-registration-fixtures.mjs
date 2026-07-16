#!/usr/bin/env node

import { createHash, createPrivateKey, createPublicKey, sign } from "node:crypto";
import { execFile } from "node:child_process";
import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  unlink,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";

const exec = promisify(execFile);
const RELEASE = {
  version: "0.800.22",
  commit: "a5e5631d8fceb6a9a28522b7b9799adb74b9f232",
  macosSha256: "08703dfe5193755a0a2feaafe34576f68c2769377f428e5cc7a779418b7958b9",
};
const NULL_HASH = "sha256:null";
const EVENT_SCHEMA = "vela.event.v0.1";
const FIXED_GIT_ENV = {
  GIT_AUTHOR_DATE: "2026-07-16T12:00:00Z",
  GIT_COMMITTER_DATE: "2026-07-16T12:00:00Z",
};
const actorId = "reviewer:temporal-fixture";
const agentKey = "42".repeat(32);

function fail(message) {
  throw new Error(message);
}

function sorted(value) {
  if (Array.isArray(value)) return value.map(sorted);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, sorted(value[key])]),
    );
  }
  return value;
}

function canonical(value) {
  return JSON.stringify(sorted(value));
}

function sha256Bytes(value) {
  return createHash("sha256").update(value).digest("hex");
}

function sha256(value) {
  return `sha256:${sha256Bytes(value)}`;
}

function eventContent(event) {
  return {
    schema: event.schema,
    kind: event.kind,
    target: event.target,
    actor: event.actor,
    timestamp: event.timestamp,
    reason: event.reason,
    before_hash: event.before_hash,
    after_hash: event.after_hash,
    payload: event.payload,
    caveats: event.caveats,
  };
}

function eventSigningBody(event) {
  return {
    schema: event.schema,
    id: event.id,
    kind: event.kind,
    target: event.target,
    actor: event.actor,
    timestamp: event.timestamp,
    reason: event.reason,
    before_hash: event.before_hash,
    after_hash: event.after_hash,
    payload: event.payload,
    caveats: event.caveats,
  };
}

function eventId(event) {
  return `vev_${sha256Bytes(Buffer.from(canonical(eventContent(event)))).slice(0, 16)}`;
}

function privateKeyFromSeed(seed) {
  const prefix = Buffer.from("302e020100300506032b657004220420", "hex");
  return createPrivateKey({
    key: Buffer.concat([prefix, seed]),
    format: "der",
    type: "pkcs8",
  });
}

function publicKeyHex(privateKey) {
  const spki = createPublicKey(privateKey).export({ format: "der", type: "spki" });
  return spki.subarray(spki.length - 32).toString("hex");
}

function signEvent(event, privateKey) {
  const body = Buffer.from(canonical(eventSigningBody(event)));
  const media = "application/vnd.vela.event+json";
  const framed = Buffer.concat([
    Buffer.from(`DSSEv1 ${Buffer.byteLength(media)} ${media} ${body.length} `),
    body,
  ]);
  return `v1:${sign(null, framed, privateKey).toString("hex")}`;
}

function buildEvent({ frontierId, timestamp, reason, payload, privateKey }) {
  const event = {
    schema: EVENT_SCHEMA,
    id: "",
    kind: "research_trace.review",
    target: { type: "frontier", id: frontierId },
    actor: { id: actorId, type: "human" },
    timestamp,
    reason,
    before_hash: NULL_HASH,
    after_hash: NULL_HASH,
    payload,
    caveats: [],
    signature: null,
  };
  event.id = eventId(event);
  if (privateKey !== undefined) event.signature = signEvent(event, privateKey);
  return event;
}

async function command(argv, options = {}) {
  const result = await exec(argv[0], argv.slice(1), {
    cwd: options.cwd,
    env: { ...process.env, ...options.env },
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
    timeout: options.timeout ?? 120_000,
  });
  return result.stdout.trim();
}

async function commandResult(argv, options = {}) {
  try {
    const stdout = await command(argv, options);
    return { exitCode: 0, stdout, stderr: "" };
  } catch (error) {
    return {
      exitCode: typeof error.code === "number" ? error.code : 1,
      stdout: error.stdout ?? "",
      stderr: error.stderr ?? String(error),
    };
  }
}

async function git(repo, args, env = {}) {
  return command(["git", ...args], {
    cwd: repo,
    env: { ...FIXED_GIT_ENV, ...env },
  });
}

async function commit(repo, message) {
  await git(repo, ["add", "-A"]);
  await git(repo, [
    "-c",
    "commit.gpgsign=false",
    "-c",
    "core.hooksPath=/dev/null",
    "commit",
    "--no-gpg-sign",
    "-m",
    message,
  ]);
  return git(repo, ["rev-parse", "HEAD"]);
}

async function writeJson(file, value) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(value, null, 2)}\n`);
}

async function readJson(file) {
  return JSON.parse(await readFile(file, "utf8"));
}

async function materialize(vela, repo, home) {
  await command([vela, "frontier", "materialize", ".", "--json"], {
    cwd: repo,
    env: { HOME: home },
  });
}

async function appendEvent(repo, event) {
  await writeJson(path.join(repo, ".vela", "events", `${event.id}.json`), event);
}

async function activationFile(repo) {
  const directory = path.join(repo, ".vela", "events");
  for (const name of await readdir(directory)) {
    const file = path.join(directory, name);
    const event = await readJson(file);
    if (event.kind === "actor.registration_activated") return { file, event };
  }
  fail("activation event not found");
}

async function replaceActivation(repo, privateKey, mutate) {
  const current = await activationFile(repo);
  const event = structuredClone(current.event);
  mutate(event);
  event.id = eventId(event);
  event.signature = signEvent(event, privateKey);
  await unlink(current.file);
  await appendEvent(repo, event);
  return event.id;
}

async function checkoutCase(repo, base, name) {
  await git(repo, ["switch", "--detach", base]);
  await git(repo, ["switch", "-c", name]);
}

async function velaCheck(vela, repo, home, strict) {
  const argv = [vela, "check", "."];
  if (strict) argv.push("--strict");
  argv.push("--json");
  const result = await commandResult(argv, {
    cwd: repo,
    env: { HOME: home },
  });
  let json;
  try {
    json = JSON.parse(result.stdout);
  } catch {
    json = null;
  }
  return {
    exit_code: result.exitCode,
    signals: Array.isArray(json?.signals)
      ? json.signals
          .map((signal) => ({
            kind: signal.kind,
            severity: signal.severity,
            blocks: signal.blocks,
          }))
          .sort((left, right) =>
            `${left.kind}:${left.severity}`.localeCompare(
              `${right.kind}:${right.severity}`,
            ),
          )
      : [],
    event_log_count: json?.event_log?.count ?? null,
    event_log_hash: json?.replay?.event_log_hash
      ? `sha256:${json.replay.event_log_hash}`
      : null,
  };
}

async function bundle(repo, file) {
  await command(["git", "bundle", "create", file, "--all"], { cwd: repo });
  await command(["git", "bundle", "verify", file], { cwd: repo });
}

async function main() {
  const args = process.argv.slice(2);
  const velaIndex = args.indexOf("--vela");
  const outputIndex = args.indexOf("--output");
  if (velaIndex < 0 || outputIndex < 0 || args[velaIndex + 1] === undefined || args[outputIndex + 1] === undefined) {
    fail("usage: build-temporal-registration-fixtures.mjs --vela <released-binary> --output <empty-directory>");
  }
  const vela = path.resolve(args[velaIndex + 1]);
  const output = path.resolve(args[outputIndex + 1]);
  if ((await readdir(output).catch(() => [])).length !== 0) {
    fail(`output directory is not empty: ${output}`);
  }
  await mkdir(output, { recursive: true });
  const binary = await readFile(vela);
  if (sha256Bytes(binary) !== RELEASE.macosSha256) {
    fail("Vela binary digest does not match the registered macOS v0.800.22 release");
  }
  if ((await command([vela, "--version"])) !== `vela ${RELEASE.version}`) {
    fail("Vela binary version does not match the registered release");
  }

  const root = await mkdtemp(path.join(os.tmpdir(), "canopus-temporal-registration-"));
  const source = path.join(root, "source");
  const temporal = path.join(root, "temporal");
  const fixtureHome = path.join(root, "fixture-home");
  await mkdir(fixtureHome, { recursive: true });

  try {
    await command([vela, "init", source, "--name", "temporal-registration-training", "--json"], {
      cwd: root,
      env: { HOME: fixtureHome },
    });
    await git(source, ["config", "user.name", "Canopus Temporal Fixture"]);
    await git(source, ["config", "user.email", "temporal-fixture@vela.invalid"]);
    await git(source, ["config", "commit.gpgsign", "false"]);
    await git(source, ["config", "tag.gpgsign", "false"]);
    await writeFile(
      path.join(source, "campaign.yaml"),
      [
        "batches:",
        "  - name: temporal registration cold-use training",
        "    state: open",
        "    problems:",
        "      - id: seed:temporal-registration",
        "        title: Reproduce a bounded Golomb witness",
        "        why: Exercise pending producer work without authority",
        "",
      ].join("\n"),
    );
    await mkdir(path.join(source, "training-fixture"), { recursive: true });
    await writeFile(
      path.join(source, "training-fixture", "golomb.json"),
      '{"kind":"golomb","length":6,"marks":[0,1,4,6]}\n',
    );
    await commit(source, "initialize temporal registration training frontier");

    const identity = JSON.parse(
      await command(
        [vela, "id", "create", "--handle", "temporal-fixture", "--force", "--json"],
        { cwd: source, env: { HOME: fixtureHome } },
      ),
    );
    if (identity.actor_id !== actorId) fail("fixture identity actor mismatch");
    await command([vela, "actor", "add", ".", "--json"], {
      cwd: source,
      env: { HOME: fixtureHome },
    });

    const seed = Buffer.from(
      (await readFile(identity.key_path, "utf8")).trim(),
      "hex",
    );
    const privateKey = privateKeyFromSeed(seed);
    if (publicKeyHex(privateKey) !== identity.pubkey) fail("fixture key mismatch");
    const frontier = await readJson(path.join(source, "frontier.json"));
    const frontierId = frontier.frontier_id;

    const legacy = buildEvent({
      frontierId,
      timestamp: "2026-07-01T00:00:00Z",
      reason: "Unsigned pre-registration training history.",
      payload: { case: "anchored_unsigned" },
    });
    const anchoredSigned = buildEvent({
      frontierId,
      timestamp: "2026-07-02T00:00:00Z",
      reason: "Signed pre-registration training history.",
      payload: { case: "anchored_signed" },
      privateKey,
    });
    await appendEvent(source, legacy);
    await appendEvent(source, anchoredSigned);
    await materialize(vela, source, fixtureHome);
    const anchorCommit = await commit(source, "freeze temporal registration anchor");
    const anchorTree = await git(source, ["show", "-s", "--format=%T", anchorCommit]);

    const laterSigned = buildEvent({
      frontierId,
      timestamp: "2026-07-03T00:00:00Z",
      reason: "Signed post-anchor training history.",
      payload: { case: "post_anchor_signed" },
      privateKey,
    });
    await appendEvent(source, laterSigned);
    await materialize(vela, source, fixtureHome);
    const timelessHead = await commit(source, "append signed post-anchor event");

    await command(["git", "clone", "--no-local", source, temporal], { cwd: root });
    await git(temporal, ["remote", "remove", "origin"]);
    await git(temporal, ["config", "user.name", "Canopus Temporal Fixture"]);
    await git(temporal, ["config", "user.email", "temporal-fixture@vela.invalid"]);
    await git(temporal, ["config", "commit.gpgsign", "false"]);
    const preview = JSON.parse(
      await command(
        [vela, "actor", "activate", ".", "--anchor", anchorCommit, "--preview", "--json"],
        { cwd: temporal, env: { HOME: fixtureHome } },
      ),
    );
    const activation = JSON.parse(
      await command(
        [
          vela,
          "actor",
          "activate",
          ".",
          "--anchor",
          anchorCommit,
          "--yes",
          "--confirm-root",
          preview.preview_root,
          "--json",
        ],
        { cwd: temporal, env: { HOME: fixtureHome } },
      ),
    );
    const temporalHead = await git(temporal, ["rev-parse", "HEAD"]);
    const activationId = activation.activation_event_id;
    if (typeof activationId !== "string") {
      fail("activation ceremony did not return activation_event_id");
    }

    await checkoutCase(temporal, temporalHead, "case/unsigned-post-anchor");
    const unsignedLater = buildEvent({
      frontierId,
      timestamp: "2026-07-17T00:00:00Z",
      reason: "Unsigned post-anchor hostile case.",
      payload: { case: "unsigned_post_anchor" },
    });
    await appendEvent(temporal, unsignedLater);
    await materialize(vela, temporal, fixtureHome);
    await commit(temporal, "case: unsigned post-anchor event");

    await checkoutCase(temporal, temporalHead, "case/backdated-post-anchor");
    const backdated = buildEvent({
      frontierId,
      timestamp: "2026-06-01T00:00:00Z",
      reason: "Backdated unsigned post-anchor hostile case.",
      payload: { case: "backdated_post_anchor" },
    });
    await appendEvent(temporal, backdated);
    await materialize(vela, temporal, fixtureHome);
    await commit(temporal, "case: backdated unsigned post-anchor event");

    await checkoutCase(temporal, temporalHead, "case/anchor-signature-removed");
    const anchoredSignedFile = path.join(
      temporal,
      ".vela",
      "events",
      `${anchoredSigned.id}.json`,
    );
    const stripped = await readJson(anchoredSignedFile);
    stripped.signature = null;
    await writeJson(anchoredSignedFile, stripped);
    await materialize(vela, temporal, fixtureHome);
    await commit(temporal, "case: remove anchored signature");

    await checkoutCase(temporal, temporalHead, "case/wrong-anchor-root");
    await replaceActivation(temporal, privateKey, (event) => {
      event.payload.anchor.event_log_root = `sha256:${"0".repeat(64)}`;
    });
    await materialize(vela, temporal, fixtureHome);
    await commit(temporal, "case: wrong anchor event-log root");

    await git(temporal, ["switch", "--orphan", "fixture/nonancestor-anchor"]);
    await writeFile(path.join(temporal, "NONANCESTOR.txt"), "independent anchor object\n");
    const forkCommit = await commit(temporal, "create non-ancestor anchor object");
    const forkTree = await git(temporal, ["show", "-s", "--format=%T", forkCommit]);
    await checkoutCase(temporal, temporalHead, "case/nonancestor-anchor");
    await replaceActivation(temporal, privateKey, (event) => {
      event.payload.anchor.git_commit = forkCommit;
      event.payload.anchor.git_tree = forkTree;
    });
    await materialize(vela, temporal, fixtureHome);
    await commit(temporal, "case: signed non-ancestor anchor");

    await checkoutCase(temporal, temporalHead, "case/registry-key-replaced");
    const actorsFile = path.join(temporal, ".vela", "actors.json");
    const actors = await readJson(actorsFile);
    const replacementPrivate = privateKeyFromSeed(Buffer.alloc(32, 0x73));
    actors[0].public_key = publicKeyHex(replacementPrivate);
    await writeJson(actorsFile, actors);
    await materialize(vela, temporal, fixtureHome);
    await commit(temporal, "case: replace actor registry key");

    await checkoutCase(temporal, temporalHead, "case/activation-deleted");
    await unlink((await activationFile(temporal)).file);
    await materialize(vela, temporal, fixtureHome);
    await commit(temporal, "case: delete activation event");

    await checkoutCase(temporal, temporalHead, "case/activation-and-actor-deleted");
    await unlink((await activationFile(temporal)).file);
    await writeJson(path.join(temporal, ".vela", "actors.json"), []);
    await materialize(vela, temporal, fixtureHome);
    await commit(temporal, "case: delete activation and actor record");

    await checkoutCase(temporal, temporalHead, "case/git-publication-only");
    await writeFile(
      path.join(temporal, "PUBLICATION-NOT-ACCEPTANCE.md"),
      "This Git commit adds no scientific decision event.\n",
    );
    await commit(temporal, "case: Git publication without scientific acceptance");
    await git(temporal, ["switch", "--detach", temporalHead]);
    await git(temporal, ["branch", "-f", "main", temporalHead]);

    const branches = {};
    for (const line of (
      await git(temporal, ["for-each-ref", "--format=%(refname:short) %(objectname)", "refs/heads"])
    ).split("\n")) {
      const [name, commit] = line.trim().split(" ");
      if (name) branches[name] = commit;
    }
    const timelessBundle = path.join(output, "timeless.bundle");
    const temporalBundle = path.join(output, "temporal.bundle");
    await bundle(source, timelessBundle);
    await bundle(temporal, temporalBundle);
    const timelessClone = path.join(root, "timeless-bundle-clone");
    const temporalClone = path.join(root, "temporal-bundle-clone");
    await command(["git", "clone", timelessBundle, timelessClone], { cwd: root });
    await command(["git", "clone", temporalBundle, temporalClone], { cwd: root });
    const timelessStrict = await velaCheck(
      vela,
      timelessClone,
      fixtureHome,
      true,
    );
    const timelessNonStrict = await velaCheck(
      vela,
      timelessClone,
      fixtureHome,
      false,
    );
    const temporalStrict = await velaCheck(
      vela,
      temporalClone,
      fixtureHome,
      true,
    );
    const temporalNonStrict = await velaCheck(
      vela,
      temporalClone,
      fixtureHome,
      false,
    );
    const branchChecks = {};
    for (const [name, branchCommit] of Object.entries(branches)) {
      if (!name.startsWith("case/")) continue;
      await git(temporalClone, ["switch", "--detach", branchCommit]);
      branchChecks[name] = {
        strict: await velaCheck(vela, temporalClone, fixtureHome, true),
        non_strict: await velaCheck(vela, temporalClone, fixtureHome, false),
      };
    }
    const shallow = path.join(root, "temporal-depth-one-clone");
    await command(
      [
        "git",
        "clone",
        "--depth",
        "1",
        pathToFileURL(temporal).href,
        shallow,
      ],
      { cwd: root },
    );
    const shallowAnchor = await commandResult(
      ["git", "cat-file", "-e", `${anchorCommit}^{commit}`],
      { cwd: shallow },
    );
    if (shallowAnchor.exitCode === 0) {
      fail("depth-one clone unexpectedly retained the activation anchor");
    }
    const shallowStrict = await velaCheck(vela, shallow, fixtureHome, true);
    const shallowNonStrict = await velaCheck(
      vela,
      shallow,
      fixtureHome,
      false,
    );
    const registryBytes = await readFile(path.join(source, ".vela", "actors.json"));
    const eventFiles = await readdir(path.join(source, ".vela", "events"));
    const commonEventIds = eventFiles
      .filter((name) => name.endsWith(".json"))
      .map((name) => name.slice(0, -5))
      .sort();
    const commonEvents = [];
    for (const id of commonEventIds) {
      const relative = path.join(".vela", "events", `${id}.json`);
      const timelessBytes = await readFile(path.join(source, relative));
      const temporalBytes = await readFile(path.join(temporal, relative));
      if (!timelessBytes.equals(temporalBytes)) {
        fail(`matched-arm event bytes differ for ${id}`);
      }
      const event = JSON.parse(timelessBytes.toString("utf8"));
      if (event.kind !== "research_trace.review") {
        fail(`unexpected truth-bearing event kind in common fixture: ${event.kind}`);
      }
      commonEvents.push({
        id,
        kind: event.kind,
        byte_root: sha256(timelessBytes),
        signature_present: typeof event.signature === "string",
        anchor_member: id === legacy.id || id === anchoredSigned.id,
      });
    }
    const temporalEventNames = (
      await readdir(path.join(temporal, ".vela", "events"))
    )
      .filter((name) => name.endsWith(".json"))
      .sort();
    if (
      temporalEventNames.length !== commonEventIds.length + 1 ||
      !temporalEventNames.includes(`${activationId}.json`)
    ) {
      fail("temporal arm must add exactly one activation event");
    }
    for (const repo of [source, temporal]) {
      const tracked = (
        await git(repo, ["ls-tree", "-r", "--name-only", "HEAD"])
      ).split("\n");
      if (
        tracked.some(
          (name) =>
            name === ".vela/identity.json" || name.startsWith(".vela/keys/"),
        )
      ) {
        fail("fixture repository contains identity or private-key custody files");
      }
    }

    const registration = {
      schema: "canopus.temporal-registration-fixture.v1",
      status: "frozen_not_executed",
      generated_by: {
        script: "scripts/build-temporal-registration-fixtures.mjs",
        canopus_version: "0.1.10",
        model_calls: 0,
      },
      released_vela: {
        version: RELEASE.version,
        commit: RELEASE.commit,
        macos_aarch64_sha256: `sha256:${RELEASE.macosSha256}`,
      },
      actor: {
        id: actorId,
        public_key: identity.pubkey,
        private_key_published: false,
      },
      frontier: {
        id: frontierId,
        anchor_commit: anchorCommit,
        anchor_tree: anchorTree,
        timeless_head: timelessHead,
        temporal_head: temporalHead,
        activation_event_id: activationId,
        activation_preview_root: preview.preview_root,
        common_event_ids: commonEventIds,
        common_events: commonEvents,
        anchored_unsigned_event_id: legacy.id,
        anchored_signed_event_id: anchoredSigned.id,
        post_anchor_signed_event_id: laterSigned.id,
        actor_registry_root: sha256(registryBytes),
      },
      bundles: {
        timeless: {
          path: "timeless.bundle",
          sha256: sha256(await readFile(timelessBundle)),
        },
        temporal: {
          path: "temporal.bundle",
          sha256: sha256(await readFile(temporalBundle)),
        },
      },
      branches,
      derived_cases: {
        missing_anchor_object: {
          method: "depth_one_clone_of_temporal_main",
          strict: shallowStrict,
          non_strict: shallowNonStrict,
        },
      },
      hostile_case_checks: branchChecks,
      expected: {
        timeless_strict: timelessStrict,
        timeless_non_strict: timelessNonStrict,
        temporal_strict: temporalStrict,
        temporal_non_strict: temporalNonStrict,
        anchored_unsigned_legacy_count: 1,
        anchored_signed_count: 1,
        post_anchor_unsigned_count: 0,
        post_anchor_signed_count: 1,
        accepted_event_delta: 0,
        common_event_byte_delta: 0,
        scientific_event_delta: 0,
        audit_event_delta: 1,
      },
      producer: {
        target: "seed:temporal-registration",
        witness: "training-fixture/golomb.json",
        actor: "agent:temporal-participant",
        disposable_agent_signing_seed_hex: agentKey,
        credential_scope: "public_fixture_non_human_non_authority",
        expected_route: "deferred",
        expected_accepted_event_delta: 0,
      },
      credit: {
        scientific: false,
        human: false,
        independent: false,
        external: false,
        authority: false,
      },
    };
    await writeJson(path.join(output, "registration.json"), registration);
    await writeFile(
      path.join(output, "README.md"),
      [
        "# Temporal actor-registration training fixture",
        "",
        "This packet is non-scientific training evidence. The fixture human key was",
        "created outside the repositories and deleted after the bundles were frozen.",
        "No private key is present in either bundle. The public agent key in the",
        "registration is a disposable producer credential, not human authority.",
        "",
        "Verify bundle custody and roots against `registration.json` before use.",
        "The `case/*` branches are hostile reviewer cases. A depth-one clone of",
        "`temporal` supplies the missing-anchor-object case.",
        "",
      ].join("\n"),
    );

    const privateSeedHex = seed.toString("hex");
    const privateSeedBytes = Buffer.from(seed);
    for (const file of [
      timelessBundle,
      temporalBundle,
      path.join(output, "registration.json"),
      path.join(output, "README.md"),
    ]) {
      const bytes = await readFile(file);
      if (
        bytes.includes(Buffer.from(privateSeedHex)) ||
        bytes.includes(privateSeedBytes)
      ) {
        fail(`private fixture seed entered ${path.basename(file)}`);
      }
    }
    const finalFiles = await readdir(output);
    console.log(
      JSON.stringify(
        {
          ok: true,
          schema: registration.schema,
          output,
          files: finalFiles.sort(),
          registration_sha256: sha256(
            await readFile(path.join(output, "registration.json")),
          ),
          private_key_published: false,
          model_calls: 0,
          external_gate_credit: false,
        },
        null,
        2,
      ),
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

await main();
