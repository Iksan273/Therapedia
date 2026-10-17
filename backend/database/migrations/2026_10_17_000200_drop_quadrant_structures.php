<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Kuadran dihapus total (17 Okt 2026): hasil asesmen hanya skor mentah per section. Migration create 000017/000029/000033/000034
// sudah dirapikan untuk database baru; migration ini membersihkan database yang sudah terlanjur dimigrasi (UAT).
return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('assessment_quadrant_scores');

        if (Schema::hasColumn('assessment_questions', 'quadrant_code')) {
            Schema::table('assessment_questions', function (Blueprint $table) {
                $table->dropForeign(['quadrant_code']);
                $table->dropColumn('quadrant_code');
            });
        }

        if (Schema::hasColumn('assessment_answers', 'quadrant_code')) {
            Schema::table('assessment_answers', function (Blueprint $table) {
                $table->dropColumn('quadrant_code');
            });
        }

        Schema::dropIfExists('sensory_quadrants');
    }

    public function down(): void
    {
        // Sengaja tidak dikembalikan: fitur kuadran dihapus permanen.
    }
};
