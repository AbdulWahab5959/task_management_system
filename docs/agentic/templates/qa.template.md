# QA Report

Use this template for `05-qa.md` after implementation and review. Record only actual observations. Never claim a command ran unless it ran; planned, skipped, and blocked checks must be labeled explicitly. Use Not applicable with a reason for irrelevant areas.

## Sources

Reference `00-requirement.md`, `01-investigation.md`, applicable `02-spec.md`, `03-plan.md`, and `04-review.md`, plus actual test/evidence sources.

## Environment

Record date, verifier, branch/revision, relevant local changes, tool versions when relevant, and test environment. Identify database isolation or other prerequisites before tests that mutate state. Do not include secret values or private customer data.

## Automated Tests

Record working directory, exact command, execution time, exit status, and observed result in the table. Use PASS / FAIL / NOT RUN / BLOCKED. Retain failed runs when adding reruns; do not substitute a historical documented baseline for current execution.

| Command | Result | Notes |
| --- | --- | --- |

## Functional Tests

Map tests to acceptance criterion IDs. Enter the actual result only after verification; otherwise mark NOT RUN or BLOCKED with the reason.

| Test | Expected | Actual | Status |
| --- | --- | --- | --- |

## Authentication Tests

Record relevant credential and session scenarios, observed results, and evidence.

## Authorization Tests

Record relevant ownership/role/permission and negative-access cases.

## Tenant Isolation Tests

Record relevant cross-organization, inactive-organization, and removed-member cases.

## API Tests

Record relevant contract, validation, status, and compatibility checks.

## Database Tests

Record relevant migration/data checks, target environment, and actual results. Do not run destructive checks without scoped authorization.

## UI Tests

Record relevant state, keyboard, focus, labeling, and interaction checks.

## Responsive Tests

Record actual viewport/device checks and their observations; do not infer visual success from a build.

## Error Handling Tests

Record relevant loading, empty, validation, unauthorized, rate-limit, retry, and partial-failure scenarios.

## Regression Tests

Record checks of affected existing behavior and their actual results.

## Edge Cases

Record boundary, concurrency, duplicate-request, and missing-data checks as applicable.

## Failed Tests

List failures, evidence, fixes, and rerun results. Do not erase earlier failures; distinguish resolved from unresolved failures.

## Manual Verification Required

List remaining checks, expected outcomes, who/access is needed, and blockers. Use None only when all required manual work is complete or not applicable with a reason.

## QA Result

Not assessed. Select PASS / FAIL / PARTIAL with rationale. PASS requires all required acceptance checks to have actually passed; FAIL indicates unresolved failures; PARTIAL indicates incomplete or blocked required verification.
