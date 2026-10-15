<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Master data awal (sumber: frontend/src/domain/client.js, schedule.js, credit.js dan masterDataStore.js).
 * Idempotent: kunci = kode. Menjalankan ulang tidak menimpa label yang sudah diubah lewat Master Data
 * kecuali baris belum ada (insertOrIgnore).
 *
 * Alasan sistem `RD` (reschedule tidak dilanjutkan) dan `LN` (alasan lainnya) adalah konstanta kode, bukan baris tabel.
 */
class MasterDataSeeder extends Seeder
{
    public function run(): void
    {
        $this->call(ClientCodeCounterSeeder::class); // counter kode client (AE/FJ/KO/PT/UZ)

        $now = now();
        $stamp = ['created_at' => $now, 'updated_at' => $now];

        // Layanan intake
        $services = [
            ['b_ota', 'BOT-A', 'Asesmen', 'Brief Occupational Therapy Assessment (BOT-A) & Sensory Screening'],
            ['f_ota', 'FOT-A', 'Asesmen', 'Full Occupational Therapy Assessment (FOT-A), asesmen komprehensif'],
            ['school_companion', 'School Companion', 'Asesmen', 'School Companion Profile: profil observasi anak di lingkungan sekolah (dapat dipilih bersama layanan lain)'],
            ['consult_wo_report', 'Consultation without Report', 'Konsultasi', 'Konsultasi tatap muka evaluasi klinis tanpa laporan tertulis'],
            ['consult_w_report', 'Consultation with Report', 'Konsultasi', 'Konsultasi klinis mendalam dengan laporan tertulis resmi'],
        ];
        DB::table('services')->insertOrIgnore(collect($services)->map(fn ($s, $i) => [
            'code' => $s[0], 'label' => $s[1], 'category' => $s[2], 'description' => $s[3],
            'is_active' => true, 'sort_order' => $i + 1,
        ] + $stamp)->all());

        // Kuadran sensori
        $quadrants = [
            ['AV', 'Avoiding', 'Sensation Avoiding', 'Penghindar Sensori (Perilaku aktif menjauh)', 'blue'],
            ['SN', 'Sensitivity', 'Sensory Sensitivity', 'Sensitivitas Tinggi (Mudah terganggu stimulus)', 'lime'],
            ['RG', 'Registration', 'Low Registration', 'Pendaftaran Rendah (Pasif / Butuh intensitas lebih)', 'pink'],
            ['SK', 'Seeking', 'Sensory Seeking', 'Pencari Sensori (Mendambakan stimulasi ekstra)', 'amber'],
        ];
        DB::table('sensory_quadrants')->insertOrIgnore(collect($quadrants)->map(fn ($q, $i) => [
            'code' => $q[0], 'title' => $q[1], 'full_name' => $q[2], 'description' => $q[3], 'color' => $q[4],
            'sort_order' => $i + 1,
        ] + $stamp)->all());

        // Alasan Cancel / Off (satu daftar; Therapist Off dibedakan flag)
        $cancelReasons = [
            ['OL', 'On Leave (Cuti)', false],
            ['S', 'Sick (Sakit / Kondisi Medis)', false],
            ['SCA', 'School Activities (Kegiatan Sekolah)', false],
            ['MCU', 'Medical Check Up', false],
            ['FM', 'Family Matter (Keperluan Keluarga)', false],
            ['TI', 'Transport Issue', false],
            ['H', 'Holiday (Libur)', false],
            ['NS', 'No Show (Tanpa Kabar)', false],
            ['TO', 'Therapist Off (Terapis Berhalangan)', true],
            ['TS', 'Therapist Sick (Terapis Sakit)', true],
        ];
        DB::table('cancel_reasons')->insertOrIgnore(collect($cancelReasons)->map(fn ($r, $i) => [
            'code' => $r[0], 'label' => $r[1], 'is_therapist_off' => $r[2],
            'is_active' => true, 'sort_order' => $i + 1,
        ] + $stamp)->all());

        // Alasan discharge
        $dischargeReasons = [
            ['moving', 'Moving / Relocation'],
            ['financial', 'Financial / Biaya'],
            ['conflict_schedule', 'Schedule Conflict / Bentrok'],
            ['expectation_not_met', 'Expectation Not Met'],
            ['graduate', 'Tercapai Target (Graduated)'],
        ];
        DB::table('discharge_reasons')->insertOrIgnore(collect($dischargeReasons)->map(fn ($r, $i) => [
            'code' => $r[0], 'label' => $r[1], 'is_active' => true, 'sort_order' => $i + 1,
        ] + $stamp)->all());

        // Katalog paket kredit. `code` = id lama frontend; `invoice_code` dipakai nomor invoice INV-{KODE}-…
        $packages = [
            ['pkg-reguler', 'REG', 'Regular Therapist', 10, 2500000, '10 Sesi Terapi bersama Regular Therapist (OT / Sensori / Wicara)', 3, false],
            ['pkg-vip', 'SNR', 'Senior Therapist', 10, 3500000, '10 Sesi Terapi bersama Senior Therapist (1-on-1 Specialist)', 3, false],
            ['pkg-consult', 'KON', 'Paket Konsultasi', 1, 500000, '1 Sesi Konsultasi Klinis & Review', 1, true],
        ];
        DB::table('master_packages')->insertOrIgnore(collect($packages)->map(fn ($p) => [
            'code' => $p[0], 'invoice_code' => $p[1], 'name' => $p[2], 'credits' => $p[3], 'price' => $p[4],
            'description' => $p[5], 'leave_quota' => $p[6], 'is_satuan' => $p[7], 'is_assessment' => false,
            'is_active' => true,
        ] + $stamp)->all());
    }
}
