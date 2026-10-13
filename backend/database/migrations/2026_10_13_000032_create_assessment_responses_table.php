<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('assessment_responses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('access_code_id')->unique()->constrained('assessment_access_codes')->cascadeOnDelete();
            $table->foreignId('client_id')->constrained('clients')->cascadeOnDelete();
            $table->foreignId('category_id')->constrained('assessment_categories')->restrictOnDelete();
            $table->unsignedSmallInteger('answered_count');
            $table->timestamp('consent_at');
            $table->timestamp('submitted_at')->useCurrent();
            $table->string('ip_address', 45)->nullable();
            $table->timestamps();
            $table->index(['client_id', 'category_id', 'submitted_at'], 'idx_responses_client');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('assessment_responses');
    }
};
