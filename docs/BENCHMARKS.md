# Canopus benchmarks

The first benchmark is deliberately small: one paired internal-agent proxy,
one run per arm, and at most two model calls. Both prompts are rendered from
the same registered facts. The baseline receives unordered raw records. The
treatment receives the same facts organized as inherited Vela state.

The task tests a concrete failure mode: branching a substantive child from a
stronger but merely pending result, or from a failed verifier route, instead of
the current accepted base. Metrics include rubric defects, review items,
dead-route selection, downstream reuse, token counts, response bytes, and wall
time.

Registration lives at `benchmarks/registration/v0.json`. It pins the facts,
answer schema, runner, Codex CLI/model request, limits, rubric, and decision
rule before a model is called. Results use no external-gate credit and make no
causal claim at n=1. A tie is `no_advantage`, not evidence for more protocol.

Zero-call preflights found and corrected release-boundary defects before
execution: the native Codex runtime needed thread creation and the compatibility
page-size sysctl inside the outer Seatbelt profile; startup also needed
metadata-only visibility of the absent managed-requirements path and a finite
set of named macOS runtime services. Codex's own macOS network policy identified
the exact DNS/TLS services, public resolver files, notification-center shared
memory, and canonical `/private/var/run/mDNSResponder` socket needed at the
outer boundary; no wildcard service or broad user-preference read was added.
The final profile replaces broad network access with the Chromium-style shape:
that single resolver socket plus remote TCP/UDP, leaving other host Unix sockets
closed.
The package also needed to include the exact registered runner source. An
IP-denied diagnostic completed DNS through that exact socket and then stopped
at the expected network boundary. The registration records the resulting
implementation commit. No failed probe reached the provider, and none changed
the benchmark information, arms, model, budgets, rubric, or decision rule.

Native Codex 0.139 creates and locks `CODEX_HOME/installation_id` while starting
its in-process app server. Canopus therefore copies only bounded `auth.json` and
optional `models_cache.json` bytes into a fresh writable home for each arm. The
outer sandbox can write only inside that home, and the runner removes it in a
`finally` block. The user's real credential directory is never writable by the
model process and credential bytes are not retained in benchmark output.

The first network-enabled launch reached TLS root loading but returned no HTTP
or model response because `rustls-native-certs` attempted the denied macOS
keychain path. Canopus pins `SSL_CERT_FILE` to `/etc/ssl/cert.pem`, already inside
the public system-runtime allowlist. This preserves TLS without admitting the
user's keychains. That failed launch produced no benchmark arm; the registration
records the amendment without changing the facts, model, rubric, or decision
rule.

Dollar pricing is unavailable on the Codex subscription surface used here, so
the report preserves exact token counts rather than inventing a dollar value.
The harness does not use the available Anthropic balance for this initial
probe.
