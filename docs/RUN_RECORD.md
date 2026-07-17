# Canopus run records

A completed run writes these local records beneath its run root:

- `activity.jsonl`: append-only orchestration events linked by full SHA-256
  digests, including the exact `vela next` offer digest and selected rank;
- `candidate.json`: the frozen candidate and verifier facts;
- `run.json`: the compact run record, exact roots, landing result, costs, and
  clean-clone reproduction result;
- `projection.json`: a read-only view for a future Hub, Atlas, or UI consumer.
- `landing-command.json`: the exact argv, exit status, raw streams, and stream
  digests observed at the potentially effectful `vela land` boundary;
- `landing-observation.json`: the parsed raw Vela result, retained before any
  Canopus interpretation.

If anything fails at or after that boundary, `landing-recovery.json` records
the last command, raw result when available, parsed route when available, and
freshly inspected roots. `failure.json` points to that recovery record. A
command timeout may have changed external state even when no complete stdout
was captured, so recovery roots are authoritative over assumptions.

These files are operational evidence, not Vela authority. The projection says
so in its schema and can be rebuilt with `canopus inspect run.json`. Deleting
the run-record files must not change Vela replay, a policy route, or accepted
state.

The run root also contains isolated checkouts and content-addressed artifacts.
The landing clone uses a disposable attached branch so Vela can publish exact
deltas; the immutable input clone remains detached and read-only. Successful
runs delete the isolated Vela home and its agent-only key. Failed runs may
retain local diagnostic state until explicit cleanup. Never publish a run root
or Codex credential directory wholesale. After verification, Mission v1 makes
one unsigned non-authoritative Git commit containing exactly the frozen source
artifacts before invoking `vela land`; `activity.jsonl` records that commit,
tree, and path set. The terminal Vela commit then contains the Receipt, activity
record, proposal, and `records/artifacts/sha256/<digest>` copies. This ordering
keeps `vela.lock` and every clean Git checkout self-contained.

`route: defer` with `accepted_event_delta: 0` means the Receipt v1 record is
pending human review. It is a successful producer handoff, not scientific
acceptance. `route: permit` is valid only when an already signed Vela policy
admits the exact proposal; Canopus still does not hold a human key.

## Budget semantics

The mission hard-bounds prompt bytes, artifact bytes, attempts, spawned
research-lane processes, and captured research-lane output. The same ledger
covers the first verifier and clean-clone verifier. `max_observed_tokens` is an
honest postcondition over provider-reported usage; the Codex subscription
surface does not expose a portable pre-call token cutoff. Git and Vela are the
control plane and retain their own fixed command timeout/output bounds. The
mission therefore does not advertise a hard end-to-end subprocess or billing
budget it cannot enforce.
