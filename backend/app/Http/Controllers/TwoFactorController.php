<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\ActivityLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class TwoFactorController extends Controller
{
    public function __construct(private readonly ActivityLogService $activityLogService) {}

    public function setup(Request $request): JsonResponse
    {
        $request->validate(['password' => ['required', 'string']]);
        $user = $request->user();
        $this->confirmPassword($request, $user);
        if ($user->two_factor_confirmed_at) {
            return response()->json(['message' => 'Two-factor authentication is already enabled.'], 409);
        }

        $secret = $this->base32Secret();
        $user->forceFill([
            'two_factor_secret' => Crypt::encryptString($secret),
            'two_factor_recovery_codes' => null,
            'two_factor_confirmed_at' => null,
        ])->save();

        return response()->json([
            'secret' => $secret,
            'otpauth_uri' => $this->otpauthUri($user, $secret),
            'message' => 'Scan the authenticator setup or enter the secret manually, then confirm a code.',
        ]);
    }

    public function confirm(Request $request): JsonResponse
    {
        $validated = $request->validate(['code' => ['required', 'digits:6']]);
        $user = $request->user();
        $secret = $this->secret($user);
        if (! $secret || ! $this->validCode($secret, $validated['code'])) {
            throw ValidationException::withMessages(['code' => ['The authenticator code is invalid or expired.']]);
        }

        $codes = collect(range(1, 8))->map(fn () => strtoupper(Str::random(4) . '-' . Str::random(4)))->values()->all();
        $user->forceFill([
            'two_factor_recovery_codes' => Crypt::encryptString(json_encode(array_map(fn ($code) => Hash::make($code), $codes), JSON_THROW_ON_ERROR)),
            'two_factor_confirmed_at' => now(),
            'two_factor_last_used_timecode' => (string) floor(time() / 30),
        ])->save();
        $this->activityLogService->logFromRequest('security.2fa_enabled', 'Two-factor authentication enabled.', [], $request);

        return response()->json(['message' => 'Two-factor authentication enabled.', 'recovery_codes' => $codes]);
    }

    public function disable(Request $request): JsonResponse
    {
        $request->validate(['password' => ['required', 'string'], 'code' => ['required', 'string']]);
        $user = $request->user();
        $this->confirmPassword($request, $user);
        if (! $this->verifySecondFactor($user, $request->string('code')->toString())) {
            throw ValidationException::withMessages(['code' => ['The authenticator or recovery code is invalid.']]);
        }
        $user->forceFill(['two_factor_secret' => null, 'two_factor_recovery_codes' => null, 'two_factor_confirmed_at' => null, 'two_factor_last_used_timecode' => null])->save();
        $this->activityLogService->logFromRequest('security.2fa_disabled', 'Two-factor authentication disabled.', [], $request);
        return response()->json(['message' => 'Two-factor authentication disabled.']);
    }

    public function recoveryCodes(Request $request): JsonResponse
    {
        $request->validate(['password' => ['required', 'string'], 'code' => ['required', 'string']]);
        $user = $request->user();
        $this->confirmPassword($request, $user);
        if (! $user->two_factor_confirmed_at || ! $this->verifySecondFactor($user, $request->string('code')->toString(), false)) {
            throw ValidationException::withMessages(['code' => ['The authenticator or recovery code is invalid.']]);
        }
        $codes = collect(range(1, 8))->map(fn () => strtoupper(Str::random(4) . '-' . Str::random(4)))->values()->all();
        $user->forceFill(['two_factor_recovery_codes' => Crypt::encryptString(json_encode(array_map(fn ($value) => Hash::make($value), $codes), JSON_THROW_ON_ERROR))])->save();
        return response()->json(['message' => 'Recovery codes regenerated.', 'recovery_codes' => $codes]);
    }

    public function challenge(Request $request): JsonResponse
    {
        $validated = $request->validate(['challenge_token' => ['required', 'string'], 'code' => ['required', 'string']]);
        $key = '2fa-login:' . hash('sha256', $validated['challenge_token']);
        $userId = Cache::get($key);
        if (! $userId) throw ValidationException::withMessages(['code' => ['This sign-in challenge has expired. Please sign in again.']]);
        $user = User::find($userId);
        if (! $user || $user->status !== User::STATUS_ACTIVE || ! $this->verifySecondFactor($user, $validated['code'])) {
            throw ValidationException::withMessages(['code' => ['The authenticator or recovery code is invalid.']]);
        }
        Cache::forget($key);
        return app(AuthController::class)->issueLoginResponse($request, $user);
    }

    private function confirmPassword(Request $request, User $user): void
    {
        if (! Hash::check($request->string('password')->toString(), $user->password)) {
            throw ValidationException::withMessages(['password' => ['The password is incorrect.']]);
        }
    }

    private function secret(User $user): ?string
    {
        if (! $user->two_factor_secret) return null;
        try { return Crypt::decryptString($user->two_factor_secret); } catch (\Throwable) { return null; }
    }

    private function verifySecondFactor(User $user, string $value, bool $consumeRecovery = true): bool
    {
        $value = strtoupper(trim($value));
        $secret = $this->secret($user);
        if ($secret && preg_match('/^\d{6}$/', $value) && $this->validCode($secret, $value)) {
            $timecode = (string) intdiv(time(), 30);
            if ($user->two_factor_last_used_timecode === $timecode) return false;
            $user->forceFill(['two_factor_last_used_timecode' => $timecode])->save();
            return true;
        }
        if (! $consumeRecovery || ! $user->two_factor_recovery_codes) return false;
        try { $codes = json_decode(Crypt::decryptString($user->two_factor_recovery_codes), true, 32, JSON_THROW_ON_ERROR); } catch (\Throwable) { return false; }
        foreach ($codes as $index => $hash) {
            if (Hash::check($value, $hash)) {
                unset($codes[$index]);
                $user->forceFill(['two_factor_recovery_codes' => Crypt::encryptString(json_encode(array_values($codes), JSON_THROW_ON_ERROR))])->save();
                return true;
            }
        }
        return false;
    }

    private function validCode(string $secret, string $code): bool
    {
        $counter = intdiv(time(), 30);
        for ($offset = -1; $offset <= 1; $offset++) {
            $binary = pack('N*', 0) . pack('N*', $counter + $offset);
            $hash = hash_hmac('sha1', $binary, $this->base32Decode($secret), true);
            $position = ord($hash[19]) & 0xf;
            $number = ((ord($hash[$position]) & 0x7f) << 24) | ((ord($hash[$position + 1]) & 0xff) << 16) | ((ord($hash[$position + 2]) & 0xff) << 8) | (ord($hash[$position + 3]) & 0xff);
            if (hash_equals(str_pad((string) ($number % 1000000), 6, '0', STR_PAD_LEFT), $code)) return true;
        }
        return false;
    }

    private function base32Secret(): string
    {
        $alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
        $bits = '';
        foreach (str_split(random_bytes(20)) as $byte) $bits .= str_pad(decbin(ord($byte)), 8, '0', STR_PAD_LEFT);
        $secret = '';
        foreach (str_split($bits, 5) as $chunk) $secret .= $alphabet[bindec(str_pad($chunk, 5, '0'))];
        return $secret;
    }

    private function base32Decode(string $value): string
    {
        $alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
        $bits = '';
        foreach (str_split(strtoupper($value)) as $character) {
            $position = strpos($alphabet, $character);
            if ($position === false) return '';
            $bits .= str_pad(decbin($position), 5, '0', STR_PAD_LEFT);
        }
        $binary = '';
        foreach (str_split($bits, 8) as $chunk) if (strlen($chunk) === 8) $binary .= chr(bindec($chunk));
        return $binary;
    }
    private function otpauthUri(User $user, string $secret): string { return 'otpauth://totp/LaunchStack:' . rawurlencode($user->email) . '?secret=' . $secret . '&issuer=LaunchStack'; }
}
