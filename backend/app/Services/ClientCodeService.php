<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;

/**
 * Kode client `AE-00001` = grup huruf pertama nama (A–E=AE, F–J=FJ, K–O=KO, P–T=PT, U–Z=UZ) + counter 5 digit
 * (schema.md `client_code_counters`). Global lintas cabang, atomik, tidak dipakai ulang.
 * Panggil di dalam transaksi pembuatan client.
 */
class ClientCodeService
{
    public function next(string $childName): string
    {
        $group = $this->groupFor($childName);

        DB::update('UPDATE client_code_counters SET last_number = LAST_INSERT_ID(last_number + 1) WHERE group_code = ?', [$group]);
        $number = (int) DB::selectOne('SELECT LAST_INSERT_ID() AS n')->n;

        return sprintf('%s-%05d', $group, $number);
    }

    public function groupFor(string $childName): string
    {
        $letter = strtoupper(substr(preg_replace('/[^A-Za-z]/', '', $childName) ?: 'A', 0, 1));

        return match (true) {
            $letter <= 'E' => 'AE',
            $letter <= 'J' => 'FJ',
            $letter <= 'O' => 'KO',
            $letter <= 'T' => 'PT',
            default => 'UZ',
        };
    }
}
