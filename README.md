# LaunchStack SaaS Boilerplate

![Laravel](https://img.shields.io/badge/Laravel-12-FF2D20?logo=laravel&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=111827)
![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-38B2AC?logo=tailwindcss&logoColor=white)
![Sanctum](https://img.shields.io/badge/Auth-Laravel_Sanctum-111827)
![Status](https://img.shields.io/badge/status-active_development-0f766e)
![License](https://img.shields.io/badge/license-not_specified-lightgrey)

LaunchStack is a full-stack SaaS starter project with a Laravel API backend and a React TypeScript dashboard frontend. It currently implements the core authentication and account-management flows needed before building paid SaaS modules: registration, login, email verification, forgot/reset password, protected routes, dashboard layout, profile updates, and password changes.

The project is intentionally scoped. Stripe, subscriptions, multi-tenancy, teams, and admin features are not presented as complete product features in this README.

## Screenshots

Screenshots can be added here after capturing the local UI.

| Dashboard | Profile | Settings |
| --- | --- | --- |
| `docs/screenshots/dashboard.png` | `docs/screenshots/profile.png` | `docs/screenshots/settings.png` |

## Features

### Authentication

- User registration with name, email, password, and password confirmation
- Login with email and password
- Laravel Sanctum bearer-token authentication
- Current-user endpoint with `/api/auth/me`
- Logout endpoint and frontend logout actions
- Email verification requirement for dashboard access
- Resend verification email flow
- Signed email verification link handling
- Forgot password email flow
- Reset password with token and confirmation
- Protected React routes for authenticated users
- Verified-only route behavior for dashboard access

### Dashboard

- Authenticated dashboard layout
- Desktop sidebar navigation
- Mobile sidebar drawer
- Top navbar with current page title
- User avatar initials and dropdown menu
- Logout from sidebar and navbar
- Dashboard home page with welcome message, stats cards, account status, quick actions, and recent activity placeholder
- Profile page with account summary, email verification status, name/email update, and password update form
- Settings page with account, notification, and security placeholder sections for future modules

### Backend API

- Health check endpoint
- Auth request validation classes
- Clean JSON responses for auth/profile/password endpoints
- Profile update endpoint
- Password update endpoint requiring the current password
- Email-change flow that marks the account unverified and sends a new verification email
- Feature tests for auth, email verification, password reset, and profile updates

### Frontend UI

- Reusable `Button`, `Input`, `Card`, `LoadingSpinner`, `EmptyState`, `StatsCard`, and `PageHeader` components
- Axios API service with auth-token interceptor
- Auth context and `useAuth` hook
- Responsive Tailwind CSS dashboard styling
- Lucide icon usage for navigation and actions

## Tech Stack

### Backend

- PHP 8.2+
- Laravel 12
- Laravel Sanctum
- Laravel Notifications and Mail
- MySQL or SQLite
- PHPUnit

### Frontend

- React 19
- TypeScript
- Vite
- Tailwind CSS
- React Router
- Axios
- Lucide React

## Folder Structure

```text
launchstack/
  backend/
    app/
      Http/
        Controllers/
        Requests/Auth/
      Models/
      Services/
      Traits/
    config/
    database/
      migrations/
      seeders/
    routes/
      api.php
      web.php
    tests/
      Feature/
  frontend/
    public/
    src/
      components/
        common/
        dashboard/
        subscription/
      context/
      hooks/
      layouts/
      pages/
        Auth/
        Dashboard/
      services/
      types/
      utils/
```

## Installation

### Prerequisites

- PHP 8.2+
- Composer
- Node.js and npm
- MySQL or SQLite
- SMTP account for email verification and password reset emails

### Backend Setup

```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate
php artisan serve --host=127.0.0.1 --port=8000
```

### Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

### Local URLs

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:8000/api`
- Health check: `http://localhost:8000/api/health`

## Environment Setup

Backend environment file:

```bash
cd backend
cp .env.example .env
```

Set these values in `backend/.env`:

- `APP_URL`
- `FRONTEND_URL`
- `DB_CONNECTION`
- `DB_HOST`
- `DB_PORT`
- `DB_DATABASE`
- `DB_USERNAME`
- `DB_PASSWORD`
- `MAIL_MAILER`
- `MAIL_HOST`
- `MAIL_PORT`
- `MAIL_USERNAME`
- `MAIL_PASSWORD`
- `MAIL_FROM_ADDRESS`

Frontend environment file:

```bash
cd frontend
cp .env.example .env
```

Set:

```bash
VITE_API_URL=http://localhost:8000/api
```

For Gmail SMTP, use a Gmail app password rather than your account password.

## API Endpoints

```text
GET    /api/health
POST   /api/auth/register
POST   /api/auth/login
GET    /api/auth/me
POST   /api/auth/logout
POST   /api/auth/email/verification-notification
GET    /api/auth/verify-email/{id}/{hash}
POST   /api/auth/forgot-password
POST   /api/auth/reset-password
PUT    /api/auth/profile
PUT    /api/auth/password
GET    /api/auth/verified-only
```

## Verification

Run the frontend build:

```bash
cd frontend
npm run build
```

Run frontend linting:

```bash
cd frontend
npm run lint
```

Run backend tests:

```bash
cd backend
php artisan test
```

## Roadmap

These items are planned or scaffolded for future development. They are not complete product features yet.

- Stripe billing flow
- Subscription plan management
- Tenant onboarding
- Team management
- Role-based permissions
- Admin dashboard
- Activity timeline backed by real events
- Notification preferences backed by database settings
- Avatar upload
- Two-factor authentication
- Deployment documentation

## Contributing

Contributions are welcome once the repository is prepared for public collaboration.

Suggested workflow:

1. Fork the repository.
2. Create a feature branch.
3. Keep changes scoped and documented.
4. Run the frontend build and backend tests.
5. Open a pull request with a clear summary and testing notes.

Please avoid adding unfinished product claims to the README. Document only behavior that is implemented and verified.

## License

No project license file is currently included. Add a `LICENSE` file before publishing this project as open source or reusing it in a commercial context.
