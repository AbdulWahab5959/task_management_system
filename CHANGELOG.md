# Changelog

All notable checkpoint documentation changes are recorded here.

## 2026-06-19

### Added

- **Backend: AnalyticsController** (`backend/app/Http/Controllers/Admin/AnalyticsController.php`)
  - New `GET /api/admin/analytics` endpoint protected by `auth:sanctum` and `admin` middleware.
  - Returns real database metrics: total/verified/unverified users, new users this month, contact messages total/new, activity log count.
  - Returns recent 5 users (safe fields only: id, name, email, role, email_verified_at, created_at).
  - Returns recent 10 activity logs with user info.
  - Returns contact message summary (new, read, replied).
  - Efficient counts using `count()`, no loading all records into memory.

- **Frontend: Admin Analytics Dashboard** (`frontend/src/pages/Dashboard/AdminPage.tsx`)
  - Fully replaced placeholder admin page with real analytics dashboard.
  - Stats cards for 7 metrics with color-coded variants.
  - Recent users table (name, email, role, verified status, joined date).
  - Recent activity table (action, user, date with description).
  - Contact message summary (new, read, replied counts).
  - Loading state with animated skeleton placeholders.
  - Error state with retry button.
  - Empty state when no data is available.
  - Responsive Tailwind CSS layout matching existing dashboard design.

- **Frontend: Types** (`frontend/src/types/admin-analytics.types.ts`)
  - TypeScript interfaces for `AdminAnalyticsStats`, `RecentUser`, `RecentActivityItem`, `ContactSummary`, `AdminAnalyticsResponse`.

- **Frontend: Service** (`frontend/src/services/admin-analytics.service.ts`)
  - `adminAnalyticsService.get()` calling `GET /api/admin/analytics`.

### Changed

- `backend/routes/api.php` — Added route for `GET /api/admin/analytics` inside the `auth:sanctum` + `admin` middleware group.
- `PROGRESS.md` — Moved admin analytics from Pending to Done.

### Security

- `EnsureAdminRole` middleware protects the analytics endpoint — normal users receive 403.
- No sensitive data exposed: passwords, tokens, reset tokens, remember tokens, SMTP values are never returned.
- Safe user fields only: id, name, email, role, email_verified_at, created_at.

### Verification

- `php artisan route:list` confirmed `GET|HEAD api/admin/analytics` is registered under `Admin\AnalyticsController@index`.
- TypeScript compilation passed with `npx tsc --noEmit`.

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
