# Erdős 1056 k=15 capsule

This non-authoritative verifier independently recomputes the exact inclusive
prime range selected by its compile-time bounds. The active build covers
`10428601..10428800`. It accepts one byte-exact artifact describing
either the first 16-cut factorial-residue witness in that range or the complete
negative scan. A negative result is only about this finite range.

Build the active static Linux ARM64 capsule with
`aarch64-linux-gnu-g++ (GCC) 15.2.0`:

```bash
mkdir -p capsules/erdos1056-k15/bin/linux-arm64/10428601-10428800
aarch64-linux-gnu-g++ -O3 -std=c++20 -static -s \
  -DCANOPUS_RANGE_START=10428601 -DCANOPUS_RANGE_END=10428800 \
  capsules/erdos1056-k15/verifier.cpp \
  -o capsules/erdos1056-k15/bin/linux-arm64/10428601-10428800/verifier
```

The active Linux ARM64 capsule SHA-256 root is
`875a28177ef9b29d2480a8fe7906eddc3e809824190083abc885609555f8e52d`.

The Linux x86-64 capsule was built in `alpine:3.22.1` for `linux/amd64`,
pinned at
`sha256:4bcff63911fcb4448bd4fdacec207030997caf25e9bea4045fa6c8c44de311d1`,
using exact package `g++ 14.2.0-r6` with the same flags. Its SHA-256 root is
`51fc4e682d7a7f8f30f5e0dc2584e17fe94a037d246ff402fbe5d5ca6b820dc8`.

Completed range binaries and registrations remain recoverable from their
recorded Git commits and release evidence; they are intentionally absent from
the active package.

The prepared mission copies the executable into its content-addressed bundle.
The separate verifier container has no network and no writable persistent
mounts.
