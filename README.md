# Canopus

Canopus is the Vela Research Harness: a small, replaceable producer above
released Vela and Git interfaces.

It checks out exact roots, gives a bounded mission to a worker, freezes the
resulting artifacts, runs a separate verifier process, and lands a Receipt v1
through `vela land`. It has no signing or human-decision capability. An
already signed Vela policy may nevertheless route that exact landing to
Permit; Canopus records the policy effect without becoming its authority.
Deleting Canopus leaves Vela replay unchanged.

The first release deliberately has no server, dashboard, provider framework,
graph database, or second state plane. Codex is the first engine behind a
small interface. Run activity is local, ignored orchestration evidence; Git
and Vela roots remain the durable identity.

## Status

Canopus `v0.1.10` targets checksum-pinned Vela `v0.800.22`. A run is not, by
itself, scientific acceptance. `defer` is pending review with zero accepted
event delta; `permit` means an already signed Vela policy admitted the exact
proposal. Canopus cannot manufacture either a human decision or an external
replication result.

The preregistered inherited-state native pair and subagent proxy both finished
`no_advantage`: the raw and inherited arms scored 6/6 on the small case.
ADR 0004 Stage A then completed four safe composition cells. The released Vela
profile preserved the same exact facts and outcomes as the standards lock while
using roughly half the context bytes on both tasks. These n=1 internal results
carry no causal, scientific, human, independent, external, or authority credit.
See the raw records in `benchmarks/results/`.

The ADR 0005 cold-use packet is frozen. Its first eligible v0.1.10
producer/timeless cell completed safely at the Vela boundary: historical
events stayed byte-identical, the proposal remained deferred, accepted state
did not change, and the expected timeless strict blocker remained. The frozen
benchmark scorer then stopped on a shell-escaping mismatch in the participant's
reported command trace, so the remaining three Stage A cells and Stage B were
not run. This is first-party diagnostic evidence only and carries zero
scientific, human, independent, external, causal, or authority credit.

## Development

Requires Node 22 or newer and pnpm 10.

```bash
pnpm install
pnpm check
```

Validate a mission without running a model or changing a frontier:

```bash
pnpm build
node dist/src/cli.js validate path/to/mission.json
```

`canopus run` requires SHA-256-pinned Vela and Codex binaries, a clean
immutable Git commit named by the mission, and a separate run root. It
performs no automatic push and has no signing command. See
[run records](docs/RUN_RECORD.md)
for the pending/accepted distinction and publication boundary.

See [ADR 0001](docs/adr/0001-harness-boundary-and-name.md) for the boundary
and deletion test, [mission roles](docs/MISSIONS.md) for the four bounded
research jobs, and [benchmarks](docs/BENCHMARKS.md) for the registered two-call
inherited-state probe. Exact tag, CI, released-Vela, clean-clone, and benchmark
evidence is recorded in [release evidence](docs/RELEASES.md).
