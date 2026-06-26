<?php

use App\Http\Controllers\Admin\ActivityLogController as AdminActivityLogController;
use App\Http\Controllers\Admin\AnalyticsController as AdminAnalyticsController;
use App\Http\Controllers\Admin\ContactMessageController as AdminContactMessageController;
use App\Http\Controllers\Admin\PlanController as AdminPlanController;
use App\Http\Controllers\Admin\SubscriptionController as AdminSubscriptionController;
use App\Http\Controllers\Admin\UserController as AdminUserController;
use App\Http\Controllers\Api\BillingController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\PlanController;
use App\Http\Controllers\Api\StripeWebhookController;
use App\Http\Controllers\AuthController;
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

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/payments/checkout', [PaymentController::class, 'checkout']);
    Route::get('/payments/{reference}', [PaymentController::class, 'show']);

    // Billing routes for authenticated users
    Route::prefix('billing')->group(function () {
        Route::get('/current', [BillingController::class, 'getCurrentSubscription']);
        Route::get('/plans', [BillingController::class, 'getPlans']);
        Route::post('/checkout', [BillingController::class, 'checkout']);
        Route::post('/cancel', [BillingController::class, 'cancelSubscription']);
        Route::get('/payments', [BillingController::class, 'getPaymentHistory']);
    });

    // Stripe Checkout route
    Route::post('/billing/stripe/checkout', [App\Http\Controllers\Api\StripeCheckoutController::class, 'createSession']);
});

Route::middleware(['auth:sanctum', 'admin'])->prefix('admin')->group(function () {
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
    });

    // Admin payments route
    Route::get('/payments', [AdminSubscriptionController::class, 'getPayments']);
});

Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register'])
        ->middleware('throttle:auth-register');

    Route::post('/login', [AuthController::class, 'login'])
        ->middleware('throttle:auth-login');

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
    });

    Route::get('/verify-email/{id}/{hash}', [AuthController::class, 'verifyEmail'])
        ->middleware(['signed', 'throttle:auth-verify-email'])
        ->name('auth.verify-email');

    Route::middleware(['auth:sanctum', 'verified'])->group(function () {
        Route::get('/verified-only', [AuthController::class, 'verifiedOnly']);
    });
});
