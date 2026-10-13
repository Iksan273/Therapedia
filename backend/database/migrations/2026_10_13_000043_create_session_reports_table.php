<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('session_reports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('schedule_id')->unique()->constrained('schedules')->cascadeOnDelete();
            $table->foreignId('client_id')->constrained('clients')->cascadeOnDelete();
            $table->foreignId('therapist_id')->constrained('users')->restrictOnDelete();
            $table->text('activity_section')->nullable();
            $table->text('note_section')->nullable();
            $table->text('homework_section')->nullable();
            $table->unsignedTinyInteger('filled_sections')->storedAs('(activity_section IS NOT NULL AND activity_section <> \'\') + (note_section IS NOT NULL AND note_section <> \'\') + (homework_section IS NOT NULL AND homework_section <> \'\')');
            $table->unsignedInteger('version')->default(1);
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->index(['client_id', 'created_at'], 'idx_reports_client');
            $table->index(['therapist_id', 'filled_sections'], 'idx_reports_therapist');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('session_reports');
    }
};
