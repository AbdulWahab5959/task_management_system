# Review: Organizations page consistency and loading performance

## Implemented

- Organization selector cards now use the shared dashboard card surface treatment and only show a selection check for the active organization.
- Snapshot cards have a stable minimum height so wrapped values do not leave an empty-looking fourth card or shift the grid.
- Current billing remains available for the create-limit decision, but billing plans are fetched only when the limit dialog is actually opened.
- Organization settings are no longer fetched on initial page load. The existing summary response populates the editor; settings are fetched only if the editor is opened without summary data.
- Removed the duplicate tenant refresh and summary fetch from the create callback because `TenantContext.createTenant()` already refreshes/selects the new tenant and the active-tenant effect loads the summary.
- Added in-flight reuse for tenant summaries and current billing to prevent StrictMode development effect replay from issuing duplicate requests.
- Preserved existing tenant-scoped API calls, authorization behavior, routes, and shared button component.

## Backend review

The existing summary endpoint performs several sequential tenant/project/task/subscription queries, but no backend code was changed because the confirmed page-level waste could be removed without changing the API contract or tenant authorization path.
