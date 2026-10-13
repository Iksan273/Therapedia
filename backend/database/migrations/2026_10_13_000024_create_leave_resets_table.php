<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('leave_resets', function (Blueprint $table) {
            $table->id();
            $table->date('reset_date');
            $table->unsignedInteger('clients_count');
            $table->unsignedInteger('forfeited_days');
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->index('reset_date', 'idx_leave_reset_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('leave_resets');
    }
};
