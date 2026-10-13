<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('client_leaves', function (Blueprint $table) {
            $table->id();
            $table->foreignId('branch_id')->constrained('branches')->cascadeOnDelete();
            $table->foreignId('client_id')->constrained('clients')->cascadeOnDelete();
            $table->date('start_date');
            $table->date('end_date');
            $table->date('counted_start');
            $table->date('counted_end');
            $table->date('return_date')->nullable();
            $table->string('return_note', 255)->nullable();
            $table->timestamp('returned_at')->nullable();
            $table->foreignId('returned_by')->nullable()->constrained('users')->nullOnDelete();
            $table->enum('status', ['active', 'voided'])->default('active');
            $table->string('reason', 255)->nullable();
            $table->text('note')->nullable();
            $table->text('void_reason')->nullable();
            $table->timestamp('voided_at')->nullable();
            $table->foreignId('voided_by')->nullable()->constrained('users')->nullOnDelete();
            $table->unsignedInteger('version')->default(1);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->index(['client_id', 'start_date'], 'idx_leave_client');
            $table->index(['branch_id', 'start_date'], 'idx_leave_branch');
        });
        DB::statement('ALTER TABLE client_leaves ADD CONSTRAINT chk_client_leaves_1 CHECK (end_date >= start_date)');
        DB::statement('ALTER TABLE client_leaves ADD CONSTRAINT chk_client_leaves_2 CHECK (counted_start BETWEEN start_date AND end_date)');
        DB::statement('ALTER TABLE client_leaves ADD CONSTRAINT chk_client_leaves_3 CHECK (counted_end BETWEEN counted_start AND end_date)');
        DB::statement('ALTER TABLE client_leaves ADD CONSTRAINT chk_client_leaves_4 CHECK (return_date IS NULL OR (return_date > start_date AND return_date <= end_date))');
        DB::statement('ALTER TABLE client_leaves ADD CONSTRAINT chk_client_leaves_5 CHECK ((NOT (status = \'voided\') OR void_reason IS NOT NULL))');
    }

    public function down(): void
    {
        Schema::dropIfExists('client_leaves');
    }
};
