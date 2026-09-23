# Requirement

Workflow reference: [docs/agentic/README.md](../../README.md)

## Title

Unify task creation on the full task editor and correct verified project/task surface defects.

## Task ID

LS-004-task-creation-modal-unification

## Task Level

Level 2 - Standard engineering.

Rationale: the change touches multiple frontend files plus a narrow, non-destructive section-count contract alignment in two controllers. It changes no schema, no migration, no authentication, no tenant resolution, no billing, and no authorization rule. Existing routes and permission middleware stay identical. Per [the workflow guide](../../README.md), Level 2 requires `00` -> `01` -> optional `02` -> `03` -> implementation -> `04` -> `05` -> `06` with no automatic plan-approval gate.

A sibling recommendation (polish items: row actions, inline title editing, avatars, overdue styling, keyboard shortcut) is explicitly deferred to a follow-up task and is not authorized here.

## Original User Request

Date: 2026-09-18. Source: developer message in the VS Code session.

The developer supplied a long-form Todoist-comparison blueprint for the Projects and Tasks surfaces, then selected this option when asked how to proceed:

> "Fix the defects and the universal-modal slice together as one Level 2 task, then the polish items"

The selection follows a verification pass in which the blueprint's claims about the current implementation were checked against the repository. The blueprint's three false claims (My Tasks has a project selector and Add task button; every section Add task opens the full modal; the modal can select a Project) and five additional defects were reported to the developer before the selection was made.

Preserved blueprint intent relevant to this task:

- "The small inline form should not be the main task creation experience."
- "Click section Add task -> Open full task modal -> Section already selected."
- "The same task editor should be used for: creating tasks, editing tasks, viewing tasks, assigning tasks, updating status, updating priority, managing subtasks. This prevents different task behaviors in different places."
- My Tasks should let the user "create a new task" and "choose which project receives the task".

## Business Objective

Make project/task creation predictable and consistent across Project Detail and My Tasks so users complete a task with all its context in one place instead of discovering missing fields after creation, and so no surface reports a number or label the server does not actually mean.

## User Objective

An organization owner, admin, or member working in LaunchStack needs one task editor that opens from every "Add task" entry point, carries the project and section context already implied by that entry point, and never accepts input the server will reject for a reason the UI hides.

## Expected Behavior

1. `+ Add task` in any project section opens the full task editor with that section pre-selected, instead of an inline three-field form.
2. `+ Add task` in the project header opens the full task editor with no section pre-selected.
3. My Tasks exposes a create path that opens the same full task editor, and the editor lets the creator choose the destination project from that page.
4. A task created from My Tasks is confirmed to the user, because the new task may legitimately not appear in a member's assigned-task list.
5. In the editor, the due-date ceiling follows the selected project's due date, so the UI cannot offer a date the backend will reject.
6. When the server rejects a task mutation, the specific validation reason is shown instead of a generic message.
7. My Tasks offers delete and edit capability under the same rule the Project Detail page uses, derived from the tenant role/permission payload rather than duplicated per page.
8. On the project page, the member count is labelled as what the server actually returns (organization members), not project membership.
9. A section's task total counts the section's top-level tasks, matching the count badge the project page renders for that section.

Label: item 4's exact confirmation wording is an INFERENCE pending implementation review.

## Current Behavior

Verified in the repository during the verification pass recorded in `01-investigation.md`:

- The full editor exists and is complete, but is reachable only from the project header button and from clicking an existing task row.
- Each project section renders `TaskQuickAdd`, an inline title/status/priority form that is the "main task creation experience" the blueprint rejects.
- My Tasks has no create path and passes no project context to the editor.
- No items were reported by the developer as first-hand observed behavior; every item above was observed directly in code.

## Scope

- `frontend/src/components/projects/TaskDetailModal.tsx`: optional project selection for creation, project-scoped section loading, project-scoped due-date ceiling, specific server error surfacing.
- `frontend/src/components/projects/ProjectSection.tsx`: Add task opens the full editor with the section pre-selected.
- `frontend/src/components/projects/TaskQuickAdd.tsx`: removed as dead code after replacement.
- `frontend/src/pages/Dashboard/ProjectDetailPage.tsx`: task creation via the dialog, shared permission rule, member-count label.
- `frontend/src/pages/Dashboard/MyTasksPage.tsx`: create path, project options, correct project due date, delete capability, confirmation feedback.
- New shared frontend helpers for tenant-scoped task permissions and API error extraction.
- `backend/app/Http/Controllers/ProjectSectionController.php` and `backend/app/Http/Controllers/ProjectController.php`: section `tasks_total` counts top-level tasks.
- `backend/tests/Feature/ProjectTaskTest.php`: coverage for the section count and unchanged section semantics.
## Out of Scope

- Labels, filters, Inbox, Today/Upcoming navigation, comments, activity history, notifications, recurring tasks, drag-and-drop ordering, calendar/board/timeline views, reminders, attachments, dependencies (blueprint "Medium" and "Later" tiers).
- Task row polish: row actions, inline title editing, avatar display, overdue styling, keyboard shortcut (deferred follow-up task).
- Any new tenant table or column; any migration.
- Any change to routes, permission middleware, tenant resolution, or authorization keys.
- Changing a task's project while editing an existing task.
- Resolving the `review` status discrepancy between `LS-003 02-spec.md` and the implementation, which requires a developer decision (see `01-investigation.md`).
- Reopening, amending, or re-approving any LS-003 artifact.

## Constraints

- Follow root, `backend`, and `frontend` `AGENTS.md` policy.
- Preserve unrelated work; the working tree was clean at `14f96e5` when the investigation started.
- No destructive migrations, no `migrate:fresh`, no `db:wipe`, no commit, no push.
- Keep the existing visual identity and CSS class vocabulary; add no new design system.
- Frontend must not authorize locally: the backend remains the source of truth, and the shared helper only mirrors the server rule for control visibility.

## Acceptance Criteria

- AC-1: Every project-section Add task control opens the full task editor with the section pre-selected. Verification: code inspection, `npm.cmd run lint`/`build`, and the manual check in `03-plan.md`.
- AC-2: The project header Add task control opens the editor with no section pre-selected. Verification: same as AC-1.
- AC-3: My Tasks provides a create path that opens the full editor and allows choosing the destination project. Verification: same as AC-1.
- AC-4: The editor's due-date `max` equals the effective project's due date on both pages and in create and edit modes. Verification: code inspection, manual check, and the existing `test_task_due_date_cannot_exceed_project_due_date` backend rule.
- AC-5: A server rejection on task create/update shows the server's first validation message when one is returned. Verification: code inspection and manual check.
- AC-6: My Tasks passes `canDelete` for users whose tenant permissions include `tasks.delete`, and edit visibility follows the shared rule; members without `tasks.update` see a read-only editor. Verification: code inspection plus existing permission middleware tests.
- AC-7: The project page member label states organization membership. Verification: code inspection.
- AC-8: A section's `tasks_total` counts only top-level tasks. Verification: new automated test in `ProjectTaskTest`.
- AC-9: No schema, route, middleware, or authorization-key change. Verification: `git diff` inspection.
- AC-10: `php artisan test` passes with the pre-existing baseline of 162 tests plus new coverage, and `npm.cmd run lint` plus `npm.cmd run build` pass. Verification: executed commands recorded in `05-qa.md`.

## Known Risks

- Removing `TaskQuickAdd` changes the number of steps for a fast title-only capture. Mitigation: the full editor opens with the title focused and the section already selected, so a title-only task is still two actions. Investigation confirmed no other importer of the component.
- Aligning section `tasks_total` to top-level tasks changes a response field's meaning. Investigation confirmed no consumer of that field in this repository.
- Editing an existing task keeps its project fixed; a reviewer could read the blueprint's editable Project field as required. Recorded as a deliberate decision rather than an assumption.

## Human Decisions

Confirmed:

- Task bundling and level: the developer selected the defect + universal-modal bundle as a single Level 2 task on 2026-09-18, with polish items deferred to a follow-up.

Outstanding:

- Whether the `review` task status in `LS-003 02-spec.md` should be removed from that document or implemented in code. No dependent work in this task.

## Status

IN REVIEW as of 2026-09-18. Implementation complete; review, QA, and evidence are recorded in `04-review.md`, `05-qa.md`, and `06-evidence.md`.

## Requirement Amendment

None.