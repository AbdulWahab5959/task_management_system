<?php

namespace App\Providers;

use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        RateLimiter::for('auth-login', function (Request $request) {
            $email = strtolower((string) $request->input('email'));

            return Limit::perMinute(5)->by($request->ip().'|'.$email);
        });

        RateLimiter::for('auth-register', function (Request $request) {
            $email = strtolower((string) $request->input('email'));

            return Limit::perMinute(3)->by($request->ip().'|'.$email);
        });

        RateLimiter::for('auth-email-verification-notification', function (Request $request) {
            return Limit::perMinute(6)->by($request->user()?->getAuthIdentifier() ?? $request->ip());
        });

        RateLimiter::for('auth-forgot-password', function (Request $request) {
            $email = strtolower((string) $request->input('email'));

            return Limit::perMinute(3)->by($request->ip().'|'.$email);
        });

        RateLimiter::for('auth-reset-password', function (Request $request) {
            $email = strtolower((string) $request->input('email'));

            return Limit::perMinute(6)->by($request->ip().'|'.$email);
        });

        RateLimiter::for('auth-verify-email', function (Request $request) {
            return Limit::perMinute(6)->by($request->ip().'|'.(string) $request->route('id'));
        });

        RateLimiter::for('team-invitation-send', function (Request $request) {
            return Limit::perMinute(5)->by(
                $request->user()?->id.'|'.(string) $request->header('X-Tenant-ID').'|'.strtolower((string) $request->input('email'))
            );
        });

        RateLimiter::for('team-invitation-resend', function (Request $request) {
            return Limit::perMinute(10)->by($request->user()?->id.'|'.(string) $request->route('invitation'));
        });

        $frontendUrl = rtrim((string) env('FRONTEND_URL', config('app.url')), '/');

        VerifyEmail::createUrlUsing(function ($notifiable) use ($frontendUrl) {
            $verificationUrl = URL::temporarySignedRoute(
                'auth.verify-email',
                now()->addMinutes(60),
                [
                    'id' => $notifiable->getKey(),
                    'hash' => sha1($notifiable->getEmailForVerification()),
                ]
            );

            return $frontendUrl.'/verify-email?verification_url='.urlencode($verificationUrl);
        });

        ResetPassword::createUrlUsing(function ($notifiable, string $token) use ($frontendUrl) {
            return $frontendUrl.'/reset-password?token='.urlencode($token).'&email='.urlencode($notifiable->getEmailForPasswordReset());
        });
    }
}
