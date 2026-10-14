<?php

namespace Tests\Feature\Master;

use App\Models\MasterPackage;
use App\Models\User;
use Database\Seeders\MasterDataSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\Concerns\AuthFixtures;
use Tests\Concerns\OrganizationFixtures;
use Tests\TestCase;

/** M3: layanan, kuadran, alasan Cancel/Off, alasan Discharge, master paket. */
class MasterDataTest extends TestCase
{
    use AuthFixtures, OrganizationFixtures, RefreshDatabase;

    private User $master;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedFoundation();
        $this->seed(MasterDataSeeder::class);
        $this->master = $this->makeStaff('master');
    }

    // ---- Akses

    public function test_every_logged_in_staff_can_read_but_unauthenticated_cannot(): void
    {
        $paths = ['services', 'quadrants', 'cancel-reasons', 'discharge-reasons', 'packages'];

        // Cek tanpa login dulu: actAs() bertahan sampai akhir test, jadi request sesudahnya akan terautentikasi.
        foreach ($paths as $path) {
            $this->getJson("/api/v1/master/{$path}")->assertStatus(401);
        }

        $this->actAs($this->makeStaff('therapist'));
        foreach ($paths as $path) {
            $this->getJson("/api/v1/master/{$path}")->assertOk()->assertJsonStructure(['data' => [['code']]]);
        }
    }

    public function test_write_requires_the_module(): void
    {
        $therapist = $this->actAs($this->makeStaff('therapist'));

        $therapist->postJson('/api/v1/master/services', ['code' => 'x', 'label' => 'X', 'category' => 'Terapi'])->assertStatus(403);
        $therapist->postJson('/api/v1/master/cancel-reasons', ['code' => 'x', 'label' => 'X'])->assertStatus(403);
        // inquiry_master_data tidak cukup untuk master paket (modul finance)
        $this->actAs($this->makeStaff('admin_inquiry'))->postJson('/api/v1/master/packages', $this->packagePayload())->assertStatus(403);
        $this->actAs($this->makeStaff('finance'))->postJson('/api/v1/master/packages', $this->packagePayload())->assertCreated();
        $this->actAs($this->makeStaff('admin_inquiry'))->postJson('/api/v1/master/services', ['code' => 'x', 'label' => 'X', 'category' => 'Terapi'])->assertCreated();
    }

    // ---- Layanan

    public function test_service_crud_keeps_code_immutable(): void
    {
        $this->actAs($this->master);

        $this->postJson('/api/v1/master/services', ['code' => 'ot_baru', 'label' => 'OT Baru', 'category' => 'Terapi', 'description' => ' '])
            ->assertCreated()->assertJsonPath('data.code', 'ot_baru')->assertJsonPath('data.is_active', true)->assertJsonPath('data.description', null);
        $this->postJson('/api/v1/master/services', ['code' => 'ot_baru', 'label' => 'Dobel', 'category' => 'Terapi'])
            ->assertStatus(422)->assertJsonPath('errors.code.0', 'Kode layanan ini sudah dipakai.');

        $this->patchJson('/api/v1/master/services/ot_baru', ['label' => 'OT Baru 2', 'is_active' => false])
            ->assertOk()->assertJsonPath('data.label', 'OT Baru 2')->assertJsonPath('data.is_active', false);
        $this->patchJson('/api/v1/master/services/ot_baru', ['code' => 'lain'])->assertStatus(422)->assertJsonPath('errors.code.0', 'Kode layanan tidak dapat diubah.');

        $this->getJson('/api/v1/master/services?active=1')->assertOk();
        $this->assertNotContains('ot_baru', collect($this->getJson('/api/v1/master/services?active=1')->json('data'))->pluck('code')->all());

        $this->deleteJson('/api/v1/master/services/ot_baru')->assertNoContent();
        $this->getJson('/api/v1/master/services/ot_baru')->assertNotFound();
    }

    public function test_service_in_use_cannot_be_deleted(): void
    {
        $code = DB::table('services')->value('code');
        $client = $this->makeClient();
        DB::table('client_services')->insert(['client_id' => $client->id, 'service_code' => $code]);

        $this->actAs($this->master)->deleteJson("/api/v1/master/services/{$code}")
            ->assertStatus(409)->assertJsonPath('code', 'in_use');
        $this->assertDatabaseHas('services', ['code' => $code]);
    }

    public function test_service_used_by_a_schedule_cannot_be_deleted(): void
    {
        $code = DB::table('services')->value('code');
        $client = $this->makeClient();
        DB::table('schedules')->insert([
            'branch_id' => $client->branch_id, 'client_id' => $client->id, 'therapist_id' => $this->master->id, 'service_code' => $code,
            'session_date' => '2026-11-02', 'start_time' => '09:00', 'end_time' => '10:00', 'created_at' => now(), 'updated_at' => now(),
        ]);

        $this->actAs($this->master)->deleteJson("/api/v1/master/services/{$code}")->assertStatus(409)->assertJsonPath('code', 'in_use');
    }

    // ---- Kuadran

    public function test_quadrant_crud_and_unused_quadrants_can_all_be_deleted(): void
    {
        $this->actAs($this->master);

        $this->postJson('/api/v1/master/quadrants', ['code' => 'xy', 'title' => 'Baru', 'full_name' => 'Kuadran Baru'])
            ->assertCreated()->assertJsonPath('data.code', 'XY')->assertJsonPath('data.color', 'slate');
        $this->patchJson('/api/v1/master/quadrants/XY', ['title' => 'Baru 2', 'color' => 'blue'])->assertOk()->assertJsonPath('data.title', 'Baru 2');

        foreach (DB::table('sensory_quadrants')->pluck('code') as $code) {
            $this->deleteJson("/api/v1/master/quadrants/{$code}")->assertNoContent();
        }

        $this->assertSame(0, DB::table('sensory_quadrants')->count());
    }

    // ---- Alasan Cancel/Off dan Discharge

    public function test_cancel_reasons_are_one_list_split_by_therapist_off_flag(): void
    {
        $this->actAs($this->master);

        $this->postJson('/api/v1/master/cancel-reasons', ['code' => 'LIBUR_X', 'label' => 'Libur Khusus', 'is_therapist_off' => true])
            ->assertCreated()->assertJsonPath('data.is_therapist_off', true);

        $off = collect($this->getJson('/api/v1/master/cancel-reasons?therapist_off=1')->json('data'));
        $cancel = collect($this->getJson('/api/v1/master/cancel-reasons?therapist_off=0')->json('data'));

        $this->assertContains('LIBUR_X', $off->pluck('code')->all());
        $this->assertContains('TO', $off->pluck('code')->all());
        $this->assertTrue($off->every(fn ($r) => $r['is_therapist_off'] === true));
        $this->assertTrue($cancel->every(fn ($r) => $r['is_therapist_off'] === false));
        $this->assertGreaterThan(count($off), count($this->getJson('/api/v1/master/cancel-reasons')->json('data')));
    }

    public function test_cancel_and_discharge_reasons_can_be_deleted_freely(): void
    {
        $this->actAs($this->master);

        $cancel = DB::table('cancel_reasons')->value('code');
        $discharge = DB::table('discharge_reasons')->value('code');

        $this->deleteJson("/api/v1/master/cancel-reasons/{$cancel}")->assertNoContent();
        $this->deleteJson("/api/v1/master/discharge-reasons/{$discharge}")->assertNoContent();
        $this->assertDatabaseMissing('cancel_reasons', ['code' => $cancel]);
        $this->assertDatabaseMissing('discharge_reasons', ['code' => $discharge]);
    }

    public function test_discharge_reasons_have_no_therapist_off_flag_and_unique_codes(): void
    {
        $this->actAs($this->master);

        $res = $this->postJson('/api/v1/master/discharge-reasons', ['code' => 'PINDAH', 'label' => 'Pindah Kota', 'is_therapist_off' => true])->assertCreated();
        $this->assertArrayNotHasKey('is_therapist_off', $res->json('data'));

        $this->postJson('/api/v1/master/discharge-reasons', ['code' => 'PINDAH', 'label' => 'Dobel'])
            ->assertStatus(422)->assertJsonPath('errors.code.0', 'Kode alasan ini sudah dipakai.');
        $this->patchJson('/api/v1/master/discharge-reasons/PINDAH', ['label' => 'Pindah Domisili', 'is_active' => false])
            ->assertOk()->assertJsonPath('data.label', 'Pindah Domisili');
    }

    // ---- Paket

    private function packagePayload(array $override = []): array
    {
        return array_merge(['name' => 'Paket Baru', 'invoice_code' => 'new', 'credits' => 8, 'price' => 1_200_000, 'leave_quota' => 2], $override);
    }

    public function test_package_crud_and_rules(): void
    {
        $this->actAs($this->master);

        $created = $this->postJson('/api/v1/master/packages', $this->packagePayload())
            ->assertCreated()->assertJsonPath('data.invoice_code', 'NEW')->assertJsonPath('data.price', 1_200_000)->assertJsonPath('data.is_active', true);
        $id = $created->json('data.id');
        $this->assertSame('pkg-paket-baru', $created->json('data.code'));

        $this->postJson('/api/v1/master/packages', $this->packagePayload(['name' => 'Paket Baru', 'invoice_code' => 'NEW']))
            ->assertStatus(422)->assertJsonPath('errors.invoice_code.0', 'Kode invoice ini sudah dipakai paket lain.');
        $this->postJson('/api/v1/master/packages', $this->packagePayload(['invoice_code' => 'asm']))
            ->assertStatus(422)->assertJsonPath('errors.invoice_code.0', 'Kode ASM dipakai invoice asesmen, pilih kode lain.');

        // ubah sendiri dengan kode invoice yang sama tidak dianggap duplikat
        $this->putJson("/api/v1/master/packages/{$id}", $this->packagePayload(['price' => 1_500_000]))->assertOk()->assertJsonPath('data.price', 1_500_000);
        $this->patchJson("/api/v1/master/packages/{$id}/active", ['is_active' => false])->assertOk()->assertJsonPath('data.is_active', false);
        $this->patchJson("/api/v1/master/packages/{$id}/active", [])->assertStatus(422);

        $active = collect($this->getJson('/api/v1/master/packages?active=1')->json('data'))->pluck('id')->all();
        $this->assertNotContains($id, $active);

        $this->deleteJson("/api/v1/master/packages/{$id}")->assertNoContent();
        $this->assertNull(MasterPackage::find($id));
    }

    public function test_package_used_by_invoice_cannot_be_deleted(): void
    {
        $package = MasterPackage::query()->firstOrFail();
        $client = $this->makeClient();
        DB::table('invoices')->insert([
            'invoice_number' => 'INV-TEST-1', 'client_id' => $client->id, 'branch_id' => $client->branch_id, 'master_package_id' => $package->id,
            'type_code' => 'REG', 'package_name' => $package->name, 'amount' => 1000, 'created_at' => now(), 'updated_at' => now(),
        ]);

        $this->actAs($this->master)->deleteJson("/api/v1/master/packages/{$package->id}")->assertStatus(409)->assertJsonPath('code', 'in_use');
        $this->assertNotNull(MasterPackage::find($package->id));
    }
}
