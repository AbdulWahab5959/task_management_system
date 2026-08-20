<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('tenants')->orderBy('id')->eachById(function (object $tenant): void {
            $alreadyLogged = DB::table('activity_logs')
                ->where('tenant_id', $tenant->id)
                ->where('action', 'tenant.organization.created')
                ->exists();

            if ($alreadyLogged) {
                return;
            }

            DB::table('activity_logs')->insert([
                'tenant_id' => $tenant->id,
                'user_id' => $tenant->owner_id,
                'action' => 'tenant.organization.created',
                'description' => "Organization created: {$tenant->name}",
                'properties' => json_encode([
                    'tenant_id' => $tenant->id,
                    'organization_name' => $tenant->name,
                    'source' => 'organization_creation_history_backfill',
                ], JSON_THROW_ON_ERROR),
                'created_at' => $tenant->created_at ?? now(),
                'updated_at' => $tenant->created_at ?? now(),
            ]);
        });
    }

    public function down(): void
    {
        DB::table('activity_logs')
            ->where('action', 'tenant.organization.created')
            ->whereJsonContains('properties->source', 'organization_creation_history_backfill')
            ->delete();
    }
};
