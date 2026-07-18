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

## Mission v1

Mission v1 keeps the same four roles and authority boundary while adding a
tool-enabled local worker. `mission prepare` selects the first ranked attack,
derives the clean Git and Vela roots, registers the complete pre-existing
strict blocker set, and copies the exact packet, native permission profile,
structured-output schema, and verifier capsule into a portable bundle. The
Codex binary, model, verifier image, resource ceilings, and every copied byte
are hash-pinned.

The producer runs through the native Codex CLI under a default-deny platform
profile: Seatbelt on macOS and Codex's Bubblewrap sandbox on Linux or WSL2. The
writable workspace contains only the exact target packet; the full source
checkout, Vela home, host home, and authentication file remain outside
command-readable paths. Provider transport is available only to the Codex
process. Shell commands have no network access.

Only a `success` draft with the declared artifact proceeds to the separate
network-denied verifier. `null` and `failed` drafts are preserved in
`engine-result.json` and stop before verification or Receipt landing. After a
verifier pass, Canopus publishes exactly the frozen artifact sources in one
unsigned non-authoritative Git commit and then calls `vela land`.

Defer-only Mission v1 bundles preserve their original zero-delta behavior. A
profile may register `permit` only when it also freezes one closed positive
`canopus.result-contract.v1` and a `vela.execution-binding.v1` over the full
packet, profile, verifier-capsule, and result-contract roots. The worker result
must be an exact computational success, the verifier must pass, its claim is
replaced by the contract's exact canonical claim, and every required artifact
kind must be present before Canopus authors the binding through Vela's Receipt
builder. Any mismatch stops before landing. Vela alone evaluates the
already-signed policy; Canopus then requires the registered route and
accepted-event delta and reproduces the retained Receipt from a clean clone.
Canopus does not treat its own Receipt verifier row as load-bearing Vela
assurance.
