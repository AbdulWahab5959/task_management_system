# LaunchPad Backend

Laravel API backend for the LaunchPad SaaS Boilerplate.

## Stack

- PHP 8.2+
- Laravel 12
- Laravel Sanctum
- PHPUnit
- MySQL or SQLite

## Setup

```bash
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate
php artisan serve --host=127.0.0.1 --port=8000
```

## Environment

Configure these values in `.env`:

- `APP_URL`
- `FRONTEND_URL`
- `DB_CONNECTION`
- `DB_DATABASE`
- `DB_USERNAME`
- `DB_PASSWORD`
- `MAIL_MAILER`
- `MAIL_HOST`
- `MAIL_PORT`
- `MAIL_USERNAME`
- `MAIL_PASSWORD`
- `MAIL_FROM_ADDRESS`

## Commands

```bash
php artisan test
php artisan config:clear
php artisan route:list
```

## API Areas

- `/api/health`
- `/api/auth/register`
- `/api/auth/login`
- `/api/auth/me`
- `/api/auth/logout`
- `/api/auth/email/verification-notification`
- `/api/auth/verify-email/{id}/{hash}`
- `/api/auth/forgot-password`
- `/api/auth/reset-password`
- `/api/auth/profile`
- `/api/auth/password`

Future SaaS domain scaffolding exists for plans, subscriptions, tenants, invoices, projects, tasks, files, and activity logs.
