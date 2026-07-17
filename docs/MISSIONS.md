# Mission roles

Canopus Mission v0 runs one explicit role per mission. The role changes the worker
instruction, not the trust boundary:

- `producer` constructs the smallest candidate or preserves a null result;
- `adversary` seeks a concrete counterexample or narrows the claim;
- `verifier` checks correspondence between the candidate and declared tests,
  while the separate frozen executable remains the mechanical verifier;
- `fidelity` checks that prose claims do not outrun frozen artifacts and
  verifier facts.

A research loop may fan these into separate missions against the same exact
accepted roots. Each result lands its own Receipt and route. A repair mission
names an immutable parent candidate, but a substantive downstream mission may
inherit only state that Vela reports as accepted. Defer, a verifier pass, or a
Canopus candidate digest is not an inheritance edge.

This deliberately avoids a workflow DSL, agent society, or second graph. Git
stores the bytes, Vela stores authority and accepted lineage, and Canopus is
replaceable orchestration over those primitives.

## Proposed Mission v1

Mission v1 keeps the same four roles and authority boundary while adding a
tool-enabled local worker. `mission prepare` selects the first ranked attack,
derives the clean Git and Vela roots, registers the complete pre-existing
strict blocker set, and copies the exact packet, structured-output schema, and
verifier capsule into a portable bundle. The worker image, Codex binary, model,
resource ceilings, and every copied byte are hash-pinned.

Only a `success` draft with the declared artifact proceeds to the separate
network-denied verifier. `null` and `failed` drafts are preserved in
`engine-result.json` and stop before verification or Receipt landing. A passing
verifier may reach only Vela's `defer` route with accepted-event delta zero.

Mission v1 remains proposed and unreleased while the strict Docker profile and
Codex's nested Linux Bubblewrap sandbox cannot both execute shell tools and
preserve credential custody on the tested Docker Desktop runtime.
