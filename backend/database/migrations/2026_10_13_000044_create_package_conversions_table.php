<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('package_conversions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_id')->constrained('clients')->cascadeOnDelete();
            $table->foreignId('invoice_id')->constrained('invoices')->cascadeOnDelete();
            $table->foreignId('from_package_id')->constrained('client_packages')->cascadeOnDelete();
            $table->foreignId('to_package_id')->constrained('client_packages')->cascadeOnDelete();
            $table->unsignedSmallInteger('from_remaining');
            $table->unsignedSmallInteger('to_sessions');
            $table->unsignedBigInteger('remaining_value');
            $table->unsignedBigInteger('leftover_amount')->default(0);
            $table->enum('mode', ['auto', 'manual']);
            $table->string('reason', 500)->nullable();
            $table->unsignedSmallInteger('deleted_schedule_count')->default(0);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('created_at')->useCurrent();
            $table->index(['client_id', 'created_at'], 'idx_conv_client');
            $table->index(['invoice_id', 'created_at'], 'idx_conv_invoice');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('package_conversions');
    }
};
