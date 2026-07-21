# Final render QA

The OpenAI Build Week product-first master was rendered from the Remotion
project over source base commit `fbcbd2fa47706703eb03b1f26e2c19f542bd6bed`
with Remotion `4.0.495`.
The release package is local-only; no video or gallery asset has been uploaded.

## Encoded master

- Composition: `CanopusBuildWeek`
- Duration: `166.266667` seconds (`2:46.267`)
- Picture: H.264, 1920×1080, 30 fps, 4,988 frames, YouTube-compatible
  4:2:0 pixel format
- Sound: AAC, 48 kHz, stereo, `166.250667` seconds
- Audio/video duration delta: `0.016` seconds
- Audio check: mean `-18.6 dB`, peak `-3.7 dB`
- File size: `78,729,491` bytes
- MP4 SHA-256:
  `0f91243b3aef300577adf016dd6124c0b8a0e3b91f4081c56f0c8fd7a5fa4d88`
- SRT SHA-256:
  `732190f8bd498d470222b78e539f6493c50cca24b5ac24760c7ea2637110f754`

`bun run verify:render` reproduces the codec, dimensions, frame-rate,
frame-count, duration, and sync checks and writes `out/render-report.json`.
`bun run package:release` builds the local upload package and its checksummed
manifest under `out/release/`.

## Content and visual review

- Roughly 71% of the runtime is authentic public product footage captured in
  Chrome rather than presentation slides.
- The public Vela homepage, Canopus GitHub repository, exact GPT-5.6 profile,
  retained artifact, independent verifier, npm package, Build Week ledger, and
  live Observatory run are all shown directly.
- Capture URLs, viewport, cropping disclosure, and SHA-256 roots are bound in
  `public/captures/product-demo/manifest.json`; an automated test recomputes
  every capture hash.
- The film opens on the genuine GPT-5.6 Sidon result: the bounded `a(24)`
  construction advances from 7,193 to 7,194.
- The worker's exact replacement is shown: remove baseline point 72 and add
  hexadecimal points `970f25` and `246891`.
- The frozen verifier reports all 25,880,415 unordered componentwise pair sums
  checked with zero collisions.
- The independent audit, public run identity, Receipt-bound Defer route, and
  accepted-state delta zero are all represented separately.
- A formal Lean example demonstrates fail-closed behavior without implying that
  the failed candidate produced a Receipt, proposal, route, or state mutation.
- Canopus `0.6.2`, trusted publishing, SLSA provenance, the current Vela and
  Observatory versions, and the clean-clone reproduction path are included.
- No authentication, private run home, unrestricted log, human key, feedback
  Session ID, or private absolute path appears in generated public surfaces.
- Burned-in captions and the standalone 54-cue SRT end before the 2:46.27
  composition boundary.
- A ten-frame encoded contact sheet plus full-resolution mission, verifier,
  Observatory, thumbnail, and end-card frames were inspected after rendering.

The committed Samantha narration is a precisely timed production track with
English voiceover. It can be replaced by a human read later without changing
the evidence, scene timing, or caption contract.
