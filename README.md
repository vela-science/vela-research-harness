<p align="center">
  <img src="docs/assets/canopus-readme-hero.jpg" width="960" alt="Canopus carries one bounded target through an isolated Codex worker and separate verifier into a Receipt pending human review." />
</p>

<p align="center"><strong>Bounded research for Codex.</strong></p>

<p align="center">
  Give Codex one finite mission. Verify the artifact independently. Keep humans in authority.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@vela-science/canopus"><img alt="npm" src="https://img.shields.io/npm/v/@vela-science/canopus?style=flat-square&color=C9A664&labelColor=081224" /></a>
  <a href="https://github.com/vela-science/vela-research-harness/actions/workflows/ci.yml"><img alt="CI" src="https://img.shields.io/github/actions/workflow/status/vela-science/vela-research-harness/ci.yml?branch=main&style=flat-square&label=build&labelColor=081224" /></a>
  <a href="LICENSE-APACHE"><img alt="Apache-2.0 OR MIT" src="https://img.shields.io/badge/license-Apache--2.0%20OR%20MIT-4F8F8B?style=flat-square&labelColor=081224" /></a>
</p>

<p align="center">
  <a href="https://app.vela.space/build-week">Live evidence</a> ·
  <a href="BUILD_WEEK.md">Build Week record</a> ·
  <a href="docs/MISSIONS.md">Missions</a> ·
  <a href="docs/RUN_RECORD.md">Run records</a> ·
  <a href="https://github.com/vela-science/vela">Vela</a>
</p>

Canopus is a removable producer over released Vela and Git. It gives Codex one
exact work offer, freezes the result, runs a separate verifier, and can land a
Receipt through `vela land`.

It cannot sign, accept a proposal, or make a scientific decision. Removing
Canopus does not change accepted state or Vela replay.

## Judge quickstart

**20 seconds — inspect the real result:** open the anonymous
[Build Week evidence page](https://app.vela.space/build-week) and follow
Mission → GPT-5.6 → artifact → verifier → Receipt → Defer.

**90 seconds — inspect the shipped product:**

```sh
bunx @vela-science/canopus@0.6.1 --version
bunx @vela-science/canopus@0.6.1 profile validate sidon-a24-at-least-7194-gpt56-v3
```

**Full workflow — reproduce without rebuilding Canopus:**

```sh
git clone https://github.com/vela-science/sidon-frontier.git
cd sidon-frontier
git checkout 825657d7e87618c0aa6fc9af7e3182e05f324750
vela reproduce artifacts/sidon-a24-gpt56-7194.witness.json
node verification/verify-sidon-a24-7194.mjs \
  artifacts/sidon-a24-gpt56-7194.witness.json
```

The first command selects the pending artifact explicitly and runs Vela's
frozen Sidon verifier. The second is an independent base-3 implementation that
also rejects a bound collision injection. Neither command accepts the proposal.

## Quickstart

Run the provenance-backed public package with Bun:

```sh
bunx @vela-science/canopus@0.6.1 --version
```

Inspect a clean frontier, then run its first ranked producer offer:

```sh
bunx @vela-science/canopus@0.6.1 doctor /path/to/frontier
bunx @vela-science/canopus@0.6.1 run /path/to/frontier --first
bunx @vela-science/canopus@0.6.1 inspect latest
bunx @vela-science/canopus@0.6.1 replay /path/to/run.json
```

Export a completed Defer run without publishing or mutating anything:

```sh
canopus publish-run /path/to/run.json --mission /path/to/mission.json \
  --repository https://github.com/vela-science/<frontier> \
  --output ./public-evidence
```

The new directory contains `public-run.json`, `root-manifest.json`, exact
pending-state commands, and a read-only Observatory import descriptor. Run v1
separates worker observations, verifier observations, and caveats that remain
standing after verification; historical run v0 records remain inspectable.

Use `--no-land` for a diagnostic mission that cannot change the source frontier:

```sh
bunx @vela-science/canopus@0.6.1 run /path/to/frontier --first --no-land
```

`doctor` binds the exact Vela, Codex, Git, frontier, packet, profile, and verifier
roots. `run` refuses dirty frontiers, drifted roots, missing capsules, and
unregistered targets. It never silently skips the first ranked offer.

## Custody and authority

| Surface | Can do | Cannot do |
| --- | --- | --- |
| Codex worker | Use tools inside one bounded workspace | Reach the network, host home, human keys, or verifier |
| Verifier | Read frozen candidate bytes and declared inputs | Write, use the network, or make an authority decision |
| Canopus | Preserve evidence, replay, land a Receipt, withdraw its own proposal | Sign, accept, reject, or call verifier success acceptance |

The worker uses macOS Seatbelt or Codex's Bubblewrap sandbox on Linux and WSL2.
The verifier runs in a separate pinned container with network and writes denied.

## Everyday commands

```sh
canopus doctor [frontier]
canopus run [frontier] [--first | --target <id>] [--profile <name>] [--no-land]
canopus inspect [run.json | latest]
canopus replay <run.json>
```

Advanced profile and withdrawal commands are documented in
[Missions](docs/MISSIONS.md). Installed profiles are closed,
content-addressed contracts that bind the target, packet, objective, artifact
types, worker, verifier, replay command, budgets, and landing ceiling.

## OpenAI Build Week

Inspect the retained Mission → worker → artifact → verifier → Receipt → Defer
chain on the [live evidence surface](https://app.vela.space/build-week). Exact
commits, run roots, audit evidence, and nonclaims live in
[`BUILD_WEEK.md`](BUILD_WEEK.md).

## Development

Requires Bun 1.3.12, Vela 0.912.0, Codex CLI 0.144.6, and Docker. The built
package also runs under Node 22 or 24; unsupported odd-numbered Node releases
are rejected rather than silently treated as supported.

```sh
bun install --frozen-lockfile
bun run check
bun run pack:check
```

## Documentation

- [Missions and profiles](docs/MISSIONS.md)
- [Run records and publication](docs/RUN_RECORD.md)
- [Release evidence](docs/RELEASES.md)
- [Why the harness stays removable](docs/adr/0001-harness-boundary-and-name.md)

## License

Apache-2.0 OR MIT, at your option. Canopus is a replaceable producer; Vela
remains the protocol and authority boundary.
