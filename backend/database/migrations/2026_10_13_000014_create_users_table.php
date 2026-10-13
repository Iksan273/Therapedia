<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->foreignId('role_id')->constrained('roles')->restrictOnDelete();
            $table->foreignId('branch_id')->nullable()->constrained('branches')->restrictOnDelete();
            $table->string('name', 150);
            $table->string('email', 150)->unique();
            $table->string('password', 255);
            $table->boolean('must_change_password')->default(true);
            $table->timestamp('password_changed_at')->nullable();
            $table->string('phone', 30)->nullable();
            $table->string('title', 50)->nullable();
            $table->string('specialty', 150)->nullable();
            $table->unsignedSmallInteger('max_sessions_per_month')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamp('last_login_at')->nullable();
            $table->rememberToken();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();
            $table->timestamps();
            $table->index(['branch_id', 'role_id', 'is_active'], 'idx_users_branch_role');
        });
        DB::statement('ALTER TABLE users ADD CONSTRAINT chk_users_1 CHECK ((max_sessions_per_month IS NULL OR max_sessions_per_month BETWEEN 1 AND 744))');
    }

    public function down(): void
    {
        Schema::dropIfExists('users');
    }
};
