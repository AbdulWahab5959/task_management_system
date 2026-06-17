<?php

use App\Http\Controllers\AuthController;
use Illuminate\Support\Facades\Route;

Route::get('/health', function () {
    return response()->json([
        'status' => 'ok',
        'message' => 'Backend connected successfully',
    ]);
});

Route::post('/contact', [App\Http\Controllers\ContactController::class, 'store']);

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
