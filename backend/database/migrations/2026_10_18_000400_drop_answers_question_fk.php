<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Soal master boleh dihapus walau sudah dijawab di kuesioner yang sudah dikirim: teks soal, tipe, opsi, section, dan template tiap hasil
 * sudah tersimpan utuh di `assessment_access_codes.structure_snapshot` (dibekukan saat draft pertama / kirim), jadi `question_id` di jawaban
 * cukup menjadi pengenal ke snapshot, bukan kunci asing. Hapus tetap ditolak selama ada kuesioner yang sedang diisi (lihat SectionActions).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('assessment_answers', function (Blueprint $table) {
            $table->dropForeign(['question_id']);
        });
    }

    public function down(): void
    {
        Schema::table('assessment_answers', function (Blueprint $table) {
            $table->foreign('question_id')->references('id')->on('assessment_questions')->restrictOnDelete();
        });
    }
};
