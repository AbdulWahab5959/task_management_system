# Changelog

All notable checkpoint documentation changes are recorded here.

## 2026-06-22

### Changed

- **Complete Dashboard UI/UX Redesign** — All authenticated dashboard pages and components redesigned to premium SaaS quality.

#### Layout & Navigation
- `DashboardLayout.tsx` — Updated background, text colors, and spacing for modern SaaS feel.
- `Sidebar.tsx` — Complete redesign with dark navy theme (`bg-slate-900`), indigo accent colors, professional lucide-react icons per menu item (`LayoutDashboard`, `BarChart3`, `Users`, `Activity`, `Mail`, `Settings`, `UserCircle`), improved active state with indigo glow, cleaner user section, and backdrop blur overlay on mobile.
- `DashboardNavbar.tsx` — Polished sticky header with backdrop blur, page title with breadcrumb-style label, user avatar with initials + email display, improved profile dropdown with divider, and smoother transitions.

#### Reusable Components
- `Card.tsx` — Updated to `rounded-xl` with softer shadow `shadow-slate-200/50`.
- `Button.tsx` — Changed accent from cyan to indigo, added `transition-all duration-150` for smoother hover effects.
- `Input.tsx` — Updated focus ring to indigo, added `transition-all duration-150`.
- `StatsCard.tsx` — Redesigned with larger icons (h-12 w-12), `rounded-xl` icon containers, `text-2xl font-bold` values, optional trend indicators (up/down/neutral), and additional color variants.
- `PageHeader.tsx` — Updated with indigo eyebrow color, `font-bold tracking-tight` titles, and improved spacing.
- `EmptyState.tsx` — Updated to `rounded-xl` with `bg-slate-50/50`, larger icon container (h-14 w-14), and `text-base` title.

#### Dashboard Pages
- `DashboardPage.tsx` — Premium redesign with icon-labeled card headers, better stat cards with `BadgeCheck`, `UserCircle`, `Shield` icons, improved account status card with `LayoutDashboard` icon, quick actions card with indigo hover effects, and recent activity section.
- `ProfilePage.tsx` — Premium gradient avatar (`from-indigo-500 to-indigo-600`), better spacing, icon-labeled card headers (`UserCircle`, `Lock`), improved success/error message styling, and `BadgeCheck` icon for confirmation messages.
- `SettingsPage.tsx` — Updated toggle switches with proper `role="switch"`, indigo accent color for active toggles, improved toggle animation, and icon-labeled card headers.
- `AdminPage.tsx` — Migrated to use `StatsCard` component with proper `title` prop, improved loading skeletons, better empty/error states, and consistent table styling with `px-6 py-3.5` padding.
- `ActivityLogsPage.tsx` — Improved filter labels with consistent `text-sm font-medium`, indigo focus on selects/inputs, better table styling with uppercase tracking-wider headers, and improved pagination.
- `ContactMessagesPage.tsx` — Premium modal design with backdrop blur, improved delete confirmation with icon, consistent table styling, and indigo accent colors.
- `UsersPage.tsx` — Consistent filter/table styling, better dropdown styling, and improved user management experience.
- `UserDetailPage.tsx` — Icon-labeled card headers, premium info cards, consistent form styling, and improved success/error feedback.

### Design System
- **Colors**: Switched from cyan/teal to indigo/blue accent palette for a more professional SaaS look.
- **Typography**: Consistent `font-bold tracking-tight` for page titles, `font-semibold` for card titles, `text-xs uppercase tracking-wider` for labels.
- **Spacing**: Improved card padding (`px-6 py-5`), table cell padding (`px-6 py-4`), and section gaps (`gap-5`, `gap-6`).
- **Borders & Shadows**: Cards use `rounded-xl` with `shadow-sm shadow-slate-200/50` for subtle depth.
- **Transitions**: Added `transition-all duration-150` to interactive elements for smooth hover/focus effects.

### Verification
- `npm run build` passed successfully with zero errors.

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
