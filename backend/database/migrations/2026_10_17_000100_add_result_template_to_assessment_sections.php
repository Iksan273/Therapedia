<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Template hasil per section (schema.md `assessment_sections.result_template`): section ber-template jadi tabel
// psikologi (skor mentah per section), section tanpa template = form biasa.
// Sekalian menyelaraskan `lead_text` → `description` (TEXT) dan `document_url` sesuai schema.md.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('assessment_sections', function (Blueprint $table) {
            $table->renameColumn('lead_text', 'description');
        });

        Schema::table('assessment_sections', function (Blueprint $table) {
            $table->text('description')->nullable()->change();
            $table->string('document_url', 500)->nullable()->after('description');
            $table->enum('result_template', ['school_companion', 'toddler_sensory', 'child_sensory'])
                ->nullable()
                ->after('document_url');
        });
    }

    public function down(): void
    {
        Schema::table('assessment_sections', function (Blueprint $table) {
            $table->dropColumn(['result_template', 'document_url']);
        });

        Schema::table('assessment_sections', function (Blueprint $table) {
            $table->string('description', 150)->nullable()->change();
            $table->renameColumn('description', 'lead_text');
        });
    }
};
