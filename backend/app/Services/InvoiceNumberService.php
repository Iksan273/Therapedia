<?php

namespace App\Services;

use Carbon\CarbonInterface;
use Illuminate\Support\Facades\DB;

/**
 * Nomor invoice `INV-{type_code}-{YYYYMMDD WIB}-{NNN}` dari `invoice_counters` (counter per kode + tanggal WIB,
 * atomik lewat LAST_INSERT_ID; 3 digit minimal, otomatis 4 digit bila lebih dari 999). Panggil di transaksi terbit invoice.
 */
class InvoiceNumberService
{
    public function next(string $typeCode, ?CarbonInterface $at = null): string
    {
        $date = ($at ?? now())->copy()->setTimezone('Asia/Jakarta')->toDateString();

        DB::statement(
            'INSERT INTO invoice_counters (type_code, counter_date, last_number) VALUES (?, ?, LAST_INSERT_ID(1))
             ON DUPLICATE KEY UPDATE last_number = LAST_INSERT_ID(last_number + 1)',
            [$typeCode, $date],
        );
        $number = (int) DB::selectOne('SELECT LAST_INSERT_ID() AS n')->n;

        return sprintf('INV-%s-%s-%03d', $typeCode, str_replace('-', '', $date), $number);
    }
}
