<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Pipeline / daftar client TANPA filter cabang (master & akun semua cabang): `WHERE status = ? ORDER BY created_at DESC, id DESC LIMIT n`.
     * `idx_clients_pipeline` (branch_id, status, created_at) tidak bisa dipakai karena kolom pertamanya cabang, sehingga
     * query memindai seluruh tabel + filesort (±300 ms per tahap pada 110 ribu client, papan 9 tahap ±2,6 detik).
     * Indeks ini melayani urutan itu langsung (InnoDB menambahkan `id` di ujung indeks sekunder) dan hitung per status.
     */
    public function up(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            $table->index(['status', 'created_at'], 'idx_clients_status_created');
        });
    }

    public function down(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            $table->dropIndex('idx_clients_status_created');
        });
    }
};
