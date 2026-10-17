<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Langkah bawaan "Data Pengisi" per kategori: profil di kategori, nilai di draft (JSON) dan di hasil (kolom terstruktur).
 * Hasil lama / profil `none` = kolom NULL.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('assessment_categories', function (Blueprint $table) {
            $table->enum('respondent_profile', ['none', 'parent', 'teacher'])->default('parent')->after('domain');
        });

        Schema::table('assessment_drafts', function (Blueprint $table) {
            $table->json('respondent')->nullable()->after('answers');
        });

        Schema::table('assessment_responses', function (Blueprint $table) {
            $table->string('respondent_name', 150)->nullable()->after('answered_count');
            $table->string('respondent_relation', 50)->nullable()->after('respondent_name');
            $table->string('respondent_school', 150)->nullable()->after('respondent_relation');
            $table->string('respondent_class', 50)->nullable()->after('respondent_school');
            $table->string('respondent_phone', 30)->nullable()->after('respondent_class');
            $table->string('respondent_email', 150)->nullable()->after('respondent_phone');
        });
    }

    public function down(): void
    {
        Schema::table('assessment_responses', function (Blueprint $table) {
            $table->dropColumn(['respondent_name', 'respondent_relation', 'respondent_school', 'respondent_class', 'respondent_phone', 'respondent_email']);
        });
        Schema::table('assessment_drafts', function (Blueprint $table) {
            $table->dropColumn('respondent');
        });
        Schema::table('assessment_categories', function (Blueprint $table) {
            $table->dropColumn('respondent_profile');
        });
    }
};
