# Technical Specification

Use this template for `02-spec.md`. Required for Level 3 and for Level 2 when behavior, API contracts, architecture, or compatibility needs clarification. Keep proposed decisions visibly pending until approved; major architecture changes require an identified human decision.

## Sources

- `00-requirement.md`, including recorded amendments.
- `01-investigation.md`, distinguishing facts from proposals.

Add actual policy and decision references used to draft this specification.

## Approved Behavior

Describe behavior already authorized by the requirement or a recorded developer decision, citing that source. Separate proposed behavior still awaiting approval. This heading alone does not indicate approval or authorize Level 3 implementation.

## User Flow

Describe the intended steps, visible outcomes, and failure/recovery paths.

## Frontend Design

Describe affected views, components, state, and existing patterns to reuse.

## Backend Design

Describe trusted boundaries, service responsibilities, and transaction behavior.

## API Design

Define methods, routes, request/response shapes, validation, status codes, and compatibility. Mark any new contract awaiting a decision.

## Database Design

Describe schema, connections, migration/data impact, constraints, and recovery requirements without executable destructive operations.

## Authentication

Define how authenticated identity is resolved and invalid/expired credentials are handled.

## Authorization

Define server-owned ownership, roles, permissions, and negative access cases.

## Tenant Isolation

Define organization resolution and access checks before tenant-connection use. Include cross-organization and inactive/removed-member behavior.

## Validation

Define accepted input, bounds, normalization, and invalid-input outcomes.

## Error Handling

Define controlled errors, loading/empty/retry behavior, safe logging, and duplicate-request handling.

## Security Requirements

Reference applicable permanent policy and add concrete task-specific protections and checks.

## Performance Requirements

Define measurable budgets or state what remains unmeasured; identify relevant load assumptions.

## Accessibility

Define applicable keyboard, focus, labeling, contrast, and assistive-technology behavior, or explain why not applicable.

## Backward Compatibility

Describe existing consumers and data that must remain compatible, including rollout constraints.

## Edge Cases

List boundary, concurrency, retry, missing-data, and partial-failure cases relevant to this change.

## Acceptance Criteria

Map each requirement criterion ID to specified behavior and a verification method. New criteria need a recorded requirement amendment.

## Explicit Non-Goals

Restate task-specific exclusions and rejected expansion; do not convert recommendations into scope.

## Human Decisions / Approvals

List pending decisions and their implementation dependencies. For confirmed decisions, record the developer, date, scope, and source. Specification agreement does not replace explicit approval of the Level 3 plan in `03-plan.md`.
