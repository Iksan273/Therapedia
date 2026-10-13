<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('role_permissions', function (Blueprint $table) {
            $table->foreignId('role_id')->constrained('roles')->cascadeOnDelete();
            $table->string('module_code', 50);
            $table->boolean('allowed')->default(false);
            $table->timestamps();
            $table->foreign('module_code')->references('code')->on('access_modules')->cascadeOnDelete()->cascadeOnUpdate();
            $table->primary(['role_id', 'module_code']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('role_permissions');
    }
};
