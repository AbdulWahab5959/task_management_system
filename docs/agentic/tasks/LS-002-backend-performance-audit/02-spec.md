# Technical Specification

## Sources

- [00-requirement.md](00-requirement.md)
- [01-investigation.md](01-investigation.md)
- Developer approval to prepare implementation planning for bounded/paginated support history, 2026-09-14.

## Approved Behavior

The approved decision is limited to preparing this specification and plan. No support API, frontend, database, authorization, or billing behavior is approved for implementation.

## User Flow

An authenticated user opens support for an organization they can access. The client requests the first bounded page of that organization's conversation, displays messages in chronological order, and requests older messages only through an explicit continuation action or equivalent controlled loading behavior. Empty history, end-of-history, retry, and expired-auth states remain controlled.

## Frontend Design

The support widget and support service are affected consumers. Existing message normalization and merge behavior should be reused. The client must preserve the current organization selection, avoid mixing messages when the organization changes, show loading/error states, and retain newly sent messages while older pages load. No frontend change is authorized by this document.

## Backend Design

The trusted backend resolves the authenticated user and owned conversation, verifies active organization membership, and only then serves the conversation. Retrieval should use a bounded, deterministic query ordered by message identity/time. Any cursor must be opaque or validated server-side and scoped to the conversation.

## API Design

Current route: `GET /api/support/conversation/messages` and the corresponding admin route.

Proposed contract, pending approval: retain `data` as an array and add bounded pagination metadata, such as `next_cursor`/`has_more`, with a server-enforced maximum page size. The exact parameter and metadata names, default size, ordering, and whether the admin route changes must be decided before implementation. Invalid cursors/page sizes must return controlled 4xx responses. Existing consumers must not receive raw query details or another organization's messages.

## Database Design

No schema or data change is required for the initial proposal. Existing conversation/message indexes must be checked against the final ordering/filter. Any new index or migration is a separate approval-gated decision; no destructive data operation is permitted.

## Authentication

Use the existing Sanctum-authenticated identity. Missing, invalid, and expired credentials remain rejected by the existing middleware.

## Authorization

Conversation ownership and organization membership remain server-derived. Client-supplied user, owner, tenant, or conversation identifiers cannot override ownership. Billing ownership is unaffected.

## Tenant Isolation

Resolve and validate the active organization and membership before any tenant connection or organization-scoped read. Missing, inactive, removed-member, and cross-organization requests must be rejected without leaking message existence.

## Validation

Validate page size within a small server-owned maximum and validate cursor format, direction, and conversation scope. Reject malformed or conflicting pagination inputs with a controlled 4xx response.

## Error Handling

Preserve controlled JSON errors, retry behavior, and empty-state behavior. Do not log message bodies, cursors containing sensitive data, credentials, or raw SQL.

## Security Requirements

Follow `AGENTS.md` and `backend/AGENTS.md`. Preserve Sanctum, organization authorization, tenant-connection ordering, throttling, and privacy controls. Support messages remain distinct from customer chatbot conversations.

## Performance Requirements

The response must be bounded by a server-owned page size. Compare p50/p95 duration, query count, slow-query count, and response bytes against the recorded baseline using 0/100/1,000-message synthetic fixtures. A repeated p95 regression over 20% or unexpected response growth blocks release of the candidate change. Local measurements are not production SLOs.

## Accessibility

If the widget gains a load-older control, it must be keyboard reachable, labeled, announce loading/errors appropriately, and preserve the existing message-log semantics. This is pending frontend implementation approval.

## Backward Compatibility

Existing `data` array consumers must remain compatible where possible. A contract change must define rollout, default behavior, admin-route impact, and client fallback before implementation. Existing message records must remain unchanged.

## Edge Cases

- empty conversation;
- exactly one page and exact page boundary;
- deleted or inaccessible conversation;
- organization switch during a request;
- duplicate/retried page request;
- new message arriving between page requests;
- invalid, expired, or cross-conversation cursor;
- inactive organization or removed member.

## Acceptance Criteria

The original investigation criteria remain unchanged: separate LS-002 scope, labeled findings, accurate measurements, no unapproved application/database changes, and deferred implementation. Proposed additional verification must prove bounded response size, ordering, pagination boundaries, authorization negatives, tenant isolation, and frontend retry/merge behavior.

## Explicit Non-Goals

No implementation, query rewrite, cache, index, schema migration, deletion, billing change, authentication change, or unrelated dashboard optimization is included.

## Human Decisions / Approvals

- Confirmed: use cursor-based pagination for customer support history; keep `data` as an array and add `next_cursor` and `has_more`; enforce a server-side page-size limit; apply the same contract to customer and admin support-history routes; preserve authentication, tenant isolation, authorization, billing ownership, and existing messages. Approved by the developer on 2026-09-14 in the conversation.
- Confirmed: implementation of this exact backend/frontend/API scope is approved. No database migration, cache, unrelated optimization, or behavior outside this scope is approved.
- Pending: approve any index, migration, cache, or query rewrite if later evidence requires it.
