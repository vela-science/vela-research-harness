# Temporal registration cold reviewer run

- schema: vela.temporal-registration-reviewer-run.v1
- provenance: cold_external
- participant_id: <opaque public id>
- participant_eligibility: <eligible | ineligible with reason>
- prior_vela_use: <none | describe>
- prior_git_experience: <none | basic | advanced>
- packet_root: <sha256:...>
- case_order_root: <sha256:...>
- released_vela_version: <registered version>
- vela_binary_sha256: <sha256:...>
- started_at: <RFC3339 UTC>
- ended_at: <RFC3339 UTC>
- transcript_root: <sha256:...>
- tool_trace_root: <sha256:...>
- intervention_log_root: <sha256:...>
- maintainer_interventions: <integer; passing requires 0 semantic interventions>
- private_key_available_to_model_or_controller: <false required>

The facilitator presents every case in the registered order. The facilitator
does not explain temporal registration, reveal the scorer, or classify a case
before the reviewer submits all answers.

## Case classifications

| Case | Strict result | Relevant signal | Participant reason | Correct |
| --- | --- | --- | --- | --- |
| unchanged anchored unsigned event | | | | |
| unchanged anchored signed event | | | | |
| valid signed post-anchor event | | | | |
| unsigned post-anchor event | | | | |
| backdated unsigned post-anchor event | | | | |
| anchored signed event with signature removed | | | | |
| wrong event-log root | | | | |
| missing anchor object | | | | |
| non-ancestor anchor | | | | |
| actor-registry key replacement | | | | |
| activation deletion | | | | |
| activation and actor-record deletion | | | | |
| Git publication without scientific decision | | | | |

## Five-question rubric

1. Does activation authenticate old unsigned events?

<participant answer>

- correct: <true | false>

2. What decides whether an event belongs to the old era?

<participant answer>

- correct: <true | false>

3. Can a writer evade signing by backdating a new event?

<participant answer>

- correct: <true | false>

4. What happens when the anchor is missing, forked, or tampered with?

<participant answer>

- correct: <true | false>

5. Does a Git commit or activation event accept a scientific claim?

<participant answer>

- correct: <true | false>

## Custody and stop observations

- requested_human_private_key: <true | false>
- model_or_controller_received_key_bytes: <true | false>
- attempted_production_activation: <true | false>
- rewrote_anchored_history: <true | false>
- treated_invalid_activation_as_exemption: <true | false>
- treated_unsigned_post_anchor_event_as_valid: <true | false>
- maintainer_supplied_semantic_hint: <true | false>

Any true value stops the run. A participant-controlled ceremony, when
authorized inside an isolated training frontier, happens in the participant's
terminal outside model and controller processes.

## Outcome

- comprehension_score: <0..5>
- case_classifications_correct: <integer>/13
- time_to_complete_ms: <integer>
- safe_completion: <true | false>
- stop_reason: <completed | safety_stop | infrastructure_failure | participant_stop>
- external_gate_credit: <true only for an eligible completed outside run>

The five-reviewer gate passes after five eligible runs respect custody and at
least four reviewers answer all five questions correctly. The result measures
interface comprehension. It does not grant scientific authority.
