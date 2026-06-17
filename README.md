# LaunchPad SaaS Boilerplate

LaunchPad is a full-stack SaaS boilerplate built with a Laravel API backend and a React TypeScript frontend. It is designed as a clean starting point for authenticated products that need registration, email verification, password recovery, protected dashboard routes, account settings, and a modular foundation for future SaaS features.

## Project Overview

This repository is organized as a two-app monorepo:

- `backend`: Laravel API with Sanctum token authentication, email verification, password reset, profile updates, and future SaaS domain scaffolding.
- `frontend`: React, TypeScript, Vite, Tailwind CSS, React Router, Axios, and reusable dashboard UI components.

The current product surface focuses on authentication and the authenticated dashboard experience. Billing, subscriptions, teams, tenants, and admin modules are intentionally not part of the active UI yet, though some backend/domain scaffolding is present for future work.

## Features Implemented

- Laravel API health check
- User registration and login
- Sanctum bearer-token authentication
- Authenticated `/api/auth/me` endpoint
- Logout
- Email verification and resend verification email
- Forgot password and reset password flow
- Protected React routes
- Verified-email gate for dashboard access
- Authenticated dashboard layout
- Responsive sidebar and navbar
- User dropdown and logout actions
- Dashboard home with status cards, quick actions, and activity placeholder
- Profile page with name/email update and password update
- Settings page prepared for account, notification, and security modules
- Reusable frontend components for buttons, inputs, cards, page headers, empty states, spinners, and stats cards
- Feature tests for auth, email verification, password reset, and profile updates

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
- Lucide React icons

## Folder Structure

```text
launchpad/
  backend/
    app/
      Http/Controllers/
      Http/Requests/Auth/
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

### Backend

```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate
php artisan serve --host=127.0.0.1 --port=8000
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Default local URLs:

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:8000/api`
- Health check: `http://localhost:8000/api/health`

## Environment Setup

Create the backend environment file from `backend/.env.example` and set:

- `APP_URL`
- `FRONTEND_URL`
- database connection values
- SMTP mail credentials for email verification and password reset

Create the frontend environment file from `frontend/.env.example` and set:

- `VITE_API_URL`

For Gmail SMTP, use an app password rather than your account password.

## Authentication Features

- Register with name, email, password, and password confirmation
- Login with email and password
- Store API token in local storage
- Load current user on app boot
- Redirect unauthenticated users to `/login`
- Redirect unverified users to `/email-verification-required`
- Resend verification email
- Verify email through signed Laravel URL
- Request forgot-password email
- Reset password with token
- Logout from dashboard sidebar or navbar

## Dashboard Features

- `/dashboard`: authenticated home view with welcome message, stats, account status, quick actions, and recent activity placeholder
- `/dashboard/profile`: profile details, avatar placeholder, email verification status, name/email update, and password update
- `/dashboard/settings`: future-ready account, notification, and security settings sections
- Responsive layout with desktop sidebar and mobile drawer
- Top navbar with current page title, user dropdown, and logout

## Future Roadmap

- Subscription plans and billing UI
- Stripe checkout and webhook handling
- Tenant onboarding
- Team management
- Role-based permissions
- Admin dashboard
- Activity timeline
- Notification preferences backed by API settings
- Avatar upload
- Two-factor authentication
- Production deployment guides

## Screenshots Placeholder

Add screenshots here when the UI is ready for a public portfolio page.

```text
docs/screenshots/dashboard.png
docs/screenshots/profile.png
docs/screenshots/settings.png
```

## Verification

Useful commands:

```bash
cd frontend
npm run build
```

```bash
cd backend
php artisan test
```

## Current Scope Notes

- Stripe, subscriptions, multi-tenancy, teams, and admin features are not active product flows yet.
- Some domain scaffolding remains in the repository for future SaaS modules.
- Environment example files contain placeholders only and should not include real credentials.
