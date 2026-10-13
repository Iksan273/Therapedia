<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('assessment_questions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('category_id')->constrained('assessment_categories')->cascadeOnDelete();
            $table->foreignId('section_id')->constrained('assessment_sections')->cascadeOnDelete();
            $table->unsignedSmallInteger('item_no');
            $table->string('quadrant_code', 10)->nullable();
            $table->enum('question_type', ['scale_0_5', 'range', 'multiple_choice', 'checkbox_multi', 'free_text', 'yes_no', 'short_text', 'number', 'dropdown', 'date', 'birth_date', 'time'])->default('scale_0_5');
            $table->text('question');
            $table->json('options')->nullable();
            $table->smallInteger('range_min')->nullable();
            $table->smallInteger('range_max')->nullable();
            $table->string('range_min_label', 60)->nullable();
            $table->string('range_max_label', 60)->nullable();
            $table->boolean('is_required')->default(true);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->foreign('quadrant_code')->references('code')->on('sensory_quadrants')->restrictOnDelete();
            $table->index(['category_id', 'section_id', 'sort_order'], 'idx_questions_form');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('assessment_questions');
    }
};
