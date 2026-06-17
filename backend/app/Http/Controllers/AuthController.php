<?php

namespace App\Http\Controllers;

use App\Http\Requests\Auth\ForgotPasswordRequest;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\ResetPasswordRequest;
use App\Http\Requests\Auth\RegisterRequest;
use Illuminate\Http\Request;
use Illuminate\Auth\Events\Verified;
use App\Models\User;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\URL;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\Response;

class AuthController extends Controller
{
    public function register(RegisterRequest $request)
    {
        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
        ]);

        $token = $user->createToken('auth_token')->plainTextToken;
        $user->sendEmailVerificationNotification();

        return response()->json([
            'user' => $user,
            'token' => $token,
            'requires_email_verification' => ! $user->hasVerifiedEmail(),
            'message' => 'Please verify your email address before continuing.',
        ], 201);
    }

    public function login(LoginRequest $request)
    {
        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'user' => $user,
            'token' => $token,
            'requires_email_verification' => ! $user->hasVerifiedEmail(),
        ]);
    }

    public function sendVerificationNotification(Request $request)
    {
        $user = $request->user();

        if ($user->hasVerifiedEmail()) {
            return response()->json([
                'message' => 'Your email address is already verified.',
            ]);
        }

        $user->sendEmailVerificationNotification();

        return response()->json([
            'message' => 'Verification email sent.',
        ]);
    }

    public function verifyEmail(Request $request, string $id, string $hash)
    {
        $user = User::findOrFail($id);

        if (! hash_equals($hash, sha1($user->getEmailForVerification()))) {
            throw ValidationException::withMessages([
                'email' => ['The verification link is invalid or has expired.'],
            ]);
        }

        if (! $user->hasVerifiedEmail()) {
            $user->markEmailAsVerified();
            event(new Verified($user));
        }

        return response()->json([
            'message' => 'Email verified successfully.',
        ]);
    }

    public function verifiedOnly(Request $request)
    {
        return response()->json([
            'message' => 'Verified email access granted.',
            'user' => $request->user(),
        ]);
    }

    public function forgotPassword(ForgotPasswordRequest $request)
    {
        $status = Password::broker()->sendResetLink($request->only('email'));

        if ($status !== Password::RESET_LINK_SENT && $status !== Password::INVALID_USER) {
            throw ValidationException::withMessages([
                'email' => [__($status)],
            ]);
        }

        return response()->json([
            'message' => 'If this email exists, a password reset link has been sent.',
        ]);
    }

    public function resetPassword(ResetPasswordRequest $request)
    {
        $status = Password::broker()->reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function (User $user, string $password) {
                $user->forceFill([
                    'password' => Hash::make($password),
                ])->save();

                $user->tokens()->delete();
            }
        );

        if ($status !== Password::PASSWORD_RESET) {
            throw ValidationException::withMessages([
                'email' => ['The password reset link is invalid or has expired.'],
            ]);
        }

        return response()->json([
            'message' => 'Your password has been reset successfully.',
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Successfully logged out',
        ]);
    }

    public function me(Request $request)
    {
        return response()->json($request->user());
    }
}
