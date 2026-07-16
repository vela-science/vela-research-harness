# Release evidence

## Canopus v0.1.0

- Repository: [`vela-science/vela-research-harness`](https://github.com/vela-science/vela-research-harness)
- Release: [`v0.1.0`](https://github.com/vela-science/vela-research-harness/releases/tag/v0.1.0)
- Tag commit: `0c0e59bf025b93faca8e8078b098b5aee9c67078`
- Main CI:
  [run 29471356493](https://github.com/vela-science/vela-research-harness/actions/runs/29471356493),
  succeeded at the tag commit
- Tag CI:
  [run 29478846248](https://github.com/vela-science/vela-research-harness/actions/runs/29478846248),
  succeeded at the tag commit
- Released Vela input: `v0.800.15`, commit
  `9c939cd914cc46563204b6b1d78487a53f68e8ed`
- Published Vela macOS arm64 SHA-256:
  `09cf489a5fc1b9a94fc75044643e387e564a99e34d1905f0ff875d7c6a692f11`

Both hosted Canopus runs install with the frozen lockfile, run the ordinary
test suite, download and checksum the published Vela binary, execute the real
released-Vela composition test, and inspect the package contents. The explicit
composition test proves:

1. the mission target appears exactly once in the released `vela next` offer;
2. `vela work` publishes the claimed session and passes strict replay;
3. the worker and verifier remain separate bounded processes;
4. Canopus delegates Receipt v1 authoring and landing to released Vela;
5. signed policy routes the result to Defer with zero accepted-state delta;
6. the retained receipt binds the exact artifacts and verifier result; and
7. an ordinary clean clone reproduces the frozen result.

A fresh clone of the tag repeated 65 ordinary passes, one intentional
released-binary skip, package inspection, and the explicit composition test.
No signing command, human-key read, external-use claim, or independent
scientific verdict is part of this evidence.

## Benchmark result

The preregistered subagent proxy completed both same-information arms and
returned `no_advantage`: both arms scored 6/6 with zero defects, review burden,
or dead routes and equal downstream reuse. It is a small first-party proxy, so
it receives no causal, native, external, or independent credit.

The native Codex lane completed zero arms because the provider returned its
usage limit. That lane remains `OPEN — INFRASTRUCTURE`; it is not a negative
model result. Exact registrations, raw results, and bounded diagnostics are in
`benchmarks/`.
