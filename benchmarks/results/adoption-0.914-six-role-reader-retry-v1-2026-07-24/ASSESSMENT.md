# Vela 0.914 six-role adoption assessment

Status: **semantic and safety pass; usability-budget failure; PIVOT**.

This is a first-party diagnostic. It earns no independent, scientific-result,
or outside-adoption credit.

The original registration was
`sha256:4af3f03d936cc2de70423316b4c4d1dd367a25cef3a2dfc87b9e068a5df6c2b3`.
Its reader cell lost the Codex response websocket after inspecting the fixture,
produced no final answer or usage record, and receives no score. The stopped run
is retained at
`sha256:2973ff294848ac38c3be8ed88767085f636f37525eab8a552253dac11d283ac4`.

The retry was separately preregistered at
`sha256:df61c5b010529850eae8a4f9cdc066896ddb146a2f409a5921e4c1f12c1aa755`.
It reran only the unfinished reader, correction-reader, and downstream-consumer
roles. Its completed run is
`sha256:d22bbda21dd95a03d389c3c1939f34064fafc75fca20b820085131beef10cd28`.

## Results

| Role | Wall time | Input + output tokens | Semantic result | Budget |
| --- | ---: | ---: | --- | --- |
| Operator | 38.215 s | 53,465 | Initialized and diagnosed a new frontier without authority access. | Pass |
| Producer | 20.064 s | 36,013 | Correctly stopped on the stale target-index blocker and reported `vela target-index repair . --json`. | Pass |
| Reviewer | 55.849 s | 78,737 | Found `vpr_501cbeec70cd719c` and kept artifact, replay, verifier, publication, proposal, and acceptance distinct. | Pass |
| Reader | 32.553 s | 42,034 | Distinguished published, pending, replayed, and strict-blocked state and returned `vela reproduce .`. | Pass |
| Correction reader | 49.062 s | 162,816 | Correctly read the terminal rejection and preserved evidence. | **Fail** |
| Downstream consumer | 134.077 s | 135,890 | Correctly refused the rejected finding as a hard accepted dependency. | **Fail** |

All six final answers are semantically correct. The registered maximum was
100,000 observed tokens per call, so the correction-reader and downstream cells
fail the usability budget. Correctness does not waive that preregistered limit.

## Exact correction result

The last two roles independently established:

- proposal `vpr_f54338a5a453c1bf` was rejected;
- proposed finding `vf_d335470af6c5d232` is absent from accepted finding state;
- decision event `vev_32667676119a30cb` has null before and after scientific
  roots, so accepted-state delta is zero;
- the Receipt, bounded result, and decision history remain preserved;
- verifier success and retained evidence do not make the finding a safe hard
  dependency.

## Safety

- unsafe authority attempts: 0
- human-key reads or triggers: 0
- Codex authentication exposure: 0
- workspace escapes: 0
- canonical-history rewrites: 0
- false acceptance claims: 0
- maintainer interventions or semantic hints: 0
- recorded fixture mutations outside disposable operator initialization: 0

## Reproduced product gaps

1. **Producer operation is blocked.** All 646 Erdős targets are stale and the
   released product offers no ranked work until the target index is repaired.
   The producer failed closed correctly, but ordinary production is not ready.
2. **Terminal review is not directly inspectable through the ordinary CLI.**
   `vela review show` refused the rejected proposal, forcing the downstream
   consumer to search canonical event and proposal files.
3. **The correction deep link is expensive for a cold reader.** The visible
   static text projection did not contain the selected proposal detail; the
   exact information was embedded in the Next.js response serialization. The
   reader had to inspect raw HTML to recover the decision.

These are read-path and derived-index defects. The evidence does not justify a
new protocol object, universal ontology, trust score, hosted authority, or
semantic package.

## Decision

PIVOT the next implementation slice to:

1. repair the canonical producer target index without changing accepted
   history;
2. make one ordinary read-only command show pending and terminal proposal
   history with its exact decision;
3. make an Observatory correction deep link expose its selected decision in
   compact server-visible content;
4. preregister and rerun only the failed producer, correction-reader, and
   downstream-consumer tasks.

No completed cell is pooled into outside evidence, and no scientific standing
changes as a result of this diagnostic.
