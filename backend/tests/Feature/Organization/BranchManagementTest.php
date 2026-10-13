<?php

namespace Tests\Feature\Organization;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\AuthFixtures;
use Tests\Concerns\OrganizationFixtures;
use Tests\TestCase;

class BranchManagementTest extends TestCase
{
    use AuthFixtures, OrganizationFixtures, RefreshDatabase;

    private User $master;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedFoundation();
        $this->master = $this->makeStaff('master');
    }

    private function payload(array $override = []): array
    {
        return array_merge(['name' => 'Gubeng', 'code' => 'gbg', 'city' => 'Surabaya', 'address' => 'Jl. Gubeng No. 1', 'phone' => '031-123'], $override);
    }

    // ---- Baca

    public function test_every_logged_in_staff_can_read_branches_without_a_module(): void
    {
        $this->getJson('/api/v1/branches')->assertStatus(401);

        $res = $this->actAs($this->makeStaff('therapist'))->getJson('/api/v1/branches')->assertOk();
        $this->assertSame(['CTL', 'EAST', 'WEST'], collect($res->json('data'))->pluck('code')->sort()->values()->all());
        $this->assertArrayHasKey('is_active', $res->json('data.0'));

        $this->getJson('/api/v1/branches/'.$this->branchId('EAST'))->assertOk()->assertJsonPath('data.code', 'EAST');
    }

    public function test_active_filter_hides_inactive_branches(): void
    {
        $this->actAs($this->master)->patchJson('/api/v1/branches/'.$this->branchId('WEST').'/active', ['is_active' => false])->assertOk();

        $all = $this->getJson('/api/v1/branches')->json('data');
        $active = $this->getJson('/api/v1/branches?active=1')->json('data');

        $this->assertCount(3, $all, 'nonaktif tetap tampil di daftar lengkap');
        $this->assertSame(['CTL', 'EAST'], collect($active)->pluck('code')->sort()->values()->all());
    }

    // ---- Tulis

    public function test_writes_require_branch_master_module(): void
    {
        $this->actAs($this->makeStaff('finance'))->postJson('/api/v1/branches', $this->payload())->assertStatus(403);
        $this->putJson('/api/v1/branches/'.$this->branchId('EAST'), ['name' => 'X'])->assertStatus(403);
        $this->patchJson('/api/v1/branches/'.$this->branchId('EAST').'/active', ['is_active' => false])->assertStatus(403);
    }

    public function test_create_normalizes_code_and_defaults(): void
    {
        $this->actAs($this->master)->postJson('/api/v1/branches', ['name' => '  Gubeng ', 'code' => ' gbg1 '])
            ->assertCreated()
            ->assertJsonPath('data.name', 'Gubeng')
            ->assertJsonPath('data.code', 'GBG1')
            ->assertJsonPath('data.city', 'Surabaya')
            ->assertJsonPath('data.is_active', true)
            ->assertJsonPath('data.address', null);
    }

    public function test_create_validation(): void
    {
        $this->actAs($this->master);

        $this->postJson('/api/v1/branches', [])->assertStatus(422)->assertJsonStructure(['errors' => ['name', 'code']]);
        $this->postJson('/api/v1/branches', $this->payload(['code' => 'EAST']))->assertStatus(422)->assertJsonPath('errors.code.0', 'Kode cabang ini sudah dipakai.');
        $this->postJson('/api/v1/branches', $this->payload(['name' => 'East']))->assertStatus(422)->assertJsonPath('errors.name.0', 'Nama cabang ini sudah dipakai.');
        $this->postJson('/api/v1/branches', $this->payload(['code' => 'A']))->assertStatus(422)->assertJsonPath('errors.code.0', 'Kode cabang 2-10 karakter, hanya huruf dan angka.');
        $this->postJson('/api/v1/branches', $this->payload(['code' => 'TERLALU-PANJANG']))->assertStatus(422)->assertJsonStructure(['errors' => ['code']]);
        $this->postJson('/api/v1/branches', $this->payload(['code' => 'GB G']))->assertStatus(422)->assertJsonStructure(['errors' => ['code']]);
    }

    public function test_update_with_put_and_patch_ignoring_own_uniques(): void
    {
        $id = $this->branchId('CTL');
        $this->actAs($this->master);

        $this->putJson('/api/v1/branches/'.$id, ['name' => 'Citraland', 'code' => 'ctl', 'address' => 'Alamat baru', 'phone' => ''])
            ->assertOk()->assertJsonPath('data.code', 'CTL')->assertJsonPath('data.address', 'Alamat baru')->assertJsonPath('data.phone', null);

        $this->patchJson('/api/v1/branches/'.$id, ['city' => ''])->assertOk()->assertJsonPath('data.city', 'Surabaya');
        $this->patchJson('/api/v1/branches/'.$id, ['code' => 'EAST'])->assertStatus(422)->assertJsonPath('errors.code.0', 'Kode cabang ini sudah dipakai.');
        $this->patchJson('/api/v1/branches/99999', ['name' => 'X'])->assertStatus(404);
    }

    public function test_toggle_active(): void
    {
        $id = $this->branchId('WEST');
        $this->actAs($this->master);

        $this->patchJson("/api/v1/branches/{$id}/active", ['is_active' => false])->assertOk()->assertJsonPath('data.is_active', false);
        $this->patchJson("/api/v1/branches/{$id}/active", ['is_active' => true])->assertOk()->assertJsonPath('data.is_active', true);
        $this->patchJson("/api/v1/branches/{$id}/active", [])->assertStatus(422)->assertJsonPath('errors.is_active.0', 'Status aktif wajib dikirim.');
    }

    // ---- Pratinjau & hapus (hanya master)

    public function test_delete_impact_counts_related_data_for_master_only(): void
    {
        $east = $this->branchId('EAST');
        $this->makeClient();
        $this->makeClient();
        $this->makeStaff('therapist');
        $this->makeStaff('finance', ['branch_id' => $this->branchId('CTL')]);

        $this->actAs($this->master)->getJson("/api/v1/branches/{$east}/delete-impact")
            ->assertOk()
            ->assertJsonPath('data.code', 'EAST')
            ->assertJsonPath('data.impact', ['clients' => 2, 'schedules' => 0, 'invoices' => 0, 'staff' => 1, 'holidays' => 0]);

        // Akun dengan modul branch_master tetapi bukan master: ditolak.
        $role = $this->makeCustomRole('kelola_cabang', ['branch_master']);
        $manager = $this->makeStaffWithRole($role, null);
        $this->actAs($manager)->getJson("/api/v1/branches/{$east}/delete-impact")->assertStatus(403);
    }

    public function test_delete_is_master_only_and_not_implemented_yet(): void
    {
        $id = $this->branchId('WEST');

        $role = $this->makeCustomRole('kelola_cabang', ['branch_master']);
        $this->actAs($this->makeStaffWithRole($role, null))->deleteJson("/api/v1/branches/{$id}")->assertStatus(403);

        // Hapus permanen + cascade dikerjakan Sprint 4 (DeleteBranchAction); sampai itu 501 dan data aman.
        $this->actAs($this->master)->deleteJson("/api/v1/branches/{$id}")->assertStatus(501)->assertJsonPath('code', 'not_implemented');
        $this->assertDatabaseHas('branches', ['id' => $id]);
    }
}
