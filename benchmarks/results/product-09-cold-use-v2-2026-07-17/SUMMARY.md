# Vela 0.9 cold-use diagnostic v2

Status: stopped before the first model call. First-party controller evidence
only; no benchmark, independent, human, causal, or scientific-result credit.

All four fixtures and custody preflights completed. When the execution phase
created the operator runtime, the runner refused the already-existing
fixture-local `.agent-home` directory with `EEXIST`. The directory was a safe,
excluded product-state location created by the preflight itself. No Codex
session began, no human key or authentication material was exposed, and no
frontier or authority state changed.

The repair makes the fixture-local agent home and temporary directory
idempotent. Future calls require a new registration and runner root; v2 is not
reopened or pooled.
