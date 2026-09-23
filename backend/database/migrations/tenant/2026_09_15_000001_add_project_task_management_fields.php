<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('projects', function (Blueprint $table): void {
            $table->date('start_date')->nullable()->after('description');
            $table->date('due_date')->nullable()->after('start_date');
            $table->index(['status', 'due_date']);
        });

        Schema::table('tasks', function (Blueprint $table): void {
            $table->timestamp('completed_at')->nullable()->after('due_date');
            $table->index(['project_id', 'status']);
            $table->index(['assigned_to', 'status']);
            $table->index('due_date');
        });
    }

    public function down(): void
    {
        Schema::table('tasks', function (Blueprint $table): void {
            $table->dropIndex('tasks_project_id_status_index');
            $table->dropIndex('tasks_assigned_to_status_index');
            $table->dropIndex('tasks_due_date_index');
            $table->dropColumn('completed_at');
        });

        Schema::table('projects', function (Blueprint $table): void {
            $table->dropIndex('projects_status_due_date_index');
            $table->dropColumn(['start_date', 'due_date']);
        });
    }
};
