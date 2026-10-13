<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('holidays', function (Blueprint $table) {
            $table->id();
            $table->foreignId('branch_id')->nullable()->constrained('branches')->cascadeOnDelete();
            $table->unsignedBigInteger('branch_key')->storedAs('IFNULL(branch_id, 0)');
            $table->date('holiday_date');
            $table->string('name', 150);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->unique(['holiday_date', 'branch_key'], 'uq_holidays_date_branch');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('holidays');
    }
};
