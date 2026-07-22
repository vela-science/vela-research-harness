# ADR 0007: Policy-bound profile and result contracts

- Status: Deferred
- Historical candidate target: Canopus `v0.5.0` (not released as an enabled
  profile)
- Dependency: accepted Vela ADR 0013
- Implementation status: dormant compatibility machinery shipped; product
  acceptance gate unmet

## Context

Canopus profiles already bind execution and verification evidence for replay,
but Vela policy v0.1 cannot necessarily distinguish the intended profile from
another computational verifier with the same assurance class. Canopus must not
solve that by becoming a policy or authority service.

## Deferred decision

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
`vela-verify` executable from Vela commit `234cc34a`. The same Vela library
rechecks the retained artifact and exact claim during v0.2 landing and strict
replay. The earlier target-specific C++ checker and six-line artifact format
were removed after arm64/x86-64 parity, claim-inflation, and collision tests
passed; keeping both would create unnecessary verifier drift.

Canopus cannot author, sign, activate, rotate, revoke, or approve a Vela policy.
It may prepare the exact read-only policy plan for inspection. The human alone
approves the protected card. A policy mismatch, missing binding, unexpected
Permit, or unexpected accepted-state delta stops the run.

## Shipped implementation and release history

The public package contains a compatibility implementation of this candidate,
but that does not make the product decision accepted:

- commit `c3eabca6718be87f67d0cb7181fa4347d8a218a9` added the
  `vela.execution-binding.v1` and `canopus.result-contract.v1` parsers, Mission
  v1 validation, profile checks, Receipt mapping, and Vela CLI forwarding;
- commit `b9f1567498b7c0ebc80007a304a8847353c66734` bound the candidate to exact
  claim bytes and rejected claim substitution;
- commit `7ab8236c89d6253a3adc09bc9ce535a3d6892b7c` retained the last frozen
  `sidon-a24-improve` Permit candidate; and
- commit `752f674bd32ca94b42bbe55997fea2b08dd172dc` deleted that profile, mission,
  and result-contract file before any stable public release.

The dormant parser, schema, and forwarding surface first appeared in the
published stable package at `v0.4.2` and remains present in `v0.6.2`. The
package exports the contract types, validates all four full roots, substitutes
the registered exact claim only after verifier success, passes the roots to
Vela's sole Receipt authoring edge, and checks the retained binding. Unit tests
cover the fail-closed parser and substitution cases.

That is compatibility and implementation evidence, not evidence that a
policy-bound Canopus product profile shipped. Every real profile packaged by
`v0.6.2` is Defer-only and omits `result_contract`. The released-Vela
integration test exercises Mission v0, Defer, accepted-event delta zero, and
clean-clone replay. No retained real run in the release records Permit or
accepted-event delta one. The ADR itself is not part of the npm package.

Vela ADR 0013 being Accepted proves that released Vela can interpret an exact
execution binding under a matching signed policy. It does not prove that
Canopus registered, shipped, or exercised such a profile. This ADR therefore
remains Deferred. Historical package behavior and public API bytes remain
auditable without claiming the unexercised product path is current.

## Future acceptance gate

Acceptance requires a new dated candidate and all of the following evidence:

1. one exact Permit profile and its result contract are included in the packed
   public package;
2. hostile wrong-profile, wrong-target, wrong-packet, wrong-capsule,
   wrong-result-contract, wrong-artifact-kind, and claim-substitution vectors
   fail before landing or route away from Permit;
3. a released Vela binary evaluates an exact signed policy over the retained
   Receipt binding rather than trusting a producer-declared verifier row;
4. one real positive result follows the registered profile through verifier
   success, Permit, accepted-event delta one, retained binding verification,
   and clean-clone replay; and
5. historical Canopus run records and every packaged Defer profile replay
   unchanged.

A null, failed, unverifiable, or Deferred run is useful evidence but cannot
exercise this positive Permit contract. Lowering the signed policy's assurance
threshold is not an acceptable substitute. Until every gate passes, ordinary
profiles remain Defer-only and the dormant compatibility surface confers no
authority.

The retired Sidon candidate at commit `7ab8236c89d6253a3adc09bc9ce535a3d6892b7c`
bound profile root
`sha256:75ad68706fd74650b6d82c2820dc9aae78d20995e7d89b0045519383bbb4ed92`,
result-contract root
`sha256:092c30d5309701b6e2bd61c37b6c47f6a9abfcb768a326d06ba85aabf10dc6ca`,
arm64 capsule root
`sha256:7641fdaf11a3ad0c4110ade53b7d905c1ce1dae5a16234ed0d4e8d1dc79f548c`,
and x86-64 capsule root
`sha256:799b6ba5afb372dd74abd7952b76640d19a2edca9fdd9c54aecb024de5e100cd`.
Those bytes remain historical, non-authoritative evidence. A future candidate
must be registered from current exact roots and pass the gate above; it must
not revive the retired profile by name alone.
