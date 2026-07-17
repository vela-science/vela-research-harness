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

Canopus `v0.2.0` targets checksum-pinned Vela `v0.800.23`. Mission v1 runs the
OpenAI-signed native Codex CLI under a default-deny macOS permission profile,
exposes only the exact target packet, freezes the result, and invokes a
separate network-denied and write-denied verifier container.

The release gate completed on the first ranked non-review Erdős target. The
bounded search produced a negative result for the exact prime range
`10428008..10428200`; the frozen verifier independently reproduced it; Vela
routed the Receipt to `defer`; accepted-event delta was zero; and a clean clone
reproduced the same roots and verifier digests. This is useful first-party
producer evidence, not scientific acceptance or independent replication.

Mission v0 and the stopped cold-use registrations remain available for exact
historical reproduction. Their detailed evidence lives in
[release evidence](docs/RELEASES.md), not in the primary workflow.

## Development

Requires Node 22 or newer and pnpm 10.

```bash
pnpm install
pnpm check
```

Prepare and validate a Mission v1 bundle without changing a frontier:

```bash
pnpm build
node dist/src/cli.js mission prepare path/to/draft.json \
  --source /clean/frontier --output /new/bundle --vela /path/to/vela \
  --codex /path/to/codex --verifier-image canopus-verifier:tag
node dist/src/cli.js mission validate /new/bundle/mission.json
```

`canopus run` requires SHA-256-pinned Vela, Codex, container, schema, packet,
and verifier identities, a clean immutable Git commit, and a separate run
root. A null or failed worker retains `engine-result.json` and stops before the
verifier and landing. Canopus performs no automatic push and has no signing
command. See
[run records](docs/RUN_RECORD.md)
for the pending/accepted distinction and publication boundary.

See [ADR 0001](docs/adr/0001-harness-boundary-and-name.md) for the boundary
and deletion test, [mission roles](docs/MISSIONS.md) for the four bounded
research jobs, and [benchmarks](docs/BENCHMARKS.md) for the registered two-call
inherited-state probe. Exact tag, CI, released-Vela, clean-clone, and benchmark
evidence is recorded in [release evidence](docs/RELEASES.md).
