# Standards baseline semantics v0

The shared `vela.verifiable-composition.fact-manifest.v0` contract is the only
definition of dependency standing used by both Stage A arms. Every manifest is
canonical JSON containing only null, booleans, strings, lists, objects, and
safe integers. Floats and integers outside JavaScript's exact safe range are
invalid so an independent TypeScript reader derives the same full root.

The L arm carries each exact manifest in an in-toto Statement, an unsigned DSSE
envelope, and a fixture-signed `science.lock`. The fixture identity is public,
deterministic, non-human, and explicitly outside scientific authority. The V
arm carries the same manifest through the Vela fact envelope and removable
read-only resolution, correction-CI, and context projections.

A verified same or descendant lineage with accepted finding standing, a valid
decision, valid verifier material, and available evidence is `satisfied`. A
verified hard-premise correction or supersession is `review_required`. A valid
non-descendant lineage is `forked`. Missing or invalid continuity, evidence,
decision, verifier, or change-event material is `unresolvable`. Withdrawal or
revocation blocks hard, data, and method premises; soft and contextual roles
remain review-only.

Every projection is non-authoritative, rebuildable, read-only, and reports
`child_truth = not_assessed`, `child_mutation = none`, and
`authority_effect = none`. A parent correction changes dependency standing; it
does not prove the child false, edit a Receipt, sign, accept, apply, finalize,
or create an authority event.
