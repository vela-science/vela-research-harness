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
pnpm install --frozen-lockfile
pnpm verify
```

The encoded outputs are intentionally ignored by Git:

- `out/canopus-build-week.mp4`
- `out/render-report.json`

The generated SRT, evidence projection, narration fallback, and public capture
manifest are committed so their bindings remain reviewable.

Use `pnpm dev` for a Remotion Studio preview. Evidence and captions can be
regenerated independently with `pnpm evidence` and `pnpm captions`.

## Evidence boundary

`scripts/generate-evidence.mjs` reads only public, committed Canopus evidence.
The film contains a sanitized structural projection of genuine GPT-5.6 worker
events, exact frozen-verifier output, a public Canopus run projection, and a
public Observatory capture. It never imports a raw run directory, isolated
home, authentication, unrestricted log, or human key.

The film is deliberately explicit about the two different examples:

- the formal GPT-5.6 attempt produced a candidate and failed the Lean verifier;
- the retained GPT-5.4 computation passed its verifier and was routed to Defer,
  with accepted-state delta zero;
- GPT-5.6 separately performed a claim-fidelity assessment that was not landed
  as scientific state.

The narration WAV is a precisely timed production fallback. A natural human
read can replace it without changing the composition if it preserves the
script timings. Visual QA is performed in Remotion Studio with the Codex Chrome
integration and against stills decoded from the final MP4.
