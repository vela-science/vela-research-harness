# Final render QA

The OpenAI Build Week master was rendered from source commit
`ab10a97280dd41debeeca152cdf2ab22962c4e96` with Remotion `4.0.495`.

## Encoded master

- Composition: `CanopusBuildWeek`
- Duration: `166.293333` seconds (`2:46.293` container duration)
- Picture: H.264, 1920×1080, 30 fps, 4,988 frames, YouTube-compatible
  4:2:0 pixel format
- Sound: AAC, 48 kHz, stereo container, `166.293333` seconds
- Audio/video duration delta: `0.026666` seconds
- Integrated check: mean `-16.1 dB`, peak `-1.8 dB`
- File size: `12,472,311` bytes
- MP4 SHA-256:
  `eb1570697afd57b79ffafb91ba829251c16d37bf048e1c191f571d4417683a10`
- SRT SHA-256:
  `4849a9887df828204506590cbff9f4cc75ed5f9f4f4e57345de12975126fa0df`

`pnpm verify:render` reproduces the codec, dimensions, frame-rate, frame-count,
duration, and sync checks and writes `out/render-report.json`.

## Content and visual review

- The film distinguishes the failed GPT-5.6 formal attempt from the retained
  GPT-5.4 verified computation at every relevant scene.
- The GPT-5.6 assessment is labeled `model_assessment` and never presented as
  scientific state.
- The failed proof stops before Receipt, proposal, route, commit, or frontier
  mutation.
- The successful chain ends at Defer with accepted-state delta zero.
- No authentication, private run home, unrestricted log, human key, or private
  absolute path appears in the source or rendered frames.
- Burned-in captions and the standalone 54-cue SRT remain inside the 2:46.27
  composition.
- A 12-frame decoded contact sheet plus full-resolution retained-run and
  end-card frames were inspected from the encoded MP4.
- The live Observatory capture was made through the Codex Chrome integration
  and its source binding is recorded in `public/captures/manifest.json`.

The committed Samantha narration is the precisely timed production fallback.
A natural human read remains the preferred final audio if one can be recorded
without changing the script timings.
