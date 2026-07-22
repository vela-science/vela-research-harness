# Deferred Research Activity Adapter Evidence Plan

- Status: Deferred
- Release: None reserved
- Governing decision: [ADR 0008](../adr/0008-corpus-adapters-and-knowledge-profile-boundary.md)
- Authority effect: None

## Purpose

Determine whether two real workbench exports justify any shared Canopus
activity contract. This is an evidence plan, not an implementation train.

The product story remains:

```text
produce → preserve → check → decide → reuse
```

Canopus serves **Produce**. Source-local scripts may help one producer hand
rooted bytes to a frontier Git repository. Git preserves, Vela checks, signed
policy or a protected human decision decides, and replaceable readers support
reuse. This plan must not create a second state store, authority path, generic
research platform, or semantic service.

## Entry gates

Do not start shared Canopus implementation until both gates pass:

1. The parent ecosystem's in-place Erdős reader experiment records GO after
   its loss, round-trip, authority, and reuse checks.
2. Two stable, licensed, machine-readable workbench formats have independent
   source-local import scripts whose repeated code demonstrates one smaller
   common contract.

Until then, the activity envelope, profile v3, adapter SDK, registry, and CLI
commands remain deferred. No future Canopus version is reserved.

## Stage 1: Register source evidence

For each candidate, record without writing shared product code:

- source repository, exact commit, released version, and license;
- normative format documentation and acquisition command;
- exact exported bytes and SHA-256 root;
- whether fixtures may be redistributed;
- completed, failed, cancelled, partial, redacted, and unknown-field behavior;
- network, mutation, authentication, and host-data risks; and
- the real handoff or bespoke path the candidate could replace.

Candidate order:

1. Entire CLI `v0.8.42`, using only released documented exports;
2. OpenScience, after pinning its exact Apache-2.0 source and stable export;
3. OpenResearch only after a stable licensed export exists; and
4. Cursor Origin only after a public stable schema and license exist.

Direct Codex transcript parsing does not count as an independent second
format. Study it only after a retained fixture proves a released source export
omits evidence required by an existing mission.

## Stage 2: Build source-local scripts first

For each source that passes Stage 1, build the smallest disposable script next
to that integration. Do not add a shared SDK, registry, profile version, or CLI
surface.

Each script must:

1. accept one explicit file or directory and make no network request;
2. bind its own version, source version, exact input bytes, and output root;
3. preserve process outcome separately from verifier and scientific standing;
4. distinguish missing, unknown, redacted, and not-applicable fields;
5. reject traversal, symlinks, devices, oversized input, environment capture,
   authentication canaries, private paths, and unrelated host files;
6. leave the canonical source and every frontier byte unchanged; and
7. reproduce byte-identically from the same retained input.

Entire export must run only in a disposable exact-commit clone with all needed
objects prehydrated, operating-system network denial, and before/after tree,
ref, and object inventories. Missing bytes fail; the script never fetches or
normalizes an incomplete capture.

## Stage 3: Measure commonality

After two source-local scripts exist, compare them mechanically:

- fields with identical meaning and validation;
- canonicalization and hostile-input code duplicated byte-for-byte or by
  behavior;
- source-specific fields that cannot enter a common core;
- evidence lost or invented during conversion;
- code added versus code that a shared layer would delete; and
- at least one real handoff reused by a second consumer.

Produce a short comparison report with a GO, PIVOT, or NO-GO result.

### GO

Reopen ADR 0008 and specify only the proved common core. Name a release only
after selecting that implementation. The promotion change must delete the
corresponding source-local duplication.

### PIVOT

Keep a smaller shared utility, such as canonical hashing or hostile archive
validation, if that is the only duplicated capability. Do not promote an
activity schema, profile revision, SDK, or CLI merely to complete the original
idea.

### NO-GO

Keep useful scripts source-local or delete them if unused. Record why the
formats do not share a stable boundary. Canopus remains unchanged.

## Stage 4: Candidate shared contract, only after GO

If both entry gates and Stage 3 return GO, the follow-up plan may consider:

- one closed authority-free activity envelope;
- one shared adapter boundary limited to the duplicated code;
- an optional closed profile binding only if two real profiles need it; and
- advanced validation/import commands only after operators repeatedly use the
  shared contract.

Any activity-to-evidence path must still bind an exact claim target, evidence
role, retained artifact roots, caveats, and verifier subject/profile roots.
Workbench completion or evaluation scores never imply Vela standing.

## Evidence checks

The source-local experiments must prove:

- byte-identical offline re-import;
- changed inputs create a different root;
- missing blobs fail without network access;
- source tree, refs, and frontier bytes do not change;
- secret, path, symlink, archive-size, and environment canaries fail closed;
- workbench success, verifier success, and scientific standing remain distinct;
- no human key or authority operation is reachable; and
- every retained output identifies its exact source and limitations.

Use focused script tests and `git diff --check`. Do not add the proposed
adapter/activity test suite to the release gate until a GO decision authorizes
shared production code.

## Stop conditions

Stop on an undocumented or unlicensed source format, source-specific semantics
leaking into a proposed core, network-dependent replay, secret or human-key
exposure, canonical-source mutation, inferred scientific standing, a new
daemon/database/UI, or a shared layer that adds more permanent code than it
removes.

## Exit condition

This plan is complete when the two entry gates yield a documented decision:

- **GO:** a new bounded implementation plan replaces this document;
- **PIVOT:** only the proved smaller utility is proposed; or
- **NO-GO:** useful source-local scripts remain explicitly removable and no
  Canopus release or interface is scheduled.
