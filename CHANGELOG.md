# Changelog

All notable checkpoint documentation changes are recorded here.

## 2026-06-18

### Added

- Added root project checkpoint documentation.
- Added `PROGRESS.md` with Done, In Progress, Pending, Blocked, and Next Recommended Step sections.
- Added `ROADMAP.md` with the requested future implementation order.
- Added `API_ENDPOINTS.md` with backend API routes, frontend routes, and missing route notes.
- Added root `.env.example` reference template.

### Changed

- Updated root `README.md` to reflect the current inspected Laravel + React status.

### Verification

- `npm run build` was attempted and blocked by local PowerShell execution policy for `npm.ps1`.
- `npm.cmd run build` passed.
- `php artisan route:list` passed and showed 18 routes including framework routes.
- `php artisan migrate:status` passed and showed all default app migrations as run.

### Needs Verification

- Tenant migration status per tenant database.
- End-to-end Stripe subscription flow.
- Tenant routes/UI and subscription routes/UI, because scaffolded code exists but no routes are registered.
- Activity logging usage beyond model/trait scaffolding.
