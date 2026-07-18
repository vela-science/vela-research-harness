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

The Sidon candidate uses one `vela-witness` JSON artifact and the generic
`vela-verify` executable from Vela commit `d8902d6a`. The same Vela library
rechecks the retained artifact and exact claim during v0.2 landing and strict
replay. The earlier target-specific C++ checker and six-line artifact format
were removed after arm64/x86-64 parity, claim-inflation, and collision tests
passed; keeping both would create unnecessary verifier drift.

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
end-to-end Vela route whose assurance derives from retained event evidence or
the v0.2 exact Vela-native witness floor. Lowering the signed policy's
assurance threshold is not an acceptable substitute.

The current frozen Sidon candidate binds profile root
`sha256:29b1bc18cc04ad715bace77ab536f03ec46573bec3a5fbfcbeeb33aa285d4da6`,
result-contract root
`sha256:092c30d5309701b6e2bd61c37b6c47f6a9abfcb768a326d06ba85aabf10dc6ca`,
arm64 capsule root
`sha256:7a75bef8c0cbe29e6385f5b9426e6f9a2ef65368142311843a3a9f16ac8bdf4f`,
and x86-64 capsule root
`sha256:afa5f28a617f3a9e879be5d1e94df59669cccd29a089c4b6a2350a3f914da75c`.
These remain non-authoritative until the release and protected-policy gates
pass.
