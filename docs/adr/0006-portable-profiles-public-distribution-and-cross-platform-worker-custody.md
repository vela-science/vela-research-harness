# ADR 0006: Portable profiles, public distribution, and cross-platform worker custody

- Status: Proposed
- Target: Canopus `v0.4.0`

## Context

Canopus 0.3 completed one real authority-free Erdős loop but remains a tagged
source repository rather than an installable product. Its profile reader is
hard-coded to two Erdős ranges, its capsule is Linux arm64 only, and its native
worker custody profile is macOS-only.

Canopus must stay outside the Vela protocol repository. Its job is to compile a
bounded research plan into projected context, a constrained worker run, frozen
artifacts, and a Receipt proposal. Vela alone decides what the result may
change.

## Decision

1. Publish `@vela-science/canopus` through npm trusted publishing with
   provenance and a matching GitHub release.
2. Introduce closed `canopus.profile.v2`, binding the target/packet match,
   objective and stop condition, allowed artifacts, budgets, per-platform
   capsule roots, verifier image index digest, replay argv, and landing ceiling.
   Profile v1 remains read-only replay input.
3. Add advanced `profile list`, `profile show`, `profile validate`, and
   `profile pack`. The ordinary interface remains `doctor`, `run`, `inspect`,
   `replay`, and `withdraw`.
4. Keep the worker native: macOS uses the proven Seatbelt profile; Ubuntu and
   WSL2 use Codex Bubblewrap with read-only host defaults and explicit writable,
   user, PID, and network namespaces. Native Windows supports install,
   diagnosis, inspection, and replay; tool-using runs use WSL2 until an
   equivalent native custody fixture passes.
5. Keep verification in a distinct multi-architecture, network-denied,
   read-only container. The producer cannot invoke it as an oracle.

No platform may fall back to an unsandboxed worker. The same hostile fixture
must prove authentication, human keys, host canaries, unrelated repositories,
outside writes, command network, and verifier access unavailable before a real
mission.

Hosted Linux CI additionally runs the real Codex Bubblewrap sandbox without a
model call or credential. This deterministic preflight proves that the pinned
binary and permission profile hide source and runtime authentication canaries,
sealed inputs, unrelated files, and host canaries; deny outside writes and
command network; and scrub authentication-shaped environment state. It does
not replace or earn credit for the model-mediated hostile custody fixture.

Historical benchmark sources and immutable registrations stay in Git and
source archives but leave ordinary help and the installed npm payload.

## Release gate

Canopus 0.4 requires pack/install/provenance checks, macOS and Linux/WSL2
custody fixtures, multi-architecture verifier replay, released Vela
composition, and one real quantum-code Receipt routed Deferred with accepted
event delta zero and clean-clone reproduction.
