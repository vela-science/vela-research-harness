# Erdős 1056 k=15 capsule

This non-authoritative verifier independently recomputes the exact inclusive
prime range `10428008..10428200`. It accepts one byte-exact artifact describing
either the first 16-cut factorial-residue witness in that range or the complete
negative scan. A negative result is only about this finite range.

Build the static Linux ARM64 capsule with the pinned cross-compiler:

```bash
mkdir -p missions/erdos1056-k15/capsule
aarch64-linux-gnu-g++ -O3 -std=c++20 -static -s \
  capsules/erdos1056-k15/verifier.cpp \
  -o missions/erdos1056-k15/capsule/verifier
```

The release build used `aarch64-linux-gnu-g++ (GCC) 15.2.0`, binary SHA-256
`b70a2d4da3aa934c1276a038bd69d7041dc5f94e4090e5432500422c59f53b6f`.
The resulting capsule SHA-256 is
`aff16eeca0ca689838ee0e0e88a5cfd85e0206ea8aa8bf3201fa1aeea566be33`.

The prepared mission copies the executable into its content-addressed bundle.
The separate verifier container has no network and no writable persistent
mounts.
