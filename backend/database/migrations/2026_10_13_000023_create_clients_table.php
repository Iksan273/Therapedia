<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('clients', function (Blueprint $table) {
            $table->id();
            $table->string('client_code', 10)->unique();
            $table->foreignId('branch_id')->constrained('branches')->cascadeOnDelete();
            $table->string('child_name', 120);
            $table->enum('gender', ['male', 'female']);
            $table->date('date_of_birth');
            $table->unsignedTinyInteger('birth_month')->storedAs('MONTH(date_of_birth)');
            $table->string('parent_name', 120);
            $table->string('parent_phone', 30);
            $table->string('parent_email', 150)->nullable();
            $table->text('address')->nullable();
            $table->text('intake_note')->nullable();
            $table->enum('status', ['inquiry', 'service_selected', 'assessment_scheduled', 'assessment_done', 'admitted', 'done_consult', 'done_assessment', 'discontinued', 'discharged'])->default('inquiry');
            $table->enum('final_outcome', ['admitted', 'done_consult', 'done_assessment', 'discontinued'])->nullable();
            $table->timestamp('status_changed_at')->nullable();
            $table->date('date_of_join')->nullable();
            $table->date('date_of_discharge')->nullable();
            $table->date('date_of_discontinue')->nullable();
            $table->string('discharge_reason', 150)->nullable();
            $table->text('discharge_note')->nullable();
            $table->integer('credit_balance')->default(0);
            $table->unsignedSmallInteger('leave_granted')->default(30);
            $table->unsignedSmallInteger('leave_credit_balance')->default(0);
            $table->date('leave_reset_at')->nullable();
            $table->unsignedBigInteger('leftover_balance')->default(0);
            $table->timestamp('last_login_at')->nullable();
            $table->unsignedInteger('version')->default(1);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->index(['branch_id', 'status', 'created_at'], 'idx_clients_pipeline');
            $table->index(['branch_id', 'status', 'credit_balance'], 'idx_clients_roster');
            $table->index(['branch_id', 'birth_month'], 'idx_clients_birthday');
            $table->index(['branch_id', 'leftover_balance'], 'idx_clients_leftover');
            $table->index(['branch_id', 'date_of_discharge'], 'idx_clients_discharge');
            $table->index('child_name', 'idx_clients_child_name');
            $table->index('parent_name', 'idx_clients_parent_name');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('clients');
    }
};
