<?php

namespace Tests\Feature\Client;

use App\Models\Client;
use App\Models\Schedule;
use Database\Seeders\MasterDataSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\AuthFixtures;
use Tests\Concerns\OrganizationFixtures;
use Tests\TestCase;

class ClientListTest extends TestCase
{
    use AuthFixtures, OrganizationFixtures, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedFoundation();
        $this->seed(MasterDataSeeder::class);
    }

    private function names(array $json): array
    {
        return collect($json['data'])->pluck('child_name')->all();
    }

    public function test_search_is_prefix_per_word_on_names_and_prefix_on_code(): void
    {
        $this->makeClient(['child_name' => 'Kenzo Wirawan', 'parent_name' => 'Sari Dewi', 'client_code' => 'KO-00001']);
        $this->makeClient(['child_name' => 'Aisyah Putri', 'parent_name' => 'Rina Wirasti', 'client_code' => 'AE-00002']);
        $this->makeClient(['child_name' => 'Bima', 'parent_name' => 'Tono', 'client_code' => 'AE-00003']);
        $this->actAs($this->makeStaff('admin_inquiry'));

        $this->assertEqualsCanonicalizing(['Kenzo Wirawan', 'Aisyah Putri'], $this->names($this->getJson('/api/v1/clients?q=Wir')->assertOk()->json()));
        $this->assertSame(['Kenzo Wirawan'], $this->names($this->getJson('/api/v1/clients?q=kenz')->json()));
        $this->assertSame(['Aisyah Putri'], $this->names($this->getJson('/api/v1/clients?q=AE-00002')->json()));
        $this->assertSame([], $this->names($this->getJson('/api/v1/clients?q=enzo')->json())); // tengah kata tidak cocok
    }

    public function test_filters_by_status_service_and_credit_status(): void
    {
        $healthy = $this->makeClient(['child_name' => 'Sehat', 'status' => 'admitted', 'credit_balance' => 8]);
        $this->makeClient(['child_name' => 'Menipis', 'status' => 'admitted', 'credit_balance' => 2]);
        $this->makeClient(['child_name' => 'Habis', 'status' => 'admitted', 'credit_balance' => 0]);
        $this->makeClient(['child_name' => 'Baru', 'status' => 'inquiry']);
        $healthy->clientServices()->create(['service_code' => 'b_ota', 'selected_at' => now()]);
        $this->actAs($this->makeStaff('admin_inquiry'));

        $this->assertSame(['Baru'], $this->names($this->getJson('/api/v1/clients?status[]=inquiry')->json()));
        $this->assertEqualsCanonicalizing(['Sehat', 'Menipis', 'Habis'], $this->names($this->getJson('/api/v1/clients?status[]=admitted')->json()));
        $this->assertSame(['Sehat'], $this->names($this->getJson('/api/v1/clients?credit_status=healthy')->json()));
        $this->assertSame(['Menipis'], $this->names($this->getJson('/api/v1/clients?credit_status=low')->json()));
        $this->assertEqualsCanonicalizing(['Habis', 'Baru'], $this->names($this->getJson('/api/v1/clients?credit_status=zero')->json()));
        $this->assertSame(['Sehat'], $this->names($this->getJson('/api/v1/clients?service_code=b_ota')->json()));

        $row = $this->getJson('/api/v1/clients?q=Sehat')->json('data.0');
        $this->assertSame(['b_ota'], $row['service_codes']);
        $this->assertFalse($row['frozen']);
    }

    public function test_pagination_meta_and_sort(): void
    {
        foreach (['Cici', 'Adi', 'Boni'] as $n) {
            $this->makeClient(['child_name' => $n]);
        }
        $this->actAs($this->makeStaff('admin_inquiry'));

        $res = $this->getJson('/api/v1/clients?per_page=2&page=2&sort=child_name')->assertOk();
        $this->assertSame(['Cici'], $this->names($res->json()));
        $this->assertSame(['total' => 3, 'page' => 2, 'per_page' => 2, 'last_page' => 2], $res->json('meta'));
    }

    public function test_branch_scope_hides_other_branch_and_master_filters_by_branch(): void
    {
        $west = $this->makeClient(['child_name' => 'Barat', 'branch_id' => $this->branchId('WEST')]);
        $this->makeClient(['child_name' => 'Timur']);

        $this->actAs($this->makeStaff('admin_inquiry')); // cabang EAST
        $this->assertSame(['Timur'], $this->names($this->getJson('/api/v1/clients?branch_id='.$this->branchId('WEST'))->json())); // diabaikan
        $this->getJson('/api/v1/clients/'.$west->id)->assertNotFound();
        $this->patchJson('/api/v1/clients/'.$west->id, ['version' => 1, 'parent_name' => 'X'])->assertNotFound();

        $this->actAs($this->makeStaff('master'));
        $this->assertEqualsCanonicalizing(['Barat', 'Timur'], $this->names($this->getJson('/api/v1/clients')->json()));
        $this->assertSame(['Barat'], $this->names($this->getJson('/api/v1/clients?branch_id='.$this->branchId('WEST'))->json()));
    }

    public function test_therapist_only_sees_clients_scheduled_with_them(): void
    {
        $mine = $this->makeClient(['child_name' => 'Milik Saya']);
        $this->makeClient(['child_name' => 'Bukan Saya']);
        $therapist = $this->makeStaff('therapist');
        Schedule::query()->create([
            'branch_id' => $mine->branch_id, 'client_id' => $mine->id, 'therapist_id' => $therapist->id,
            'type' => 'therapy', 'session_date' => now()->addDay()->toDateString(), 'start_time' => '09:00', 'end_time' => '10:00',
        ]);

        $this->actAs($therapist);
        $this->assertSame(['Milik Saya'], $this->names($this->getJson('/api/v1/clients')->assertOk()->json()));
        $this->getJson('/api/v1/clients/'.$mine->id)->assertOk();
    }

    public function test_board_returns_every_stage_in_one_request_with_totals_and_same_filters(): void
    {
        $a = $this->makeClient(['child_name' => 'Aisyah', 'status' => 'inquiry']);
        $this->makeClient(['child_name' => 'Aira', 'status' => 'inquiry']);
        $this->makeClient(['child_name' => 'Bima', 'status' => 'admitted']);
        $this->makeClient(['child_name' => 'Barat', 'status' => 'inquiry', 'branch_id' => $this->branchId('WEST')]);
        $a->clientServices()->create(['service_code' => 'b_ota', 'selected_at' => now()]);
        $this->actAs($this->makeStaff('admin_inquiry'));

        $res = $this->getJson('/api/v1/clients/board')->assertOk();
        $stages = collect($res->json('data.stages'));
        $this->assertSame(['inquiry', 'service_selected', 'assessment_scheduled', 'assessment_done', 'admitted', 'done_consult', 'done_assessment', 'discontinued', 'discharged'], $stages->pluck('status')->all());
        $this->assertSame(2, $stages->firstWhere('status', 'inquiry')['total']); // cabang WEST tidak ikut
        $this->assertSame(['Aira', 'Aisyah'], collect($stages->firstWhere('status', 'inquiry')['items'])->pluck('child_name')->sort()->values()->all());
        $this->assertSame(1, $stages->firstWhere('status', 'admitted')['total']);
        $this->assertSame([], $stages->firstWhere('status', 'discharged')['items']);

        $filtered = collect($this->getJson('/api/v1/clients/board?q=Ais&service_code=b_ota')->json('data.stages'));
        $this->assertSame(1, $filtered->firstWhere('status', 'inquiry')['total']);
        $this->assertSame(0, $filtered->firstWhere('status', 'admitted')['total']);

        $limited = collect($this->getJson('/api/v1/clients/board?per_stage=1')->json('data.stages'))->firstWhere('status', 'inquiry');
        $this->assertSame(2, $limited['total']);
        $this->assertCount(1, $limited['items']); // total asli tetap, kartu dibatasi
    }

    public function test_board_requires_pipeline_module(): void
    {
        $this->actAs($this->makeStaff('finance'))->getJson('/api/v1/clients/board')->assertStatus(403);
    }

    public function test_birth_month_filter_for_birthday_radar(): void
    {
        $this->makeClient(['child_name' => 'Januari', 'status' => 'admitted', 'date_of_birth' => '2018-01-20']);
        $this->makeClient(['child_name' => 'Maret', 'status' => 'admitted', 'date_of_birth' => '2018-03-05']);
        $this->makeClient(['child_name' => 'Maret Keluar', 'status' => 'discharged', 'date_of_birth' => '2017-03-30']);
        $this->actAs($this->makeStaff('admin_schedule'));

        $this->assertSame(['Januari'], $this->names($this->getJson('/api/v1/clients?birth_month=1&status[]=admitted')->assertOk()->json()));
        $this->assertSame(['Maret'], $this->names($this->getJson('/api/v1/clients?birth_month=03&status[]=admitted')->json()));
        $this->assertEqualsCanonicalizing(['Maret', 'Maret Keluar'], $this->names($this->getJson('/api/v1/clients?birth_month=3')->json()));
        $this->assertCount(3, $this->getJson('/api/v1/clients?birth_month=13')->json('data')); // di luar 1-12 diabaikan
    }

    public function test_pipeline_summary_counts_per_status(): void
    {
        $this->makeClient(['status' => 'inquiry']);
        $this->makeClient(['status' => 'inquiry']);
        $this->makeClient(['status' => 'admitted']);
        $this->makeClient(['status' => 'admitted', 'branch_id' => $this->branchId('WEST')]);
        $this->actAs($this->makeStaff('admin_inquiry'));

        $data = $this->getJson('/api/v1/clients/pipeline-summary')->assertOk()->json('data');
        $this->assertSame(2, $data['inquiry']);
        $this->assertSame(1, $data['admitted']); // cabang WEST tidak ikut
        $this->assertSame(0, $data['discharged']);
        $this->assertCount(9, $data);
    }

    public function test_roles_without_client_modules_are_forbidden(): void
    {
        $this->actAs($this->makeStaff('admin_inquiry'));
        $this->getJson('/api/v1/clients')->assertOk();

        $role = $this->makeCustomRole('tanpa_client', ['branch_master']);
        $this->actAs($this->makeStaffWithRole($role))->getJson('/api/v1/clients')->assertStatus(403);
        $this->assertSame(0, Client::query()->count());
    }
}
