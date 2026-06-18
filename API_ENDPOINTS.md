# API Endpoints

Project checkpoint generated on 2026-06-18.

Source command: `php artisan route:list`

## App API Routes

| Method | Path | Handler | Middleware / Notes |
| --- | --- | --- | --- |
| GET\|HEAD | `/api/health` | Closure in `routes/api.php` | Public health check |
| POST | `/api/contact` | `ContactController@store` | Public contact message submission |
| POST | `/api/auth/register` | `AuthController@register` | Public, throttled |
| POST | `/api/auth/login` | `AuthController@login` | Public, throttled |
| POST | `/api/auth/forgot-password` | `AuthController@forgotPassword` | Public, throttled |
| POST | `/api/auth/reset-password` | `AuthController@resetPassword` | Public, throttled |
| GET\|HEAD | `/api/auth/me` | `AuthController@me` | `auth:sanctum` |
| PUT | `/api/auth/profile` | `AuthController@updateProfile` | `auth:sanctum` |
| PUT | `/api/auth/password` | `AuthController@updatePassword` | `auth:sanctum` |
| POST | `/api/auth/logout` | `AuthController@logout` | `auth:sanctum` |
| POST | `/api/auth/email/verification-notification` | `AuthController@sendVerificationNotification` | `auth:sanctum`, throttled |
| GET\|HEAD | `/api/auth/verify-email/{id}/{hash}` | `AuthController@verifyEmail` | Signed, throttled, named `auth.verify-email` |
| GET\|HEAD | `/api/auth/verified-only` | `AuthController@verifiedOnly` | `auth:sanctum`, `verified` |

## Web and Framework Routes

| Method | Path | Handler | Notes |
| --- | --- | --- | --- |
| GET\|HEAD | `/` | Closure in `routes/web.php` | Laravel welcome view |
| GET\|HEAD | `/sanctum/csrf-cookie` | Sanctum controller | Framework route |
| GET\|HEAD | `/storage/{path}` | Laravel storage route | Framework route |
| PUT | `/storage/{path}` | Laravel storage upload route | Framework route |
| GET\|HEAD | `/up` | Laravel health route | Framework route |

## Frontend Routes

| Path | Component / Purpose | Status |
| --- | --- | --- |
| `/` | Public home page | Done |
| `/about` | Public about page | Done |
| `/contact` | Public contact page and form | Done |
| `/health` | API health check page | Done |
| `/login` | Login page | Done |
| `/register` | Registration page | Done |
| `/verify-email` | Email verification callback page | Done |
| `/email-verification-required` | Verification-required state | Done |
| `/forgot-password` | Forgot password page | Done |
| `/reset-password` | Reset password page | Done |
| `/dashboard` | Protected dashboard home | Done |
| `/dashboard/profile` | Protected profile page | Done |
| `/dashboard/settings` | Protected settings page | Done |
| `*` | Redirects to `/` | Done |

## Missing or Needs Verification

- No registered backend routes for tenants.
- No registered backend routes for subscriptions, plans, invoices, or Stripe webhooks.
- No registered backend routes for admin contact message management.
- No registered backend routes for user management.
- No registered backend routes for activity logs.
- No registered backend routes for analytics.
- `PaymentForm.tsx` posts to `/subscriptions/subscribe`, but `php artisan route:list` does not show that endpoint.
- Subscription, tenant, and activity controllers/services/models are present but route integration needs verification.
