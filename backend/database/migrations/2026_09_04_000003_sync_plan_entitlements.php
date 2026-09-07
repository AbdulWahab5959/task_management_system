<?php

use Database\Seeders\PlanSeeder;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    public function up(): void
    {
        // Keep existing installations in sync with the canonical plan catalog.
        app(PlanSeeder::class)->run();
    }

    public function down(): void
    {
        // Plan data is application configuration; it is intentionally not removed.
    }
};
