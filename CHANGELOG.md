# Changelog

## 0.1.1 - 2026-07-16

- Replace `v0.1.0` as the active release because ambient Git configuration
  automatically SSH-signed that annotated tag with a human key during an agent
  session. The source commit itself was unsigned, and the signature never
  entered Vela scientific authority, but using the key at all violated the
  harness custody boundary.
- Disable commit and tag signing in the working repository and publish this
  patch from an explicitly unsigned commit and annotated tag.
- Preserve the same checksum-pinned Vela `v0.800.15` composition behavior and
  benchmark nonclaims.

## 0.1.0 - 2026-07-16

- Withdrawn as an active release because its annotated Git tag was
  ambiently SSH-signed with a human key. Retained as transparent historical
  evidence; use `v0.1.1`.
- Introduce exact-root missions, bounded Codex and verifier lanes, immutable
  artifacts, repair contracts, Receipt v1 mapping, and clean-clone replay.
- Preserve engine and verifier manifests as Vela-bound evidence.
- Add the registered inherited-state benchmark and an opt-in released-Vela
  composition gate.
- Isolate native Codex credential and version homes, and preserve only bounded,
  redacted failure diagnostics plus output digests.
- Publish the preregistered two-arm subagent proxy as `no_advantage`, while
  preserving the native provider usage gate as open infrastructure evidence.
- Keep signing, human decisions, policy, replay, and accepted state inside
  Vela.
