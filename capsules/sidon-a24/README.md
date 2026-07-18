# Sidon `a(24)` improvement capsule

This capsule verifies one exact positive artifact for `sidon:a24-improve`. It
accepts only the six-line `canopus.sidon-a24-witness.v1` format, more than 7,192
distinct 24-bit vectors, and a complete duplicate-free check of all
`m(m+1)/2` componentwise integer pair sums.

Each vector is encoded as six lowercase hexadecimal digits. The verifier
spreads its 24 binary coordinates into 48 two-bit lanes, so ordinary integer
addition is an injective encoding of the componentwise sum. It then sorts every
encoded pair sum and rejects any adjacent duplicate. At the registered ceiling
of 8,000 points the main array is about 256 MB.

The verifier proves only the supplied lower-bound witness. It does not prove
maximality or classify all Sidon subsets of the 24-cube.

Run the small internal algorithm check with:

```bash
./verifier --self-test
```

Release binaries are static Linux executables for arm64 and x86-64. Their exact
compiler identities, commands, and SHA-256 roots are recorded in the profile
and release evidence; they run only inside the separate network-denied,
write-denied verifier container.
