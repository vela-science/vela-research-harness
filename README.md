# Canopus

Canopus is a bounded research runner over released Vela and Git interfaces. It
selects an exact Vela work offer, gives a finite mission to a tool-enabled Codex
worker, freezes the output, runs an independent verifier container, and may land
a Receipt v1 through `vela land`.

Canopus cannot sign, accept a proposal, or make a scientific decision. A
verifier-passing landing remains `Deferred` or `pending_review` unless an
already-signed Vela policy says otherwise. Removing Canopus does not change Vela
replay or accepted state.

## Product workflow

Canopus 0.3 targets checksum-pinned Vela 0.901.0. Its ordinary path is:

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

The native Codex worker runs under a bundled default-deny profile with only the
target workspace and required compiler files exposed. macOS uses Seatbelt;
Linux and WSL2 use Codex's Bubblewrap sandbox. Native Windows supports the
read-only product surface and directs tool-using runs to WSL2. Authentication,
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

The packaged Erdős profiles cover these exact inclusive ranges:

- `erdos1056-k15-10428008-10428200`
- `erdos1056-k15-10428201-10428400`

Both capsules are content-addressed static Linux binaries for arm64 and x86-64.
Their source and pinned build provenance are retained for audit and reproducible
rebuilding, but an installed product run does not require a cross-compiler.

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
canopus profile show erdos1056-k15-10428008-10428200
canopus profile validate erdos1056-k15-10428008-10428200
canopus profile pack erdos1056-k15-10428008-10428200 --output /new/profile-pack
```

Mission v0 and the stopped cold-use registrations remain available in Git for
exact historical reproduction. Benchmark commands, compiled benchmark modules,
registrations, and benchmark documentation are intentionally absent from the
installed npm package.

## Development

Requires Node 22 or newer, pnpm 10, Vela 0.901.0, Codex CLI 0.144.6, and Docker.
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
