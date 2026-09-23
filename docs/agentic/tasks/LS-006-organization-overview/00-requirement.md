# Requirement: Organization overview and management page

## Metadata

- Task ID: LS-006
- Level: 2
- Status: IMPLEMENTING
- Date: 2026-09-21

## User request

Redesign the Organizations page as a quick, useful overview of the selected organization. Keep the organization list and create-organization action, remove the full inline profile form, add an edit-organization action that opens the existing creation form pattern, and include organization profile details, team, subscription, open tasks, projects, recent activity, actionable snapshots, and the full setup checklist. Avoid the double-scrollbar behavior in the organization modal/page.

## Acceptance criteria

1. The page keeps the existing organization list, create action, tenant selection, authorization behavior, and destructive-action safeguards.
2. The selected organization profile is presented as a read-only overview containing industry, website, phone, country, timezone, currency, contact email, description, and created date when available.
3. The inline organization form is removed from the page. Editing is available through an Edit organization action and uses a bounded modal with the same fields and save behavior as the existing form.
4. The page includes compact snapshots for profile completion, active team, subscription, open tasks, projects, completed projects, overdue tasks, and pending invitations.
5. The page includes team, subscription, open-task, recent-project, recent-activity, and setup-checklist sections using the existing tenant dashboard summary contract.
6. Buttons, controls, badges, progress indicators, and cards use the existing LaunchStack visual language and remain responsive.
7. When a modal is open, the document behind it does not scroll and the modal content has at most one internal scrollbar; the page must not show a second competing scrollbar.
8. Frontend lint and production build complete successfully after the change.

## Out of scope

- New backend endpoints, migrations, billing behavior, authorization rules, or tenant data contracts.
- Redesigning unrelated dashboard, project, task, team, or billing pages.

## Requirement amendment — 2026-09-21

- Remove the empty Recent activity panel from the organization overview.
- Shift the overview’s visual emphasis toward the existing green/amber website palette for cards and progress states, reducing violet/rose/indigo accents on this page.
