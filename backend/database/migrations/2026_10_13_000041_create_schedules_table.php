<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('schedules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('branch_id')->constrained('branches')->cascadeOnDelete();
            $table->foreignId('client_id')->constrained('clients')->cascadeOnDelete();
            $table->foreignId('therapist_id')->constrained('users')->restrictOnDelete();
            $table->foreignId('series_id')->nullable()->constrained('schedule_series')->nullOnDelete();
            $table->foreignId('client_package_id')->nullable()->constrained('client_packages')->nullOnDelete();
            $table->string('service_code', 50)->nullable();
            $table->enum('type', ['therapy', 'assessment', 'consultation'])->default('therapy');
            $table->date('session_date');
            $table->time('start_time');
            $table->time('end_time');
            $table->enum('status', ['scheduled', 'completed', 'cancelled', 'rescheduled', 'reschedule_pending'])->default('scheduled');
            $table->string('previous_status', 30)->nullable();
            $table->string('client_status_from', 30)->nullable();
            $table->string('client_status_to', 30)->nullable();
            $table->timestamp('reverted_at')->nullable();
            $table->enum('credit_effect', ['none', 'used', 'excused', 'penalty'])->default('none');
            $table->text('booking_note')->nullable();
            $table->text('history_note')->nullable();
            $table->foreignId('history_note_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('leave_id')->nullable()->constrained('client_leaves')->nullOnDelete();
            $table->string('cancel_reason', 150)->nullable();
            $table->text('cancel_note')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->foreignId('cancelled_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('completed_at')->nullable();
            $table->foreignId('completed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->date('origin_date')->nullable();
            $table->time('origin_start_time')->nullable();
            $table->time('origin_end_time')->nullable();
            $table->foreignId('origin_therapist_id')->nullable()->constrained('users')->nullOnDelete();
            $table->date('prev_date')->nullable();
            $table->time('prev_start_time')->nullable();
            $table->time('prev_end_time')->nullable();
            $table->foreignId('prev_therapist_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('rescheduled_at')->nullable();
            $table->string('pending_reason', 150)->nullable();
            $table->text('pending_note')->nullable();
            $table->timestamp('pending_at')->nullable();
            $table->unsignedInteger('version')->default(1);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->foreign('service_code')->references('code')->on('services')->restrictOnDelete();
            $table->index(['branch_id', 'session_date', 'status'], 'idx_sch_calendar');
            $table->index(['therapist_id', 'session_date', 'start_time'], 'idx_sch_therapist');
            $table->index(['client_id', 'session_date'], 'idx_sch_client');
            $table->index(['status', 'session_date'], 'idx_sch_status');
            $table->index('series_id', 'idx_sch_series');
            $table->index('leave_id', 'idx_sch_leave');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('schedules');
    }
};
