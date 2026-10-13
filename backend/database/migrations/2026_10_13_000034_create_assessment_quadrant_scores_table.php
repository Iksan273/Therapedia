<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('assessment_quadrant_scores', function (Blueprint $table) {
            $table->foreignId('response_id')->constrained('assessment_responses')->cascadeOnDelete();
            $table->string('quadrant_code', 10);
            $table->unsignedSmallInteger('raw_score');
            $table->unsignedSmallInteger('item_count');
            $table->string('classification', 40)->nullable();
            $table->foreign('quadrant_code')->references('code')->on('sensory_quadrants')->restrictOnDelete();
            $table->primary(['response_id', 'quadrant_code']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('assessment_quadrant_scores');
    }
};
