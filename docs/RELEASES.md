# Release evidence

## Canopus v0.1.3

`v0.1.3` is the active release. It advances the checksum-pinned composition
gate to public Vela `v0.800.19` without changing the harness architecture,
mission schema, Receipt mapping, authority boundary, or frozen ADR 0004 Stage A
benchmark.

- Repository: [`vela-science/vela-research-harness`](https://github.com/vela-science/vela-research-harness)
- Release: [`v0.1.3`](https://github.com/vela-science/vela-research-harness/releases/tag/v0.1.3)
- Tag commit: `4302ecd507a10c1c09dd7deb2b3680791de66fde`
- Main CI:
  [run 29513406128](https://github.com/vela-science/vela-research-harness/actions/runs/29513406128),
  succeeded at the tag commit
- Tag CI:
  [run 29513408654](https://github.com/vela-science/vela-research-harness/actions/runs/29513408654),
  succeeded at the tag commit
- Released Vela input: `v0.800.19`, commit
  `5a270f8b5ec038ade7c1274dc64a33dd99117851`
- Published Vela macOS arm64 SHA-256:
  `705f56293679a6c46ae7ddee2c9d07098772069a76f8d289035335b58bc51fa3`

The default suite passes 72 tests with the released-binary integration
intentionally skipped. Enabling that exact published binary passes all 73.
Canopus remains a removable producer and verifier harness with no signer,
policy, event log, accepted-state store, or scientific verdict surface.

## Canopus v0.1.2

`v0.1.2` was the previous release. It targets public Vela `v0.800.17`, adds the
bounded ADR 0004 Stage A composition runner, and keeps dependency-standing and
exact-lock semantics in released public Vela references rather than duplicating
them inside Canopus.

- Repository: [`vela-science/vela-research-harness`](https://github.com/vela-science/vela-research-harness)
- Release: [`v0.1.2`](https://github.com/vela-science/vela-research-harness/releases/tag/v0.1.2)
- Tag commit: `e573b8d3bd79a415252f5e7a22e20aff2bf510a7`
- Main CI:
  [run 29493950827](https://github.com/vela-science/vela-research-harness/actions/runs/29493950827),
  succeeded at the tag commit
- Tag CI:
  [run 29493951876](https://github.com/vela-science/vela-research-harness/actions/runs/29493951876),
  succeeded at the tag commit
- Released Vela input: `v0.800.17`, commit
  `4c963ba66026d5e699419d074db3c18a5bc12233`
- Published Vela macOS arm64 SHA-256:
  `66c3493cc82ddc49a31950b8ee534f17638349061ed54ce9217800ba1b66f267`

The release gate installs from the frozen lockfile, runs all ordinary tests,
downloads and verifies the published Vela binary, executes the real
released-Vela integration, and inspects the package contents. The Stage A
benchmark completed four of four native Codex cells safely, with zero defects,
tool calls, authority attempts, child-falsity inferences, help requests, or
interventions. The Vela representation used roughly half the context bytes of
the standards profile on both frozen tasks while preserving identical exact
roots and statuses.

This is an internal n=1 interface-compression result. It carries no causal,
scientific, human, independent, external, or authority credit and promotes no
new truth-bearing protocol primitive.

## Canopus v0.1.1

`v0.1.1` was the repaired first public release. It preserves the `v0.1.0` source
behavior while repairing its release-custody failure: ambient Git configuration
had automatically SSH-signed the `v0.1.0` annotated tag with a human key during
an agent session. The `v0.1.0` release commit was unsigned and the tag signature
never entered Vela scientific authority, but any agent use of a human key is
forbidden. The repository now disables commit and tag signing locally, and both
the `v0.1.1` commit and annotated tag are explicitly unsigned.

- Repository: [`vela-science/vela-research-harness`](https://github.com/vela-science/vela-research-harness)
- Release: [`v0.1.1`](https://github.com/vela-science/vela-research-harness/releases/tag/v0.1.1)
- Tag commit: `a719ae95453a883eaf7b0093542fb9cb193285c8`
- Main CI:
  [run 29479896016](https://github.com/vela-science/vela-research-harness/actions/runs/29479896016),
  succeeded at the tag commit
- Tag CI:
  [run 29479897094](https://github.com/vela-science/vela-research-harness/actions/runs/29479897094),
  succeeded at the tag commit
- Released Vela input: `v0.800.15`, commit
  `9c939cd914cc46563204b6b1d78487a53f68e8ed`
- Published Vela macOS arm64 SHA-256:
  `09cf489a5fc1b9a94fc75044643e387e564a99e34d1905f0ff875d7c6a692f11`

The release gate installs with the frozen lockfile, runs the ordinary test
suite, downloads and checksums the published Vela binary, executes the real
released-Vela composition test, and inspects the package contents. The explicit
composition test proves:

1. the mission target appears exactly once in the released `vela next` offer;
2. `vela work` publishes the claimed session and passes strict replay;
3. the worker and verifier remain separate bounded processes;
4. Canopus delegates Receipt v1 authoring and landing to released Vela;
5. signed policy routes the result to Defer with zero accepted-state delta;
6. the retained receipt binds the exact artifacts and verifier result; and
7. an ordinary clean clone reproduces the frozen result.

No signing command, human-key read, external-use claim, or independent
scientific verdict is part of the harness.

## Withdrawn Canopus v0.1.0

- Tag commit: `0c0e59bf025b93faca8e8078b098b5aee9c67078`
- Main CI:
  [run 29471356493](https://github.com/vela-science/vela-research-harness/actions/runs/29471356493),
  succeeded at the tag commit
- Tag CI:
  [run 29478846248](https://github.com/vela-science/vela-research-harness/actions/runs/29478846248),
  succeeded at the tag commit
- Withdrawal reason: its annotated tag carries an unintended human SSH
  signature created by ambient Git configuration. This is release-custody
  evidence only; it does not alter the source bytes or confer scientific
  authority.

A fresh clone of the withdrawn tag repeated 65 ordinary passes, one intentional
released-binary skip, package inspection, and the explicit composition test.
Those technical results remain valid, but `v0.1.0` is not the active release.

## Earlier benchmark result

The preregistered subagent proxy completed both same-information arms and
returned `no_advantage`: both arms scored 6/6 with zero defects, review burden,
or dead routes and equal downstream reuse. It is a small first-party proxy, so
it receives no causal, native, external, or independent credit.

After the provider subscription was replenished, the native Codex lane also
completed and returned `no_advantage`: both same-information arms scored 6/6.
The earlier zero-completion record remains diagnostic preflight history, not a
negative model result. Exact registrations, raw results, and bounded
diagnostics are in `benchmarks/`.
