<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('master_packages', function (Blueprint $table) {
            $table->id();
            $table->string('code', 50)->unique();
            $table->string('invoice_code', 10)->unique();
            $table->string('name', 150);
            $table->unsignedSmallInteger('credits');
            $table->unsignedBigInteger('price');
            $table->text('description')->nullable();
            $table->unsignedSmallInteger('leave_quota')->default(3);
            $table->boolean('is_satuan')->default(false);
            $table->boolean('is_assessment')->default(false);
            $table->boolean('is_active')->default(true);
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('master_packages');
    }
};
