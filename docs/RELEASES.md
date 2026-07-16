# Release evidence

## Canopus v0.1.8 release candidate

`v0.1.8` opens Stage A v3 after v2 reached the Codex process but could not
resolve the provider host. The failure occurred before any provider response,
model execution, or scored cell.

The v3 controller reuses the exact DNS/TLS runtime file set from Canopus's
already tested tool-free outer sandbox and adds a no-model `chatgpt.com` DNS
check to the four-cell preflight. The fixture, prompts, answer contract, and
scorer semantics remain unchanged.

- Released Vela input: `v0.800.21`, commit
  `2bbcf8323e53643fcaacb81137645fc757789073`
- Superseded v2 root:
  `sha256:d97224f0ca1be5dc94c45cfc7619effab29729892491de1e9964fb5727d36615`
- Total prior model calls: `0`
- Total prior scored cells: `0`
- Semantic maintainer guidance: none
- Active Stage A v3 registration root:
  `sha256:e1a45975802c0bed66e6059a4563103c21e36a713b23df3402ff6e843c30db24`
- Four-cell no-model sandbox and provider-DNS preflight: passed

Tag, CI, preflight, and v3 registration evidence are pending.

## Canopus v0.1.7

`v0.1.7` opens Stage A v2 after retaining both v1 controller failures. The
second exact invocation stopped before session creation because the outer
sandbox allowed the real `/private/tmp` Codex home while `CODEX_HOME` carried
its lexical `/tmp` spelling. No model call or scored cell ran.

The v2 controller binds lexical and real workspace, HOME, and CODEX_HOME paths
and adds a no-model four-cell sandbox preflight before execution. The fixture,
prompts, answer contract, and scorer semantics remain unchanged.

- Release:
  [`v0.1.7`](https://github.com/vela-science/vela-research-harness/releases/tag/v0.1.7)
- Tag commit: `d2ad8c85d6a99c1c07ce688d2854fc81b000eace`
- Main CI:
  [run 29525266409](https://github.com/vela-science/vela-research-harness/actions/runs/29525266409)
- Tag CI:
  [run 29525331012](https://github.com/vela-science/vela-research-harness/actions/runs/29525331012)
- Released Vela input: `v0.800.21`, commit
  `2bbcf8323e53643fcaacb81137645fc757789073`
- Superseded v1 roots:
  - `sha256:9cca7c1061ee5b5dd5e3c4822239c65259f9b7adc7ddcd03f802bb950c28ac53`
  - `sha256:79557a2d1c283640c96559fcc473d5e7751e2829ea98e9ed7314bb878018b8ea`
- Total prior model calls: `0`
- Total prior scored cells: `0`
- Semantic maintainer guidance: none
- Active Stage A v2 registration root:
  `sha256:d97224f0ca1be5dc94c45cfc7619effab29729892491de1e9964fb5727d36615`
- Four-cell no-model sandbox preflight: passed

Tag, CI, preflight, and v2 registration evidence are pending.

## Canopus v0.1.6

`v0.1.6` repaired the cold-use controller after its first exact invocation
stopped before any model call on an unbound local cell variable. The frozen
fixture, tasks, answer contract, and scorer semantics are unchanged. A new
Stage A registration consumes the single allowed transport repair and records
zero prior model calls.

- Release:
  [`v0.1.6`](https://github.com/vela-science/vela-research-harness/releases/tag/v0.1.6)
- Tag commit: `ade6363b28ffedcc11777cd2da4c8fa9bd2f88f3`
- Main CI:
  [run 29524745742](https://github.com/vela-science/vela-research-harness/actions/runs/29524745742)
- Tag CI:
  [run 29524805582](https://github.com/vela-science/vela-research-harness/actions/runs/29524805582)
- Released Vela input: `v0.800.21`, commit
  `2bbcf8323e53643fcaacb81137645fc757789073`
- Superseded Stage A registration root:
  `sha256:9cca7c1061ee5b5dd5e3c4822239c65259f9b7adc7ddcd03f802bb950c28ac53`
- Replacement Stage A registration root:
  `sha256:79557a2d1c283640c96559fcc473d5e7751e2829ea98e9ed7314bb878018b8ea`
- Repair class: controller transport before session creation
- Prior model calls: `0`
- Prior scored cells: `0`
- Semantic maintainer guidance: none

Tag, CI, and replacement registration evidence are pending.

## Canopus v0.1.5

`v0.1.5` is the active release. It advances the checksum-pinned gate to
byte-preserving Vela `v0.800.21` and freezes the ADR 0005 cold-use Stage A
packet.

- Release:
  [`v0.1.5`](https://github.com/vela-science/vela-research-harness/releases/tag/v0.1.5)
- Tag commit: `f56b326d7b464fff5643d430cc8217cff9031b8c`
- Main CI:
  [run 29524475737](https://github.com/vela-science/vela-research-harness/actions/runs/29524475737),
  succeeded at the tag commit
- Tag CI:
  [run 29524520594](https://github.com/vela-science/vela-research-harness/actions/runs/29524520594),
  succeeded at the tag commit
- Released Vela input: `v0.800.21`, commit
  `2bbcf8323e53643fcaacb81137645fc757789073`
- Vela public conformance:
  [run 29523076181](https://github.com/vela-science/vela/actions/runs/29523076181)
- Vela immutable release:
  [run 29523648391](https://github.com/vela-science/vela/actions/runs/29523648391)
- Published Vela macOS arm64 SHA-256:
  `248665a9185e3ba4f0aad754f9b5b572480d5857ffe737ef6e466006d0cf83c6`
- Published Vela Linux x86-64 SHA-256:
  `acc0c8fc97e8ffc381b39f70177f0bd068ea6e4b6100cae46c3a40a2c4340774`
- Fixture registration SHA-256:
  `sha256:59c31a04bdb75b55d714558b849942f472043a90bff4fcb31c2538dabd100411`
- Stage A registration root:
  `sha256:9cca7c1061ee5b5dd5e3c4822239c65259f9b7adc7ddcd03f802bb950c28ac53`

No Stage A model call had run at this release point. The packet has
no signer, policy, accepted-state store, human key, scientific verdict, or
independent-result credit.

The default suite contains 77 tests with the two exact released-binary tests
skipped when their binary environment variables are absent. Enabling the
published Vela binary passes all 77 tests, including the real producer/Defer/
clean-clone integration and every registered temporal hostile case.

## Canopus v0.1.4

`v0.1.4` is the active release. It advances the checksum-pinned
composition gate to public Vela `v0.800.20` without changing the harness
architecture, mission schema, Receipt mapping, authority boundary, or frozen
ADR 0004 Stage A benchmark.

- Repository: [`vela-science/vela-research-harness`](https://github.com/vela-science/vela-research-harness)
- Release: [`v0.1.4`](https://github.com/vela-science/vela-research-harness/releases/tag/v0.1.4)
- Tag commit: `f00535ecaee1bb281ef197867ea57dcdfe792246`
- Main CI:
  [run 29520881747](https://github.com/vela-science/vela-research-harness/actions/runs/29520881747),
  succeeded at the tag commit
- Tag CI:
  [run 29520980854](https://github.com/vela-science/vela-research-harness/actions/runs/29520980854),
  succeeded at the tag commit
- Released Vela input: `v0.800.20`, commit
  `06ca1712573d735263c869fb20c7a3c4b54ce345`
- Vela public conformance:
  [run 29519883804](https://github.com/vela-science/vela/actions/runs/29519883804)
- Vela immutable release:
  [run 29520328002](https://github.com/vela-science/vela/actions/runs/29520328002)
- Published Vela macOS arm64 SHA-256:
  `d246aa29519f9f2a5d9a6b8b40d3cbe64334fe53d0d64556d03efba99ef1ae3e`

The default suite must pass 72 tests with the released-binary integration
intentionally skipped. Enabling that exact published binary must pass all 73.
Canopus remains a removable producer and verifier harness with no signer,
policy, event log, accepted-state store, or scientific verdict surface.

## Canopus v0.1.3

`v0.1.3` was the previous release. It advances the checksum-pinned composition
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
