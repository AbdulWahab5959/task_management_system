# Implementation Review

Use this template for `04-review.md` only after implementation. Compare the actual task diff with the requirement, investigation, applicable spec, and plan, including its approval when required. Identify the reviewer and date; an agent self-review is not independent human approval.

## Sources

Reference `00-requirement.md`, `01-investigation.md`, applicable `02-spec.md`, and `03-plan.md`. Record the task base revision and actual staged/unstaged/committed diff inspected. Inspect new untracked file contents separately because normal `git diff` omits them.

## Requirement Coverage

Map each acceptance criterion to implemented behavior and source evidence. Report missing or changed behavior explicitly.

## Plan Compliance

Compare implementation with planned steps, scope, and decisions. Confirm required approval applied to the implemented plan revision; explain deviations without rewriting history.

## Changed Files

List actual modified, added, and deleted task files with their purpose.

## Unexpected Changes

Identify changes outside the plan and pre-existing unrelated work separately. Explain disposition without discarding user work; state None only after inspection.

## Code Quality

Assess maintainability, consistency with existing patterns, unnecessary complexity, and clarity of the change.

## Backend Review

Review applicable controllers, services, validation, errors, and transactions, or explain why not applicable.

## Frontend Review

Review applicable state, API integration, accessible interaction, and loading/empty/error behavior.

## Database Review

Review schema/data impact, migration compatibility, connection use, and recovery requirements.

## API Review

Check implementation against contracts, consumers, status codes, and compatibility requirements.

## Authentication Review

Check authenticated identity handling and invalid/expired credential paths.

## Authorization Review

Check server-side ownership, role/permission enforcement, and rejection paths.

## Tenant Isolation Review

Check organization access before tenant use and cross-organization regression risks.

## Security Review

Review task-specific protections, sensitive-data handling, and applicable permanent rules.

## Performance Review

Assess evidenced performance impact and unverified concerns without inventing measurements.

## Regression Risks

List affected existing behavior and required QA coverage.

## Missing Tests

Identify uncovered acceptance criteria and meaningful regression checks still needed.

## Issues Found

For each issue record source, impact, required action, and resolution status. Retain failures and resolutions through review updates.

### Critical

Record findings, or None identified after review; use Not assessed if this area was not reviewed.

### High

Record findings, or None identified after review; use Not assessed if this area was not reviewed.

### Medium

Record findings, or None identified after review; use Not assessed if this area was not reviewed.

### Low

Record findings, or None identified after review; use Not assessed if this area was not reviewed.

## Recommendation

Not assessed. Select READY FOR QA or CHANGES REQUIRED based on the actual review and explain any remaining blockers. Readiness is not commit, release, or human approval.
