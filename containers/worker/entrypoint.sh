#!/bin/sh
set -eu

umask 077

native_codex="$(find /usr/local/lib/node_modules/@openai/codex -type f -path '*/vendor/*/bin/codex' -print)"
test -n "$native_codex"
test "$(printf '%s\n' "$native_codex" | wc -l | tr -d ' ')" = "1"

if [ "${1:-}" = "identity" ]; then
  codex --version
  sha256sum "$native_codex"
  exit 0
fi

: "${CANOPUS_MODEL:?CANOPUS_MODEL is required}"
: "${CANOPUS_EXPECTED_CODEX_VERSION:?CANOPUS_EXPECTED_CODEX_VERSION is required}"
: "${CANOPUS_EXPECTED_CODEX_SHA256:?CANOPUS_EXPECTED_CODEX_SHA256 is required}"

observed_version="$(codex --version)"
observed_sha256="sha256:$(sha256sum "$native_codex" | cut -d ' ' -f 1)"
test "$observed_version" = "$CANOPUS_EXPECTED_CODEX_VERSION"
test "$observed_sha256" = "$CANOPUS_EXPECTED_CODEX_SHA256"

mkdir -p /runtime/codex /workspace
cp /credentials/auth.json /runtime/codex/auth.json
if [ -f /credentials/models_cache.json ]; then
  cp /credentials/models_cache.json /runtime/codex/models_cache.json
fi
cp -R /source/. /workspace/
chmod -R u+rwX /workspace

export HOME=/runtime
export CODEX_HOME=/runtime/codex
export NO_COLOR=1
export GIT_CONFIG_NOSYSTEM=1
export GIT_CONFIG_GLOBAL=/dev/null
export GIT_TERMINAL_PROMPT=0
export VELA_NO_KEY_ACCESS=1

exec codex exec \
  --ephemeral \
  --ignore-user-config \
  --ignore-rules \
  --strict-config \
  --skip-git-repo-check \
  --sandbox workspace-write \
  --model "$CANOPUS_MODEL" \
  --output-schema /contract/engine-output.v0.json \
  --output-last-message /out/final.json \
  --json \
  --color never \
  --cd /workspace \
  --config shell_environment_policy.inherit=none \
  --config 'approval_policy="never"' \
  --config 'web_search="disabled"' \
  --disable apps \
  --disable artifact \
  --disable auth_elicitation \
  --disable browser_use \
  --disable browser_use_external \
  --disable computer_use \
  --disable enable_fanout \
  --disable enable_mcp_apps \
  --disable goals \
  --disable hooks \
  --disable image_generation \
  --disable in_app_browser \
  --disable memories \
  --disable multi_agent \
  --disable multi_agent_v2 \
  --disable plugin_sharing \
  --disable plugins \
  --disable remote_plugin \
  --disable standalone_web_search \
  --disable tool_call_mcp_elicitation \
  --disable tool_suggest \
  --disable workspace_dependencies \
  -
