# Technical Specification

## Sources

- `00-requirement.md`, including its recorded scope and non-goals.
- `01-investigation.md`, distinguishing facts from proposals.
- `backend/config/permissions.php`, `app/Services/TenantPermissionService.php`, `routes/api.php`, `frontend/AGENTS.md` (the presentation layer must not authorize locally).

## Approved Behavior

Authorized by the developer's recorded selection in `00-requirement.md` ("Fix the defects and the universal-modal slice together as one Level 2 task"):

- One task editor serves create, view, edit, assign, status, priority, and subtask management from both Project Detail and My Tasks.
- Every Add task entry point opens that editor with the context that entry point already implies.
- The five verified defects are corrected without changing authentication, authorization, tenant isolation, routes, or schema.

Proposed in this specification within the authorized intent above:

- Section `tasks_total` reports top-level tasks only.
- The project header count is labelled "workspace members".
- Task edit keeps the existing project fixed.

## User Flow

Create from a project section:

1. The user opens a project, expands a section, and selects Add task.
2. The full editor opens with Project and Section already resolved.
3. The user completes any remaining fields and selects Create task.
4. The editor closes, the project reloads, and the new task appears in that section; progress and counters update.

Create from the project header:

1. The user selects Add task in the project header.
2. The editor opens with the project set and no section selected.
3. On submit the task appears under Unsorted work until a section is chosen.

Create from My Tasks:

1. The user selects Add task on My Tasks.
2. The editor opens with a project selector, because this page has no project context.
3. The user chooses the project, then optionally section, assignees, status, priority, and dates.
4. On submit the page reloads the assigned-task list and shows a success confirmation naming the project.

Edit or delete an existing task:

1. The user selects a task row on either page.
2. The same editor opens in edit mode; Project is displayed but not editable.
3. Users with the delete capability see Delete task; users without it do not.
4. On save or delete, the page reloads and confirmation appears only after the authoritative response returns.

Failure and recovery: if the server rejects a mutation, the editor stays open, duplicate submission stays disabled, and the server's first validation message is shown when one exists, otherwise the existing fallback text. If loading a task's detail fails, the editor keeps the row data it already had and shows the existing error text.

## Frontend Design

`TaskDetailModal` gains `project_id` in its form state and an optional `projects` prop.

- The effective project derives from the form state; when editing an existing task it is seeded from the task and rendered read-only, preserving today's behavior.
- The section-list effect keys on the effective project and falls back to the caller-provided sections only when the effective project matches the caller's project.
- The due-date `max` derives from the effective project's `due_date`.
- Changing the project while creating clears `section_id`, because sections belong to a project.
- The create-mode Project row renders a select over the `projects` prop when supplied; otherwise it stays the current read-only label.

`ProjectSection` replaces its inline `TaskQuickAdd` body with an Add task button that reports only the target section id. `TaskQuickAdd.tsx` is deleted.

`MyTasksPage` adds create-mode state using the same dialog component, loads the project list once per tenant for the selector and the due-date lookup, and passes the task's project due date in edit mode.

New utilities: `src/utils/taskPermissions.ts` (tenant-scoped capability checks) and `src/utils/apiError.ts` (validation-message extraction).

## Backend Design

No service or transaction change. Two read-only aggregations change scope: `ProjectSectionController` and `ProjectController::show` count a section's top-level tasks. `TaskController` remains the only task write path and keeps every existing validation and authorization rule.
## API Design

Unchanged methods, routes, payloads, and status codes.

One response-field clarification, recorded for traceability:

- `GET /api/tenant/projects/{project}` -> `data.sections[].tasks_total`, and `GET /api/tenant/projects/{project}/sections` -> `data[].tasks_total`, now count tasks whose `parent_task_id` is null. Previously the value counted all tasks in the section, including subtasks. No in-repository consumer reads this field; `ProjectSection.tsx` uses the caller-supplied task list.

Task requests are unchanged. The frontend now sends `project_id` from the editor's selected project when creating, which `TaskController::store` already accepts and validates.

## Database Design

None. No migration, no schema change, no data mutation, no backfill.

## Authentication

Unchanged. Existing Sanctum resolution applies. No new credential or session path.

## Authorization

Mirrored on the client for control visibility only, matching `TenantPermissionService`:

- create: `tasks.create`
- update: `tasks.update`, and for a member-role user the user must be an assignee or the creator
- delete: `tasks.delete`, plus the same member-role relationship condition

Owners and admins satisfy every key through `TenantPermissionService::userCan`. The server remains authoritative; a client that renders a control it should not have still receives the existing 403.

## Tenant Isolation

Unchanged. The editor never selects a tenant. `project_id` travels as a resource identifier and is resolved through the tenant-scoped `Project` model, so a cross-organization project id still fails with the existing not-found behavior.

## Validation

Unchanged server-side rules: task title required on create, section must belong to the project, parent task must belong to the project, start date must not exceed due date, due date must not exceed the project deadline, assignees must be active organization members, and members may assign only themselves.

Client-side: the editor continues to require a non-empty title, applies the effective project's deadline as the due-date maximum, and disables submission while a request is in flight.

## Error Handling

- A rejected mutation keeps the editor open and shows the server's first `errors.*` message, then its `message`, then the existing fallback string.
- Success feedback on My Tasks appears as a dashboard alert after the list reload resolves.
- Loading states keep the existing inline table loader on the project page, the dialog's detail loader inside the editor, and the existing full-page loader on first paint.
- Empty states are unchanged: an empty section keeps its inline empty text, and an empty My Tasks list keeps its current empty state.
- Duplicate submissions stay disabled through the existing `saving`/`deleting` flags.

## Security Requirements

- No secret, filesystem path, SQL, stack trace, or raw provider response is rendered; only Laravel validation/`message` fields already returned to the client.
- No authorization decision moves to the client; the helper is presentation-only.
- No new endpoint, so the existing middleware chain remains the only entry gate.

## Performance Requirements

No measured budget. The change adds one project-list request on My Tasks and a constrained aggregate per section query. Not measured in this environment.

## Accessibility

- Add task remains a real `button`, so it stays keyboard reachable and announces its label.
- The editor keeps `dialog` semantics, `aria-label`, Escape handling, and title autofocus.
- The new project select uses the existing `dashboard-control` class and a visible label, matching the other editor fields.
- The member-count relabel keeps the existing decorative icon marked `aria-hidden`.
- No new color-only signal is introduced.
## Backward Compatibility

- Routes, payloads, permission keys, and status codes are unchanged.
- `TaskQuickAdd.tsx` and its `QuickTaskInput` type are removed; they had no other importer.
- The only response-value change is the documented `tasks_total` scope.
- Existing rows, dates, and assignee records are untouched, so no data migration is required for already-created tasks.

## Edge Cases

- Unsorted pseudo-section (`section: null`): Add task opens the editor with no section, matching the current null-section behavior.
- Editing a task whose section was deleted: the select falls back to "No section" and the backend keeps its existing validation.
- A project with no deadline: the due-date maximum stays unset, exactly as today.
- Project switch during creation: `section_id` resets, preventing a cross-project section from being submitted.
- A member creating a task without self-assignment: the task does not appear in their list; the confirmation names the project, which is why the success feedback is required.
- A member without `tasks.delete`: Delete task is not rendered, matching the existing 403.
- A section containing only subtasks: the count is zero because subtasks are not top-level tasks.

## Acceptance Criteria

- AC-1: add-task in a section opens the editor with that section selected - `ProjectSection` control plus manual check.
- AC-2: header add-task opens the editor with no section - `ProjectDetailPage` control plus manual check.
- AC-3: My Tasks create path with project selection - `MyTasksPage` plus manual check.
- AC-4: due-date maximum equals the effective project deadline in create and edit modes on both pages - code inspection plus manual check.
- AC-5: server validation message surfaced - `apiError` helper plus manual check.
- AC-6: delete shown only with `tasks.delete`; the update rule matches `TenantPermissionService` - code inspection plus permission middleware tests.
- AC-7: member label states workspace membership - code inspection.
- AC-8: section `tasks_total` counts top-level tasks - new `ProjectTaskTest` assertion.
- AC-9: no schema/route/middleware change - `git diff` inspection.

## Explicit Non-Goals

- Any new tenant table, column, or migration.
- Labels, filters, Inbox, Today/Upcoming navigation, comments, activity, notifications, recurrence, reminders, attachments, dependencies.
- Row-level polish: inline title editing, row action menus, avatars, overdue styling, keyboard shortcut.
- Changing a task's project while editing it.
- Changing routes, middleware, permission keys, or validation rules.
- Amending LS-003 artifacts.

## Human Decisions / Approvals

Confirmed: the developer authorized this bundle as one Level 2 task on 2026-09-18 (see `00-requirement.md`).

Pending: whether `review` should exist as a task status. Recorded in `01-investigation.md`; no implementation dependency.