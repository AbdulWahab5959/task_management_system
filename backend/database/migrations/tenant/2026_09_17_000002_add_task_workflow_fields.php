<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tasks', function (Blueprint $table): void {
            $table->foreignId('section_id')->nullable()->after('project_id')->constrained('project_sections')->nullOnDelete();
            $table->foreignId('parent_task_id')->nullable()->after('section_id')->constrained('tasks')->nullOnDelete();
            $table->date('start_date')->nullable()->after('priority');

            $table->index(['project_id', 'section_id']);
            $table->index('parent_task_id');
        });
    }

    public function down(): void
    {
        Schema::table('tasks', function (Blueprint $table): void {
            $table->dropForeign(['section_id']);
            $table->dropForeign(['parent_task_id']);
            $table->dropIndex('tasks_project_id_section_id_index');
            $table->dropIndex('tasks_parent_task_id_index');
            $table->dropColumn(['section_id', 'parent_task_id', 'start_date']);
        });
    }
};
