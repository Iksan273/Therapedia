<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('assessment_answers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('response_id')->constrained('assessment_responses')->cascadeOnDelete();
            $table->foreignId('question_id')->constrained('assessment_questions')->restrictOnDelete();
            $table->unsignedSmallInteger('item_no');
            $table->text('answer_text');
            $table->json('answer_values')->nullable();
            $table->smallInteger('score')->nullable();
            $table->unique(['response_id', 'question_id'], 'uq_answers_question');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('assessment_answers');
    }
};
