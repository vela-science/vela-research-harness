# ADR 0003: Independent handoff runner and participant custody

- Status: Proposed
- Target release: Canopus `v0.2.0`
- Entry gate: ADR 0002 Stage A and Stage B complete safely

The entry gate is not met. Stage A v6 stopped after two cells on an exact command
reporting defect, so Canopus `v0.2.0` implementation and independent execution
have not started.

## Context

Canopus can run one exact-root producer and verifier path against released
Vela. Its internal benchmarks do not establish outside usability,
interoperability, independent replay, or a correction-aware downstream handoff.

The next experiment requires people and implementations outside the Vela
project. Canopus may package the work and record activity. It cannot decide
scientific standing, supply participant semantics during the blind phase, or
claim that first-party repetitions are independent.

## Decision

Canopus `v0.2.0` will provide a public, removable runner and participant packet
for the experiment defined by Vela ADR 0006.

The runner owns:

- exact-root workspace preparation;
- participant-role packets;
- budget and wall-time enforcement;
- process isolation;
- artifact freezing;
- transcript and tool-trace roots;
- timing, token, command, repair, and intervention records;
- Vela-profile and standards-baseline arm scheduling; and
- deterministic report assembly.

The runner does not own:

- a scientific event log;
- a policy engine;
- a signer;
- accepted state;
- a dependency-standing oracle;
- a human decision;
- participant keys; or
- an independent-reader verdict.

Deleting Canopus must leave every Vela frontier replayable and unchanged.

## Participant roles

The packet defines these roles:

```text
producer_a
verifier_v1
verifier_v2
human_steward
producer_b
reader_c
red_team
baseline_team
```

Each participant records its organization, repository, code lineage, model or
human role, toolchain, prior Vela contribution history, and declared
independence relationships.

The protocol team may answer public installation questions already covered by
the frozen packet. It may not edit participant artifacts, interpret the
scientific claim, select B's dependency, repair Reader C, or change the
registered semantics after Producer A begins.

## Custody

The public packet contains no human key or general service credential.

- Models receive no human scientific key.
- The human steward performs any Vela ceremony locally and outside Canopus.
- Participant signing keys remain with their owners.
- Canopus records public key fingerprints and signed outputs, not private keys.
- The baseline arm receives the same semantic information and intervention
  rules.
- A key exposure or agent signing attempt invalidates the run.

## Experiment transport

Participants exchange ordinary Git repositories, Git bundles, immutable
artifact descriptors, and registered packet files. A hosted Vela or Canopus
service is not required.

Canopus may consume the current ADR 0004 experimental Vela profile and the
matched standards profile. It must not promote either profile into Vela
authority or treat an experimental status as a protocol verdict.

## Records

Every run records:

- exact repository commits, trees, event roots, and packet roots;
- Vela, Canopus, Codex, verifier, and operating-system versions;
- prompts and schemas;
- transcript and tool-trace roots;
- commands and exit codes;
- wall time and human minutes;
- token and direct-cost usage;
- repairs and maintainer interventions;
- strict-signal classifications;
- accepted-state deltas;
- participant contact during the blind phase; and
- the final GO, PIVOT, or NO-GO evidence inputs.

Raw secrets, provider authentication files, and private model streams are
excluded.

## Stop conditions

The runner stops and preserves evidence after:

- human-key exposure;
- historical event rewrite;
- false strict pass;
- semantic maintainer hint;
- participant contact forbidden by the blind protocol;
- mismatched information between arms;
- changed registration bytes;
- false independent-credit classification; or
- a scorer or reader result that cannot be reproduced.

## Release boundary

Canopus `v0.2.0` may ship the frozen packet and runner after ADR 0002 Stage A
and Stage B pass. Running the independent experiment still depends on outside
participants and a human steward. The release itself earns no independent or
scientific credit.

## Consequences

Canopus supplies repeatable operations while Vela remains the only scientific
authority boundary. Outside teams can reject Canopus and reproduce the trust
steps from Git, Vela, and the registered packet.
