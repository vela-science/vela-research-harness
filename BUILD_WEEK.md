# OpenAI Build Week

## Submission identity

- **Track:** Developer Tools
- **Product:** Canopus: Bounded Research for Codex
- **Tagline:** Give Codex a mission. Verify the work. Keep humans in authority.
- **Core message:** Let agents do the work without letting them declare truth.
- **Repository:** <https://github.com/vela-science/vela-research-harness>
- **Live evidence:** <https://app.vela.space/build-week>

The OpenAI Build Week submission period began July 13, 2026 at 9:00 a.m.
Pacific and ends July 21, 2026 at 5:00 p.m. Pacific. Canopus did not exist at
the start of that period. Its first commit,
`9d95924f27842ceb14a45bb0ecaf5a777c3b2736`, was created July 15 at 11:05
p.m. Toronto time.

## Baseline and Build Week delta

The pre-existing substrate is distinguished from the submitted work:

| Repository or layer | Submission-period baseline | Build Week contribution |
| --- | --- | --- |
| Canopus | none | Entire bounded runner, custody boundary, verifier separation, npm package, retained runs, public projection, and advisory audit |
| Vela protocol | `26386aef9126594c27888d511b76ad65a8d56870` | Released Vela 0.910.0 is consumed through existing public interfaces; Canopus changes no protocol, Receipt, policy, or authority primitive |
| Erdős frontier | `a143c351f8488e0c621598307e248373d9dc3374` | Retains the exact bounded 1056 artifact, Receipt, Defer proposal, and replayable final commit used by the demo |
| Vela Observatory | `37eca05ae3bc1e2f2832ed99c58ba9fdc4bd1787` | Adds a pinned public-run type, retained-run detail route, and stable anonymous `/build-week` evidence page |

Canopus releases `0.1.0` through `0.4.3` and their dated commits were all made
during the submission period. Version `0.4.4` advances the product and CI pin
to Vela 0.910.0, adds the GPT-5.6 formal registration, preserves the exact
GPT-5.4 registration from `v0.4.3`, and adds the sanitized public projection
and claim-fidelity fallback.

## Exact evidence used by the submission

### Retained bounded research result

The successful research example is the existing Canopus Erdős 1056 run. Its
worker used GPT-5.4; the separate Build Week advisory below is the GPT-5.6
addition over its immutable evidence.

- Run: `run_eb6bcd46-cffd-4ae8-b630-2681bd84da71`
- Mission: `mission_erdos1056_k15_range_10428401_10428600_native1`
- Target: `erdos:1056`
- Activity: worker success; verifier pass; clean-clone replay matched
- Bounded range: `10428401..10428600`; 15 primes tested
- Maximum multiplicity: 12 at `p=10428581`, residue `5141590`
- Artifact root: `sha256:79370d5243095f28e65c218f3d5dc4710802e4dbe462fcfff1a35a8697a6f225`
- Verifier root: `sha256:6d3f61b9111fde87d57340404ad5b7561a4aa777ce54c8bf639d081c216cb165`
- Receipt root: `sha256:263506aae0144fb2aa4784ff9c145c6c41886b2956191c6458214cedd0bfd4aa`
- Route: `defer`
- Accepted-state delta: `0`
- Final frontier commit: `807f0a8f770cfed05ac0dff00b952dc41052a720`
- Public projection root: `sha256:056d7a3d9ba8d5fb682b6271e73616bff72cd9fa11f62f1ac93d76e89a699350`

The generated, sanitized projection is
[`evidence/build-week/run_eb6bcd46-cffd-4ae8-b630-2681bd84da71.public.json`](evidence/build-week/run_eb6bcd46-cffd-4ae8-b630-2681bd84da71.public.json).
It contains no raw worker events, isolated home, authentication, private path,
or unrestricted log.

### GPT-5.6 claim-fidelity advisory

The fallback registration uses `gpt-5.6-sol` once, without tools, over the
immutable run, artifact, and five final Vela roots. Deterministic replay binds
the schema, roots, artifact, and numeric correspondences. Language and
publication recommendations are explicitly labeled `model_assessment`.

- Registration: `erdos1056-run-eb6b-claim-fidelity-gpt56`
- Registration root: `sha256:371390871e1a371207e3de797e45989e84bbb766e07afdab5d47fdb3536f2c1b`
- Output-schema root: `sha256:874c61b6fbd44a2bcb68cde8b5a9a89b74f6d00f3d9a9723cb67c682bd64e045`
- Assessment root: `sha256:9205390df001a428b4b3e2fbb0a855e9f1061754b3f87771a85fc7328824ed1f`
- Deterministic checks: source run, all five roots, artifact root, all six
  numeric correspondences, and the verifier/acceptance distinction pass
- Model assessment: no universal claim; no “solved” language; publishable only
  with the bounded-result and non-acceptance caveats
- Scientific state landed: `false`

See the [registration](advisories/erdos1056-claim-fidelity/registration.json),
[assessment](advisories/erdos1056-claim-fidelity/results/assessment.json), and
[verification](advisories/erdos1056-claim-fidelity/results/verification.json).

### Formal GPT-5.6 fail-closed case

The active `formal-erdos-505-test-dim-one-gpt56` profile binds
`gpt-5.6-sol`, profile root
`sha256:e2330e477bdab48aede90512b4cf3f86cccda5fa014b4e64edfed23797f8e254`,
the frozen Lean 4.27.0 capsule, one proof-term artifact, expected route Defer,
and maximum accepted-state delta zero.

The preregistered attempt `run_4c2ba5f5-04ac-44d5-adb6-8937eb2ea165`
produced candidate root
`sha256:ef81cbf548d8a08e3811f0aa070b6ce0d58b52792f0bb56b5584dd806da4cb30`.
The frozen verifier rejected an unsolved one-dimensional inverse goal and
reported `sorryAx`, with stdout root
`sha256:04e31b07889f94a1d205231942bf30fa6c3b27864520b6a42de58604da53e544`.
Canopus stopped before landing. There is no Receipt, proposal, policy route,
accepted-state delta, Git commit, or frontier mutation for this attempt. The
raw failure directory is intentionally not published.

## Reproduce without rebuilding Canopus

The retained scientific-state transition needs only released Vela and the
public frontier:

```bash
git clone https://github.com/vela-science/erdos-frontier.git
cd erdos-frontier
git checkout 807f0a8f770cfed05ac0dff00b952dc41052a720
vela reproduce .
```

To inspect the packaged product under Node 22 or 24 without rebuilding:

```bash
npm install --global @vela-science/canopus@0.4.4
canopus --version
canopus profile list
canopus profile validate formal-erdos-505-test-dim-one-gpt56
```

Supported tool-using worker platforms are macOS arm64 and Linux x86-64,
including WSL2. Native Windows retains the read-only doctor, inspect, and
replay surface and directs tool-using work into WSL2.

## Codex collaboration and human decisions

Codex implemented and tested the harness, custody profiles, verifier routing,
release automation, Vela 0.910.0 compatibility, public projection, GPT-5.6
advisory, and evidence surface. The main Build Week completion task also used
Codex to audit the live GitHub organization, verify official submission rules,
run the exact custody preflight, execute the preregistered formal attempt, and
diagnose its fail-closed result.

The human chose the product boundary, Developer Tools track, mission and
fallback criteria, public presentation, and the rule that no model or Canopus
process receives a human key. The human remains the only party that can make a
protected scientific decision or submit the final Devpost entry. The private
`/feedback` Session ID is kept in the submission checklist, not this repository.

## Nonclaims

- A verifier pass is not scientific acceptance.
- The retained Erdős 1056 result covers one exact finite range; it does not
  solve Erdős 1056.
- The rejected formal candidate does not prove the one-dimensional theorem or
  the general Erdős 505 statement.
- The GPT-5.6 advisory is a non-authoritative model assessment and was not
  landed as scientific state.
- Vela predates Build Week. The submission is the Canopus product and its
  Build Week additions, not the whole Vela ecosystem.
