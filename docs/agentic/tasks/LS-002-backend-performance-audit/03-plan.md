# Implementation Plan

## Sources

- [00-requirement.md](00-requirement.md)
- [01-investigation.md](01-investigation.md)
- [02-spec.md](02-spec.md)
- Developer approval to prepare planning only, 2026-09-14.

## Task Risk Level

Level 3 for implementation planning because the proposed API/frontend behavior touches authenticated support access and must preserve organization isolation. The current work is documentation-only.

## Summary

Plan revision LS-002-P1 (2026-09-14): define and, only after renewed approval, implement bounded support-message retrieval with a compatible pagination contract. No implementation is authorized by the current developer approval.

## Files To Modify

None authorized at this stage. Candidate files, pending approval, are `backend/app/Http/Controllers/Api/SupportController.php`, `backend/app/Services/SupportService.php`, `frontend/src/services/support.service.ts`, `frontend/src/components/support/SupportWidget.tsx`, and related tests/API documentation.

## Files To Create

None for implementation. Tests or API documentation may be added only after the contract is approved.

## Files Explicitly Not To Modify

Do not modify LS-001 artifacts, billing, authentication, tenant provisioning, database schema/migrations, unrelated dashboard code, unverified SQLite files, or `saas_system`.

## Implementation Steps

### Step 1 — contract decision

Confirm page size, cursor/direction, response metadata, admin-route scope, rollout, and client fallback. Stop if the decision changes beyond support history.

### Step 2 — backend implementation (approval required)

Add validated bounded retrieval while preserving conversation ownership, active membership, organization authorization, throttling, deterministic ordering, and controlled errors. Add focused backend tests for positive and negative access cases.

### Step 3 — frontend implementation (approval required)

Update the support service/widget to request pages, merge deterministically, prevent organization-switch races, and expose accessible loading/error/end states. Add focused frontend tests where the current test setup supports them.

### Step 4 — verification

Run backend tests from `backend`, frontend lint/build from `frontend`, and disposable synthetic measurements using the approved fixture matrix. Record exact commands, dates, exit statuses, and sanitized results.

## Database Changes

None planned. Any index or migration requires a revised plan, explicit approval, and a separate recovery review.

## API Changes

Potential pagination parameters and metadata for support messages; exact contract is pending. Existing `data` compatibility and admin-route impact must be resolved first.

## Frontend Changes

Potential support-widget pagination, merge, loading, retry, and accessibility changes; not authorized yet.

## Backend Changes

Potential controller/service validation and bounded query changes; not authorized yet.

## Security Considerations

Preserve Sanctum identity, conversation ownership, active organization membership, cross-organization rejection, tenant ordering, throttling, and safe error/logging behavior. Never trust client ownership identifiers.

## Performance Considerations

Expected benefit is bounded response size and memory transfer for long conversations. Verify p50/p95, query count, slow-query metrics, and bytes at 0/100/1,000 messages. Do not claim production improvement from local results alone.

## Testing Plan

Planned only: backend authorization/contract tests; frontend pagination/merge/error tests; `php artisan test` from `backend`; `npm.cmd run lint` and `npm.cmd run build` from `frontend`; disposable measurement rerun. No checks were run in this planning step.

## Manual Verification

Use a disposable synthetic environment. Verify first page, older-page loading, empty/end states, retry, organization switching, new-message merge, invalid cursor, inactive organization, removed member, and cross-organization rejection.

## Rollback Strategy

Revert the implementation files while preserving all support records. Do not delete messages, reset databases, or use destructive Git commands. If a migration is later approved, provide a reversible migration and backup/recovery plan first.

## Known Risks

The current frontend expects `data` as an array. Cursor semantics, ordering under concurrent new messages, admin compatibility, and whether an index is needed remain unresolved. Existing evidence is synthetic and small.

## Approval Required

YES — exact API contract and implementation scope remain pending, and the proposed work touches authenticated support access and tenant isolation.

## Approval Status

APPROVED

## Approved By

Developer, 2026-09-14.

## Approval Notes

On 2026-09-14, the developer first approved planning and then approved this exact implementation scope: “Use cursor-based pagination for customer support history. Keep `data` as an array. Add `next_cursor` and `has_more` metadata. Enforce a server-side page-size limit. Apply the same contract to the admin support-history route. Preserve authentication, tenant isolation, authorization, billing ownership, and all existing messages. No database migration unless separately approved.” Any material contract, route, schema, authorization, billing, or frontend scope change requires renewed approval.
