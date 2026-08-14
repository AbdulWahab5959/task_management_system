<?php

namespace App\Services;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Artisan;

class TenantService
{
    public function create(array $data, User $owner): Tenant
    {
        DB::beginTransaction();
        $databaseName = null;
        $databaseCreated = false;

        try {
            // Generate unique slug and database name
            $slug = $this->generateUniqueSlug($data['name']);
            $databaseName = $this->generateDatabaseName($slug);

            // Create tenant record
            $tenant = Tenant::create([
                'name' => $data['name'],
                'slug' => $slug,
                'database_name' => $databaseName,
                'owner_id' => $owner->id,
                'status' => 'active',
                'trial_ends_at' => now()->addDays(14), // 14-day trial
            ]);

            // Attach owner to tenant
            $tenant->users()->attach($owner->id, [
                'role' => 'owner',
                'joined_at' => now(),
            ]);

            // Create tenant database
            $this->createTenantDatabase($databaseName);
            $databaseCreated = true;

            // Run migrations on tenant database
            $this->migrateTenantDatabase($tenant);

            // Seed initial data
            $this->seedTenantData($tenant);

            DB::commit();

            // Fire event optionally (checking if class exists)
            if (class_exists(\App\Events\TenantCreated::class)) {
                event(new \App\Events\TenantCreated($tenant));
            }

            return $tenant;
        } catch (\Exception $e) {
            DB::rollBack();

            // Remove only the database created by this failed operation. Existing
            // tenant databases are never touched by this recovery path.
            if ($databaseCreated && $databaseName) {
                $this->cleanupCreatedTenantDatabase($databaseName);
            }

            throw $e;
        }
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

    protected function createTenantDatabase(string $databaseName): void
    {
        $driver = config('database.default');
        if ($driver === 'sqlite') {
            $path = database_path($databaseName . '.sqlite');
            if (!file_exists($path)) {
                touch($path);
            }
        } else {
            DB::statement("CREATE DATABASE `{$databaseName}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
        }
    }

    protected function migrateTenantDatabase(Tenant $tenant): void
    {
        $tenant->configure();

        Artisan::call('migrate', [
            '--database' => 'tenant',
            '--path' => 'database/migrations/tenant',
            '--force' => true,
        ]);
    }

    protected function seedTenantData(Tenant $tenant): void
    {
        $tenant->run(function () use ($tenant) {
            // Insert default settings
            DB::connection('tenant')->table('tenant_settings')->insert([
                ['key' => 'site_name', 'value' => $tenant->name, 'type' => 'string'],
                ['key' => 'timezone', 'value' => 'UTC', 'type' => 'string'],
                ['key' => 'currency', 'value' => 'USD', 'type' => 'string'],
            ]);
        });
    }

    public function delete(Tenant $tenant): bool
    {
        DB::beginTransaction();

        try {
            // Drop tenant database
            $driver = config('database.default');
            if ($driver === 'sqlite') {
                $path = database_path($tenant->database_name . '.sqlite');
                if (file_exists($path)) {
                    @unlink($path);
                }
            } else {
                DB::statement("DROP DATABASE IF EXISTS `{$tenant->database_name}`");
            }

            // Delete tenant record (cascades to relationships)
            $tenant->delete();

            DB::commit();

            return true;
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
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
