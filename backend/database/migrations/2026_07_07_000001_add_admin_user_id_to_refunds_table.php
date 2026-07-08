<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('refunds', function (Blueprint $table): void {
            if (! Schema::hasColumn('refunds', 'admin_user_id')) {
                $table->foreignId('admin_user_id')
                    ->nullable()
                    ->after('user_id')
                    ->constrained('users')
                    ->nullOnDelete();
            }
        });
    }

    public function down(): void
    {
        Schema::table('refunds', function (Blueprint $table): void {
            if (Schema::hasColumn('refunds', 'admin_user_id')) {
                $table->dropConstrainedForeignId('admin_user_id');
            }
        });
    }
};
