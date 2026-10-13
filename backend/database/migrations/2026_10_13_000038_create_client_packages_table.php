<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('client_packages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_id')->constrained('clients')->cascadeOnDelete();
            $table->foreignId('invoice_id')->nullable()->unique()->constrained('invoices')->nullOnDelete();
            $table->foreignId('master_package_id')->nullable()->constrained('master_packages')->restrictOnDelete();
            $table->string('package_name', 150);
            $table->unsignedBigInteger('package_price');
            $table->unsignedSmallInteger('total_credit');
            $table->smallInteger('remaining_credit');
            $table->unsignedSmallInteger('cancel_count')->default(0);
            $table->unsignedSmallInteger('leave_total')->default(3);
            $table->unsignedSmallInteger('leave_used')->default(0);
            $table->boolean('is_refunded')->default(false);
            $table->enum('status', ['active', 'depleted', 'converted', 'voided'])->default('active');
            $table->unsignedBigInteger('converted_from_package_id')->nullable();
            $table->unsignedBigInteger('converted_to_package_id')->nullable();
            $table->timestamp('activated_at')->useCurrent();
            $table->unsignedInteger('version')->default(1);
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->index(['client_id', 'status', 'activated_at'], 'idx_pkg_client');
        });
        DB::statement('ALTER TABLE client_packages ADD CONSTRAINT chk_client_packages_1 CHECK (remaining_credit >= 0 AND remaining_credit <= total_credit)');
        DB::statement('ALTER TABLE client_packages ADD CONSTRAINT chk_client_packages_2 CHECK (leave_used <= leave_total)');
    }

    public function down(): void
    {
        Schema::dropIfExists('client_packages');
    }
};
