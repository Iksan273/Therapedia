<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('assessment_drafts', function (Blueprint $table) {
            $table->foreignId('access_code_id')->primary()->constrained('assessment_access_codes')->cascadeOnDelete();
            $table->json('answers');
            $table->unsignedSmallInteger('answered_count')->default(0);
            $table->foreignId('last_section_id')->nullable()->constrained('assessment_sections')->nullOnDelete();
            $table->timestamp('consent_at')->nullable();
            $table->unsignedInteger('version')->default(1);
            $table->string('ip_address', 45)->nullable();
            $table->timestamp('started_at')->useCurrent();
            $table->timestamp('updated_at')->useCurrent()->useCurrentOnUpdate();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('assessment_drafts');
    }
};
