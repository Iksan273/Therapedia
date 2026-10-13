<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('assessment_access_codes', function (Blueprint $table) {
            $table->id();
            $table->string('code', 20)->unique();
            $table->foreignId('client_id')->constrained('clients')->cascadeOnDelete();
            $table->foreignId('category_id')->constrained('assessment_categories')->restrictOnDelete();
            $table->enum('status', ['issued', 'submitted'])->default('issued');
            $table->foreignId('issued_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('issued_at')->useCurrent();
            $table->timestamp('expires_at')->nullable();
            $table->timestamp('submitted_at')->nullable();
            $table->boolean('invoice_required')->default(true);
            $table->timestamps();
            $table->index(['client_id', 'category_id'], 'idx_codes_client');
            $table->index(['status', 'issued_at'], 'idx_codes_awaiting');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('assessment_access_codes');
    }
};
