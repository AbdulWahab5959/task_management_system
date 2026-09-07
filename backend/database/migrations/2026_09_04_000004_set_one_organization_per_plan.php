<?php

use Database\Seeders\PlanSeeder;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    public function up(): void
    {
        // Organization count is intentionally fixed at one for every plan.
        // Other limits and entitlements remain plan-specific in PlanSeeder.
        app(PlanSeeder::class)->run();
    }

    public function down(): void
    {
        // Plan catalog changes are not reversed automatically.
    }
};
