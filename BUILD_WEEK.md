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
| Vela protocol | `26386aef9126594c27888d511b76ad65a8d56870` | Released Vela 0.912.0 adds proposal-scoped verifier evidence and replay without changing its protocol, Receipt, policy, or authority semantics |
| Sidon frontier | `5f138a51a6c8723d5a85ff0ffc265728c2c33c6e` | A root-bound GPT-5.6 target, a new 7,194-point witness, frozen verification, Receipt, Defer proposal, and replayable final commit |
| Vela Observatory | `37eca05ae3bc1e2f2832ed99c58ba9fdc4bd1787` | A pinned public-run type, retained-run detail route, and stable anonymous `/build-week` evidence page |

Canopus versions `0.1.0` through `0.6.1` were built during the submission
period. Version `0.4.6` added the successful GPT-5.6 Sidon profile and secure
workspace-backed artifact retention. Versions `0.5` and `0.6` then hardened
retry-safe Vela composition, stage-typed run evidence, proposal-scoped replay,
and a local-only sanitized publication bundle. None adds an acceptance path.

## Dated Build Week ledger

All dates below are Toronto time. Tags identify released product bytes; later
documentation commits do not rewrite those release or evidence identities.

| Date | Repository and immutable ref | Build Week addition |
| --- | --- | --- |
| July 15 | Canopus first commit `9d95924f27842ceb14a45bb0ecaf5a777c3b2736` | Introduced the bounded research harness; no Canopus repository existed at the competition baseline. |
| July 16 | Canopus `v0.1.0` at `0c0e59bf025b93faca8e8078b098b5aee9c67078` | Bound exact missions, worker custody, artifact freezing, verifier separation, and released-Vela composition. |
| July 16 | Canopus `v0.2.0` at `ab01e6b4eebebb64cd3403962e1104d4b2d43bbb` | Shipped the authority-free mission loop with retained success and failure evidence. |
| July 17 | Canopus `v0.3.0` at `a25c97c4b92c6248d1f827ead6ab9522084728b8` | Added the installable `doctor`, `run`, `inspect`, `replay`, and `withdraw` product surface. |
| July 19 | Canopus `v0.4.3` at `f461a0d184f2076c4b451e524e5e949abdee621e` | Published the provenance-backed npm path and repaired clean-install usability. |
| July 20 | Sidon frontier result commit `4289e05876f142e72af622672e190be26f6a6f1d` | Retained the GPT-5.6-produced 7,194-point witness, verifier pass, Receipt, Defer proposal, and accepted delta zero. |
| July 20 | Canopus `v0.4.6` at `ad72a7aca63aaa6c060f840020cca6871e4a9f11` | Added the successful GPT-5.6 Sidon profile and bounded workspace-backed artifact handoff. |
| July 20 | Canopus `v0.5.0` at `25523ccb558f81db95c01b48b83616ed3ab05b35` | Added stage-typed run evidence and retry-safe Vela composition without adding an authority path. |
| July 20 | Sidon independent-audit commit `825657d7e87618c0aa6fc9af7e3182e05f324750` | Added a separate base-3 verifier and a deterministic collision-injection rejection probe. |
| July 21 | Canopus `v0.6.1` at `b98c846d61d4c554e43388107bcce77c51307db5` | Froze the final npm package, public projection, proposal-scoped replay, and corrected judge path. |
| July 21 | Vela `v0.912.0` at `bb6774b6a65ecc5615e17ddf574c3efd893e0e44` | Bound the final Build Week composition while leaving Receipt, policy, replay, and human-authority semantics intact. |
| July 21 | Observatory `v0.340.6` at `7483ab20c0d2878f3d50a76ed1bca9969f7dd5f5` | Deployed the anonymous run detail and `/build-week` route with an exact evidence manifest. |
| July 21 | Canopus documentation at `4cae162bc37538e9ff1add0ef42861804ff86a62` | Corrected the public commands to select and reproduce the pending witness rather than only retained canonical witnesses. |

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

The immutable `0.4.6` Receipt preserves the worker's pre-verifier handoff
caveat that separate verification remained pending, alongside the rooted final
verifier evidence. We do not rewrite that historical record. Canopus fixed
post-verifier caveat finalization in commit
`58aad1e5806e7f3c192214e65f8968e03e2cff87` and shipped it from `0.5.1`
onward; the public projection derives standing caveats from the final run
observations and therefore reports the recorded verifier pass.

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
stopped before Receipt creation or frontier mutation. The rejected verifier
result is bound at
`sha256:04e31b07889f94a1d205231942bf30fa6c3b27864520b6a42de58604da53e544`.

## Reproduce without rebuilding Canopus

The pending primary artifact needs released Vela and the public frontier. The
audit commit adds an independent implementation without changing the retained
Receipt, proposal, or accepted state:

```bash
git clone https://github.com/vela-science/sidon-frontier.git
cd sidon-frontier
git checkout 825657d7e87618c0aa6fc9af7e3182e05f324750
vela reproduce artifacts/sidon-a24-gpt56-7194.witness.json
node verification/verify-sidon-a24-7194.mjs \
  artifacts/sidon-a24-gpt56-7194.witness.json
```

`vela reproduce .` remains the whole-frontier canonical-witness check, but it
must not be presented as verification of this still-pending proposal. The
artifact-specific command above is the exact pending-result path.

Inspect the packaged product under Node 22 or 24:

```bash
npm install --global @vela-science/canopus@0.6.1
canopus --version
canopus profile validate sidon-a24-at-least-7194-gpt56-v3
```

Supported tool-using worker platforms are macOS arm64 and Linux x86-64,
including WSL2. Native Windows retains the read-only doctor, inspect, and
replay surface and directs tool-using work into WSL2.

## Codex collaboration and human decisions

Codex implemented and tested Canopus, its custody profiles, verifier routing,
release automation, Vela 0.912.0 compatibility, public projection, and
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

## Licensing and third-party boundary

Canopus is dual-licensed Apache-2.0 OR MIT. Its runtime npm dependency set is
empty. Bundled verifier capsules and separately supplied development or host
tools are documented in [`THIRD_PARTY.md`](THIRD_PARTY.md); those tools do not
receive scientific decision authority through Canopus.
