# Investigation: Organization overview and management page

## Current flow

- `frontend/src/pages/Dashboard/OrganizationsPage.tsx` renders `OrganizationManagementPanel`.
- `frontend/src/components/dashboard/OrganizationManagementPanel.tsx` owns organization selection, creation, settings loading/saving, primary-organization changes, deletion safeguards, and billing-limit handling.
- `frontend/src/services/tenant-dashboard.service.ts` already exposes the tenant-scoped dashboard summary endpoint.
- `frontend/src/types/tenant-dashboard.types.ts` already models organization profile, team, billing, projects/tasks, activity, and setup checklist data.
- `frontend/src/components/dashboard/StatsCard.tsx` and `SetupChecklist.tsx` provide existing dashboard visual primitives.

## Findings

1. The organization panel previously rendered the complete organization settings form inline beneath the organization list. This made the page long and mixed management fields with overview content.
2. The create form is already modal-based, so the existing form interaction can be reused for editing without introducing a new page or API contract.
3. The summary endpoint supplies the requested overview data and keeps the page aligned with the dashboard’s server-owned tenant scope.
4. The modal overlay used a scrollable outer container while the dialog content could also exceed the viewport. Without locking the document body, this creates the reported double-scroll experience.
5. Existing dirty work in the repository is broader than this task. Changes must stay scoped to the organization panel and task artifacts; unrelated edits must remain untouched.

## Design direction

Use the existing LaunchStack visual language: indigo as the interaction accent, green for healthy/completed state, amber for attention, violet for team/work signals, quiet slate surfaces, restrained borders, and the same rounded controls used elsewhere in the dashboard. The page should read as an overview first, with profile editing intentionally secondary.
