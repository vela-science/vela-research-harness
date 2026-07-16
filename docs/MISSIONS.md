# Mission roles

Canopus v0 runs one explicit role per mission. The role changes the worker
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
