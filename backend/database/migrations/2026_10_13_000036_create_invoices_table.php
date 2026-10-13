<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('invoices', function (Blueprint $table) {
            $table->id();
            $table->string('invoice_number', 40)->unique();
            $table->foreignId('client_id')->constrained('clients')->cascadeOnDelete();
            $table->foreignId('branch_id')->constrained('branches')->cascadeOnDelete();
            $table->foreignId('master_package_id')->nullable()->constrained('master_packages')->restrictOnDelete();
            $table->enum('invoice_type', ['package', 'assessment', 'leave'])->default('package');
            $table->foreignId('assessment_access_code_id')->nullable()->constrained('assessment_access_codes')->nullOnDelete();
            $table->unsignedBigInteger('leave_id')->nullable();
            $table->unsignedBigInteger('leave_schedule_id')->nullable();
            $table->string('type_code', 10);
            $table->boolean('is_renewal')->default(false);
            $table->string('package_name', 150);
            $table->unsignedSmallInteger('credits')->default(0);
            $table->unsignedBigInteger('amount');
            $table->unsignedBigInteger('gross_amount')->nullable();
            $table->unsignedBigInteger('balance_applied')->default(0);
            $table->enum('status', ['unpaid', 'paid', 'void'])->default('unpaid');
            $table->text('void_reason')->nullable();
            $table->enum('void_credit_action', ['keep', 'revoke'])->nullable();
            $table->boolean('reset_leave')->default(false);
            $table->unsignedBigInteger('refund_amount')->nullable();
            $table->timestamp('refunded_at')->nullable();
            $table->foreignId('refunded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('refund_reason')->nullable();
            $table->unsignedSmallInteger('refund_credits')->nullable();
            $table->timestamp('voided_at')->nullable();
            $table->foreignId('voided_by')->nullable()->constrained('users')->nullOnDelete();
            $table->unsignedBigInteger('replaces_invoice_id')->nullable()->unique();
            $table->timestamp('issued_at')->useCurrent();
            $table->timestamp('paid_at')->nullable();
            $table->date('paid_date')->nullable()->storedAs('DATE(paid_at + INTERVAL 7 HOUR)');
            $table->foreignId('verified_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('verified_at')->nullable();
            $table->string('payment_method', 40)->default('transfer');
            $table->string('renewal_reason', 150)->nullable();
            $table->unsignedTinyInteger('proof_upload_count')->default(0);
            $table->unsignedInteger('version')->default(1);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->index(['branch_id', 'status', 'issued_at'], 'idx_inv_queue');
            $table->index(['client_id', 'issued_at'], 'idx_inv_client');
            $table->index(['status', 'branch_id', 'paid_date', 'amount'], 'idx_inv_paid_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('invoices');
    }
};
