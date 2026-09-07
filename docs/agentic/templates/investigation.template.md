# Investigation

Use this template for `01-investigation.md`. Prefix findings with FACT, INFERENCE, RECOMMENDATION, or REQUIRES APPROVAL. Cite evidence for facts and the reasoning/uncertainty for inferences. Recommendations do not become requirements or approved architecture automatically. Mark irrelevant sections with a reason and unknowns as unverified.

## Sources

Reference `00-requirement.md`, applicable policy, inspected files, tests, documentation, and actual commands. Include revisions or line references where useful; list only sources actually read.

## Requirement Summary

Summarize the recorded request and acceptance criteria without expanding scope.

## Repository State

Record the branch, base commit, investigation date, `git status`, staged/unstaged diff state, and relevant untracked files. Identify pre-existing user work and how it will be preserved.

## Current Execution Flow

Trace the current path from entry point through validation, authorization, services, storage, and response, as applicable. Distinguish observed behavior from inferred behavior.

## Current Architecture

Describe relevant boundaries and ownership using repository evidence.

## Root Cause / Functional Gap

State the verified cause or missing behavior. Include reproduction evidence; label a suspected cause as INFERENCE until verified.

## Affected Files

List likely affected paths and explain why. This is an investigation finding, not authorization to edit every listed file.

## Affected Components

Identify callers, consumers, shared components, and dependencies.

## Database Findings

Record relevant models, migrations, schema assumptions, connections, data impact, and verification limits. Do not execute a migration or mutate important data as investigation.

## API Findings

Record current routes, methods, contracts, consumers, and compatibility concerns.

## Authentication / Authorization Findings

Trace identity, permissions, ownership, and organization checks before tenant access.

## Frontend Findings

Describe relevant state, routing, API clients, and loading/empty/error behavior.

## Backend Findings

Describe relevant request validation, controllers, services, transactions, and error handling.

## Security Findings

Record evidenced security risks and required decisions without exposing sensitive data.

## Performance Findings

Record measured behavior or clearly labeled risks; do not invent measurements.

## Existing Tests

List relevant test files and cases, what they cover, and gaps. Separate tests inspected from tests actually executed.

## Risks

Identify scope, regression, data, and operational risks. Reassess the task level if necessary.

## Recommendations

Label each proposed change RECOMMENDATION, with rationale and scope impact. Record required developer decisions before promoting it into the spec or plan.

## Alternatives Considered

Describe viable alternatives, tradeoffs, and why each remains open or was rejected.

## Requires Human Decision

Label each unresolved decision REQUIRES APPROVAL and state which work depends on it. Link actual decisions when received.

## Unknown / Unverified Items

List unresolved assumptions, unavailable sources, unrun checks, and the next step to resolve each.

## Confidence

Score investigation confidence from 1-10 and explain the evidence and limitations. This is not a test result.
