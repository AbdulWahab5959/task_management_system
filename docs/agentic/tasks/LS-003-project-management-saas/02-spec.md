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

- Projects: list/search/filter, create, show, update, archive, authorized delete; statuses `active`, `on_hold`, `completed`, `archived`; dates and creator included.
- Tasks: list/search/filter by status/priority/assignee/due date, create, update, delete, assignment, status/priority changes, and project-scoped retrieval; statuses `todo`, `in_progress`, `review`, `done`; priorities `low`, `medium`, `high`, `urgent`.
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

