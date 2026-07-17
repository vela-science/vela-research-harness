# ADR 0004: Tool-using local Codex worker and frozen verifier

- Status: Proposed
- Candidate release: Canopus `v0.2.0`
- Scope: one authority-free local research mission

## Context

Canopus Mission v0 deliberately gave Codex no tools. That contract remains
useful for reproducing frozen benchmarks, but it cannot test whether Canopus is
useful for ordinary research. The current Erdős frontier also has known strict
debt unrelated to a new producer task. Treating the frontier as strict-clean
would make the harness unusable; ignoring the debt would weaken Vela.

The useful next test is narrower than the deferred independent-participant
program: select the first ranked non-review attack target, let one local Codex
worker inspect an exact checkout and produce a bounded artifact, verify frozen
bytes in a separate process, and land only a pending Receipt. This is
first-party engineering and research evidence. It earns no independent,
scientific, human, or acceptance credit.

## Decision

Canopus introduces `canopus.mission.v1` and these primary commands:

```text
canopus mission prepare
canopus mission validate
canopus run
canopus inspect
```

Mission v0 and its tool-free execution remain supported for frozen benchmark
reproduction. Benchmark commands remain available but move out of default-help
prominence.

Mission v1 binds:

- exact Git commit and tree;
- Vela version, binary SHA-256, event root, and snapshot root;
- the first ranked attack target and exact target-packet path and digest;
- the complete strict blocker set by canonical root and per-rule counts;
- a Docker worker image, direct Codex version and native binary SHA-256, model,
  tool profile, bundled structured-output schema and its SHA-256, and resource
  ceilings;
- a separately stored verifier capsule, capsule and executable SHA-256, Docker
  image, argv, cwd, timeout, and output limit;
- allowed artifact paths, prompt and artifact budgets, and the exact
  scientific-chain assertion; and
- a single allowed landing outcome: `defer` with accepted-event delta zero.

`mission prepare` derives roots and identities from a clean source checkout and
locally present images. It copies the exact packet and executable capsule into
a fresh portable bundle. It rejects a dirty checkout, stale binary, changed
packet, missing or non-executable capsule, unavailable image, target override,
unbounded objective, or malformed budget. `mission validate` rechecks the
closed contract and bundled bytes without making a model call.

## Registered strict debt

Mission v1 does not turn strict failure into success. It registers one exact
baseline so an unrelated task can run on a debt-bearing frontier.

The canonical baseline is derived from the complete strict `signals.blockers`
array after every non-signal check passes and the summary reports zero
structural errors and invalid findings. Canopus sorts canonical blocker objects,
hashes the complete array, and records sorted per-rule counts.

Every control-lane inspection requires equality with that baseline. A missing,
new, or altered blocker; event failure; state-integrity failure; policy failure;
root change; malformed strict output; or exit/status disagreement fails closed.
Mission v0 retains the strict-clean requirement.

## Worker boundary

The worker runs the direct Codex CLI in an exact Docker image with only shell
and patch actions available. Canopus mounts:

- the exact source clone read-only;
- a disposable Codex credential copy read-only for Codex startup;
- the final-response schema read-only;
- one bounded output directory; and
- a random hostile-test canary read-only.

The entrypoint copies source bytes into a fresh writable tmpfs. Docker uses a
read-only root, dropped capabilities, no-new-privileges, a non-root host UID,
bounded CPU, memory, process count, output, tokens, and wall time, and no Docker
socket, host home, Vela key directory, or unrelated repository mount.
The image installs the distribution `bubblewrap` package required by Codex's
Linux sandbox; failure to create the inner command namespace is a hard worker
failure, not a reason to relax Docker seccomp or custody controls.

Codex runs `--ephemeral`, ignores user configuration and exec rules, inherits
no shell environment, uses `workspace-write`, and has browser, search, MCP,
apps, memories, computer use, multi-agent work, plugins, hooks, goals, and image
tools disabled. The prompt forbids signing, authority claims, credential paths,
and use of Vela or the verifier as an oracle.

Before a real mission, a hostile model fixture must attempt to read both the
staged authentication material and host-secret canary. A readable secret,
secret-bearing output, workspace escape, forbidden command, or unbounded
action stops the program before a scientific run or release.

## Verifier boundary

The producer cannot invoke the registered verifier. After the worker exits,
Canopus freezes artifact bytes and launches a second pinned image with:

- network mode `none`;
- a read-only root;
- all capabilities dropped and no-new-privileges;
- exact input, capsule, and artifact bytes mounted read-only;
- no host home, credentials, Docker socket, Vela key directory, or landing
  checkout; and
- bounded processes, memory, CPU, time, and output.

The capsule SHA-256 must equal both its registered capsule root and executable
digest. Artifacts are rehashed before and after verification. A nonzero verifier
result is an honest failure, not a success candidate.

## Landing and authority

Only a verifier-passing candidate reaches `vela land`, using an `agent:` actor.
Mission v1 permits only `Deferred` or its exact-retry equivalent, with accepted
event delta zero. Canopus verifies the retained Receipt and artifact bindings,
then reproduces roots and verifier digests in a clean clone.

Canopus exposes no `sign` or `accept` method. It does not read or trigger a
human scientific key. Git publication records bytes; it does not create
scientific acceptance.

## Stop and release gates

Stop on any:

- authentication, canary, or human-key exposure;
- workspace or mount escape;
- verifier network or persistent-write access;
- changed packet, capsule, image, binary, event, snapshot, or strict baseline;
- historical rewrite;
- false strict pass or false authority claim;
- accepted-state change; or
- mismatch in clean-clone reproduction.

Canopus `v0.2.0` may release only after focused tests, live hostile isolation,
and one real first-ranked mission complete safely. A safe null result is
preserved as run evidence but does not satisfy the release gate.

## Conformance

```bash
pnpm check
pnpm build
node --test dist/tests/mission-v1.test.js
node --test dist/tests/engine-tools.test.js
node --test dist/tests/verifier.test.js
node --test dist/tests/integration/released-vela.test.js
pnpm pack --dry-run
git diff --check
```

Live tests additionally prove the hostile custody boundary and a real
network-denied, write-denied verifier run. They never call `vela sign`.

## Consequences

Canopus becomes useful for one ordinary bounded task without adding an
authority surface or Vela primitive. The exact strict-debt registration keeps
the current frontier usable without laundering known failures. If the
experiment fails, Mission v0 and released Vela remain intact and the failure
identifies an orchestration gap rather than a protocol mandate.

## Current implementation evidence

The first live implementation pass remains below the release gate. The
separate verifier profile denied network, persistent writes, and host-home
visibility. The first worker custody fixture reported credentials and canary
unreadable but did not prove its shell probes executed, so that apparent pass
is invalid. The corrected fixture requires a positive shell sentinel and fails
at the same nested Linux sandbox boundary: Codex cannot create the Bubblewrap
namespace inside Docker with all capabilities dropped.

Installing Debian's documented `bubblewrap` package did not change the Docker
Desktop namespace denial. A diagnostic seccomp relaxation allowed commands but
also made the staged credential, runtime credential, and canary readable. That
configuration is rejected. The retained failures caused no verifier pass,
Receipt landing, historical rewrite, accepted-state delta, or authority claim.
ADR 0004 therefore stays Proposed and `v0.2.0` remains unreleased.
