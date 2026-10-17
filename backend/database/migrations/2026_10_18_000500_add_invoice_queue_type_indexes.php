<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Antrean Finance ("Menunggu Pembayaran", daftar per jenis): `WHERE [branch_id =] status IN (...) AND invoice_type = ... ORDER BY issued_at DESC, id DESC`.
 * `idx_inv_queue (branch_id, status, issued_at)` tidak memuat `invoice_type` sehingga MySQL memakai `idx_inv_paid_date` + filesort
 * (±43 ribu baris di 100 ribu invoice, ±250 ms). Dua indeks ini membuat urutan terbaru-dulu langsung dari indeks (tanpa filesort, 10 baris dibaca).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->index(['status', 'invoice_type', 'issued_at'], 'idx_inv_status_type_issued'); // master / akun semua cabang (tanpa filter cabang)
            $table->index(['branch_id', 'status', 'invoice_type', 'issued_at'], 'idx_inv_branch_status_type_issued'); // Finance per cabang
        });
    }

    public function down(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->dropIndex('idx_inv_status_type_issued');
            $table->dropIndex('idx_inv_branch_status_type_issued');
        });
    }
};
