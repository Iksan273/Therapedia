<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Counter kode client per grup huruf pertama nama anak (schema.md `client_code_counters`): AE, FJ, KO, PT, UZ.
 * Wajib ada sebelum client pertama dibuat (ClientCodeService memakai UPDATE ... LAST_INSERT_ID). Idempoten:
 * baris yang sudah ada (counter berjalan) tidak disentuh.
 */
class ClientCodeCounterSeeder extends Seeder
{
    public function run(): void
    {
        DB::table('client_code_counters')->insertOrIgnore(
            collect(['AE', 'FJ', 'KO', 'PT', 'UZ'])->map(fn (string $group) => ['group_code' => $group, 'last_number' => 0])->all()
        );
    }
}
