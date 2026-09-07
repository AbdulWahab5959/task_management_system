<?php

use Database\Seeders\PlanSeeder;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    public function up(): void
    {
        // Organization capacity is rendered from limits, so it must not also
        // appear as a duplicate marketing feature on plan cards.
        app(PlanSeeder::class)->run();
    }

    public function down(): void
    {
        // Plan catalog presentation changes are not reversed automatically.
    }
};
