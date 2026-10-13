<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('client_leave_sessions', function (Blueprint $table) {
            $table->foreignId('leave_id')->constrained('client_leaves')->cascadeOnDelete();
            $table->foreignId('schedule_id')->constrained('schedules')->cascadeOnDelete();
            $table->primary(['leave_id', 'schedule_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('client_leave_sessions');
    }
};
