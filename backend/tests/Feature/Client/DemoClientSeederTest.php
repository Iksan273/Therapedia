<?php

namespace Tests\Feature\Client;

use Database\Seeders\DemoClientSeeder;
use Database\Seeders\MasterDataSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\Concerns\AuthFixtures;
use Tests\Concerns\OrganizationFixtures;
use Tests\TestCase;

class DemoClientSeederTest extends TestCase
{
    use AuthFixtures, OrganizationFixtures, RefreshDatabase;

    private function seedDemo(int $total): void
    {
        $this->seedFoundation();
        $this->seed(MasterDataSeeder::class);

        $seeder = new DemoClientSeeder;
        $seeder->total = $total; // jumlah diatur lewat properti (env DEMO_CLIENTS dipakai saat dijalankan lewat artisan)
        $seeder->setContainer($this->app)->run();
    }

    public function test_seeds_requested_total_split_evenly_across_active_branches_with_every_stage_present(): void
    {
        $this->seedDemo(100);

        $this->assertSame(100, DB::table('clients')->count());
        $perBranch = DB::table('clients')->select('branch_id', DB::raw('COUNT(*) AS n'))->groupBy('branch_id')->pluck('n', 'branch_id')->all();
        $this->assertCount(3, $perBranch);
        $this->assertSame([33, 33, 34], collect($perBranch)->sort()->values()->all());

        foreach (array_keys($perBranch) as $branchId) {
            $stages = DB::table('clients')->where('branch_id', $branchId)->distinct()->pluck('status')->all();
            $this->assertCount(9, $stages, 'semua tahap pipeline ada di tiap cabang');
        }
    }

    public function test_codes_are_unique_follow_counters_and_real_clients_continue_the_sequence(): void
    {
        $this->seedDemo(60);

        $this->assertSame(60, DB::table('clients')->distinct()->count('client_code'));
        foreach (DB::table('client_code_counters')->get() as $counter) {
            $max = DB::table('clients')->where('client_code', 'like', $counter->group_code.'-%')->count();
            $this->assertSame($max, (int) $counter->last_number, "counter {$counter->group_code} = jumlah kode yang dibuat");
        }

        // client asli berikutnya melanjutkan nomor tanpa bentrok
        $res = $this->actAs($this->makeStaff('admin_inquiry'))->postJson('/api/v1/clients', [
            'child_name' => 'Aisyah Putri', 'gender' => 'female', 'date_of_birth' => '2019-03-10', 'parent_name' => 'Budi', 'parent_phone' => '081234567890',
        ])->assertCreated();
        $next = (int) DB::table('client_code_counters')->where('group_code', 'AE')->value('last_number');
        $this->assertSame(sprintf('AE-%05d', $next), $res->json('data.client_code'));
    }

    public function test_status_dependent_columns_are_consistent_and_services_follow_stage(): void
    {
        $this->seedDemo(90);

        $this->assertSame(0, DB::table('clients')->where('status', 'admitted')->whereNull('date_of_join')->count());
        $this->assertSame(0, DB::table('clients')->where('status', 'discharged')->whereNull('date_of_discharge')->whereNull('discharge_reason')->count());
        $this->assertSame(0, DB::table('clients')->where('status', 'discontinued')->whereNull('date_of_discontinue')->count());
        $this->assertSame(0, DB::table('clients')->where('status', 'inquiry')->whereNotNull('final_outcome')->count());
        $this->assertSame(0, DB::table('clients')->where('credit_balance', '!=', 0)->count());

        $inquiryIds = DB::table('clients')->where('status', 'inquiry')->pluck('id');
        $this->assertSame(0, DB::table('client_services')->whereIn('client_id', $inquiryIds)->count()); // tahap awal belum memilih layanan
        $this->assertGreaterThan(0, DB::table('client_services')->count());
        $this->assertSame(90, DB::table('clients')->where('parent_email', 'like', '%@demo.therapedia.test')->count()); // penanda untuk pembersihan
    }

    public function test_purge_mode_removes_only_demo_clients_with_their_children_and_keeps_counters(): void
    {
        $this->seedDemo(50);
        $real = $this->makeClient(['client_code' => 'ZZ-99999', 'child_name' => 'Asli', 'parent_email' => 'asli@keluarga.test']);
        $counters = DB::table('client_code_counters')->pluck('last_number', 'group_code')->all();
        $this->assertGreaterThan(0, DB::table('client_services')->count());

        putenv('DEMO_PURGE=1');
        try {
            $seeder = new DemoClientSeeder;
            $seeder->setContainer($this->app)->run();
        } finally {
            putenv('DEMO_PURGE');
        }

        $this->assertSame(1, DB::table('clients')->count());
        $this->assertDatabaseHas('clients', ['id' => $real->id]);
        $this->assertSame(0, DB::table('client_services')->count()); // anak data ikut terhapus
        $this->assertSame($counters, DB::table('client_code_counters')->pluck('last_number', 'group_code')->all()); // nomor tidak dipakai ulang
    }

    public function test_keep_mode_trims_demo_clients_to_the_requested_number_and_keeps_real_ones(): void
    {
        $this->seedDemo(60);
        $real = $this->makeClient(['client_code' => 'ZZ-99998', 'parent_email' => 'asli@keluarga.test']);
        $lowestDemoIds = DB::table('clients')->where('parent_email', 'like', '%@demo.therapedia.test')->orderBy('id')->limit(20)->pluck('id')->all();

        putenv('DEMO_KEEP=20');
        try {
            $seeder = new DemoClientSeeder;
            $seeder->setContainer($this->app)->run();
        } finally {
            putenv('DEMO_KEEP');
        }

        $this->assertSame(20, DB::table('clients')->where('parent_email', 'like', '%@demo.therapedia.test')->count());
        $this->assertSame($lowestDemoIds, DB::table('clients')->where('parent_email', 'like', '%@demo.therapedia.test')->orderBy('id')->pluck('id')->all()); // id terkecil yang disisakan
        $this->assertDatabaseHas('clients', ['id' => $real->id]);
        $this->assertSame(0, DB::table('client_services')->whereNotIn('client_id', DB::table('clients')->select('id'))->count()); // tanpa baris yatim

        // sudah di bawah batas: tidak ada yang dihapus lagi
        putenv('DEMO_KEEP=500');
        try {
            (new DemoClientSeeder)->setContainer($this->app)->run();
        } finally {
            putenv('DEMO_KEEP');
        }
        $this->assertSame(20, DB::table('clients')->where('parent_email', 'like', '%@demo.therapedia.test')->count());
    }

    public function test_demo_clients_work_with_the_api_board_and_search(): void
    {
        $this->seedDemo(60);

        $this->actAs($this->makeStaff('master'));
        $stages = collect($this->getJson('/api/v1/clients/board?per_stage=10')->assertOk()->json('data.stages'));
        $this->assertSame(60, $stages->sum('total'));
        $this->assertLessThanOrEqual(10, count($stages->firstWhere('status', 'inquiry')['items']));
    }
}
