<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('support_conversations', function (Blueprint $table): void {
            $table->unique(['user_id', 'organization_id']);
            // Add the replacement index first so InnoDB continues to have an
            // index for the user foreign key while removing the old unique
            // constraint.
            $table->dropUnique('support_conversations_user_id_unique');
        });
    }

    public function down(): void
    {
        Schema::table('support_conversations', function (Blueprint $table): void {
            $table->dropUnique('support_conversations_user_id_organization_id_unique');
            $table->unique('user_id');
        });
    }
};
