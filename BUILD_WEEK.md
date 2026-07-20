# OpenAI Build Week

## Submission identity

- **Track:** Developer Tools
- **Product:** Canopus: Bounded Research for Codex
- **Tagline:** Give Codex a mission. Verify the work. Keep humans in authority.
- **Core message:** Let agents do the work without letting them declare truth.
- **Repository:** <https://github.com/vela-science/vela-research-harness>
- **Live evidence:** <https://app.vela.space/build-week>

The submission period began July 13, 2026 at 9:00 a.m. Pacific and ends July
21 at 5:00 p.m. Pacific. Canopus did not exist at the start. Its first commit,
`9d95924f27842ceb14a45bb0ecaf5a777c3b2736`, was created July 15 at 11:05
p.m. Toronto time.

## Baseline and Build Week delta

| Layer | Submission-period baseline | Build Week contribution |
| --- | --- | --- |
| Canopus | none | Entire bounded runner, worker custody boundary, verifier separation, npm package, retained runs, public projection, and evidence workflow |
| Vela protocol | `26386aef9126594c27888d511b76ad65a8d56870` | Released Vela 0.910.0 is consumed without changing its protocol, Receipt, policy, or authority interfaces |
| Sidon frontier | `5f138a51a6c8723d5a85ff0ffc265728c2c33c6e` | A root-bound GPT-5.6 target, a new 7,194-point witness, frozen verification, Receipt, Defer proposal, and replayable final commit |
| Vela Observatory | `37eca05ae3bc1e2f2832ed99c58ba9fdc4bd1787` | A pinned public-run type, retained-run detail route, and stable anonymous `/build-week` evidence page |

Canopus versions `0.1.0` through `0.4.6` were built during the submission
period. Version `0.4.6` adds the successful GPT-5.6 Sidon profile and evidence,
secure workspace-backed artifact retention, and the exact private Vela work
session handoff required to carry a large scientific artifact through Defer.

## Primary GPT-5.6 scientific result

### What is new

GPT-5.6 found an explicit Sidon subset of `{0,1}^24` with **7,194 points**.
Every one of its `7,194 × 7,195 / 2 = 25,880,415` unordered componentwise
integer pair sums is distinct. This advances the repository's mechanically
verified but unaccepted 7,193-point seed by one point, establishing the bounded
candidate lower bound `a(24) ≥ 7,194`. The accepted Vela state remains at its
prior human-authorized lower bound; the new result is pending review.

The discovery occurred in bounded run
`run_230412bc-01f4-4805-9152-7fc8f8a5b8e0`. GPT-5.6 designed and executed an
exact exchange search, removed zero-based baseline point 72, and added the
24-bit points `970f25` and `246891`. It independently enumerated all
25,880,415 sums. That run then failed closed because the 359 KB artifact
remained in its transient worker workspace instead of crossing the artifact
freeze boundary. It produced no Receipt and changed no frontier state.

Canopus `0.4.6` repairs that product boundary without widening custody. A
workspace-backed artifact is accepted only from its exact allowlisted path,
must remain inside the sealed worker workspace, must be one regular singly
linked file, must fit the mission byte budget, must be valid UTF-8, and is
scanned for authentication material before being frozen. Symlinks, hardlinks,
escapes, missing or empty files, invalid bytes, oversize files, and unrelated
Git changes fail closed.

### Completed primary run

- Run: `run_f68e4cfc-e5c7-4c73-86cb-d79807c47ec4`
- Mission: `mission_sidon_a24_at_least_7194_gpt56_v3`
- Profile: `sidon-a24-at-least-7194-gpt56-v3`
- Model: `gpt-5.6-sol`
- Target packet root: `sha256:09977a08357cbe240c5a7f5c3ea8e5c7055d6b5d71bcfb5f947b49accee1a3a8`
- Profile root: `sha256:3b529df4304b96890cdd7eed5f90fd862422b8b1e7b4da1cef0a478e6e7cdebe`
- Worker: success
- Artifact: 359,754 bytes at `sha256:878b05e01dbc4a785e5a671f977509f0bb338dfcb58ac53bf03d47bf6465f01e`
- Frozen verifier: pass in a network-denied, read-only Linux capsule
- Verifier root: `sha256:89130864b3ca4f354673416d4352616265b1e3dc25147a4ae91bbbf3874fbff8`
- Receipt root: `sha256:91b9f0c72e2934d3f98a34de93b61a168c8a9ff560a18a63ff4a1ee6ae2f897c`
- Evidence root: `sha256:072d5d45501fdf4fdae0481230e8b61536afbd4b02a097360bf9583a4c993a56`
- Proposal: `vpr_491cc97cfdfe98ff`
- Route: `defer`
- Accepted-state delta: `0`
- Clean-clone replay: matched
- Final frontier commit: `4289e05876f142e72af622672e190be26f6a6f1d`
- Usage: 105,553 observed tokens, 88.131 seconds, 7 research processes, 1 attempt
- Public projection root: `sha256:cf2c2ed8d54f68b8adca94f25f7ff2adcb39501fb2e68fa0b5640403dba5266e`

The generated sanitized projection is
[`evidence/build-week/run_f68e4cfc-e5c7-4c73-86cb-d79807c47ec4.public.json`](evidence/build-week/run_f68e4cfc-e5c7-4c73-86cb-d79807c47ec4.public.json).
It contains no raw worker events, isolated home, authentication, private path,
or unrestricted log.

## Secondary evidence

The earlier retained Erdős 1056 run remains a useful bounded-research example:

- Run `run_eb6bcd46-cffd-4ae8-b630-2681bd84da71`
- Artifact root `sha256:79370d5243095f28e65c218f3d5dc4710802e4dbe462fcfff1a35a8697a6f225`
- Verifier pass, Receipt `sha256:263506aae0144fb2aa4784ff9c145c6c41886b2956191c6458214cedd0bfd4aa`, Defer, accepted delta zero, and matched replay

The GPT-5.6 claim-fidelity advisory over that immutable run also remains
published as a non-authoritative `model_assessment`. Its deterministic checks
bind the source run, all five roots, artifact, numeric correspondences, and the
verifier-versus-acceptance distinction. It was not landed as scientific state.

The formal profile `formal-erdos-505-test-dim-one-gpt56` supplies the public
fail-closed counterexample. Run
`run_4c2ba5f5-04ac-44d5-adb6-8937eb2ea165` produced a candidate, but the
frozen Lean verifier rejected an unsolved inverse goal and `sorryAx`. Canopus
stopped before Receipt creation or frontier mutation.

## Reproduce without rebuilding Canopus

The primary state transition needs released Vela and the public frontier:

```bash
git clone https://github.com/vela-science/sidon-frontier.git
cd sidon-frontier
git checkout 4289e05876f142e72af622672e190be26f6a6f1d
vela reproduce .
```

Inspect the packaged product under Node 22 or 24:

```bash
npm install --global @vela-science/canopus@0.4.6
canopus --version
canopus profile validate sidon-a24-at-least-7194-gpt56-v3
```

Supported tool-using worker platforms are macOS arm64 and Linux x86-64,
including WSL2. Native Windows retains the read-only doctor, inspect, and
replay surface and directs tool-using work into WSL2.

## Codex collaboration and human decisions

Codex implemented and tested Canopus, its custody profiles, verifier routing,
release automation, Vela 0.910.0 compatibility, public projection, and
evidence surface. In the primary task, Codex also registered the GPT-5.6 Sidon
mission, diagnosed two fail-closed handoff defects, implemented bounded
artifact retention, reran all gates, executed the completed mission, and
published the resulting pending frontier state.

The human chose the product boundary, Developer Tools track, mission target,
public presentation, and the rule that no model or Canopus process receives a
human key. The human remains the only party that can make a protected
scientific decision or submit the final Devpost entry. The private `/feedback`
Session ID is kept in the submission checklist, not this repository.

## Nonclaims

- A verifier pass is not scientific acceptance.
- The 7,194-point construction does not establish maximality, classification, or a world record.
- The accepted Vela state did not change; the proposal remains pending human review.
- The retained Erdős 1056 result covers one finite range and does not solve Erdős 1056.
- The rejected formal candidate does not prove the one-dimensional theorem or Erdős 505.
- Vela predates Build Week. The submission is Canopus and its Build Week additions, not the whole ecosystem.
