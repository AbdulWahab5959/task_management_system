# LS-003 - Specification

## Status

PENDING DEVELOPER APPROVAL

## Proposed architecture

1. Preserve the existing central database plus per-tenant database architecture.
2. Resolve and authorize the active tenant with existing middleware before any tenant connection use.
3. Keep `projects` and `tasks` tenant-local. Add only missing fields and indexes through reversible tenant migrations; do not add redundant `tenant_id` columns unless the architecture is intentionally changed and separately approved.
4. Add centralized project/task authorization through the existing permission registry/service or policies, with explicit Owner/Admin/Member behavior and server-side membership checks.
5. Validate task assignees against active membership in the resolved central tenant before writing the tenant-local task row.
6. Add typed REST endpoints using existing API response/error conventions, pagination for lists, validated filters, and eager-loaded counts/relationships where supported by the connection model.
7. Add a bounded tenant dashboard summary endpoint that aggregates counts and recent records within the resolved tenant, avoiding full-dataset loading.
8. Preserve existing billing behavior initially. Any entitlement mapping for project/task limits must use server-owned plan data and be resolved as a compatibility-preserving change.

## Proposed resource behavior

- Projects: list/search/filter, create, show, update, archive, authorized delete; statuses `active`, `completed`, `archived` (AMENDED 2026-09-18, see Revision 1 below); dates and creator included.
- Tasks: list/search/filter by status/priority/assignee/due date, create, update, delete, assignment, status/priority changes, and project-scoped retrieval; statuses `todo`, `in_progress`, `done` (AMENDED 2026-09-18, see Revision 1 below); priorities `low`, `medium`, `high`, `urgent`.
- Project detail: summary, progress derived from task status, member display resolved safely, paginated task list, and empty/error/loading states.
- Dashboard: total/active/completed projects, total/completed/overdue tasks, team count, current user's tasks, recent projects/tasks, and upcoming deadlines.

## Security contract

- Never authorize from client-selected tenant, owner, creator, assignee, subscription, or payment identifiers.
- Every resource lookup must be tenant-connection scoped after membership validation; central membership checks must occur before tenant connection use.
- Only same-tenant active members may be assigned to tasks.
- Owner cannot be removed or demoted; Admin cannot modify Owner or manage billing unless existing approved behavior explicitly allows it; Member cannot manage team/billing/tenant settings.
- Fix and test the unprotected permanent-tenant-delete route before declaring tenant security complete.

## Open decisions requiring approval

- Whether the first implementation includes project/task plan limits, and which existing entitlement keys represent them.
- Whether `on_hold` and `review` are additive enum migrations compatible with all supported databases.
- Exact pagination contract and response shapes for projects/tasks/dashboard.
- Whether project deletion is hard delete or archive-first, considering tenant-local data retention.
- Whether platform super-admins can inspect tenant-local project/task data, and under what explicit route/authorization contract.
- Whether to update existing chatbot-oriented plan copy now or defer it to a separate documentation/product task.

## Revision 1 — 2026-09-18: Status enum amendment (approved)

**Approved by:** the developer (via direct instruction during the LS-005 session, in response to the discrepancy recorded in `LS-004/06-evidence.md` → "Outstanding Decision").

**Amendment:** The task status list is corrected from `todo`, `in_progress`, `review`, `done` to `todo`, `in_progress`, `done`. The project status list is corrected from `active`, `on_hold`, `completed`, `archived` to `active`, `completed`, `archived`.

**Rationale:** The shipped implementation never included `review` or `on_hold`. Every authoritative artifact — `backend/database/migrations/tenant/2026_06_12_000003_create_tasks_table.php` (line 16), `2026_06_12_000002_create_projects_table.php` (line 15), `TaskController::STATUSES` (line 17), and `frontend/src/types/project.types.ts` — defines the three-value enums, and all 163 backend tests plus both dashboard flows rely on them. The original spec listed aspirational statuses that were never approved for implementation. This amendment makes the specification match the tested, shipped contract.

**Corresponding open-decision resolution:** the open decision item "Whether `on_hold` and `review` are additive enum migrations compatible with all supported databases" is resolved as "not pursued — statuses removed from scope by this amendment." Reintroducing either status later requires a new requirement artifact, an enum migration with data review, and renewed developer approval.

**No code change** accompanies this amendment; it is documentation-only.

