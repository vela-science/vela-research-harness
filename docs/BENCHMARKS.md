# Canopus benchmarks

The first benchmark is deliberately small: one paired internal-agent proxy,
one run per arm, and at most two model calls. Both prompts are rendered from
the same registered facts. The baseline receives unordered raw records. The
treatment receives the same facts organized as inherited Vela state.

The task tests a concrete failure mode: branching a substantive child from a
stronger but merely pending result, or from a failed verifier route, instead of
the current accepted base. Metrics include rubric defects, review items,
dead-route selection, downstream reuse, token counts, response bytes, and wall
time.

Registration lives at `benchmarks/registration/v0.json`. It pins the facts,
answer schema, runner, Codex CLI/model request, limits, rubric, and decision
rule before a model is called. Results use no external-gate credit and make no
causal claim at n=1. A tie is `no_advantage`, not evidence for more protocol.

Two zero-call preflights found and corrected release-boundary defects before
execution: the native Codex runtime needed thread creation inside the outer
Seatbelt profile, and the package needed to include the exact registered runner
source. The registration records the resulting implementation commit. Neither
preflight reached the provider, and neither changed the benchmark information,
arms, model, budgets, rubric, or decision rule.

Dollar pricing is unavailable on the Codex subscription surface used here, so
the report preserves exact token counts rather than inventing a dollar value.
The harness does not use the available Anthropic balance for this initial
probe.
