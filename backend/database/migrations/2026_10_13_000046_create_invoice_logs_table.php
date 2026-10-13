<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('invoice_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('invoice_id')->constrained('invoices')->cascadeOnDelete();
            $table->enum('action', ['issued', 'proof_uploaded', 'verified', 'rejected', 'renewal_paid', 'balance_applied', 'converted', 'voided', 'refunded']);
            $table->string('actor_name', 120)->nullable();
            $table->foreignId('actor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('note', 500)->nullable();
            $table->json('data')->nullable();
            $table->timestamp('created_at', 3)->useCurrent();
            $table->index(['invoice_id', 'created_at', 'id'], 'idx_invlog_invoice');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('invoice_logs');
    }
};
