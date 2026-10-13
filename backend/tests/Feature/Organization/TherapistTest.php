<?php

namespace Tests\Feature\Organization;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\AuthFixtures;
use Tests\Concerns\OrganizationFixtures;
use Tests\TestCase;

class TherapistTest extends TestCase
{
    use AuthFixtures, OrganizationFixtures, RefreshDatabase;

    private User $master;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedFoundation();
        $this->master = $this->makeStaff('master');
    }

    private function therapist(string $name, array $overrides = []): User
    {
        return $this->makeStaff('therapist', array_merge(['name' => $name, 'title' => 'S.Ft', 'specialty' => 'Okupasi'], $overrides));
    }

    public function test_requires_login(): void
    {
        $this->getJson('/api/v1/therapists')->assertStatus(401);
    }

    public function test_list_returns_only_active_therapists_without_account_data(): void
    {
        $this->therapist('Adi');
        $this->therapist('Budi', ['is_active' => false]);
        $this->makeStaff('finance', ['name' => 'Bukan Terapis']);

        // Semua staf boleh membaca (dropdown penjadwalan), termasuk terapis sendiri.
        $res = $this->actAs($this->makeStaff('therapist', ['name' => 'Cici', 'branch_id' => $this->branchId('CTL')]))->getJson('/api/v1/therapists')->assertOk();

        $names = collect($res->json('data'))->pluck('name')->all();
        $this->assertContains('Cici', $names);
        $this->assertNotContains('Budi', $names, 'nonaktif tidak tampil');
        $this->assertNotContains('Bukan Terapis', $names);

        // Cici terikat CTL: server membatasi ke CTL (+ terapis semua cabang); Adi (EAST) tidak tampil.
        $this->assertNotContains('Adi', $names);

        $row = $res->json('data.0');
        $this->assertEqualsCanonicalizing(['id', 'name', 'title', 'specialty', 'branch_id', 'max_sessions_per_month'], array_keys($row));
    }

    public function test_master_can_filter_by_branch_and_all_branch_therapists_always_show(): void
    {
        $this->therapist('Adi');
        $this->therapist('Cici', ['branch_id' => $this->branchId('CTL')]);
        $this->therapist('Semua', ['branch_id' => null]);

        $this->actAs($this->master);

        $this->assertSame(['Adi', 'Cici', 'Semua'], collect($this->getJson('/api/v1/therapists')->json('data'))->pluck('name')->all());
        $this->assertSame(['Cici', 'Semua'], collect($this->getJson('/api/v1/therapists?branch_id='.$this->branchId('CTL'))->json('data'))->pluck('name')->all());
    }

    public function test_set_and_reset_capacity(): void
    {
        $t = $this->therapist('Adi');
        $this->actAs($this->master);

        $this->patchJson("/api/v1/therapists/{$t->id}/capacity", ['max_sessions_per_month' => 120])
            ->assertOk()->assertJsonPath('data.max_sessions_per_month', 120);
        $this->assertSame(120, $t->fresh()->max_sessions_per_month);

        $this->patchJson("/api/v1/therapists/{$t->id}/capacity", ['max_sessions_per_month' => null])
            ->assertOk()->assertJsonPath('data.max_sessions_per_month', null);
    }

    public function test_capacity_validation_and_targets(): void
    {
        $t = $this->therapist('Adi');
        $this->actAs($this->master);

        $this->patchJson("/api/v1/therapists/{$t->id}/capacity", [])->assertStatus(422)->assertJsonPath('errors.max_sessions_per_month.0', 'Maks sesi per bulan wajib dikirim (boleh kosong).');
        $this->patchJson("/api/v1/therapists/{$t->id}/capacity", ['max_sessions_per_month' => 0])->assertStatus(422)->assertJsonPath('errors.max_sessions_per_month.0', 'Maks sesi per bulan harus antara 1 dan 744.');
        $this->patchJson("/api/v1/therapists/{$t->id}/capacity", ['max_sessions_per_month' => 745])->assertStatus(422);
        $this->patchJson("/api/v1/therapists/{$t->id}/capacity", ['max_sessions_per_month' => 'banyak'])->assertStatus(422);

        $finance = $this->makeStaff('finance');
        $this->patchJson("/api/v1/therapists/{$finance->id}/capacity", ['max_sessions_per_month' => 100])->assertStatus(404);
    }

    public function test_capacity_requires_module_and_respects_branch_lock(): void
    {
        $adi = $this->therapist('Adi');
        $cici = $this->therapist('Cici', ['branch_id' => $this->branchId('CTL')]);

        // Terapis biasa (tanpa modul utilisasi/user_management) ditolak.
        $this->actAs($adi)->patchJson("/api/v1/therapists/{$adi->id}/capacity", ['max_sessions_per_month' => 90])->assertStatus(403);

        // Pengelola utilisasi terikat EAST (role kustom, tidak bergantung pada matriks seeder): hanya terapis cabangnya.
        $utilizationManager = $this->makeStaffWithRole($this->makeCustomRole('utilisasi', ['therapist_utilization']), 'EAST');
        $this->actAs($utilizationManager)->patchJson("/api/v1/therapists/{$adi->id}/capacity", ['max_sessions_per_month' => 90])->assertOk();
        $this->patchJson("/api/v1/therapists/{$cici->id}/capacity", ['max_sessions_per_month' => 90])->assertStatus(404);
    }
}
