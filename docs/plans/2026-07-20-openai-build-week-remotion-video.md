# OpenAI Build Week Remotion Video Implementation Plan

> **Status: Completed historical implementation record.** The film and its
> evidence were completed during OpenAI Build Week. Commands, versions, routes,
> and production notes below describe that dated build; they are not current
> Canopus product guidance. Current usage starts in the repository README and
> `docs/MISSIONS.md`.

**Goal:** Produce a polished, truthful, public 1920x1080 Remotion film for the OpenAI Build Week submission, with English voiceover and burned-in captions, in 2:46.27 or less.

**Architecture:** Add a self-contained `video/` Remotion application inside the Canopus repository. It reads only sanitized repository evidence and vendored public visual assets, renders ten frame-addressed scenes under one deterministic timeline, and never imports a private run directory or live secret. The Canopus npm package remains unchanged because its existing `files` allowlist excludes `video/`.

**Tech Stack:** Remotion 4.0.495, React, TypeScript, `@remotion/media`, `@remotion/captions`, `@remotion/fonts`, `@remotion/transitions`, Vitest, pnpm 10.33.0, FFmpeg/ffprobe, Browser or Chrome for visual QA.

---

## Locked production decisions

- Execute on the existing `main` branch. Do not create a feature branch or a second worktree.
- Keep the current 166.245-second Samantha narration as the timing-safe scratch track. Replace it with a natural human read before final upload if a clean take can stay within the locked chapter timings.
- Use 1920x1080, 30 fps, and 4,988 frames. Total duration is 166.267 seconds, leaving 13.733 seconds below the three-minute limit.
- Burn captions into the image and also ship a matching `.srt` for YouTube.
- Pin every Remotion package to exactly `4.0.495`; mixed Remotion versions are not permitted.
- Use Vela's approved palette and self-hosted fonts: Newsreader for editorial statements, Inter for product copy, and IBM Plex Mono for roots and terminal evidence.
- Use the stable deployed Vela brand source at `vela-web` commit `2c8f0db4e89f4af0406389d0c5d6197fa8ab8dfc`, not the dirty shared worktree's uncommitted state.
- Use a restrained editorial-scientific visual system. No gradients, glow, stock star fields, fake terminal activity, bouncing spring motion, or generic AI imagery.
- The persistent visual metaphor is an authority line. It may carry evidence through the chain, but it must stop at `Defer`; it never crosses into acceptance.
- The formal GPT-5.6 attempt is shown as a fail-closed case. The successful retained run is labeled GPT-5.4. The GPT-5.6 claim-fidelity audit is shown separately as `model_assessment` and not scientific state.
- Do not publish the raw Canopus run directory, private paths, prompt content, auth material, `/feedback` Session ID, or unrestricted logs.
- Use Browser or Chrome for all rendered visual QA and public-page capture. Do not use standalone Playwright.

## Exact timeline

| Scene | Frames | Time | Narrative job |
|---|---:|---:|---|
| `OutcomeColdOpen` | 0-359 | 0:00.000-0:12.000 | Worker success, verifier pass, Defer, accepted delta zero |
| `AuthorityBoundary` | 360-833 | 0:12.000-0:27.800 | Explain separation of worker, verifier, Vela, and human authority |
| `MissionRegistration` | 834-1619 | 0:27.800-0:54.000 | Bind GPT-5.6, target, capsule, forbidden constructs, and custody preflight |
| `WorkerStream` | 1620-2075 | 0:54.000-1:09.200 | Animate the sanitized genuine worker event structure |
| `VerifierFailClosed` | 2076-2645 | 1:09.200-1:28.200 | Show the exact Lean failure and the absence of landing |
| `RetainedSuccess` | 2646-3386 | 1:28.200-1:52.900 | Show the verified GPT-5.4 retained run and Defer route |
| `FidelityAudit` | 3387-3968 | 1:52.900-2:12.300 | Separate deterministic checks from GPT-5.6 model assessment |
| `ReleaseIdentity` | 3969-4268 | 2:12.300-2:22.300 | Show Canopus 0.4.5 provenance and byte-identical release assets |
| `Reproduction` | 4269-4481 | 2:22.300-2:29.400 | Show the no-rebuild judge path |
| `CodexBuildDelta` | 4482-4987 | 2:29.400-2:46.267 | Show Build Week delta and close on the core message |

All chapter boundaries are authoritative. Scene-local motion must fit within them. Use 8-12 frame dissolves or masked line wipes inside the scene boundaries; do not overlap scenes in a way that changes the global frame ledger.

## Task 1: Scaffold the isolated Remotion application

**Files:**
- Create: `video/package.json`
- Create: `video/pnpm-lock.yaml`
- Create: `video/tsconfig.json`
- Create: `video/remotion.config.ts`
- Create: `video/src/index.ts`
- Create: `video/src/Root.tsx`
- Modify: `.gitignore`

**Step 1: Record the repository baseline**

Run:

```bash
git status --short --branch
git rev-parse HEAD
```

Expected: clean `main`, equal to `origin/main`, at or after `52373288d1e8cd163a29a4c3022d501c85800dbd`.

**Step 2: Scaffold a blank nested project**

Run from the repository root:

```bash
pnpm dlx create-video@latest --yes --blank video
cd video
pnpm add -E remotion@4.0.495 @remotion/cli@4.0.495
pnpm remotion add @remotion/media @remotion/captions @remotion/fonts @remotion/transitions
pnpm add -D vitest
```

Expected: `video/pnpm-lock.yaml` exists and every `remotion` or `@remotion/*` package resolves to `4.0.495`.

**Step 3: Add deterministic scripts**

Set `video/package.json` scripts to:

```json
{
  "scripts": {
    "dev": "remotion studio src/index.ts",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "evidence": "node scripts/generate-evidence.mjs",
    "stills": "node scripts/render-stills.mjs",
    "render": "remotion render src/index.ts CanopusBuildWeek out/canopus-build-week.mp4 --codec=h264 --crf=18 --pixel-format=yuv420p --audio-codec=aac --audio-bitrate=192k --overwrite",
    "verify:render": "node scripts/verify-render.mjs",
    "verify": "pnpm evidence && pnpm typecheck && pnpm test && pnpm stills && pnpm render && pnpm verify:render"
  }
}
```

**Step 4: Register one composition**

Use this exact composition surface in `video/src/Root.tsx`:

```tsx
import {Composition} from 'remotion';
import {CanopusBuildWeek} from './CanopusBuildWeek';
import {FPS, HEIGHT, TOTAL_FRAMES, WIDTH} from './timing';

export const RemotionRoot = () => (
  <Composition
    id="CanopusBuildWeek"
    component={CanopusBuildWeek}
    durationInFrames={TOTAL_FRAMES}
    fps={FPS}
    width={WIDTH}
    height={HEIGHT}
  />
);
```

**Step 5: Verify the empty composition**

Run:

```bash
pnpm typecheck
pnpm remotion compositions src/index.ts
```

Expected: one `CanopusBuildWeek` composition at 1920x1080, 30 fps, 4,988 frames.

**Step 6: Commit**

```bash
git add video .gitignore
git commit -m "build(video): scaffold Build Week Remotion film"
```

## Task 2: Vendor the stable Vela visual system

**Files:**
- Create: `video/public/fonts/inter-300-700-latin.woff2`
- Create: `video/public/fonts/ibm-plex-mono-400-latin.woff2`
- Create: `video/public/fonts/ibm-plex-mono-500-latin.woff2`
- Create: `video/public/fonts/newsreader-display-500-latin.woff2`
- Create: `video/public/brand/vela-mark-full.svg`
- Create: `video/public/brand/FONT-WEB-MANIFEST.sha256`
- Create: `video/src/design/tokens.ts`
- Create: `video/src/design/fonts.ts`
- Test: `video/src/design/tokens.test.ts`

**Step 1: Copy only stable public assets**

Read each asset with `git show 2c8f0db4e89f4af0406389d0c5d6197fa8ab8dfc:<path>` from `vela-web`, then place it under `video/public`. Do not copy from the shared worktree without verifying the blob against that commit.

**Step 2: Define the palette**

`video/src/design/tokens.ts` must expose:

```ts
export const colors = {
  midnight: '#081224',
  stardust: '#C9A664',
  light: '#F7F6F2',
  deepSpace: '#111827',
  slate: '#334155',
  mist: '#A1A7B0',
  fog: '#E9EBEF',
  evidence: '#4F8F8B',
  progress: '#6E9F77',
  caution: '#B7832F',
  conflict: '#9C3F4A',
  darkConflict: '#D97783',
  darkBorder: '#263247',
} as const;
```

**Step 3: Load fonts locally**

Use `loadFont()` from `@remotion/fonts` and `staticFile()`. No render may depend on Google Fonts or another network request.

**Step 4: Write the token test**

Assert the three primary brand values, all semantic colors, and the exact font-family names. The test must fail if a token drifts from the stable Vela source.

**Step 5: Verify and commit**

```bash
pnpm typecheck
pnpm test
git add video/public/brand video/public/fonts video/src/design
git commit -m "feat(video): vendor stable Vela film identity"
```

## Task 3: Generate a sanitized evidence manifest

**Files:**
- Create: `video/scripts/generate-evidence.mjs`
- Create: `video/src/data/evidence.generated.json`
- Create: `video/src/data/evidence.ts`
- Create: `video/src/data/evidence.test.ts`
- Create: `video/src/data/privacy.test.ts`

**Step 1: Declare repository-only inputs**

The generator may read only:

```text
package.json
BUILD_WEEK.md
profiles/formal-erdos-505-test-dim-one-gpt56.json
missions/formal-erdos-505-test-dim-one-gpt56/mission.draft.json
evidence/build-week/run_eb6bcd46-cffd-4ae8-b630-2681bd84da71.public.json
advisories/erdos1056-claim-fidelity/results/assessment.json
advisories/erdos1056-claim-fidelity/results/verification.json
```

It must reject any input path containing `.canopus`, `/Users/`, `isolated-home`, `auth`, or `credentials`.

**Step 2: Generate the film facts**

The generated JSON must include:

- product version `0.4.5`;
- formal profile name, `gpt-5.6-sol`, profile root, mission root, frozen Lean 4.27.0, expected `defer`, accepted delta `0`;
- formal attempt ID `run_4c2ba5f5-04ac-44d5-adb6-8937eb2ea165`;
- formal candidate root `sha256:ef81cbf548d8a08e3811f0aa070b6ce0d58b52792f0bb56b5584dd806da4cb30`;
- formal verifier root `sha256:04e31b07889f94a1d205231942bf30fa6c3b27864520b6a42de58604da53e544`;
- formal outcome `worker: success`, `verifier: failed`, `landing_observed: false`;
- retained run ID, GPT-5.4 model identity, claim, artifact roots, verifier root, Receipt root, route, accepted delta, source commit, final commit, and reproduction commands from `canopus.public-run.v1`;
- GPT-5.6 assessment classification, numeric correspondences, language flags, accepted delta, and non-authoritative standing from the advisory files.

The generator must verify that the formal run ID and roots occur in `BUILD_WEEK.md`; it must stop if the public memo and film facts diverge.

**Step 3: Add evidence tests**

Tests must assert:

```ts
expect(evidence.formal.model).toBe('gpt-5.6-sol');
expect(evidence.formal.worker).toBe('success');
expect(evidence.formal.verifier).toBe('failed');
expect(evidence.formal.landingObserved).toBe(false);
expect(evidence.retained.model).toBe('gpt-5.4');
expect(evidence.retained.route).toBe('defer');
expect(evidence.retained.acceptedStateDelta).toBe(0);
expect(evidence.audit.classification).toBe('model_assessment');
```

**Step 4: Add the privacy test**

Scan `video/src`, `video/public`, and the generated manifest for:

```text
/Users/
.canopus/runs
OPENAI_API_KEY
GITHUB_TOKEN
Bearer 
sk-
isolated-home
```

Expected: zero matches. Do not scan binary fonts as UTF-8.

**Step 5: Run and commit**

```bash
pnpm evidence
pnpm test
git add video/scripts/generate-evidence.mjs video/src/data
git commit -m "feat(video): bind film to sanitized Build Week evidence"
```

## Task 4: Lock the timeline, narration, and captions contract

**Files:**
- Create: `video/src/timing.ts`
- Create: `video/src/timing.test.ts`
- Create: `video/src/data/script.ts`
- Create: `video/public/audio/narration.wav`
- Create: `video/public/captions/canopus-build-week.srt`
- Create: `video/src/captions/CaptionTrack.tsx`
- Test: `video/src/captions/captions.test.ts`

**Step 1: Define integer frame boundaries**

`video/src/timing.ts` must define `FPS = 30`, `TOTAL_FRAMES = 4988`, and the exact ten ranges in the timeline table above. Export a `secondsToFrames()` helper that rounds only at declaration time.

**Step 2: Test the ledger**

Assert:

- first scene starts at frame 0;
- every scene starts exactly one frame after the prior scene ends;
- no gap or overlap exists;
- final scene ends at frame 4,987;
- total duration is less than 180 seconds;
- all caption cues end at or before frame 4,987.

**Step 3: Prepare the scratch narration**

Set a local task-specific environment variable to the private source-asset directory, then convert the existing AIFF without recording its private path in Git:

```bash
ffmpeg -y -i "$CANOPUS_VIDEO_SOURCE_DIR/openai-build-week-voiceover-final.aiff" \
  -ar 48000 -ac 1 -c:a pcm_s24le video/public/audio/narration.wav
```

Expected duration: 166.245 seconds, within 0.05 seconds.

**Step 4: Author sentence-level SRT cues**

Use the nine locked narration paragraphs and scene boundaries. Keep each cue to at most two lines and roughly 42 characters per line. Do not paraphrase scientific claims in captions.

**Step 5: Parse captions with the current API**

Use `parseSrt()` from `@remotion/captions`, `staticFile()`, and `useDelayRender()`. Render captions in the bottom 12% safe zone with a translucent midnight backing, 44px Inter, and no more than two lines.

**Step 6: Commit**

```bash
pnpm typecheck
pnpm test
git add video/src/timing.ts video/src/timing.test.ts video/src/data/script.ts video/src/captions video/public/audio video/public/captions
git commit -m "feat(video): lock narration timeline and captions"
```

## Task 5: Build the motion-design primitives

**Files:**
- Create: `video/src/components/Scene.tsx`
- Create: `video/src/components/AuthorityLine.tsx`
- Create: `video/src/components/EvidenceNode.tsx`
- Create: `video/src/components/RootText.tsx`
- Create: `video/src/components/StatusPill.tsx`
- Create: `video/src/components/Terminal.tsx`
- Create: `video/src/components/EditorialTitle.tsx`
- Create: `video/src/components/BrowserFrame.tsx`
- Create: `video/src/components/FilmGrain.tsx`
- Create: `video/src/motion.ts`
- Test: `video/src/motion.test.ts`

**Step 1: Implement deterministic motion helpers**

Use `interpolate()` with clamped extrapolation and `spring()` with damping at least 180. Expose only `fadeUp`, `lineProgress`, `revealText`, and `sceneOpacity`. No component should call `Math.random()`.

**Step 2: Implement the authority line**

The line is 2px stardust on midnight and slate on light. It carries a moving evidence marker. In a verifier-failure state it ends in conflict red before the Receipt node. In a successful state it ends at `Defer`. It never renders an `Accept` node.

**Step 3: Implement typographic roles**

- Editorial title: Newsreader, 82-104px, maximum 14 words.
- Product/body copy: Inter, 30-42px.
- Roots and commands: IBM Plex Mono, 24-30px.
- Labels: uppercase Inter, 18-22px, letter spacing 0.08em.

**Step 4: Implement restrained texture**

`FilmGrain` may use a deterministic SVG turbulence layer at 1.5-2.5% opacity. No star field, bloom, or gradient is allowed.

**Step 5: Render primitive stills and commit**

Render a dark frame and a light frame. Verify type is sharp, roots remain legible at 1080p, and contrast is at least 4.5:1.

```bash
git add video/src/components video/src/motion.ts video/src/motion.test.ts
git commit -m "feat(video): add Vela evidence motion system"
```

## Task 6: Build the cold open and authority boundary

**Files:**
- Create: `video/src/scenes/OutcomeColdOpen.tsx`
- Create: `video/src/scenes/AuthorityBoundary.tsx`
- Test: `video/src/scenes/opening.test.tsx`

**Step 1: Cold-open on the four-state result**

At frame 0 show only:

```text
worker      success
verifier    pass
route       defer
accepted Δ  0
```

Reveal one row every 24 frames. At frame 180, contract the rows into the line `An agent completed bounded work. It did not declare truth.`

**Step 2: Explain the boundary collapse**

Show a single blended `agent → answer` block, then split it into four columns: `Codex / verifier / Vela / human`. The first three receive precise verbs. The human column remains beyond a visible custody boundary.

**Step 3: Test the nonclaim**

Assert the opening scene contains `defer` and `accepted Δ 0`, and contains neither `accepted` as a verdict nor `solved`.

**Step 4: Render frames 0, 180, 359, 600, and 833**

Inspect them in Chrome at 1920x1080. No text may enter the caption safe zone.

**Step 5: Commit**

```bash
git add video/src/scenes/OutcomeColdOpen.tsx video/src/scenes/AuthorityBoundary.tsx video/src/scenes/opening.test.tsx
git commit -m "feat(video): open on bounded authority separation"
```

## Task 7: Build the GPT-5.6 mission and genuine worker stream

**Files:**
- Create: `video/src/scenes/MissionRegistration.tsx`
- Create: `video/src/scenes/WorkerStream.tsx`
- Create: `video/src/components/CustodyPreflight.tsx`
- Test: `video/src/scenes/formal-attempt.test.tsx`

**Step 1: Animate the mission registration**

Reveal the exact fields in this order: target, model, artifact, frozen verifier, forbidden constructs, expected route, accepted-state limit. Keep the model string exactly `gpt-5.6-sol`.

**Step 2: Show custody preflight**

Animate checks for Codex, Git, Docker, Vela, frontier, and sandbox. Use evidence teal for verified boundaries; do not use celebratory green.

**Step 3: Animate structural worker activity**

Render only event names and sequence numbers from the sanitized nine-event projection. Do not render prompts, model prose, raw logs, auth, or paths. Put the source-event root in a fixed footer and animate the chain marker through the events.

**Step 4: Test identity and privacy**

Assert the scene includes `gpt-5.6-sol`, the exact target, `one proof term`, and `Defer`; assert it does not contain a private path or `OPENAI_API_KEY`.

**Step 5: Commit**

```bash
git add video/src/scenes/MissionRegistration.tsx video/src/scenes/WorkerStream.tsx video/src/components/CustodyPreflight.tsx video/src/scenes/formal-attempt.test.tsx
git commit -m "feat(video): animate GPT-5.6 mission and worker custody"
```

## Task 8: Build the fail-closed Lean verifier scene

**Files:**
- Create: `video/src/scenes/VerifierFailClosed.tsx`
- Test: `video/src/scenes/verifier-failure.test.tsx`

**Step 1: Render the exact failure**

Use the retained verifier lines:

```text
error: unsolved goals
⊢ EuclideanSpace.single 0 (x.ofLp 0) = x
depends on axioms: [propext, sorryAx, Classical.choice, Quot.sound]
verifier: failed · exit code 1
```

**Step 2: Stop the authority line**

The evidence marker reaches `Lean verifier`, turns conflict red, and stops. Fade in these absent downstream states:

```text
Receipt          not produced
proposal         not created
route            not reached
frontier commit  unchanged
accepted Δ       0
```

**Step 3: Bind the displayed output**

Show verifier root `sha256:04e31b...53e544` and the label `exact frozen replay`. Do not show a filesystem location.

**Step 4: Test the stop condition**

Assert `landing_observed` is false and the scene never renders `pass` for this attempt.

**Step 5: Commit**

```bash
git add video/src/scenes/VerifierFailClosed.tsx video/src/scenes/verifier-failure.test.tsx
git commit -m "feat(video): show the formal attempt failing closed"
```

## Task 9: Build the retained success and GPT-5.6 audit scenes

**Files:**
- Create: `video/src/scenes/RetainedSuccess.tsx`
- Create: `video/src/scenes/FidelityAudit.tsx`
- Create: `video/src/components/EvidenceChain.tsx`
- Test: `video/src/scenes/retained-evidence.test.tsx`

**Step 1: Build the six-node retained chain**

Animate:

```text
Mission → GPT-5.4 worker → artifact → verifier → Vela Receipt → Defer
```

Keep `GPT-5.4` above the fold for the entire scene. End on `clean-clone replay: matched` and `accepted Δ 0`.

**Step 2: Show the bounded claim and caveat together**

The claim must remain in its exact registered range. Place `This bounded result does not solve the general Erdős problem` directly beneath it.

**Step 3: Split deterministic and semantic audit columns**

Left column: source run, five roots, numeric correspondences, and verifier/acceptance distinction. Right column: universal-language check and publishability recommendation, both labeled `model_assessment`.

**Step 4: Test the evidence distinction**

Assert the retained worker is GPT-5.4, the audit model is GPT-5.6, the policy route is `defer`, and the audit is not landed as scientific state.

**Step 5: Commit**

```bash
git add video/src/scenes/RetainedSuccess.tsx video/src/scenes/FidelityAudit.tsx video/src/components/EvidenceChain.tsx video/src/scenes/retained-evidence.test.tsx
git commit -m "feat(video): separate retained evidence from GPT-5.6 assessment"
```

## Task 10: Build release, reproduction, and final Build Week delta

**Files:**
- Create: `video/src/scenes/ReleaseIdentity.tsx`
- Create: `video/src/scenes/Reproduction.tsx`
- Create: `video/src/scenes/CodexBuildDelta.tsx`
- Test: `video/src/scenes/closing.test.tsx`

**Step 1: Show release identity**

Render `@vela-science/canopus@0.4.5`, trusted publishing, npm shasum, package SHA-256, and `npm tarball == GitHub tarball`. Use a restrained equality animation, not a celebration.

**Step 2: Show the no-rebuild judge path**

Display:

```bash
npx -p @vela-science/canopus@0.4.5 canopus --version
git checkout 807f0a8f770cfed05ac0dff00b952dc41052a720
vela reproduce .
```

The commands must remain on screen long enough to pause and read.

**Step 3: Close on the Build Week delta**

Animate a compact ledger of what this Codex task built: GPT-5.6 profile, release, public projection, advisory audit, Observatory evidence route, organization presentation, and submission package.

Final frame:

```text
Canopus: Bounded Research for Codex
Give Codex a mission. Verify the work. Keep humans in authority.
Let agents do the work without letting them declare truth.

github.com/vela-science/vela-research-harness
app.vela.space/build-week
```

Hold the final frame for at least 120 frames.

**Step 4: Test URL and version identity**

Assert both public URLs, package version `0.4.5`, and exact reproduction commit are present.

**Step 5: Commit**

```bash
git add video/src/scenes/ReleaseIdentity.tsx video/src/scenes/Reproduction.tsx video/src/scenes/CodexBuildDelta.tsx video/src/scenes/closing.test.tsx
git commit -m "feat(video): close on reproducible Build Week evidence"
```

## Task 11: Assemble the composition

**Files:**
- Create: `video/src/CanopusBuildWeek.tsx`
- Modify: `video/src/Root.tsx`
- Test: `video/src/CanopusBuildWeek.test.tsx`

**Step 1: Mount scenes by absolute frame**

Use `Sequence` with values from `timing.ts`; do not duplicate numeric frame literals in scene files.

**Step 2: Add narration and captions once**

At composition root:

```tsx
<Audio src={staticFile('audio/narration.wav')} />
<CaptionTrack src={staticFile('captions/canopus-build-week.srt')} />
```

Use `Audio` from `@remotion/media`, not the legacy HTML5 audio component.

**Step 3: Add global continuity**

Mount the authority line above scenes and below captions. Its state is derived only from the current frame and evidence facts.

**Step 4: Verify composition integrity**

Test that exactly ten scene sequences mount, total frames equal 4,988, and the audio and caption assets resolve through `staticFile()`.

**Step 5: Commit**

```bash
git add video/src/CanopusBuildWeek.tsx video/src/Root.tsx video/src/CanopusBuildWeek.test.tsx
git commit -m "feat(video): assemble the Canopus Build Week film"
```

## Task 12: Capture only the public browser surfaces needed by the film

**Files:**
- Create: `video/public/captures/build-week.png`
- Create: `video/public/captures/retained-run.png`
- Create: `video/public/captures/npm-release.png`
- Create: `video/public/captures/build-week-source.png`
- Create: `video/public/captures/manifest.json`

**Step 1: Open anonymous Browser or Chrome**

Capture at 1920x1080:

- `https://app.vela.space/build-week`
- `https://app.vela.space/frontiers/erdos/runs/run_eb6bcd46-cffd-4ae8-b630-2681bd84da71`
- `https://www.npmjs.com/package/@vela-science/canopus/v/0.4.5`
- `https://github.com/vela-science/vela-research-harness/blob/main/BUILD_WEEK.md`

**Step 2: Enforce capture hygiene**

Reject a capture if it contains an avatar menu, billing banner, notification count, private repository name, browser chrome, local path, or auth state. Do not crop away evidence labels merely to hide a defect; recapture anonymously.

**Step 3: Write the capture manifest**

For each image record URL, UTC timestamp, viewport, SHA-256, and source commit when applicable.

**Step 4: Integrate sparingly**

Use captures as depth layers inside `BrowserFrame`, with deliberate pan/zoom and callout overlays. Do not let a screenshot sit full-screen without authored motion.

**Step 5: Commit**

```bash
git add video/public/captures
git commit -m "chore(video): add sanitized public evidence captures"
```

## Task 13: Replace the scratch voice and lock captions

**Files:**
- Modify: `video/public/audio/narration.wav`
- Modify: `video/public/captions/canopus-build-week.srt`
- Modify: `video/src/data/script.ts`

**Step 1: Record the natural voiceover**

Record 48kHz mono WAV in a quiet room. Read the approved script, preserve model identities and nonclaims exactly, and target 2:45-2:50. A natural voice is preferred; the Samantha track remains the safe fallback.

**Step 2: Normalize conservatively**

Target approximately -16 LUFS integrated, true peak no higher than -1 dBTP, with no audible pumping. Do not add music unless it remains at least 18 dB below narration and survives a speech-intelligibility check; silence is preferred to decorative music.

**Step 3: Retiming rule**

If the take exceeds 2:50 or misses a chapter boundary by more than 0.5 seconds, rerecord. Do not time-stretch speech and do not extend the composition past 5,100 frames.

**Step 4: Retimestamp captions**

Align sentence cues to the final waveform. Keep exact spoken text, two-line maximum, and no cue shorter than 0.8 seconds unless required by a brief label.

**Step 5: Verify and commit**

```bash
ffprobe -v error -show_entries format=duration -of default=nw=1 video/public/audio/narration.wav
pnpm test
git add video/public/audio/narration.wav video/public/captions/canopus-build-week.srt video/src/data/script.ts
git commit -m "chore(video): lock final narration and captions"
```

## Task 14: Build automated render verification

**Files:**
- Create: `video/scripts/render-stills.mjs`
- Create: `video/scripts/verify-render.mjs`
- Create: `video/scripts/scan-public-assets.mjs`

**Step 1: Render exact QA frames**

Render frames:

```text
0, 180, 359, 600, 833, 1100, 1619, 1850, 2075,
2300, 2645, 3000, 3386, 3675, 3968, 4120, 4268,
4380, 4481, 4700, 4868, 4987
```

Save them under `video/out/stills/`; do not commit render output.

**Step 2: Verify the final container**

`verify-render.mjs` must run `ffprobe` and fail unless:

- codec is H.264;
- pixel format is `yuv420p`;
- width and height are 1920x1080;
- frame rate is 30/1;
- audio is AAC, mono or stereo;
- duration is between 165 and 170 seconds;
- total duration is under 180 seconds;
- audio duration reaches within 0.1 seconds of video duration.

**Step 3: Verify loudness**

Run FFmpeg `volumedetect` or `ebur128`. Fail on clipping or inaudible narration. Record mean/integrated loudness and peak in `video/out/render-report.json`.

**Step 4: Scan public assets**

Fail if any text file contains the privacy patterns from Task 3. Compute SHA-256 for the MP4, SRT, narration, generated evidence manifest, and capture manifest.

**Step 5: Run the full gate**

```bash
cd video
pnpm verify
```

Expected: typecheck, tests, 22 stills, final render, privacy scan, media probe, and hash report all pass.

**Step 6: Commit**

```bash
git add video/scripts
git commit -m "test(video): verify Build Week render and public assets"
```

## Task 15: Perform Chrome visual QA and final submission handoff

**Files:**
- Create: `video/QA.md`
- Update: `BUILD_WEEK.md`
- Update: `docs/RELEASES.md`
- Update: private submission checklist outside the repository

**Step 1: Open Remotion Studio**

```bash
cd video
pnpm dev
```

Use Browser or Chrome to open the local Studio. Do not use standalone Playwright.

**Step 2: Scrub every chapter boundary**

Inspect all 22 QA frames plus the 12 frames before and after each chapter boundary. Verify:

- no flash of unstyled content;
- no text collision or caption overlap;
- roots are legible at 1080p;
- the authority line stops on formal failure;
- GPT-5.4 and GPT-5.6 identities are never conflated;
- `Defer` and accepted delta zero remain visible in the successful chain;
- no `Accept`, `solved`, or universal scientific claim appears;
- no avatar, billing banner, private path, or auth state appears.

**Step 3: Watch the encoded MP4 twice**

First pass: normal playback with audio. Second pass: muted, to ensure the visual story is still intelligible. Then test on a laptop-width player and a phone-width YouTube preview for caption readability.

**Step 4: Record QA evidence**

In `video/QA.md`, record:

- final MP4 SHA-256 and duration;
- Remotion and Node versions;
- render commit;
- narration choice (`human` or `Samantha fallback`);
- caption file SHA-256;
- Chrome QA viewport and date;
- every requirement as pass/fail;
- known nonblocking limitations.

Do not place the `/feedback` Session ID in this file.

**Step 5: Publish only after a clean final gate**

Upload the exact verified MP4 to YouTube, set visibility to Public, add the SRT as English captions, and confirm the public player reports a duration under three minutes.

**Step 6: Update public and private submission records**

Public repository records may include the YouTube URL, video SHA-256, and render commit. Only the private submission checklist and Devpost may contain the `/feedback` Session ID.

**Step 7: Final commit and push**

```bash
git add video BUILD_WEEK.md docs/RELEASES.md
git commit -m "docs: publish Build Week film evidence"
git push origin main
```

Expected: repository clean, `HEAD == origin/main`, Canopus CI green, public video playable, captions visible, and the Devpost package ready for final human submission.

## Final acceptance checklist

- [ ] 1920x1080, H.264, yuv420p, 30 fps.
- [ ] Duration 2:45-2:50 and strictly under three minutes.
- [ ] English voiceover is clear; natural human voice preferred.
- [ ] Burned-in captions and matching YouTube SRT are present.
- [ ] Cold open shows worker success, verifier pass, Defer, accepted delta zero.
- [ ] Formal GPT-5.6 attempt is visibly fail-closed and never presented as retained success.
- [ ] Successful retained chain is visibly and repeatedly labeled GPT-5.4.
- [ ] GPT-5.6 audit is visibly labeled `model_assessment` and not scientific state.
- [ ] Mission, verifier, Receipt, policy, and human authority are visually separate.
- [ ] No private path, auth material, raw run log, prompt, or `/feedback` ID appears.
- [ ] No logged-in browser chrome, avatar, or billing banner appears.
- [ ] All displayed roots and numeric claims match sanitized repository evidence.
- [ ] npm package is 0.4.5 and release assets are described truthfully.
- [ ] Reproduction path uses public commit `807f0a8f770cfed05ac0dff00b952dc41052a720`.
- [ ] Final MP4, SRT, evidence manifest, and render commit are hash-bound in QA notes.
- [ ] Browser/Chrome QA passes at chapter boundaries and full playback.
- [ ] Public YouTube URL works anonymously and captions are selectable.

## Execution order and cutoff

Implement Tasks 1-12 with the Samantha scratch track first. At that point, render a complete candidate and make a go/no-go decision on natural narration. If a clean human take is not locked by July 21 at 2:00 p.m. Toronto, keep the verified Samantha track and prioritize a correct public upload, captions, `/feedback`, and Devpost submission. Stop aesthetic iteration at 4:30 p.m. Toronto. Target public YouTube and final Devpost fields by 6:00 p.m. Toronto, preserving the existing two-hour deadline buffer.
