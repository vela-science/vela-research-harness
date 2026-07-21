# Canopus Build Week film

This Remotion project renders the public OpenAI Build Week film for **Canopus:
Bounded Research for Codex**. It tells one evidence-bound story: a model may do
the work, an independent verifier checks the artifact, Vela records and routes
the evidence, and protected scientific acceptance remains human-only.

The composition is 1920×1080, 30 fps, and 4,988 frames (2:46.27). Narration and
burned-in English captions are timed from the same structured script. The
standalone SRT is suitable for YouTube captions.

## Reproduce

From this directory:

```console
bun install --frozen-lockfile
bun run verify
```

The encoded outputs are intentionally ignored by Git:

- `out/canopus-build-week.mp4`
- `out/render-report.json`

The generated SRT, evidence projection, narration fallback, and public capture
manifest are committed so their bindings remain reviewable.

Use `bun run dev` for a Remotion Studio preview. Evidence, captions, and the
timed narration can be regenerated independently with `bun run evidence`,
`bun run captions`, and `bun run narration`.

## Evidence boundary

`scripts/generate-evidence.mjs` reads only public, committed Canopus evidence.
The film contains a sanitized structural projection of genuine GPT-5.6 worker
events, exact frozen-verifier output, a public Canopus run projection, and a
public Observatory capture. It never imports a raw run directory, isolated
home, authentication, unrestricted log, or human key.

The film follows one successful, end-to-end scientific result:

- GPT-5.6 improved the known construction for the bounded Sidon target
  `a(24)` from 7,193 to 7,194;
- the frozen verifier exhaustively checked all 25,880,415 unordered
  componentwise pair sums and found zero collisions;
- an independently authored verifier reproduced the result at a separately
  bound audit commit;
- Vela recorded the evidence and routed the proposal to Defer, leaving
  accepted-state delta at zero until a human decides.

A separate formal-proof example demonstrates fail-closed behavior: a Lean
candidate containing an unresolved goal never becomes a Receipt, proposal,
route, commit, or frontier mutation.

The narration WAV is a precisely timed production fallback. A natural human
read can replace it without changing the composition if it preserves the
script timings. Visual QA is performed in Remotion Studio with the Codex Chrome
integration and against stills decoded from the final MP4.
