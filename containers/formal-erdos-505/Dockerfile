FROM ghcr.io/leanprover-community/mathlib4/lean@sha256:d64b66663cba8c517b2314d59bbde8864460ae2ef513b0e8cbca1278cd1229f6

LABEL org.opencontainers.image.source="https://github.com/vela-science/vela-research-harness"
LABEL org.opencontainers.image.description="Frozen Lean verifier environment for formal:erdos-505-test-dim-one"
LABEL org.opencontainers.image.licenses="Apache-2.0 OR MIT"

ARG SOURCE_COMMIT=c252a41054125b5fd9c8356e2137cd9b55337657
ARG SOURCE_TREE=a3eb8cb29f72a7ec1e7534955a5af0f6f72775c3
ARG SOURCE_FILE_SHA256=085b536fb121ff3ed0c13a390e0e3b72b3be7e4f5dec7a5702efd5884e8d93eb

USER lean
WORKDIR /home/lean

RUN /home/lean/.elan/bin/elan toolchain install leanprover/lean4:v4.27.0
RUN git init formal-conjectures \
    && cd formal-conjectures \
    && git remote add origin https://github.com/google-deepmind/formal-conjectures.git \
    && git fetch --depth 1 origin "$SOURCE_COMMIT" \
    && git checkout --detach FETCH_HEAD \
    && test "$(git rev-parse HEAD)" = "$SOURCE_COMMIT" \
    && test "$(git rev-parse HEAD^{tree})" = "$SOURCE_TREE" \
    && test "$(sha256sum FormalConjectures/ErdosProblems/505.lean | cut -d ' ' -f 1)" = "$SOURCE_FILE_SHA256"

WORKDIR /home/lean/formal-conjectures
RUN /home/lean/.elan/bin/elan run leanprover/lean4:v4.27.0 lake exe cache get
RUN /home/lean/.elan/bin/elan run leanprover/lean4:v4.27.0 lake build FormalConjecturesUtil
RUN mkdir -p .lake/build/lib/lean/FormalConjectures/ErdosProblems \
    && /home/lean/.elan/bin/elan run leanprover/lean4:v4.27.0 lake env lean \
      -o .lake/build/lib/lean/FormalConjectures/ErdosProblems/505.olean \
      FormalConjectures/ErdosProblems/505.lean

ENTRYPOINT []
