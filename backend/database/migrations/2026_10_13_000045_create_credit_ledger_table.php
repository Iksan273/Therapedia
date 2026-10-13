<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('credit_ledger', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_id')->constrained('clients')->cascadeOnDelete();
            $table->foreignId('branch_id')->constrained('branches')->cascadeOnDelete();
            $table->foreignId('client_package_id')->nullable()->constrained('client_packages')->cascadeOnDelete();
            $table->foreignId('schedule_id')->nullable()->constrained('schedules')->nullOnDelete();
            $table->foreignId('invoice_id')->nullable()->constrained('invoices')->nullOnDelete();
            $table->enum('action', ['purchased', 'renewed', 'used', 'cancel_excused', 'cancel_penalty', 'cancel_leave', 'off_excused', 'off_penalty', 'reversal', 'manual_adjust', 'converted_out', 'converted_in', 'refund', 'discharge']);
            $table->foreignId('conversion_id')->nullable()->constrained('package_conversions')->cascadeOnDelete();
            $table->smallInteger('credit_change');
            $table->smallInteger('leave_change')->default(0);
            $table->smallInteger('package_balance_after');
            $table->integer('client_balance_after');
            $table->unsignedSmallInteger('cancel_count_after')->nullable();
            $table->string('cancel_reason', 150)->nullable();
            $table->string('package_name', 150)->nullable();
            $table->text('note')->nullable();
            $table->unsignedBigInteger('reverses_ledger_id')->nullable()->unique();
            $table->string('idempotency_key', 100)->nullable()->unique();
            $table->char('batch_id', 26)->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('created_at', 3)->useCurrent();
            $table->date('entry_date')->storedAs('DATE(created_at + INTERVAL 7 HOUR)');
            $table->index(['client_id', 'created_at'], 'idx_ledger_client');
            $table->index(['branch_id', 'created_at', 'id'], 'idx_ledger_branch');
            $table->index(['schedule_id', 'action'], 'idx_ledger_schedule');
            $table->index(['branch_id', 'entry_date', 'action'], 'idx_ledger_branch_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('credit_ledger');
    }
};
