<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('support_messages', function (Blueprint $table): void {
            // Structured metadata (FAQ slug, handoff type) used for safe
            // message classification and FAQ duplicate prevention.
            $table->json('meta')->nullable()->after('message');
        });
    }

    public function down(): void
    {
        Schema::table('support_messages', function (Blueprint $table): void {
            $table->dropColumn('meta');
        });
    }
};