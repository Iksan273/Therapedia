<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sensory_quadrants', function (Blueprint $table) {
            $table->string('code', 10)->primary();
            $table->string('title', 60);
            $table->string('full_name', 100);
            $table->text('description')->nullable();
            $table->string('color', 20)->default('slate');
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sensory_quadrants');
    }
};
