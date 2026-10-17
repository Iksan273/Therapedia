<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Snapshot struktur kuesioner per kode: dibuat saat draft pertama disimpan (atau saat submit langsung), lalu dibekukan.
 * Edit master setelah itu tidak mengubah draft maupun hasil lama.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('assessment_access_codes', function (Blueprint $table) {
            $table->json('structure_snapshot')->nullable()->after('invoice_required');
            $table->timestamp('snapshot_at')->nullable()->after('structure_snapshot');
        });
    }

    public function down(): void
    {
        Schema::table('assessment_access_codes', function (Blueprint $table) {
            $table->dropColumn(['structure_snapshot', 'snapshot_at']);
        });
    }
};
