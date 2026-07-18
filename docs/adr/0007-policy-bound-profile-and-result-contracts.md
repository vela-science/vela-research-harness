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

Vela ADR 0013 is accepted. Without introducing Mission v2, a closed Canopus
profile v2 may add one canonical `canopus.result-contract.v1` and register
`permit` with accepted-event delta one. Mission v1 then carries that contract
and the exact `vela.execution-binding.v1` Receipt extension derived from:

- the target packet's retained byte digest;
- the complete profile JSON byte digest;
- the staged verifier capsule's byte digest; and
- the canonical result-contract digest.

The result contract is deliberately positive and narrow: exact computational
replay, worker status `success`, verifier status `passed`, the exact target, an
exact canonical claim, and one or more required artifact kinds. Canopus replaces
model-authored claim prose with that registered claim after the verifier passes;
claim substitution therefore changes the result-contract root or stops before
landing. A null, failed, unverifiable, wrong-target, wrong-kind, wrong-profile,
wrong-packet, or wrong-capsule result also stops before landing. Historical and
ordinary profile v2 contracts remain Defer-only and do not gain these fields.

Canopus passes the four roots to Vela's existing Receipt authoring edge. It
does not handcraft Vela attestations, agent identity bindings, policy context,
or decision certificates. After landing, it verifies the retained binding,
the registered route and accepted-state delta, and a clean-clone replay.

Canopus cannot author, sign, activate, rotate, revoke, or approve a Vela policy.
It may prepare the exact read-only policy plan for inspection. The human alone
approves the protected card. A policy mismatch, missing binding, unexpected
Permit, or unexpected accepted-state delta stops the run.

## Release gate

The release requires the hostile wrong-profile and wrong-target vectors, one
hostile claim-substitution vector, one real positive Sidon witness or an honest
Deferred/null outcome, exact Receipt and policy replay, and unchanged behavior
for every Canopus 0.3/0.4 run record. A producer-declared Receipt verifier row
is not by itself load-bearing policy evidence: the release also requires an
end-to-end Vela route whose assurance derives from retained event evidence or a
fresh exact floor. Lowering the signed policy's assurance threshold is not an
acceptable substitute.
