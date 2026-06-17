<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('files', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('path', 500);
            $table->string('mime_type', 100);
            $table->bigInteger('size')->unsigned();
            $table->bigInteger('uploaded_by')->unsigned();
            $table->timestamp('created_at')->useCurrent();

            $table->index('uploaded_by');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('files');
    }
};
