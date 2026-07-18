# Sidon `a(24)` improvement capsule

This capsule is the generic `vela-verify` executable built from Vela commit
`d8902d6a`. Canopus supplies the exact registered claim and one Vela-native
`sidon` witness; the executable rechecks both instead of maintaining a second
target-specific verifier implementation.

For `n <= 32`, Vela packs every binary vector into two-bit lanes, sorts all
`m(m+1)/2` componentwise sums, and rejects any duplicate. Claim fidelity also
binds the witness kind, dimension, and lower bound. It cannot establish
maximality, classification, or universal nonexistence.

The arm64 and x86-64 Linux executables were built from the exact clean Vela
source with Rust 1.91.1 and musl in the pinned multi-architecture image
`rust@sha256:8efbfb788786eeb127adc581394349c5fb567712156e0f8c2e499acadbc23756`,
with the network disabled and `cargo build --release --locked -p vela-verify
--bin vela-verify`. Their full roots are registered in the profile. They run
only inside the separate network-denied, read-only verifier container.
