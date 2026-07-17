# Erdős 1056 k=15 capsule

This non-authoritative verifier independently recomputes the exact inclusive
prime range `10428008..10428200`. It accepts one byte-exact artifact describing
either the first 16-cut factorial-residue witness in that range or the complete
negative scan. A negative result is only about this finite range.

Build it inside the pinned Canopus worker image:

```bash
mkdir -p missions/erdos1056-k15/capsule
docker run --rm --entrypoint /bin/sh \
  --mount type=bind,src="$PWD",dst=/repo \
  canopus-worker:0.2.0-dev \
  -c 'g++ -O3 -std=c++20 -static -s /repo/capsules/erdos1056-k15/verifier.cpp -o /repo/missions/erdos1056-k15/capsule/verifier'
```

The prepared mission copies the executable into its content-addressed bundle.
The separate verifier container has no network and no writable persistent
mounts.
