# Implementation Plan

Use this template for `03-plan.md`. Read the requirement, investigation, and applicable specification before planning. A Level 3 plan is a proposal until the developer explicitly approves this revision; do not implement while approval is pending or rejected.

## Sources

Reference `00-requirement.md`, `01-investigation.md`, and `02-spec.md` when present, plus actual decision sources. For Level 2 without a spec, explicitly explain why behavior, API contracts, architecture, and compatibility need no separate clarification.

## Task Risk Level

Select Level 1 / Level 2 / Level 3 with the classification rationale. Use the highest applicable risk, even for a small diff.

## Summary

Describe the intended outcome and authorized scope. Assign a plan revision label/date so approval can refer to this exact plan before a commit exists.

## Files To Modify

List exact paths, purpose, and relevant existing user changes to preserve.

## Files To Create

List exact paths and why each new file is needed.

## Files Explicitly Not To Modify

Identify adjacent systems, unrelated work, and sensitive files outside scope.

## Implementation Steps

### Step 1

Define the first concrete change, affected files, prerequisites, and expected outcome.

### Step 2

Define the next dependent change and its verification point.

### Step 3

Define remaining integration or verification work. Add or remove numbered steps to match the real plan; do not retain empty steps.

## Database Changes

List schema/data changes, target environment, migration compatibility, and recovery needs, or state None. Important data and destructive operations require explicit scoped approval.

## API Changes

List contracts, callers, and compatibility impact, or state None.

## Frontend Changes

List views, state, and applicable interaction/error cases, or state None.

## Backend Changes

List routes, validation, services, and transaction boundaries, or state None.

## Security Considerations

Identify task-specific access, tenant, secret, and abuse safeguards with required checks.

## Performance Considerations

Identify likely performance impact and any checks justified by the change.

## Testing Plan

Map acceptance criteria and regression risks to existing or proposed tests. List intended commands and working directories from applicable policy/config; these are planned, not executed results.

## Manual Verification

Describe concrete scenarios, expected results, and the environment or access needed.

## Rollback Strategy

Describe how to recover the task's changes while preserving unrelated user work. Include data/schema compatibility and any restore requirements. This strategy is not permission to reset Git, delete data, or deploy.

## Known Risks

Record unresolved risks, assumptions, and decisions that block dependent work.

## Approval Required

Set `Approval Required: YES` for Level 3 or any outstanding developer decision affecting implementation. Otherwise set `Approval Required: NO` for authorized Level 1/2 work.

## Approval Status

Approval Status: PENDING

Allowed values: PENDING / APPROVED / REJECTED. For `Approval Required: NO`, PENDING is an unused approval field and does not create a gate or imply approval. For Level 3 or any required decision, implementation must wait for actual developer approval recorded here as APPROVED.

## Approved By

Not yet recorded. Record the actual developer who approved; Codex cannot approve its own plan.

## Approval Notes

Not yet recorded. On a real decision, record date, plan revision, approved scope/operations, and source (message reference or short accurate quotation with date). Never infer approval from silence or generate it to unblock work.

Material changes require a dated new revision, retained approval history, PENDING status, and renewed approval before implementing changed work. Record previous decisions here instead of silently replacing them.
