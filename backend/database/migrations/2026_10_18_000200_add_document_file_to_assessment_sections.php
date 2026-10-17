<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/** Dokumen PDF per section di storage privat (ADR 0007). Satu sumber saja: link (`document_url`) ATAU file (`document_path`). */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('assessment_sections', function (Blueprint $table) {
            $table->string('document_path', 255)->nullable()->after('document_url');
            $table->string('document_name', 255)->nullable()->after('document_path');
            $table->unsignedInteger('document_size')->nullable()->after('document_name');
        });

        DB::statement('ALTER TABLE assessment_sections ADD CONSTRAINT chk_sections_document_one_source CHECK (document_url IS NULL OR document_path IS NULL)');
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE assessment_sections DROP CONSTRAINT chk_sections_document_one_source');

        Schema::table('assessment_sections', function (Blueprint $table) {
            $table->dropColumn(['document_path', 'document_name', 'document_size']);
        });
    }
};
