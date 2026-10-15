<?php

namespace Tests\Feature\Client;

use App\Models\Client;
use App\Models\User;
use App\Services\ClientCodeService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\AuthFixtures;
use Tests\Concerns\OrganizationFixtures;
use Tests\TestCase;

class ClientCreateTest extends TestCase
{
    use AuthFixtures, OrganizationFixtures, RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedFoundation();
        $this->admin = $this->makeStaff('admin_inquiry');
    }

    private function payload(array $override = []): array
    {
        return array_merge([
            'child_name' => 'Aisyah Putri',
            'gender' => 'female',
            'date_of_birth' => '2019-03-10',
            'parent_name' => 'Budi Santoso',
            'parent_phone' => '0812-3456-7890',
            'parent_email' => 'budi@example.com',
            'address' => 'Jl. Mawar 1',
            'intake_note' => 'Rujukan sekolah',
        ], $override);
    }

    public function test_create_returns_inquiry_client_with_server_made_code(): void
    {
        $res = $this->actAs($this->admin)->postJson('/api/v1/clients', $this->payload())
            ->assertCreated()
            ->assertJsonPath('data.client_code', 'AE-00001')
            ->assertJsonPath('data.status', 'inquiry')
            ->assertJsonPath('data.branch.code', 'EAST')
            ->assertJsonPath('data.credit_balance', 0)
            ->assertJsonPath('data.frozen', true)
            ->assertJsonPath('data.version', 1);

        $this->assertDatabaseHas('clients', ['id' => $res->json('data.id'), 'created_by' => $this->admin->id]);
    }

    public function test_codes_are_sequential_per_group_and_never_reused_after_delete(): void
    {
        $this->actAs($this->admin);
        $a1 = $this->postJson('/api/v1/clients', $this->payload(['child_name' => 'Aisyah']))->json('data');
        $a2 = $this->postJson('/api/v1/clients', $this->payload(['child_name' => 'Bima']))->json('data');
        $k1 = $this->postJson('/api/v1/clients', $this->payload(['child_name' => 'Kenzo']))->json('data');
        $u1 = $this->postJson('/api/v1/clients', $this->payload(['child_name' => 'Zahra']))->json('data');

        $this->assertSame(['AE-00001', 'AE-00002', 'KO-00001', 'UZ-00001'], [$a1['client_code'], $a2['client_code'], $k1['client_code'], $u1['client_code']]);

        // hapus (master) lalu buat lagi: nomor TIDAK dipakai ulang
        $this->actAs($this->makeStaff('master'))->deleteJson('/api/v1/clients/'.$a2['id'])->assertNoContent();
        $a3 = $this->actAs($this->admin)->postJson('/api/v1/clients', $this->payload(['child_name' => 'Citra']))->json('data');
        $this->assertSame('AE-00003', $a3['client_code']);
    }

    public function test_code_group_follows_first_letter_ignoring_accents_and_symbols(): void
    {
        $service = new ClientCodeService;

        $this->assertSame('AE', $service->groupFor('Édo'));
        $this->assertSame('FJ', $service->groupFor('  Hana'));
        $this->assertSame('PT', $service->groupFor('"Sasa"'));
        $this->assertSame('AE', $service->groupFor('1234'));
    }

    public function test_code_does_not_change_when_name_is_edited(): void
    {
        $this->actAs($this->admin);
        $created = $this->postJson('/api/v1/clients', $this->payload(['child_name' => 'Aisyah']))->json('data');

        $this->patchJson('/api/v1/clients/'.$created['id'], ['version' => 1, 'child_name' => 'Zainab', 'client_code' => 'UZ-99999'])
            ->assertOk()
            ->assertJsonPath('data.client_code', 'AE-00001')
            ->assertJsonPath('data.child_name', 'Zainab')
            ->assertJsonPath('data.version', 2);
    }

    public function test_validation_errors_per_field(): void
    {
        $this->actAs($this->admin)->postJson('/api/v1/clients', [])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['child_name', 'gender', 'date_of_birth', 'parent_name', 'parent_phone']);

        $this->postJson('/api/v1/clients', $this->payload(['date_of_birth' => now()->addDay()->toDateString(), 'parent_email' => 'bukan-email', 'parent_phone' => 'abc']))
            ->assertStatus(422)
            ->assertJsonValidationErrors(['date_of_birth', 'parent_email', 'parent_phone']);
    }

    public function test_branch_staff_is_forced_to_own_branch_and_master_must_choose_active_branch(): void
    {
        // staf cabang EAST mengirim cabang lain: diabaikan
        $this->actAs($this->admin)->postJson('/api/v1/clients', $this->payload(['branch_id' => $this->branchId('WEST')]))
            ->assertCreated()->assertJsonPath('data.branch.code', 'EAST');

        $master = $this->makeStaff('master');
        $this->actAs($master)->postJson('/api/v1/clients', $this->payload())->assertStatus(422)->assertJsonValidationErrors(['branch_id']);
        $this->postJson('/api/v1/clients', $this->payload(['branch_id' => $this->branchId('WEST')]))
            ->assertCreated()->assertJsonPath('data.branch.code', 'WEST');

        $this->actAs($master)->patchJson('/api/v1/branches/'.$this->branchId('CTL').'/active', ['is_active' => false])->assertOk();
        $this->postJson('/api/v1/clients', $this->payload(['branch_id' => $this->branchId('CTL')]))->assertStatus(422)->assertJsonValidationErrors(['branch_id']);
    }

    public function test_only_pipeline_module_can_create(): void
    {
        $this->actAs($this->makeStaff('finance'))->postJson('/api/v1/clients', $this->payload())->assertStatus(403);
        $this->actAs($this->makeStaff('therapist'))->postJson('/api/v1/clients', $this->payload())->assertStatus(403);
        $this->assertSame(0, Client::query()->withoutGlobalScopes()->count());
    }

    public function test_update_requires_version_and_detects_conflict(): void
    {
        $this->actAs($this->admin);
        $id = $this->postJson('/api/v1/clients', $this->payload())->json('data.id');

        $this->patchJson("/api/v1/clients/$id", ['parent_name' => 'Baru'])->assertStatus(422)->assertJsonValidationErrors(['version']);
        $this->patchJson("/api/v1/clients/$id", ['version' => 1, 'parent_name' => 'Baru'])->assertOk()->assertJsonPath('data.version', 2);
        $this->patchJson("/api/v1/clients/$id", ['version' => 1, 'parent_name' => 'Usang'])->assertStatus(409)->assertJsonPath('code', 'version_conflict');
    }
}
