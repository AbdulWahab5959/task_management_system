<?php

use App\Http\Controllers\Admin\ActivityLogController as AdminActivityLogController;
use App\Http\Controllers\Admin\AnalyticsController as AdminAnalyticsController;
use App\Http\Controllers\Admin\ContactMessageController as AdminContactMessageController;
use App\Http\Controllers\Admin\PlanController as AdminPlanController;
use App\Http\Controllers\Admin\SubscriptionController as AdminSubscriptionController;
use App\Http\Controllers\Admin\UserController as AdminUserController;
use App\Http\Controllers\Api\BillingController;
use App\Http\Controllers\Api\InvoiceController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\TenantDashboardController;
use App\Http\Controllers\Api\TenantSubscriptionAccessController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\PlanController;
use App\Http\Controllers\Api\StripeWebhookController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\TwoFactorController;
use App\Http\Controllers\TenantController;
use App\Http\Controllers\TenantSettingsController;
use App\Http\Controllers\TenantInvitationController;
use App\Http\Controllers\TenantMemberController;
use App\Http\Controllers\TenantPermissionController;
use App\Http\Controllers\ProjectController;
use App\Http\Controllers\TaskController;
use App\Http\Controllers\UserSettingsController;
use Illuminate\Support\Facades\Route;

Route::get('/health', function () {
    return response()->json([
        'status' => 'ok',
        'message' => 'Backend connected successfully',
    ]);
});

Route::post('/contact', [App\Http\Controllers\ContactController::class, 'store']);

Route::get('/plans', [PlanController::class, 'index']);
Route::post('/stripe/webhook', StripeWebhookController::class);
Route::get('/invitations/{token}', [TenantInvitationController::class, 'preview']);

Route::middleware('auth:sanctum')->group(function () {
    Route::prefix('support')->middleware('throttle:30,1')->group(function () {
        Route::get('/faqs', [App\Http\Controllers\Api\SupportController::class, 'faqs'])->withoutMiddleware('throttle:30,1');
        Route::get('/faqs/{slug}', [App\Http\Controllers\Api\SupportController::class, 'faqAnswer'])->withoutMiddleware('throttle:30,1');
        Route::post('/conversation/faqs/{slug}', [App\Http\Controllers\Api\SupportController::class, 'faqInteraction']);
        Route::get('/conversation', [App\Http\Controllers\Api\SupportController::class, 'show']);
        Route::get('/conversation/messages', [App\Http\Controllers\Api\SupportController::class, 'messages']);
        Route::post('/conversation/messages', [App\Http\Controllers\Api\SupportController::class, 'send'])->middleware('throttle:support-messages');
        Route::post('/conversation/read', [App\Http\Controllers\Api\SupportController::class, 'markRead']);
        Route::post('/conversation/status/{status}', [App\Http\Controllers\Api\SupportController::class, 'updateStatus']);
    });
    // Tenant membership and creation. Tenant deletion remains intentionally unrouted.
    Route::get('/tenants', [TenantController::class, 'index']);
    Route::post('/tenants', [TenantController::class, 'store']);
    Route::get('/tenants/{tenant}', [TenantController::class, 'show'])
        ->middleware(['tenant.identify', 'permission:organization.view']);
        Route::delete('/tenants/{tenant}', [TenantController::class, 'destroy'])
        ->middleware('tenant.identify');
    Route::post('/tenants/{tenant}/primary', [TenantController::class, 'setPrimary'])
        ->middleware('tenant.identify');
    Route::post('/tenants/{tenant}/schedule-deletion', [TenantController::class, 'schedulePermanentDeletion'])
        ->middleware('tenant.identify');
    Route::delete('/tenants/{tenant}/permanent', [TenantController::class, 'permanentlyDelete'])
        ->middleware('tenant.identify');

    Route::prefix('tenant')->middleware('tenant.identify')->group(function () {
        Route::get('/dashboard/summary', [TenantDashboardController::class, 'summary'])->middleware('permission:organization.view');
        Route::get('/subscription/access', TenantSubscriptionAccessController::class);
        Route::get('/settings', [TenantSettingsController::class, 'show'])->middleware('permission:organization.settings.view');
        Route::put('/settings', [TenantSettingsController::class, 'update'])->middleware('permission:organization.settings.update');
        Route::get('/members', [TenantMemberController::class, 'index'])->middleware('permission:members.view');
        Route::put('/members/{user}/role', [TenantMemberController::class, 'updateRole'])->middleware('permission:members.update_role');
        Route::delete('/members/{user}', [TenantMemberController::class, 'destroy'])->middleware('permission:members.remove');
        Route::get('/invitations', [TenantInvitationController::class, 'index'])->middleware('permission:invitations.view');
        Route::post('/invitations', [TenantInvitationController::class, 'store'])
            ->middleware('permission:invitations.create')
            ->middleware('throttle:team-invitation-send');
        Route::post('/invitations/{invitation}/resend', [TenantInvitationController::class, 'resend'])
            ->middleware('permission:invitations.resend')
            ->middleware('throttle:team-invitation-resend');
        Route::delete('/invitations/{invitation}', [TenantInvitationController::class, 'revoke'])->middleware('permission:invitations.revoke');
        Route::get('/permissions', [TenantPermissionController::class, 'index'])->middleware('permission:members.update_role');
        Route::get('/roles', [TenantPermissionController::class, 'roles'])->middleware('permission:members.view');
        Route::get('/members/{user}/permissions', [TenantPermissionController::class, 'show'])->middleware('permission:members.view');
        Route::put('/members/{user}/permissions', [TenantPermissionController::class, 'update'])->middleware('permission:members.update_role');
        Route::post('/members/{user}/permissions/reset', [TenantPermissionController::class, 'reset'])->middleware('permission:members.update_role');
        Route::get('/projects', [ProjectController::class, 'index'])->middleware('permission:projects.view');
        Route::post('/projects', [ProjectController::class, 'store'])->middleware('permission:projects.create');
        Route::get('/projects/{project}', [ProjectController::class, 'show'])->middleware('permission:projects.view');
        Route::put('/projects/{project}', [ProjectController::class, 'update'])->middleware('permission:projects.update');
        Route::delete('/projects/{project}', [ProjectController::class, 'destroy'])->middleware('permission:projects.delete');
        Route::get('/tasks', [TaskController::class, 'index'])->middleware('permission:tasks.view');
        Route::post('/tasks', [TaskController::class, 'store'])->middleware('permission:tasks.create');
        Route::get('/tasks/{task}', [TaskController::class, 'show'])->middleware('permission:tasks.view');
        Route::put('/tasks/{task}', [TaskController::class, 'update'])->middleware('permission:tasks.update');
        Route::delete('/tasks/{task}', [TaskController::class, 'destroy'])->middleware('permission:tasks.delete');
    });

    Route::post('/invitations/{token}/accept', [TenantInvitationController::class, 'accept']);
    Route::post('/invitations/{token}/reject', [TenantInvitationController::class, 'reject']);
    Route::get('/me/invitations', [TenantInvitationController::class, 'pendingForUser']);
    Route::post('/me/invitations/{invitation}/accept', [TenantInvitationController::class, 'acceptForUser']);
    Route::post('/me/invitations/{invitation}/reject', [TenantInvitationController::class, 'rejectForUser']);

    Route::post('/payments/checkout', [PaymentController::class, 'checkout']);
    Route::get('/payments/{reference}', [PaymentController::class, 'show']);

    // Billing routes for authenticated users
    Route::prefix('billing')->group(function () {
        Route::get('/invoices', [InvoiceController::class, 'index']);
        Route::get('/invoices/{invoice}', [InvoiceController::class, 'show']);
        Route::get('/invoices/{invoice}/download', [InvoiceController::class, 'download']);
        Route::get('/current', [BillingController::class, 'getCurrentSubscription']);
        Route::get('/plans', [BillingController::class, 'getPlans']);
        Route::post('/checkout', [BillingController::class, 'checkout']);
        Route::post('/cancel', [BillingController::class, 'cancelSubscription']);
        Route::post('/cancel-now', [BillingController::class, 'cancelNow']);
        Route::get('/payments', [BillingController::class, 'getPaymentHistory']);
    });

    // Stripe Checkout route
    Route::post('/billing/stripe/checkout', [App\Http\Controllers\Api\StripeCheckoutController::class, 'createSession']);

    // Notification routes
    Route::prefix('notifications')->group(function () {
        Route::get('/', [App\Http\Controllers\Api\NotificationController::class, 'index']);
        Route::post('/{id}/read', [App\Http\Controllers\Api\NotificationController::class, 'markAsRead']);
        Route::post('/read-all', [App\Http\Controllers\Api\NotificationController::class, 'markAllAsRead']);
        Route::get('/unread-count', [App\Http\Controllers\Api\NotificationController::class, 'unreadCount']);
    });

    Route::get('/settings/user', [UserSettingsController::class, 'show']);
    Route::put('/settings/user', [UserSettingsController::class, 'update']);

    // Dashboard routes
    Route::prefix('dashboard')->group(function () {
        Route::get('/activity', [DashboardController::class, 'activity']);
    });
});

// Platform-wide administration is restricted to super admins. Organization
// admins use the tenant-scoped routes above, which validate membership first.
Route::middleware(['auth:sanctum', 'super.admin'])->prefix('admin')->group(function () {
    Route::prefix('support')->middleware('throttle:60,1')->group(function () {
        Route::get('/conversations', [App\Http\Controllers\Api\SupportController::class, 'adminIndex']);
        Route::get('/conversations/{conversation}', [App\Http\Controllers\Api\SupportController::class, 'adminShow']);
        Route::get('/conversations/{conversation}/messages', [App\Http\Controllers\Api\SupportController::class, 'adminMessages']);
        Route::post('/conversations/{conversation}/messages', [App\Http\Controllers\Api\SupportController::class, 'adminSend'])->middleware('throttle:support-admin-messages');
        Route::post('/conversations/{conversation}/read', [App\Http\Controllers\Api\SupportController::class, 'adminMarkRead']);
        Route::post('/conversations/{conversation}/status/{status}', [App\Http\Controllers\Api\SupportController::class, 'adminStatus']);
    });
    Route::get('/analytics', [AdminAnalyticsController::class, 'index']);
    Route::get('/activity-logs', [AdminActivityLogController::class, 'index']);
    Route::get('/activity-logs/actions', [AdminActivityLogController::class, 'actions']);

    Route::get('/contact-messages', [AdminContactMessageController::class, 'index']);
    Route::get('/contact-messages/{contactMessage}', [AdminContactMessageController::class, 'show']);
    Route::put('/contact-messages/{contactMessage}/status', [AdminContactMessageController::class, 'updateStatus']);
    Route::delete('/contact-messages/{contactMessage}', [AdminContactMessageController::class, 'destroy']);

    Route::get('/plans', [AdminPlanController::class, 'index']);
    Route::post('/plans', [AdminPlanController::class, 'store']);
    Route::get('/plans/{plan}', [AdminPlanController::class, 'show']);
    Route::put('/plans/{plan}', [AdminPlanController::class, 'update']);
    Route::delete('/plans/{plan}', [AdminPlanController::class, 'destroy']);

    Route::get('/users', [AdminUserController::class, 'index']);
    Route::get('/users/{user}', [AdminUserController::class, 'show']);
    Route::put('/users/{user}', [AdminUserController::class, 'update']);
    Route::put('/users/{user}/status', [AdminUserController::class, 'updateStatus']);
    Route::put('/users/{user}/role', [AdminUserController::class, 'updateRole']);

    // Admin subscription routes
    Route::prefix('subscriptions')->group(function () {
        Route::get('/', [AdminSubscriptionController::class, 'index']);
        Route::get('/{subscription}', [AdminSubscriptionController::class, 'show']);
        Route::post('/{subscription}/cancel-now', [\App\Http\Controllers\Admin\SubscriptionActionController::class, 'cancelNow']);
    });

    // Admin payments route
    Route::get('/payments', [AdminSubscriptionController::class, 'getPayments']);
    Route::post('/payments/{payment}/refund', [\App\Http\Controllers\Admin\PaymentActionController::class, 'refund']);
});

Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register'])
        ->middleware('throttle:auth-register');

    Route::post('/login', [AuthController::class, 'login'])
        ->middleware('throttle:auth-login');
    Route::post('/2fa/challenge', [TwoFactorController::class, 'challenge'])
        ->middleware('throttle:auth-2fa-challenge');

    Route::post('/forgot-password', [AuthController::class, 'forgotPassword'])
        ->middleware('throttle:auth-forgot-password');

    Route::post('/reset-password', [AuthController::class, 'resetPassword'])
        ->middleware('throttle:auth-reset-password');

    Route::middleware('auth:sanctum')->group(function () {
        Route::get('/me', [AuthController::class, 'me']);
        Route::put('/profile', [AuthController::class, 'updateProfile']);
        Route::post('/profile/avatar', [AuthController::class, 'updateAvatar']);
        Route::put('/password', [AuthController::class, 'updatePassword']);
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::post('/email/verification-notification', [AuthController::class, 'sendVerificationNotification'])
            ->middleware('throttle:auth-email-verification-notification');
        Route::prefix('2fa')->group(function () {
            Route::post('/setup', [TwoFactorController::class, 'setup']);
            Route::post('/confirm', [TwoFactorController::class, 'confirm'])->middleware('throttle:auth-2fa-confirm');
            Route::post('/disable', [TwoFactorController::class, 'disable'])->middleware('throttle:auth-2fa-confirm');
            Route::post('/recovery-codes', [TwoFactorController::class, 'recoveryCodes'])->middleware('throttle:auth-2fa-confirm');
        });
    });

    Route::get('/verify-email/{id}/{hash}', [AuthController::class, 'verifyEmail'])
        ->middleware(['signed', 'throttle:auth-verify-email'])
        ->name('auth.verify-email');

    Route::middleware(['auth:sanctum', 'verified'])->group(function () {
        Route::get('/verified-only', [AuthController::class, 'verifiedOnly']);
    });
});
