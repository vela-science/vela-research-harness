# Erdős 505 dimension-one verifier

This target-specific capsule verifies one raw Lean proof term against the exact
statement of `Erdos505.erdos_505.test_dim_one` from
`google-deepmind/formal-conjectures` commit
`c252a41054125b5fd9c8356e2137cd9b55337657`.

The producer supplies only the term beginning with `by`. The capsule owns the
imports and theorem statement, invokes Lean 4.27.0 inside the pinned verifier
image, and rejects `sorryAx` or any axiom outside `propext`,
`Classical.choice`, and `Quot.sound`. Kernel success does not establish
statement fidelity or scientific acceptance; the target packet and Vela review
boundary retain those distinctions.
