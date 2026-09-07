<?php

namespace App\Services;

use App\Exceptions\OrganizationCreationException;
use App\Models\Tenant;
use App\Models\Subscription;
use App\Models\User;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Artisan;
use Throwable;

class TenantService
{
    public function create(array $data, User $owner): Tenant
    {
        $tenant = null;
        $databaseName = null;
        $databaseCreated = false;

        try {
            // Keep the central transaction limited to central records. MySQL
            // DDL such as CREATE DATABASE may implicitly commit, so tenant
            // provisioning happens only after this transaction completes.
            $tenant = DB::transaction(function () use ($data, $owner): Tenant {
                User::query()->whereKey($owner->id)->lockForUpdate()->firstOrFail();
                $this->assertCanCreate($data['name'], $owner);

                $slug = $this->generateUniqueSlug($data['name']);
                $tenant = Tenant::create([
                    'name' => trim($data['name']),
                    'slug' => $slug,
                    'database_name' => $this->generateDatabaseName($slug),
                    'owner_id' => $owner->id,
                    'status' => 'active',
                    'is_primary' => ! Tenant::query()->where('owner_id', $owner->id)->where('status', Tenant::STATUS_ACTIVE)->exists(),
                    'trial_ends_at' => now()->addDays(14),
                ]);

                $tenant->users()->attach($owner->id, [
                    'role' => 'owner',
                    'joined_at' => now(),
                ]);

                return $tenant;
            });

            $databaseName = $tenant->database_name;
            $this->createTenantDatabase($databaseName);
            $databaseCreated = true;
            $this->migrateTenantDatabase($tenant);
            $this->seedTenantData($tenant, $data);

            return $tenant;
        } catch (Throwable $e) {
            // Compensate only this newly created organization if provisioning
            // fails after the central transaction has committed.
            if ($tenant?->exists) {
                try {
                    $tenant->delete();
                } catch (Throwable) {
                    // Preserve the original provisioning exception.
                }
            }

            // Remove only the database created by this failed operation. Existing
            // tenant databases are never touched by this recovery path.
            if ($databaseCreated && $databaseName) {
                $this->cleanupCreatedTenantDatabase($databaseName);
            }

            throw $e;
        }
    }

    private function assertCanCreate(string $name, User $owner): void
    {
        $normalizedName = $this->normalizeName($name);
        $duplicate = Tenant::query()
            ->where('owner_id', $owner->id)
            ->where('status', 'active')
            ->get(['name'])
            ->contains(fn (Tenant $tenant) => $this->normalizeName($tenant->name) === $normalizedName);

        if ($duplicate) {
            throw new OrganizationCreationException(
                'organization_duplicate_name',
                'You already have an organization with this name.',
            );
        }

        $subscription = $this->creationSubscription($owner);
        if (! $subscription || ! $subscription->plan) {
            throw new OrganizationCreationException(
                'subscription_required',
                'Please choose a plan before creating an organization.',
            );
        }

        $limit = $subscription->plan->getLimit('organizations', 1);
        $organizationCount = Tenant::query()
            ->where('owner_id', $owner->id)
            ->where('status', 'active')
            ->count();

        if ($limit === 'unlimited') {
            return;
        }

        $numericLimit = is_int($limit) || is_float($limit) || (is_string($limit) && is_numeric($limit))
            ? (int) $limit
            : 1;

        if ($organizationCount >= $numericLimit) {
            throw new OrganizationCreationException(
                'organization_limit_reached',
                "Your current plan allows only {$numericLimit} organization".($numericLimit === 1 ? '' : 's').'.',
                403,
                ['limit' => $numericLimit],
            );
        }
    }

    private function creationSubscription(User $owner): ?Subscription
    {
        return Subscription::query()
            ->where('user_id', $owner->id)
            ->whereIn('status', ['active', 'trialing'])
            ->with('plan')
            ->latest()
            ->first();
    }

    private function normalizeName(string $name): string
    {
        return mb_strtolower((string) preg_replace('/\s+/', ' ', trim($name)));
    }

    protected function cleanupCreatedTenantDatabase(string $databaseName): void
    {
        $driver = config('database.default');

        if ($driver === 'sqlite') {
            $path = database_path($databaseName . '.sqlite');
            if (file_exists($path)) {
                @unlink($path);
            }

            return;
        }

        try {
            DB::statement("DROP DATABASE IF EXISTS `{$databaseName}`");
        } catch (\Throwable) {
            // Preserve the original creation error; cleanup failure is not safe to expose.
        }
    }

    protected function generateUniqueSlug(string $name): string
    {
        $slug = Str::slug($name);
        $originalSlug = $slug;
        $count = 1;

        while (Tenant::where('slug', $slug)->exists()) {
            $slug = $originalSlug . '-' . $count;
            $count++;
        }

        return $slug;
    }

    protected function generateDatabaseName(string $slug): string
    {
        return 'tenant_' . str_replace('-', '_', $slug);
    }

    public function ensureProvisioned(Tenant $tenant): void
    {
        $databaseName = $tenant->database_name;
        $driver = config('database.default');

        $exists = $driver === 'sqlite'
            ? file_exists(database_path($databaseName . '.sqlite'))
            : (bool) DB::selectOne(
                'SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ?',
                [$databaseName],
            );

        if (! $exists) {
            $this->createTenantDatabase($databaseName);
        }

        $this->migrateTenantDatabase($tenant);

        $tenant->run(function () use ($tenant) {
            if (DB::connection('tenant')->table('tenant_settings')->count() === 0) {
                $this->seedTenantData($tenant);
            }
        });
    }

    protected function createTenantDatabase(string $databaseName): void
    {
        $driver = config('database.default');
        if ($driver === 'sqlite') {
            $path = database_path($databaseName . '.sqlite');
            if (file_exists($path)) {
                throw new \RuntimeException('Tenant database already exists.');
            }

            if (! touch($path)) {
                throw new \RuntimeException('Tenant database could not be created.');
            }
        } else {
            DB::statement("CREATE DATABASE `{$databaseName}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
        }
    }

    protected function migrateTenantDatabase(Tenant $tenant): void
    {
        $tenant->configure();

        $exitCode = Artisan::call('migrate', [
            '--database' => 'tenant',
            '--path' => 'database/migrations/tenant',
            '--force' => true,
        ]);

        if ($exitCode !== 0) {
            throw new \RuntimeException('Tenant database migrations failed.');
        }
    }

    protected function seedTenantData(Tenant $tenant, array $data = []): void
    {
        $tenant->run(function () use ($tenant, $data) {
            // Insert default settings
            DB::connection('tenant')->table('tenant_settings')->insert([
                ['key' => 'site_name', 'value' => $tenant->name, 'type' => 'string'],
                ['key' => 'industry', 'value' => $data['industry'] ?? null, 'type' => 'string'],
                ['key' => 'website', 'value' => $data['website'] ?? null, 'type' => 'string'],
                ['key' => 'contact_email', 'value' => $data['contact_email'] ?? null, 'type' => 'string'],
                ['key' => 'description', 'value' => $data['description'] ?? null, 'type' => 'string'],
                ['key' => 'timezone', 'value' => 'UTC', 'type' => 'string'],
                ['key' => 'currency', 'value' => 'USD', 'type' => 'string'],
            ]);
        });
    }

    public function delete(Tenant $tenant): bool
    {
        // DDL can implicitly commit on MySQL. Archive the central record
        // instead of mixing DROP DATABASE with a central transaction. This
        // removes it from active organization lists while retaining audit data.
        return (bool) $tenant->update([
            'status' => Tenant::STATUS_CANCELLED,
            'is_primary' => false,
            'archived_at' => now(),
        ]);
    }

    public function setPrimary(Tenant $tenant, User $owner): void
    {
        DB::transaction(function () use ($tenant, $owner): void {
            Tenant::query()->where('owner_id', $owner->id)->where('status', Tenant::STATUS_ACTIVE)->lockForUpdate()->get();
            $tenant->update(['is_primary' => true]);
            Tenant::query()->where('owner_id', $owner->id)->where('id', '<>', $tenant->id)->update(['is_primary' => false]);
        });
    }

    public function schedulePermanentDeletion(Tenant $tenant): void
    {
        $tenant->update([
            'status' => Tenant::STATUS_CANCELLED,
            'is_primary' => false,
            'archived_at' => $tenant->archived_at ?? now(),
            'permanent_deletion_scheduled_at' => now()->addDays(30),
        ]);
    }

    public function permanentlyDelete(Tenant $tenant): void
    {
        $databaseName = $tenant->database_name;
        $driver = config('database.default');

        DB::transaction(function () use ($tenant): void {
            $tenant->activityLogs()->delete();
            $tenant->users()->detach();
            $tenant->delete();
        });

        if ($driver === 'sqlite') {
            $path = database_path($databaseName . '.sqlite');
            if (file_exists($path)) {
                @unlink($path);
            }
        } else {
            if (! preg_match('/^tenant_[a-z0-9_]+$/', $databaseName)) {
                throw new \RuntimeException('Invalid tenant database name.');
            }
            DB::statement("DROP DATABASE IF EXISTS `{$databaseName}`");
        }
    }

    public function switchTenant(?Tenant $tenant): void
    {
        if ($tenant) {
            $tenant->configure();
            app()->instance('currentTenant', $tenant);
        } else {
            app()->forgetInstance('currentTenant');
            DB::purge('tenant');
        }
    }

    public function getCurrentTenant(): ?Tenant
    {
        return app()->bound('currentTenant') ? app('currentTenant') : null;
    }
}
