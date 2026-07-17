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

Canopus 0.3 targets checksum-pinned Vela 0.900.1. Its ordinary path is:

```bash
canopus doctor /path/to/frontier
canopus run /path/to/frontier --first
canopus inspect latest
canopus replay /path/to/run.json
```

`doctor` discovers and binds Vela, Codex, Git, Docker, the clean frontier roots,
the first Vela producer offer, and a registered verifier profile. `run` uses the
first offer unless an exact registered target is requested. It refuses dirty
frontiers, drifted binaries or roots, missing verifier images, cloud-synced
output paths, and unregistered targets.

The native Codex worker runs under a bundled default-deny macOS profile with
only the target workspace and required compiler files exposed. Authentication,
human keys, unrelated repositories, browser/search/MCP/app surfaces, delegation,
and command network access remain outside the worker boundary. The verifier
runs separately with network and writes denied.

A successful landing creates unsigned local Git commits and fast-forwards the
source checkout only after verifier success and clean-clone reproduction. It
does not push a remote. Use `--no-land` for a diagnostic run that leaves the
source frontier unchanged.

The packaged Erdős profiles cover these exact inclusive ranges:

- `erdos1056-k15-10428008-10428200`
- `erdos1056-k15-10428201-10428400`

Both capsules are content-addressed static Linux arm64 binaries. Their source is
retained for audit and reproducible rebuilding, but an installed product run
does not require a cross-compiler.

## Advanced and historical interfaces

Mission v1 remains the portable interface for preparing and validating a frozen
bundle:

```bash
canopus mission prepare path/to/draft.json \
  --source /clean/frontier --output /new/bundle --vela /path/to/vela \
  --codex /path/to/codex --verifier-image sha256:<image-root>
canopus mission validate /new/bundle/mission.json
```

Mission v0 and the stopped cold-use registrations remain available for exact
historical reproduction. Benchmark commands are intentionally absent from
primary help.

## Development

Requires Node 22 or newer, pnpm 10, Vela 0.900.1, Codex CLI 0.144.5, and Docker.

```bash
pnpm install
pnpm check
pnpm pack --dry-run
```

See [run records](docs/RUN_RECORD.md) for evidence and publication semantics,
[mission roles](docs/MISSIONS.md) for the bounded jobs, [ADR 0001](docs/adr/0001-harness-boundary-and-name.md)
for the deletion test, and [release evidence](docs/RELEASES.md) for exact roots.
