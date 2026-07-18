# ADR 0007: Policy-bound profile and result contracts

- Status: Proposed
- Candidate target: Canopus `v0.5.0`
- Dependency: Vela ADR 0013 entry gate

## Context

Canopus profiles already bind execution and verification evidence for replay,
but Vela policy v0.1 cannot necessarily distinguish the intended profile from
another computational verifier with the same assurance class. Canopus must not
solve that by becoming a policy or authority service.

## Candidate decision

If Vela ADR 0013 is accepted, Canopus profile v2 emits the exact
`vela.execution-binding.v1` Receipt extension from its already-frozen packet,
profile, capsule, and result-contract roots. It reports the expected Vela route
before landing and verifies the retained policy context and decision
certificate afterward.

Canopus cannot author, sign, activate, rotate, revoke, or approve a Vela policy.
It may prepare the exact read-only policy plan for inspection. The human alone
approves the protected card. A policy mismatch, missing binding, unexpected
Permit, or unexpected accepted-state delta stops the run.

If ADR 0013 is rejected as unnecessary, this ADR records No Change and Canopus
0.5 uses the released v0.1 route without inventing a parallel binding format.

## Release gate

The release requires the hostile wrong-profile and wrong-target vectors, one
real positive Sidon witness or an honest Deferred/null outcome, exact Receipt
and policy replay, and unchanged behavior for every Canopus 0.3/0.4 run record.
