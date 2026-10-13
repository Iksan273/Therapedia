<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Modul akses, role sistem, dan matriks izin default.
 * Sumber kebenaran: frontend/src/domain/rbac.js (ACCESS_MODULES, DEFAULT_ROLES, DEFAULT_PERMISSIONS).
 * Bila rbac.js berubah, ubah juga di sini (ada test yang membandingkan jumlah modul/izin).
 *
 * Idempotent: menjalankan ulang tidak menimpa matriks yang sudah diubah Master (izin hanya diisi bila baris belum ada).
 */
class RbacSeeder extends Seeder
{
    /** kode => [label, category, description] (urutan = sort_order) */
    public const MODULES = [
        'revenue' => ['Dashboard Revenue', 'Financial', 'Akses omzet & analitik finansial all-branch'],
        'branch_performance' => ['Performa Inquiry All-Branch', 'Financial', 'Performa inquiry & intake seluruh cabang (KPI, tren, konversi, drop-off)'],
        'inquiry_pipeline' => ['Inquiry Pipeline', 'Inquiry', 'Intake client baru & kanban pipeline'],
        'inquiry_dashboard' => ['Inquiry Dashboard', 'Inquiry', 'Ringkasan statistik & KPI inquiry'],
        'assessment_master' => ['Assessment Master Data', 'Inquiry', 'Mesin kuesioner: kategori, section, dan soal asesmen'],
        'inquiry_master_data' => ['Master Layanan & Kuadran', 'Inquiry', 'Master layanan, kuadran sensori, alasan Cancel / Off (termasuk Therapist Off), dan alasan Discharge'],
        'weekly_calendar' => ['Weekly Calendar', 'Scheduling', 'Manajemen timetable mingguan & booking slot'],
        'schedule_dashboard' => ['Schedule Dashboard', 'Scheduling', 'Ringkasan statistik & KPI penjadwalan'],
        'active_clients' => ['Active Client', 'Scheduling', 'Roster client aktif & Birthday Hub'],
        'finance' => ['Finance & Invoices', 'Financial', 'Verifikasi transfer, input tagihan, & renewal'],
        'user_management' => ['User Management', 'Administration', 'Kelola akun staff dan lokasi cabang'],
        'branch_master' => ['Master Cabang', 'Administration', 'Kelola data cabang klinik (tambah, ubah, aktif/nonaktif)'],
        'rbac' => ['RBAC', 'Administration', 'Konfigurasi hak akses role & modul sistem'],
        'therapist_module' => ['Therapist Module', 'Clinical', 'Sesi klinis, activity log & homework terapis'],
        'unreported_reports' => ['Monitoring Laporan Sesi', 'Scheduling', 'Daftar sesi completed yang laporannya belum diisi'],
        'holidays' => ['Hari Libur', 'Scheduling', 'Pengaturan tanggal libur (dilewati jadwal berulang, tidak bisa dipilih di kalender)'],
        'therapist_utilization' => ['Utilisasi Terapis', 'Scheduling', 'Jam kerja terapis serta Availability & Utilization Rate per terapis dan cabang'],
    ];

    /** kode => [name, badge, description] */
    public const ROLES = [
        'master' => ['Master Director', 'Headquarter', 'Akses penuh tanpa batas ke seluruh modul operasional sistem'],
        'manager' => ['Branch Manager', 'Manajemen Cabang', 'Supervisi omzet, pipeline, kalender, dan client cabang'],
        'admin_inquiry' => ['Admin Inquiry', 'Intake & Asesmen', 'Fokus pada penerimaan client baru, pipeline, dan data asesmen'],
        'admin_schedule' => ['Admin Schedule', 'Timetable & Roster', 'Pengelolaan kalender mingguan, roster client aktif, & slot'],
        'finance' => ['Role Finance', 'Billing & Verifikasi', 'Verifikasi pembayaran, penerbitan invoice, & data client'],
        'therapist' => ['Therapist', 'Praktisi Klinis', 'Akses ke jadwal klinik mandiri dan ringkasan dokumentasi terapis'],
    ];

    /** role => daftar modul yang diizinkan (selain itu false). master = semua modul. */
    public const ALLOWED = [
        'master' => ['*'],
        'manager' => ['revenue', 'inquiry_pipeline', 'inquiry_dashboard', 'weekly_calendar', 'schedule_dashboard', 'active_clients', 'unreported_reports', 'therapist_utilization'],
        'admin_inquiry' => ['inquiry_pipeline', 'inquiry_dashboard', 'assessment_master', 'inquiry_master_data', 'active_clients', 'weekly_calendar'],
        'admin_schedule' => ['weekly_calendar', 'schedule_dashboard', 'active_clients', 'unreported_reports', 'holidays'],
        'finance' => ['holidays', 'active_clients', 'finance','weekly_calendar'],
        'therapist' => ['therapist_module'],
    ];

    public function run(): void
    {
        $now = now();

        $sort = 0;
        $modules = [];
        foreach (self::MODULES as $code => [$label, $category, $description]) {
            $modules[] = [
                'code' => $code,
                'label' => $label,
                'category' => $category,
                'description' => $description,
                'sort_order' => ++$sort,
            ];
        }
        DB::table('access_modules')->upsert($modules, ['code'], ['label', 'category', 'description', 'sort_order']);

        $roles = [];
        foreach (self::ROLES as $code => [$name, $badge, $description]) {
            $roles[] = [
                'code' => $code,
                'name' => $name,
                'badge' => $badge,
                'description' => $description,
                'is_system' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }
        DB::table('roles')->upsert($roles, ['code'], ['name', 'badge', 'description', 'is_system', 'updated_at']);

        $roleIds = DB::table('roles')->whereIn('code', array_keys(self::ROLES))->pluck('id', 'code');
        $moduleCodes = array_keys(self::MODULES);

        foreach (self::ALLOWED as $roleCode => $allowed) {
            $roleId = $roleIds[$roleCode];
            $rows = [];
            foreach ($moduleCodes as $moduleCode) {
                $rows[] = [
                    'role_id' => $roleId,
                    'module_code' => $moduleCode,
                    'allowed' => $allowed === ['*'] || in_array($moduleCode, $allowed, true),
                    'created_at' => $now,
                    'updated_at' => $now,
                ];
            }
            // insertOrIgnore: jangan menimpa matriks yang sudah diubah Master lewat UI RBAC.
            DB::table('role_permissions')->insertOrIgnore($rows);
        }

        // Master selalu penuh (aturan sistem), termasuk modul baru yang ditambahkan kemudian.
        DB::table('role_permissions')->where('role_id', $roleIds['master'])->update(['allowed' => true, 'updated_at' => $now]);
    }
}
