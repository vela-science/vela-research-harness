FROM node@sha256:dd9d21971ec4395903fa6143c2b9267d048ae01ca6d3ea96f16cb30df6187d94

ARG DEBIAN_FRONTEND=noninteractive
RUN apt-get update \
    && apt-get install -y --no-install-recommends bubblewrap build-essential ca-certificates git jq python3 ripgrep \
    && rm -rf /var/lib/apt/lists/* \
    && npm install --global --omit=dev @openai/codex@0.144.5 \
    && npm cache clean --force

COPY entrypoint.sh /usr/local/bin/canopus-worker
RUN chmod 0555 /usr/local/bin/canopus-worker \
    && mkdir -p /source /credentials /contract /out /canary /runtime /workspace \
    && touch /contract/engine-output.v0.json /canary/host-secret \
    && chmod 0555 /source /credentials /contract /out /canary /runtime /workspace \
    && chmod 0444 /contract/engine-output.v0.json /canary/host-secret \
    && codex --version | grep -Fx 'codex-cli 0.144.5'

ENTRYPOINT ["/usr/local/bin/canopus-worker"]
