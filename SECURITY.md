# Security

Report vulnerabilities privately through GitHub Security Advisories for
`vela-science/vela-research-harness`.

Canopus does not accept human signing keys. Do not place a human Vela key,
provider credential, or unpublished scientific secret inside a run root.
Successful runs scrub the isolated agent-key home, but operators remain
responsible for deleting failed diagnostic runs and benchmark output.

The v0 isolation backend is macOS Seatbelt. Other platforms fail closed; they
do not receive a permissive fallback.
