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

The released Canopus baseline remains `v0.1.11` over checksum-pinned Vela
`v0.800.22`. Main also verifies the proposed Mission v1 path against Vela
`v0.800.23`; it is not a Canopus release. A run is not, by
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

Canopus `v0.1.11` preserves that stop and opens a new Stage A v6 registration.
The scorer compares parsed argv vectors and normalizes shell quoting only. It
does not repair the v5 result or change participant semantics. The v6
registration root is
`sha256:1c79221f5118ca08c62988e1d95f349ea682d2411371c97d10105d415d1935b4`.

The exact-tag v6 run completed two cells and stopped. Producer/timeless passed
with zero defects. Reviewer/temporal retained hard safety but used executable
path aliases and `<branch>` placeholders in its command report, which the
registered exact-argv rule rejects. The remaining cells and Stage B were not
run. This is a measurement result, not a Vela safety defect.

External recruitment is paused and the public issue is closed. Any future
outside run requires a new frozen registration; the stopped v5 and v6 evidence
does not carry forward as participant credit.

Proposed ADR 0004 adds a portable tool-worker mission and separate frozen
verifier without adding a signer. Its live release gate is currently closed:
under the required Docker `cap-drop ALL` profile, Codex's Linux command sandbox
cannot create its Bubblewrap namespace. The corrected hostile fixture requires
a positive shell sentinel, so failed commands cannot masquerade as secret
denials. Relaxing Docker seccomp made the shell
able to read the staged credential and host canary, so that relaxation was
rejected. The failed runs are retained as non-authoritative evidence; no
verifier, Receipt landing, accepted-state change, or Canopus `v0.2.0` release
followed.

## Development

Requires Node 22 or newer and pnpm 10.

```bash
pnpm install
pnpm check
```

Prepare and validate a proposed Mission v1 bundle without changing a frontier:

```bash
pnpm build
node dist/src/cli.js mission prepare path/to/draft.json \
  --source /clean/frontier --output /new/bundle --vela /path/to/vela \
  --worker-image canopus-worker:tag --verifier-image canopus-verifier:tag
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
