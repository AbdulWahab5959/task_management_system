<?php

use App\Models\User;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('users') || Schema::hasColumn('users', 'status')) {
            return;
        }

        Schema::table('users', function (Blueprint $table) {
            $table->enum('status', User::STATUSES)
                ->default(User::STATUS_ACTIVE)
                ->after(Schema::hasColumn('users', 'role') ? 'role' : 'email');

            $table->index('status');
        });
    }

    public function down(): void
    {
        // Intentionally left in place because the column may have existed before this migration.
    }
};
