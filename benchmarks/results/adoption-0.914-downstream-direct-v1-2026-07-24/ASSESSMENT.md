# Direct downstream read gate

**Date:** 2026-07-24  
**Decision:** PASS  
**Credit:** first-party product evidence only

## Frozen input

- registration:
  `benchmarks/registration/adoption-0.914-downstream-direct-v1.json`
- registration root:
  `sha256:ac672d99c0b3946203ecabee9cbf5559a7f300fecb3de74c47772f7adc99b044`
- Vela commit:
  `3f7c1eb98dd4fb14f5b68d9ab3f2ea6991bec9e4`
- Vela binary:
  `sha256:97adc3f8962fc0f855f8c505857b9ec5b92cdc458eba5c6599194262ad8ff726`
- Erdős commit:
  `7028ab2ad85f0fa2aee4526098e474044459e4e6`
- event log root:
  `sha256:12daf8cc1e4f2777629ca953e081c99b2931a60b8245273b9085a5c0add53c3b`
- proposal root:
  `sha256:e69b38037814f2e8ca826942cfc50ab370993889be2913cac1c0b3e77711160f`
- Codex:
  `0.145.0`, `gpt-5.6-sol`, low reasoning, fresh ephemeral session
- registered ceiling: 100,000 observed input-plus-output tokens

The prompt is byte-identical to the prior failed downstream cell. Only the
ordinary Vela help/skill guidance and exact repository checkout changed.

## Result

| Measure | Prior cell | Direct-read cell |
| --- | ---: | ---: |
| Observed tokens | 114,445 | 72,113 |
| Wall time | not used as the failing gate | 46.525 seconds |
| Read commands | 17 | 9 |
| Fixture writes | 0 | 0 |
| Interventions | 0 | 0 |
| Custody preflight | passed | passed |
| Semantic result | correct | correct |
| Token gate | fail | pass |

Token use fell by 37.0 percent. The reader:

- refused `vf_d335470af6c5d232` as a hard accepted dependency;
- identified proposal `vpr_f54338a5a453c1bf` and signed rejection event
  `vev_32667676119a30cb`;
- reported the verified event root and exact recorded reason;
- correctly distinguished retained Receipt/evidence from accepted state;
- reported `scientific_state_changed: false`, null before/after scientific
  roots, and no applied event;
- accessed no human key, attempted no authority action, and left the exact
  checkout byte-clean.

This passes the one remaining frozen downstream budget gate. It does not
establish outside recurrence, interoperability, independent adoption, or a
reason to promote a protocol primitive.

## Residual diagnostic

`vela status` reproduced the event log but could not create its anchored Git
scratch view because the read-only worker profile made the repository-local
`.tmp` directory read-only. The final answer did not rely on that failed
repository-context check. The runner repair is operational and narrower than
the scored cell: grant write access only to the ignored `.tmp` scratch
directory while keeping the source checkout, human keys, authentication,
unrelated repositories, and network unavailable. A direct default-deny sandbox
check after that repair returned `ok: true`, verified the pinned repository
context, reproduced the event log, and retained the exact 1,511/81 strict
classification.
