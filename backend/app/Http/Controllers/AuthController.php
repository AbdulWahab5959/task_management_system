<?php

namespace App\Http\Controllers;

use App\Http\Requests\Auth\ForgotPasswordRequest;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\ResetPasswordRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Requests\Auth\UpdatePasswordRequest;
use App\Http\Requests\Auth\UpdateAvatarRequest;
use App\Http\Requests\Auth\UpdateProfileRequest;
use App\Services\ActivityLogService;
use Illuminate\Support\Facades\Storage;
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
    public function __construct(
        private readonly ActivityLogService $activityLogService,
    ) {}

    public function register(RegisterRequest $request)
    {
        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'role' => User::ROLE_USER,
            'status' => User::STATUS_ACTIVE,
        ]);

        $token = $user->createToken('auth_token')->plainTextToken;
        $user->sendEmailVerificationNotification();

        $this->activityLogService->log(
            action: 'register',
            description: "User registered: {$user->email}",
            properties: ['user_id' => $user->id, 'email' => $user->email],
            userId: $user->id,
            ipAddress: $request->ip(),
            userAgent: $request->userAgent(),
        );

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

        if ($user->status === User::STATUS_INACTIVE) {
            throw ValidationException::withMessages([
                'email' => ['This account is inactive.'],
            ]);
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        $this->activityLogService->log(
            action: 'login',
            description: "User logged in: {$user->email}",
            properties: ['user_id' => $user->id, 'email' => $user->email],
            userId: $user->id,
            ipAddress: $request->ip(),
            userAgent: $request->userAgent(),
        );

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
        $user = $request->user();
        $user->currentAccessToken()->delete();

        $this->activityLogService->log(
            action: 'logout',
            description: "User logged out: {$user->email}",
            properties: ['user_id' => $user->id, 'email' => $user->email],
            userId: $user->id,
            ipAddress: $request->ip(),
            userAgent: $request->userAgent(),
        );

        return response()->json([
            'message' => 'Successfully logged out',
        ]);
    }

    public function me(Request $request)
    {
        return response()->json($request->user());
    }

    public function updateProfile(UpdateProfileRequest $request)
    {
        $user = $request->user();
        $validated = $request->validated();
        $emailChanged = array_key_exists('email', $validated) && $validated['email'] !== $user->email;

        $oldName = $user->name;
        $oldEmail = $user->email;

        $user->name = $validated['name'];

        if ($emailChanged) {
            $user->email = $validated['email'];
            $user->email_verified_at = null;
        }

        $user->save();

        if ($emailChanged) {
            $user->sendEmailVerificationNotification();
        }

        $user->refresh();

        $changes = [];
        if ($oldName !== $user->name) {
            $changes['name'] = ['old' => $oldName, 'new' => $user->name];
        }
        if ($oldEmail !== $user->email) {
            $changes['email'] = ['old' => $oldEmail, 'new' => $user->email];
        }

        $this->activityLogService->log(
            action: 'profile_update',
            description: "User updated profile: {$user->email}",
            properties: [
                'user_id' => $user->id,
                'email' => $user->email,
                'changes' => $changes,
            ],
            userId: $user->id,
            ipAddress: $request->ip(),
            userAgent: $request->userAgent(),
        );

        return response()->json([
            'message' => $emailChanged
                ? 'Profile updated. Please verify your new email address.'
                : 'Profile updated successfully.',
            'user' => $user,
            'requires_email_verification' => ! $user->hasVerifiedEmail(),
        ]);
    }

    public function updateAvatar(UpdateAvatarRequest $request)
    {
        $user = $request->user();
        $file = $request->file('avatar');

        // Delete old avatar if it's a local file (not an external OAuth URL)
        if ($user->avatar_url && !filter_var($user->avatar_url, FILTER_VALIDATE_URL)) {
            $oldPath = str_replace('/storage/', '', $user->avatar_url);
            if (Storage::disk('public')->exists($oldPath)) {
                Storage::disk('public')->delete($oldPath);
            }
        }

        // Store the new avatar
        $path = $file->store('avatars', 'public');
        $user->avatar_url = "/storage/{$path}";
        $user->save();

        $this->activityLogService->log(
            action: 'avatar_update',
            description: "User updated avatar: {$user->email}",
            properties: [
                'user_id' => $user->id,
                'email' => $user->email,
                'avatar_url' => $user->avatar_url,
            ],
            userId: $user->id,
            ipAddress: $request->ip(),
            userAgent: $request->userAgent(),
        );

        return response()->json([
            'message' => 'Avatar updated successfully.',
            'user' => $user,
        ]);
    }

    public function updatePassword(UpdatePasswordRequest $request)
    {
        $user = $request->user();
        $validated = $request->validated();

        if (! Hash::check($validated['current_password'], $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['The current password is incorrect.'],
            ]);
        }

        $user->forceFill([
            'password' => Hash::make($validated['password']),
        ])->save();

        $this->activityLogService->log(
            action: 'password_update',
            description: "User updated password: {$user->email}",
            properties: ['user_id' => $user->id, 'email' => $user->email],
            userId: $user->id,
            ipAddress: $request->ip(),
            userAgent: $request->userAgent(),
        );

        return response()->json([
            'message' => 'Password updated successfully.',
        ]);
    }
}