<?php

namespace Database\Seeders;

use Carbon\CarbonInterface;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Data client DUMMY untuk uji performa & tampilan (pipeline, pencarian, paginasi). BUKAN bagian `DatabaseSeeder`:
 * jalankan manual saja, dan ditolak di production.
 *
 *   php artisan db:seed --class=DemoClientSeeder --force                      # jumlah bawaan (env DEMO_CLIENTS, default 100)
 *   DEMO_CLIENTS=1000000 php artisan db:seed --class=DemoClientSeeder --force   # 1 juta (PowerShell: $env:DEMO_CLIENTS=1000000)
 *   DEMO_PURGE=1 php artisan db:seed --class=DemoClientSeeder --force           # HAPUS semua client dummy (bertahap)
 *   DEMO_KEEP=100000 php artisan db:seed --class=DemoClientSeeder --force       # SISAKAN 100.000 client dummy (id terkecil), hapus sisanya
 *
 * - Total dibagi rata ke semua cabang aktif. Satu transaksi per cabang (bukan satu transaksi raksasa) dan counter kode dimajukan
 *   per cabang, jadi proses yang terputus tetap konsisten; kemajuan dicetak tiap 50.000 baris.
 * - Skala: ±3,5 menit dan ±1 GB disk untuk 1 juta client (indeks ikut). Kode client 5 digit per grup menampung 99.999 nomor; bila total
 *   lebih besar dari ±500 ribu, nomor grup melewati 99.999 dan kode menjadi 6 digit (mis. AE-100000, masih muat di kolom).
 * - Status acak dengan bobot, tetapi SETIAP tahap pipeline dijamin muncul di tiap cabang.
 * - Kode client memakai counter resmi (`client_code_counters`, AE/FJ/KO/PT/UZ) dan counter dimajukan di akhir, jadi client asli
 *   yang dibuat sesudahnya melanjutkan nomor tanpa bentrok.
 * - Saldo kredit semua 0 (konsisten: admit tidak membuat paket). Layanan dipilih acak untuk client yang sudah lewat tahap awal.
 * - Semua email ortu berakhiran `@demo.therapedia.test` supaya mudah dibersihkan. Untuk jumlah besar pakai DEMO_PURGE=1 (hapus per
 *   10.000 id, anak data ikut terhapus lewat FK cascade; counter kode tidak diturunkan, nomor tidak dipakai ulang). Satu `DELETE` raksasa
 *   untuk jutaan baris bisa berjam-jam dan membengkakkan undo log.
 * - Idempoten tidak dijamin: menjalankan dua kali menambah client lagi.
 */
class DemoClientSeeder extends Seeder
{
    /** Jumlah total client; bisa diubah lewat env DEMO_CLIENTS atau properti ini (dipakai test). */
    public ?int $total = null;

    private const CHUNK = 500;

    /** Bobot status (jumlah relatif). Semua tahap terisi; tahap awal & Active Client paling banyak. */
    private const STATUS_WEIGHTS = [
        'inquiry' => 18, 'service_selected' => 14, 'assessment_scheduled' => 12, 'assessment_done' => 12, 'admitted' => 20,
        'done_consult' => 6, 'done_assessment' => 6, 'discontinued' => 6, 'discharged' => 6,
    ];

    private const FIRST = [
        'Aisyah', 'Alya', 'Arka', 'Bagas', 'Bima', 'Callista', 'Cinta', 'Dafa', 'Dinda', 'Elang', 'Evelyn', 'Fadli', 'Farah', 'Gempita', 'Gibran',
        'Hana', 'Hendra', 'Ikbal', 'Intan', 'Jovan', 'Jasmine', 'Kenzo', 'Keisha', 'Laras', 'Lucas', 'Maulana', 'Mikayla', 'Naufal', 'Nadine', 'Olivia',
        'Omar', 'Putra', 'Prisilla', 'Qori', 'Queenza', 'Rafka', 'Rania', 'Satria', 'Sheila', 'Tara', 'Teddy', 'Ulfa', 'Umar', 'Vino', 'Vania',
        'Wira', 'Widya', 'Xavier', 'Yasmin', 'Yusuf', 'Zahra', 'Zidan',
    ];

    private const LAST = [
        'Pratama', 'Wijaya', 'Santoso', 'Kusuma', 'Hidayat', 'Nugroho', 'Setiawan', 'Rahman', 'Saputra', 'Lestari', 'Wibowo', 'Halim', 'Susanto',
        'Gunawan', 'Permana', 'Utami', 'Firmansyah', 'Maharani', 'Anggraini', 'Cahyono', 'Hartono', 'Wirawan', 'Purnomo', 'Danendra',
    ];

    private const PARENT_TITLES = ['Bapak', 'Ibu'];

    private const REASONS = ['moving', 'financial', 'conflict_schedule', 'expectation_not_met', 'graduate'];

    private const STREETS = ['Jl. Mawar', 'Jl. Melati', 'Jl. Kertajaya', 'Jl. Darmo', 'Jl. Mayjen Sungkono', 'Jl. Raya Citraland', 'Jl. Manyar', 'Jl. Dukuh Kupang'];

    private const NOTES = ['Rujukan sekolah', 'Belum bicara sesuai usia', 'Sensitif suara', 'Sulit fokus di kelas', 'Rekomendasi dokter anak', 'Ingin konsultasi perkembangan', null, null];

    public function run(): void
    {
        if (app()->isProduction()) {
            $this->command?->error('DemoClientSeeder ditolak di production (data dummy).');

            return;
        }

        if (filter_var(env('DEMO_PURGE', false), FILTER_VALIDATE_BOOLEAN)) {
            $this->purge();

            return;
        }

        $keep = env('DEMO_KEEP');
        if ($keep !== null && $keep !== '' && ctype_digit((string) $keep)) {
            $this->trim((int) $keep);

            return;
        }

        $this->call(ClientCodeCounterSeeder::class);

        $branchIds = DB::table('branches')->where('is_active', true)->orderBy('id')->pluck('id')->all();
        if ($branchIds === []) {
            $this->command?->error('Tidak ada cabang aktif. Jalankan BranchSeeder dulu.');

            return;
        }

        $total = max(1, $this->total ?? (int) env('DEMO_CLIENTS', 100));
        $serviceCodes = DB::table('services')->where('is_active', true)->pluck('code')->all();
        $counters = DB::table('client_code_counters')->pluck('last_number', 'group_code')->map(fn ($n) => (int) $n)->all();

        $perBranch = intdiv($total, count($branchIds));
        $remainder = $total % count($branchIds);

        $started = microtime(true);
        $done = 0;
        foreach ($branchIds as $i => $branchId) {
            $count = $perBranch + ($i < $remainder ? 1 : 0);

            DB::transaction(function () use ($branchId, $count, $serviceCodes, &$counters, &$done, $total, $started): void {
                $this->seedBranch((int) $branchId, $count, $serviceCodes, $counters, function (int $n) use (&$done, $total, $started): void {
                    $done += $n;
                    if ($done % 50000 < $n) {
                        $this->command?->info(sprintf('  %s / %s client (%d detik)', number_format($done), number_format($total), microtime(true) - $started));
                    }
                });

                // Majukan counter resmi per cabang supaya client asli berikutnya tidak bentrok kode, walau proses terputus
                foreach ($counters as $group => $last) {
                    DB::table('client_code_counters')->where('group_code', $group)->update(['last_number' => $last]);
                }
            });
        }

        $this->command?->info("Selesai: {$total} client dummy di ".count($branchIds).' cabang.');
    }

    /** @param  array<string, int>  $counters  diubah by reference (counter kode per grup) */
    private function seedBranch(int $branchId, int $count, array $serviceCodes, array &$counters, ?\Closure $progress = null): void
    {
        $statuses = $this->statusPlan($count);
        $rows = [];

        for ($n = 0; $n < $count; $n++) {
            $child = self::FIRST[array_rand(self::FIRST)];
            $surname = self::LAST[array_rand(self::LAST)];
            $childName = $child.' '.$surname;
            $parentName = self::PARENT_TITLES[array_rand(self::PARENT_TITLES)].' '.self::FIRST[array_rand(self::FIRST)].' '.$surname;

            $group = $this->groupFor($child);
            $code = sprintf('%s-%05d', $group, ++$counters[$group]);

            $status = $statuses[$n];
            $created = now()->subDays(random_int(1, 365))->subMinutes(random_int(0, 1439));
            $changed = (clone $created)->addDays(random_int(0, 30));
            if ($changed->isFuture()) {
                $changed = now();
            }

            $rows[] = array_merge([
                'client_code' => $code,
                'branch_id' => $branchId,
                'child_name' => $childName,
                'gender' => random_int(0, 1) ? 'male' : 'female',
                'date_of_birth' => now()->subYears(random_int(2, 12))->subDays(random_int(0, 364))->toDateString(),
                'parent_name' => $parentName,
                'parent_phone' => '08'.random_int(1000000000, 9999999999),
                'parent_email' => strtolower(str_replace(' ', '.', $child.'.'.$surname)).$n.$branchId.'@demo.therapedia.test',
                'address' => self::STREETS[array_rand(self::STREETS)].' No. '.random_int(1, 120).', Surabaya',
                'intake_note' => self::NOTES[array_rand(self::NOTES)],
                'status' => $status,
                'status_changed_at' => $changed->toDateTimeString(),
                'credit_balance' => 0,
                'version' => 1,
                'created_at' => $created->toDateTimeString(),
                'updated_at' => $changed->toDateTimeString(),
            ], $this->statusColumns($status, $changed));

            if (count($rows) >= self::CHUNK || $n === $count - 1) {
                $progress?->__invoke(count($rows));
                $this->flush($rows, $serviceCodes);
                $rows = [];
            }
        }
    }

    /**
     * Sisakan `$keep` client dummy (id terkecil), hapus sisanya per 10.000 id (cascade ke layanan, dll.). Client asli tidak disentuh.
     * Log biner dimatikan untuk sesi ini (hapus massal tidak perlu ikut dicatat; menulis log menambah pemakaian disk), lalu
     * `OPTIMIZE TABLE` mengembalikan ruang file ke disk (InnoDB tidak menyusutkan file sendiri setelah DELETE).
     */
    private function trim(int $keep): void
    {
        $like = '%@demo.therapedia.test';
        $cutoff = DB::table('clients')->where('parent_email', 'like', $like)->orderBy('id')->offset(max($keep - 1, 0))->limit(1)->value('id');
        if ($keep === 0) {
            $this->purge();

            return;
        }
        if ($cutoff === null) {
            $this->command?->info('Client dummy tidak lebih dari '.number_format($keep).'; tidak ada yang dihapus.');

            return;
        }

        try {
            DB::statement('SET SESSION sql_log_bin = 0');
        } catch (\Throwable) {
            $this->command?->warn('Tidak bisa mematikan log biner untuk sesi ini (lanjut dengan log biner aktif).');
        }

        $maxId = (int) DB::table('clients')->max('id');
        $deleted = 0;
        for ($from = (int) $cutoff + 1; $from <= $maxId; $from += 10000) {
            $deleted += DB::table('clients')->whereBetween('id', [$from, $from + 9999])->where('parent_email', 'like', $like)->delete();
            if ($deleted > 0 && ($from - (int) $cutoff - 1) % 100000 === 0) {
                $this->command?->info('  terhapus '.number_format($deleted));
            }
        }
        $this->command?->info('Selesai: '.number_format($deleted).' client dummy dihapus, '.number_format($keep).' dummy disisakan.');

        foreach (['client_services', 'clients'] as $table) {
            try {
                $result = DB::select("OPTIMIZE TABLE `{$table}`");
                $this->command?->info("  OPTIMIZE {$table}: ".($result[count($result) - 1]->Msg_text ?? 'selesai'));
            } catch (\Throwable $e) {
                $this->command?->warn("  OPTIMIZE {$table} gagal (kemungkinan ruang disk kurang): ".$e->getMessage());
            }
        }
    }

    /** Hapus semua client dummy per rentang id (cascade ke layanan, dll.), supaya tiap DELETE kecil. */
    private function purge(): void
    {
        $range = DB::table('clients')->where('parent_email', 'like', '%@demo.therapedia.test')->selectRaw('MIN(id) AS lo, MAX(id) AS hi')->first();
        if ($range === null || $range->lo === null) {
            $this->command?->info('Tidak ada client dummy.');

            return;
        }

        $deleted = 0;
        for ($from = (int) $range->lo; $from <= (int) $range->hi; $from += 10000) {
            $deleted += DB::table('clients')->whereBetween('id', [$from, $from + 9999])->where('parent_email', 'like', '%@demo.therapedia.test')->delete();
            if ($deleted > 0 && ($from - (int) $range->lo) % 100000 === 0) {
                $this->command?->info('  terhapus '.number_format($deleted));
            }
        }

        $this->command?->info('Selesai: '.number_format($deleted).' client dummy dihapus.');
    }

    /**
     * @param  list<array<string, mixed>>  $rows
     * @param  list<string>  $serviceCodes
     */
    private function flush(array $rows, array $serviceCodes): void
    {
        DB::table('clients')->insert($rows);

        // Layanan hanya untuk client yang sudah melewati tahap awal
        $past = collect($rows)->filter(fn ($r) => $r['status'] !== 'inquiry' && $serviceCodes !== []);
        if ($past->isEmpty()) {
            return;
        }

        $ids = DB::table('clients')->whereIn('client_code', $past->pluck('client_code'))->pluck('id', 'client_code');
        $serviceRows = [];
        foreach ($past as $row) {
            $picked = (array) array_rand(array_flip($serviceCodes), min(random_int(1, 2), count($serviceCodes)));
            foreach ($picked as $code) {
                $serviceRows[] = ['client_id' => $ids[$row['client_code']], 'service_code' => $code, 'selected_at' => $row['created_at'], 'selected_by' => null];
            }
        }
        foreach (array_chunk($serviceRows, self::CHUNK) as $chunk) {
            DB::table('client_services')->insert($chunk);
        }
    }

    /**
     * Kolom yang bergantung status (outcome, tanggal join / keluar, alasan), konsisten dengan aturan transisi.
     *
     * @return array<string, mixed>
     */
    private function statusColumns(string $status, CarbonInterface $changed): array
    {
        $day = $changed->toDateString();
        $none = ['final_outcome' => null, 'date_of_join' => null, 'date_of_discharge' => null, 'date_of_discontinue' => null, 'discharge_reason' => null, 'discharge_note' => null];

        return match ($status) {
            'admitted' => array_merge($none, ['final_outcome' => 'admitted', 'date_of_join' => $day]),
            'done_consult', 'done_assessment' => array_merge($none, ['final_outcome' => $status]),
            'discontinued' => array_merge($none, [
                'final_outcome' => 'discontinued', 'date_of_discontinue' => $day,
                'discharge_reason' => self::REASONS[array_rand(self::REASONS)], 'discharge_note' => 'Data dummy',
            ]),
            'discharged' => array_merge($none, [
                'final_outcome' => 'admitted', 'date_of_join' => (clone $changed)->subDays(random_int(30, 200))->toDateString(), 'date_of_discharge' => $day,
                'discharge_reason' => self::REASONS[array_rand(self::REASONS)], 'discharge_note' => 'Data dummy',
            ]),
            default => $none,
        };
    }

    /**
     * Daftar status per client dalam satu cabang: 9 pertama = tiap tahap sekali (dijamin ada), sisanya acak berbobot, lalu diacak.
     *
     * @return list<string>
     */
    private function statusPlan(int $count): array
    {
        $plan = array_slice(array_keys(self::STATUS_WEIGHTS), 0, min($count, count(self::STATUS_WEIGHTS)));
        $pool = [];
        foreach (self::STATUS_WEIGHTS as $status => $weight) {
            $pool = array_merge($pool, array_fill(0, $weight, $status));
        }
        while (count($plan) < $count) {
            $plan[] = $pool[array_rand($pool)];
        }
        shuffle($plan);

        return $plan;
    }

    /** Sama dengan ClientCodeService::groupFor (huruf pertama nama anak). */
    private function groupFor(string $name): string
    {
        $letter = strtoupper($name[0] ?? 'A');

        return match (true) {
            $letter <= 'E' => 'AE',
            $letter <= 'J' => 'FJ',
            $letter <= 'O' => 'KO',
            $letter <= 'T' => 'PT',
            default => 'UZ',
        };
    }
}
