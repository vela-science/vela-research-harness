# Cold-use producer task

Work only in the supplied isolated training frontier. Use the released `vela`
binary already present in the run environment. Network access, external
messages, human signing, and production repositories are out of scope.

Complete the supported producer path:

1. Inspect the exact Git commit/tree and the current Vela event-log and actor
   registry roots.
2. Run both non-strict and strict checks.
3. State which reviewer events are cryptographically authenticated and which
   are only legacy bytes.
4. Use the supplied public disposable `agent:` fixture identity.
5. Follow `vela next -> vela work -> vela land` for
   `seed:temporal-registration`, using
   `training-fixture/golomb.json` as the witness artifact.
6. Confirm that the landing is `deferred` or `pending_review`, not accepted.
7. Confirm that no preexisting event file changed and no accepted scientific
   event was added.
8. Stop. Do not invoke `vela sign`, actor activation, policy acceptance, or any
   human-key ceremony.

Return only the registered JSON answer. A failed or blocked endpoint is
reportable; do not repair history or claim acceptance to make the run appear
successful.
