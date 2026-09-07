<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tenants', function (Blueprint $table): void {
            $table->boolean('is_primary')->default(false)->after('owner_id');
            $table->timestamp('archived_at')->nullable()->after('status');
            $table->timestamp('permanent_deletion_scheduled_at')->nullable()->after('archived_at');
            $table->index(['owner_id', 'status', 'is_primary']);
            $table->index('permanent_deletion_scheduled_at');
        });
    }

    public function down(): void
    {
        Schema::table('tenants', function (Blueprint $table): void {
            $table->dropIndex(['owner_id', 'status', 'is_primary']);
            $table->dropIndex(['permanent_deletion_scheduled_at']);
            $table->dropColumn(['is_primary', 'archived_at', 'permanent_deletion_scheduled_at']);
        });
    }
};
