<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Active Clients (roster & Birthday Hub) pada ratusan ribu sampai jutaan client. Diukur pada 1 juta baris sebelum indeks ini:
     *  - roster semua cabang  `status IN (...) ORDER BY child_name`: 4,4 detik (pemindaian penuh + filesort);
     *  - roster satu cabang   `branch_id = ? AND status IN (...) ORDER BY child_name`: 1,4 detik (filesort 64 ribu baris);
     *  - Birthday Hub semua cabang `birth_month = ? AND status = 'admitted' ORDER BY child_name`: 30-40 detik
     *    (indeks yang ada diawali cabang / status, lalu membuka ratusan ribu baris untuk memeriksa bulan lahir).
     *
     * Indeks menyajikan urutan nama langsung dari indeks (tanpa filesort). Roster = tiga status sekaligus (admitted, discharged,
     * discontinued): MySQL tidak bisa menggabung tiga rentang status dalam urutan nama, jadi dipakai kolom turunan `is_roster`
     * (generated, seperti `birth_month`) agar menjadi satu kondisi kesamaan yang bisa diindeks.
     */
    public function up(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            $table->boolean('is_roster')->storedAs("status IN ('admitted','discharged','discontinued')")->after('status');
        });

        Schema::table('clients', function (Blueprint $table) {
            $table->index(['birth_month', 'status', 'child_name'], 'idx_clients_birthday_all');
            $table->index(['branch_id', 'birth_month', 'status', 'child_name'], 'idx_clients_birthday_branch');
            $table->index(['status', 'child_name'], 'idx_clients_status_name');
            $table->index(['branch_id', 'status', 'child_name'], 'idx_clients_branch_status_name');
            $table->index(['is_roster', 'child_name'], 'idx_clients_roster_name');
            $table->index(['branch_id', 'is_roster', 'child_name'], 'idx_clients_branch_roster_name');
        });
    }

    public function down(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            $table->dropIndex('idx_clients_birthday_all');
            $table->dropIndex('idx_clients_birthday_branch');
            $table->dropIndex('idx_clients_status_name');
            $table->dropIndex('idx_clients_branch_status_name');
            $table->dropIndex('idx_clients_roster_name');
            $table->dropIndex('idx_clients_branch_roster_name');
        });

        Schema::table('clients', function (Blueprint $table) {
            $table->dropColumn('is_roster');
        });
    }
};
