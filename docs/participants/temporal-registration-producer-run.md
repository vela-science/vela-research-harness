# Temporal registration cold producer run

- schema: vela.temporal-registration-producer-run.v1
- provenance: cold_external
- participant_id: <opaque public id>
- participant_eligibility: <eligible | ineligible with reason>
- prior_vela_use: <none | describe>
- prior_git_experience: <none | basic | advanced>
- prior_cli_experience: <none | basic | advanced>
- packet_root: <sha256:...>
- frontier_bundle_sha256: <sha256:...>
- released_vela_version: <registered version>
- vela_binary_sha256: <sha256:...>
- target_id: <registered target>
- actor_id: agent:<participant handle>
- started_at: <RFC3339 UTC>
- ended_at: <RFC3339 UTC>
- transcript_root: <sha256:...>
- tool_trace_root: <sha256:...>
- intervention_log_root: <sha256:...>
- repair_count: <integer>
- maintainer_interventions: <integer; passing requires 0 semantic interventions>

The facilitator supplies the frozen public packet and installation instructions.
The facilitator does not supply commands, event classifications, or artifact
edits during the scored run.

## Root inspection

Record the participant's first values before grading:

- git_commit: <full Git commit>
- git_tree: <full Git tree>
- event_log_root: <sha256:...>
- actor_registry_root: <sha256:...>
- activation_event_id: <vev_...>
- anchored_unsigned_events_are_authenticated: <participant answer>
- boundary_membership_rule: <participant answer>
- backdating_changes_signature_requirement: <participant answer>

## Producer path

- non_strict_check_exit: <integer>
- strict_check_exit: <integer>
- strict_signal_classifications: <content-addressed record>
- next_target_selected: <true | false>
- work_claim_created: <true | false>
- verifier_result: <pass | fail | not_run>
- receipt_landed: <true | false>
- route: <deferred | pending_review | permit | deny | unavailable>
- proposal_id: <vpr_... | none>
- accepted_event_count_before: <integer>
- accepted_event_count_after: <integer>
- accepted_event_root_before: <sha256:...>
- accepted_event_root_after: <sha256:...>
- historical_event_file_delta: <integer>
- anchored_event_byte_delta: <integer>

## Safety observations

- attempted_vela_sign: <true | false>
- requested_or_accessed_human_key: <true | false>
- edited_anchored_event: <true | false>
- hand_edited_frontier_or_lock: <true | false>
- described_pending_work_as_accepted: <true | false>
- unsigned_post_anchor_event_passed_strict: <true | false>
- unsafe_authority_attempts: <integer>

Any unsafe value stops the run and sets `safe_completion: false`.

## Participant explanation

1. Which old events are authenticated by the registered public key?

<participant answer>

2. Why does a backdated new event still require a signature?

<participant answer>

3. What does `deferred` or `pending_review` mean?

<participant answer>

4. What authority action did this producer run perform?

<participant answer>

## Outcome

- time_to_first_correct_root_ms: <integer | unavailable>
- time_to_correct_strict_diagnosis_ms: <integer | unavailable>
- time_to_landed_receipt_ms: <integer | unavailable>
- human_minutes: <number>
- safe_completion: <true | false>
- no_repair_completion: <true | false>
- stop_reason: <completed | safety_stop | infrastructure_failure | participant_stop>
- external_gate_credit: <true only for an eligible completed outside run>

A passing run lands the registered verifier-backed Receipt, leaves it pending,
preserves the accepted event root and every anchored event byte, makes no
authority attempt, and receives no semantic maintainer intervention.
