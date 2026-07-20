# Canopus

**Canopus: Bounded Research for Codex**

Give Codex a mission. Verify the work. Keep humans in authority.

## Build Week judge quickstart

1. **20-second public demo:** open
   [app.vela.space/build-week](https://app.vela.space/build-week) to inspect the
   retained Mission → GPT-5.4 worker → artifact → independent verifier → Vela
   Receipt → Defer chain, plus the separate GPT-5.6 formal fail-closed attempt
   and advisory audit. No account or rebuild is required.
2. **90-second package inspection:** install the provenance-backed release with
   `npm install --global @vela-science/canopus@0.4.5`, then run `canopus
   --version`, `canopus profile list`, and `canopus profile validate
   formal-erdos-505-test-dim-one-gpt56`.
3. **Full local workflow:** use the exact `doctor` and `run` commands below on
   a clean supported frontier checkout. The public run page includes a separate
   no-model `vela reproduce .` path for the retained evidence.

The Build Week delta, baseline commits, Codex collaboration, exact run roots,
and nonclaims are recorded in [BUILD_WEEK.md](BUILD_WEEK.md).

Canopus is a bounded research runner over released Vela and Git interfaces. It
selects an exact Vela work offer, gives a finite mission to a tool-enabled Codex
worker, freezes the output, runs an independent verifier container, and may land
a Receipt v1 through `vela land`.

Canopus cannot sign, accept a proposal, or make a scientific decision. A
verifier-passing landing remains `Deferred` or `pending_review` unless an
already-signed Vela policy says otherwise. Removing Canopus does not change Vela
replay or accepted state.

## Product workflow

Canopus 0.4.5 targets checksum-pinned Vela 0.910.0. Install the released CLI:

```bash
npm install --global @vela-science/canopus
```

Its ordinary path is:

```bash
canopus doctor /path/to/frontier
canopus run /path/to/frontier --first
canopus inspect latest
canopus replay /path/to/run.json
canopus withdraw /path/to/frontier --run latest --reason "superseded"
```

`doctor` discovers and binds Vela, Codex, Git, Docker, the clean frontier roots,
the first Vela producer offer, and a registered verifier profile. It also runs
the same generated-canary native custody preflight required by `run`; native
Windows reports the WSL2 handoff instead of claiming mission readiness. `run`
uses the first offer unless an exact registered target is requested. It refuses
dirty frontiers, drifted binaries or roots, missing verifier images,
cloud-synced output paths, and unregistered targets.
`inspect latest` selects the newest completed or safely stopped run. Failed-run
projections state whether landing was never attempted or whether retained
landing-recovery evidence must be inspected; they never infer an unchanged
frontier from process failure alone. Withdrawal's `latest` selector remains
limited to completed, proposal-bearing runs.

The native Codex worker runs under a bundled default-deny profile with only the
target workspace and required compiler files exposed. macOS uses Seatbelt;
Linux and WSL2 use Codex's Bubblewrap sandbox. Native Windows supports the
read-only product surface and directs tool-using runs to WSL2 before creating
run output or probing credentials. Open WSL2, enter the frontier through its
Linux path, and rerun the same `canopus run` command there. Authentication,
human keys, unrelated repositories, browser/search/MCP/app surfaces,
delegation, and command network access remain outside the worker boundary. The
verifier runs separately with network and writes denied.

A successful landing creates unsigned local Git commits and fast-forwards the
source checkout only after verifier success and clean-clone reproduction. It
does not push a remote. Use `--no-land` for a diagnostic run that leaves the
source frontier unchanged.

Profiles are Defer-only by default. A profile can request the policy lane only
when it includes a closed positive result contract and binds the full target
packet, profile, verifier capsule, and result-contract roots into the Receipt.
Canopus does not decide whether that work is admitted: released Vela evaluates
the exact signed policy, and any route, root, result class, or accepted-state
delta outside the frozen profile stops the run.

After a pending landing reproduces, Canopus retains only the exact
Receipt-bound producer seed needed to withdraw that one proposal. The
capability never enters worker, verifier, or run evidence. Withdrawal is
explicit, runs in a disposable exact-head clone, proves the accepted scientific
projection unchanged, fast-forwards the clean source, and then deletes the
secret. A later human decision also consumes the now-useless secret.

The installed product contains only the current active producer profiles:

- `erdos1056-k15-10428401-10428600`
- `formal-erdos-505-test-dim-one-gpt56`

The Erdős capsule is a content-addressed static Linux binary for arm64 and
x86-64. The formal capsule is a small reviewed shell edge over an immutable
Linux-amd64 Lean image; Apple-silicon hosts bind Docker's exact amd64 emulation
instead of relying on implicit platform selection.
Completed and stopped profile registrations remain in Git and release evidence,
not in default discovery or the installed package. The shared source and pinned
build provenance remain available for reproducible rebuilding, but an installed
product run does not require a cross-compiler.

## Advanced and historical interfaces

Mission v1 remains the portable interface for preparing and validating a frozen
bundle:

```bash
canopus mission prepare path/to/draft.json \
  --source /clean/frontier --output /new/bundle --vela /path/to/vela \
  --codex /path/to/codex --verifier-image sha256:<image-root>
canopus mission validate /new/bundle/mission.json
```

Closed profile v2 contracts have a separate advanced lifecycle:

```bash
canopus profile list
canopus profile show erdos1056-k15-10428401-10428600
canopus profile validate erdos1056-k15-10428401-10428600
canopus profile pack erdos1056-k15-10428401-10428600 --output /new/profile-pack
canopus profile validate formal-erdos-505-test-dim-one-gpt56
```

Mission v0 and the stopped cold-use registrations remain available in Git for
exact historical reproduction. Benchmark commands, compiled benchmark modules,
registrations, and benchmark documentation are intentionally absent from the
installed npm package.

## Development

Requires Node 22 or 24, pnpm 10, Vela 0.910.0, Codex CLI 0.144.6, and Docker.
Linux and WSL2 also require Bubblewrap. On Ubuntu 24.04, follow OpenAI's
[targeted AppArmor setup](https://developers.openai.com/codex/concepts/sandboxing#prerequisites)
for `bwrap-userns-restrict`; Canopus never disables the global unprivileged
user-namespace restriction or falls back to an unsandboxed worker.

```bash
pnpm install
pnpm check
pnpm pack --dry-run
```

See [run records](docs/RUN_RECORD.md) for evidence and publication semantics,
[mission roles](docs/MISSIONS.md) for the bounded jobs, [ADR 0001](docs/adr/0001-harness-boundary-and-name.md)
for the deletion test, and [release evidence](docs/RELEASES.md) for exact roots.
