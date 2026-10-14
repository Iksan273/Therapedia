<?php

namespace Tests\Feature\Organization;

use App\Actions\Organization\UserGuard;
use App\Models\User;
use App\Rules\StrongPassword;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Tests\Concerns\AuthFixtures;
use Tests\Concerns\OrganizationFixtures;
use Tests\TestCase;

class UserManagementTest extends TestCase
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
        return array_merge([
            'name' => 'Dewi Lestari',
            'email' => 'dewi@therapedia.test',
            'role_id' => $this->roleId('admin_schedule'),
            'branch_id' => $this->branchId('EAST'),
        ], $override);
    }

    // ---- Akses

    public function test_requires_login_and_user_management_module(): void
    {
        $this->getJson('/api/v1/users')->assertStatus(401);

        $this->actAs($this->makeStaff('finance'))->getJson('/api/v1/users')
            ->assertStatus(403)->assertJsonPath('code', 'forbidden');
    }

    // ---- Daftar

    public function test_list_is_paginated_and_filterable(): void
    {
        $this->makeStaff('therapist', ['name' => 'Adi Terapis', 'email' => 'adi@therapedia.test']);
        $this->makeStaff('therapist', ['name' => 'Budi Terapis', 'email' => 'budi@therapedia.test', 'is_active' => false]);
        $this->makeStaff('finance', ['name' => 'Citra Finance', 'email' => 'citra@therapedia.test', 'branch_id' => $this->branchId('CTL')]);

        $this->actAs($this->master);

        $all = $this->getJson('/api/v1/users')->assertOk()->assertJsonPath('meta.per_page', 10);
        $this->assertSame(4, $all->json('meta.total'));
        $this->assertArrayNotHasKey('password', $all->json('data.0'));

        $this->assertSame(['Adi Terapis', 'Budi Terapis'], collect($this->getJson('/api/v1/users?role=therapist')->json('data'))->pluck('name')->all());
        $this->assertSame(['Adi Terapis'], collect($this->getJson('/api/v1/users?role=therapist&is_active=1')->json('data'))->pluck('name')->all());
        $this->assertSame(['Citra Finance'], collect($this->getJson('/api/v1/users?q=cit')->json('data'))->pluck('name')->all(), 'pencarian prefix nama');
        $this->assertCount(0, $this->getJson('/api/v1/users?q=itra')->json('data'), 'bukan pencarian di tengah kata');
        $this->assertSame(1, $this->getJson('/api/v1/users?q=adi@')->json('meta.total'), 'prefix email');
    }

    public function test_branch_filter_includes_all_branch_accounts(): void
    {
        $this->makeStaff('finance', ['name' => 'Cabang CTL', 'email' => 'ctl@therapedia.test', 'branch_id' => $this->branchId('CTL')]);
        $this->makeStaff('finance', ['name' => 'Cabang EAST', 'email' => 'east@therapedia.test']);

        $names = collect($this->actAs($this->master)->getJson('/api/v1/users?branch_id='.$this->branchId('CTL'))->json('data'))->pluck('name')->all();

        $this->assertContains('Cabang CTL', $names);
        $this->assertNotContains('Cabang EAST', $names);
        $this->assertContains($this->master->name, $names, 'akun semua cabang (branch_id NULL) ikut tampil di tiap cabang');
    }

    // ---- Tambah

    public function test_create_without_password_generates_a_temporary_one_shown_once(): void
    {
        $res = $this->actAs($this->master)->postJson('/api/v1/users', $this->payload())
            ->assertCreated()
            ->assertJsonPath('data.email', 'dewi@therapedia.test')
            ->assertJsonPath('data.must_change_password', true)
            ->assertJsonPath('data.is_active', true)
            ->assertJsonPath('data.role.code', 'admin_schedule')
            ->assertJsonPath('data.branch.code', 'EAST');

        $temp = $res->json('data.temporary_password');
        $this->assertNotEmpty($temp);
        $this->assertTrue(Validator::make(['p' => $temp], ['p' => [new StrongPassword]])->passes(), 'password sementara memenuhi aturan password');

        // Tidak tersimpan/terbaca lagi, dan bisa dipakai login (lalu wajib ganti).
        $this->getJson('/api/v1/users/'.$res->json('data.id'))->assertOk()->assertJsonMissingPath('data.temporary_password');
        $this->postJson('/api/v1/auth/login', ['email' => 'dewi@therapedia.test', 'password' => $temp])
            ->assertOk()->assertJsonPath('data.user.must_change_password', true);
    }

    public function test_create_with_given_password_does_not_echo_it(): void
    {
        $this->actAs($this->master)->postJson('/api/v1/users', $this->payload(['password' => 'Sementara12']))
            ->assertCreated()->assertJsonPath('data.temporary_password', null);

        $this->postJson('/api/v1/auth/login', ['email' => 'dewi@therapedia.test', 'password' => 'Sementara12'])->assertOk();
    }

    public function test_create_validation(): void
    {
        $this->actAs($this->master);
        $this->makeStaff('finance', ['email' => 'dewi@therapedia.test']);

        $this->postJson('/api/v1/users', $this->payload())
            ->assertStatus(422)->assertJsonPath('errors.email.0', 'Email ini sudah dipakai akun lain.');

        $this->postJson('/api/v1/users', [])->assertStatus(422)->assertJsonStructure(['errors' => ['name', 'email', 'role_id']]);

        $this->postJson('/api/v1/users', $this->payload(['email' => 'baru@therapedia.test', 'password' => 'pendek']))
            ->assertStatus(422)->assertJsonStructure(['errors' => ['password']]);

        $this->postJson('/api/v1/users', $this->payload(['email' => 'baru@therapedia.test', 'role_id' => 99999]))
            ->assertStatus(422)->assertJsonPath('errors.role_id.0', 'Role tidak ditemukan.');
    }

    public function test_email_is_normalized_to_lowercase(): void
    {
        $this->actAs($this->master)->postJson('/api/v1/users', $this->payload(['email' => '  Dewi@Therapedia.TEST ']))
            ->assertCreated()->assertJsonPath('data.email', 'dewi@therapedia.test');
    }

    public function test_branch_rules_all_branches_master_and_inactive(): void
    {
        $this->actAs($this->master);

        $this->postJson('/api/v1/users', $this->payload(['email' => 'semua@therapedia.test', 'branch_id' => null]))
            ->assertCreated()->assertJsonPath('data.branch_id', null);

        // Role master selalu semua cabang walau cabang dikirim.
        $this->postJson('/api/v1/users', $this->payload(['email' => 'm2@therapedia.test', 'role_id' => $this->roleId('master')]))
            ->assertCreated()->assertJsonPath('data.branch_id', null);

        $this->patchJson('/api/v1/branches/'.$this->branchId('WEST').'/active', ['is_active' => false])->assertOk();
        $this->postJson('/api/v1/users', $this->payload(['email' => 'west@therapedia.test', 'branch_id' => $this->branchId('WEST')]))
            ->assertStatus(422)->assertJsonPath('errors.branch_id.0', 'Cabang tidak aktif. Pilih cabang yang aktif.');
    }

    // ---- Pengatur terikat satu cabang

    private function branchManager(): User
    {
        $role = $this->makeCustomRole('hr_cabang', ['user_management'], 'HR Cabang');

        return $this->makeStaffWithRole($role, 'EAST');
    }

    public function test_branch_locked_manager_only_sees_and_creates_in_own_branch(): void
    {
        $manager = $this->branchManager();
        $other = $this->makeStaff('finance', ['name' => 'Orang CTL', 'email' => 'ctl@therapedia.test', 'branch_id' => $this->branchId('CTL')]);
        $own = $this->makeStaff('finance', ['name' => 'Orang EAST', 'email' => 'east@therapedia.test']);

        $this->actAs($manager);

        $names = collect($this->getJson('/api/v1/users')->json('data'))->pluck('name')->all();
        $this->assertContains('Orang EAST', $names);
        $this->assertNotContains('Orang CTL', $names);
        $this->assertNotContains($this->master->name, $names, 'akun semua cabang (master) tidak terlihat');

        $this->getJson('/api/v1/users/'.$other->id)->assertStatus(404);
        $this->getJson('/api/v1/users/'.$own->id)->assertOk();

        // Cabang dari request diabaikan: akun baru selalu di cabang pengatur.
        $this->postJson('/api/v1/users', $this->payload(['email' => 'baru@therapedia.test', 'branch_id' => $this->branchId('CTL')]))
            ->assertCreated()->assertJsonPath('data.branch.code', 'EAST');
    }

    public function test_only_master_can_assign_or_touch_master_accounts(): void
    {
        $manager = $this->branchManager();
        $this->actAs($manager);

        $this->postJson('/api/v1/users', $this->payload(['email' => 'x@therapedia.test', 'role_id' => $this->roleId('master')]))
            ->assertStatus(403);

        $own = $this->makeStaff('finance', ['email' => 'east@therapedia.test']);
        $this->patchJson('/api/v1/users/'.$own->id, ['role_id' => $this->roleId('master')])->assertStatus(403);

        $masterInBranch = $this->makeStaff('master', ['email' => 'm3@therapedia.test', 'branch_id' => $this->branchId('EAST')]);
        $this->patchJson('/api/v1/users/'.$masterInBranch->id, ['name' => 'Ubah'])->assertStatus(403);
        $this->patchJson('/api/v1/users/'.$masterInBranch->id.'/active', ['is_active' => false])->assertStatus(403);
        $this->postJson('/api/v1/users/'.$masterInBranch->id.'/reset-password')->assertStatus(403);
    }

    // ---- Ubah

    public function test_update_changes_profile_role_and_branch(): void
    {
        $user = $this->makeStaff('admin_schedule', ['email' => 'dewi@therapedia.test']);

        $this->actAs($this->master)->patchJson('/api/v1/users/'.$user->id, [
            'name' => '  Dewi Baru ',
            'role_id' => $this->roleId('therapist'),
            'branch_id' => $this->branchId('CTL'),
            'title' => 'S.Ft',
            'specialty' => 'Okupasi',
            'phone' => '0812',
        ])->assertOk()
            ->assertJsonPath('data.name', 'Dewi Baru')
            ->assertJsonPath('data.role.code', 'therapist')
            ->assertJsonPath('data.branch.code', 'CTL')
            ->assertJsonPath('data.specialty', 'Okupasi');

        // PATCH: field yang tidak dikirim tidak berubah; email boleh tetap sama (unik mengabaikan diri sendiri).
        $this->patchJson('/api/v1/users/'.$user->id, ['email' => 'dewi@therapedia.test'])->assertOk()->assertJsonPath('data.name', 'Dewi Baru');
        $this->patchJson('/api/v1/users/'.$user->id, ['branch_id' => null])->assertOk()->assertJsonPath('data.branch_id', null);
    }

    public function test_update_keeps_unchanged_inactive_branch_but_rejects_switching_to_one(): void
    {
        $user = $this->makeStaff('finance', ['email' => 'dewi@therapedia.test']);
        $this->actAs($this->master);
        $this->patchJson('/api/v1/branches/'.$this->branchId('EAST').'/active', ['is_active' => false])->assertOk();

        // Cabang sama (kini nonaktif) tidak memblokir edit profil.
        $this->patchJson('/api/v1/users/'.$user->id, ['name' => 'Nama Baru', 'branch_id' => $this->branchId('EAST')])
            ->assertOk()->assertJsonPath('data.branch.code', 'EAST');

        $this->patchJson('/api/v1/users/'.$user->id, ['branch_id' => null])->assertOk();
        $this->patchJson('/api/v1/users/'.$user->id, ['branch_id' => $this->branchId('EAST')])
            ->assertStatus(422)->assertJsonPath('errors.branch_id.0', 'Cabang tidak aktif. Pilih cabang yang aktif.');
    }

    public function test_cannot_change_own_role(): void
    {
        $this->actAs($this->master)->patchJson('/api/v1/users/'.$this->master->id, ['role_id' => $this->roleId('finance')])
            ->assertStatus(422)->assertJsonPath('code', 'cannot_change_own_role');
    }

    public function test_update_to_master_role_clears_branch(): void
    {
        $user = $this->makeStaff('finance', ['email' => 'dewi@therapedia.test']);

        $this->actAs($this->master)->patchJson('/api/v1/users/'.$user->id, ['role_id' => $this->roleId('master')])
            ->assertOk()->assertJsonPath('data.role.code', 'master')->assertJsonPath('data.branch_id', null);
    }

    public function test_password_cannot_be_changed_through_update(): void
    {
        $user = $this->makeStaff('finance', ['email' => 'dewi@therapedia.test']);

        $this->actAs($this->master)->patchJson('/api/v1/users/'.$user->id, ['password' => 'AkalAkalan1', 'name' => 'Ok'])->assertOk();

        $this->postJson('/api/v1/auth/login', ['email' => 'dewi@therapedia.test', 'password' => 'AkalAkalan1'])->assertStatus(422);
        $this->postJson('/api/v1/auth/login', ['email' => 'dewi@therapedia.test', 'password' => self::PASSWORD])->assertOk();
    }

    // ---- Aktif / nonaktif

    public function test_deactivating_revokes_tokens_and_blocks_login_then_reactivate(): void
    {
        $user = $this->makeStaff('finance', ['email' => 'dewi@therapedia.test']);
        $this->loginToken($user);
        $this->assertSame(1, $user->tokens()->count());

        $this->actAs($this->master)->patchJson('/api/v1/users/'.$user->id.'/active', ['is_active' => false])
            ->assertOk()->assertJsonPath('data.is_active', false);

        $this->assertSame(0, $user->tokens()->count(), 'semua token dihapus saat dinonaktifkan');
        $this->postJson('/api/v1/auth/login', ['email' => 'dewi@therapedia.test', 'password' => self::PASSWORD])->assertStatus(422);

        $this->patchJson('/api/v1/users/'.$user->id.'/active', ['is_active' => true])->assertOk()->assertJsonPath('data.is_active', true);
        $this->postJson('/api/v1/auth/login', ['email' => 'dewi@therapedia.test', 'password' => self::PASSWORD])->assertOk();
    }

    public function test_cannot_deactivate_self(): void
    {
        $this->actAs($this->master)->patchJson('/api/v1/users/'.$this->master->id.'/active', ['is_active' => false])
            ->assertStatus(422)->assertJsonPath('code', 'cannot_deactivate_self');
    }

    public function test_last_active_master_guard(): void
    {
        $this->assertTrue(UserGuard::isLastActiveMaster($this->master->load('role')));

        $second = $this->makeStaff('master', ['email' => 'm2@therapedia.test']);
        $this->assertFalse(UserGuard::isLastActiveMaster($this->master->fresh()->load('role')));

        $second->update(['is_active' => false]);
        $this->assertTrue(UserGuard::isLastActiveMaster($this->master->fresh()->load('role')), 'master nonaktif tidak dihitung');
    }

    // ---- Hapus akun

    public function test_master_deletes_an_account_without_history_and_revokes_its_tokens(): void
    {
        $user = $this->makeStaff('finance', ['email' => 'dewi@therapedia.test']);
        $this->loginToken($user);
        DB::table('holidays')->insert(['holiday_date' => '2026-12-25', 'name' => 'Natal', 'created_by' => $user->id, 'updated_by' => $user->id, 'created_at' => now(), 'updated_at' => now()]);

        $this->actAs($this->master)->deleteJson('/api/v1/users/'.$user->id)->assertNoContent();

        $this->assertDatabaseMissing('users', ['id' => $user->id]);
        $this->assertSame(0, DB::table('personal_access_tokens')->where('tokenable_id', $user->id)->count());
        $this->assertDatabaseHas('holidays', ['name' => 'Natal', 'created_by' => null, 'updated_by' => null]); // data tetap, pelaku jadi kosong
        $this->postJson('/api/v1/auth/login', ['email' => 'dewi@therapedia.test', 'password' => self::PASSWORD])->assertStatus(422);
    }

    public function test_only_master_may_delete_accounts(): void
    {
        $manager = $this->makeStaffWithRole($this->makeCustomRole('pengelola', ['user_management']), 'EAST');
        $target = $this->makeStaff('finance');

        $this->actAs($manager)->deleteJson('/api/v1/users/'.$target->id)->assertStatus(403)->assertJsonPath('code', 'forbidden');
        $this->assertDatabaseHas('users', ['id' => $target->id]);
    }

    public function test_cannot_delete_self_or_the_last_active_master(): void
    {
        $this->actAs($this->master)->deleteJson('/api/v1/users/'.$this->master->id)
            ->assertStatus(422)->assertJsonPath('code', 'cannot_delete_self');

        $inactiveMaster = $this->makeStaff('master', ['email' => 'm2@therapedia.test', 'is_active' => false]);
        $this->actAs($inactiveMaster)->deleteJson('/api/v1/users/'.$this->master->id)
            ->assertStatus(422)->assertJsonPath('code', 'last_master');
        $this->assertDatabaseHas('users', ['id' => $this->master->id]);
    }

    public function test_therapist_with_schedules_cannot_be_deleted(): void
    {
        $therapist = $this->makeStaff('therapist');
        $client = $this->makeClient();
        DB::table('schedules')->insert([
            'branch_id' => $client->branch_id, 'client_id' => $client->id, 'therapist_id' => $therapist->id,
            'session_date' => '2026-11-02', 'start_time' => '09:00', 'end_time' => '10:00', 'created_at' => now(), 'updated_at' => now(),
        ]);

        $this->actAs($this->master)->deleteJson('/api/v1/users/'.$therapist->id)
            ->assertStatus(409)->assertJsonPath('code', 'in_use');
        $this->assertDatabaseHas('users', ['id' => $therapist->id]);

        // terapis tanpa jadwal boleh dihapus
        $idle = $this->makeStaff('therapist');
        $this->deleteJson('/api/v1/users/'.$idle->id)->assertNoContent();
    }

    public function test_deleting_unknown_account_is_404(): void
    {
        $this->actAs($this->master)->deleteJson('/api/v1/users/999999')->assertNotFound();
    }

    // ---- Reset password

    public function test_reset_password_sets_temporary_password_and_revokes_tokens(): void
    {
        $user = $this->makeStaff('finance', ['email' => 'dewi@therapedia.test']);
        $this->loginToken($user);

        $res = $this->actAs($this->master)->postJson('/api/v1/users/'.$user->id.'/reset-password')->assertOk();
        $temp = $res->json('data.temporary_password');

        $this->assertNotEmpty($temp);
        $this->assertTrue($user->fresh()->must_change_password);
        $this->assertSame(0, $user->tokens()->count());
        $this->postJson('/api/v1/auth/login', ['email' => 'dewi@therapedia.test', 'password' => self::PASSWORD])->assertStatus(422);
        $this->postJson('/api/v1/auth/login', ['email' => 'dewi@therapedia.test', 'password' => $temp])
            ->assertOk()->assertJsonPath('data.user.must_change_password', true);
    }

    public function test_reset_password_with_given_value_and_validation(): void
    {
        $user = $this->makeStaff('finance', ['email' => 'dewi@therapedia.test']);
        $this->actAs($this->master);

        $this->postJson('/api/v1/users/'.$user->id.'/reset-password', ['password' => 'pendek'])->assertStatus(422)->assertJsonStructure(['errors' => ['password']]);

        $this->postJson('/api/v1/users/'.$user->id.'/reset-password', ['password' => 'Pilihan12345'])
            ->assertOk()->assertJsonPath('data.temporary_password', null);
        $this->postJson('/api/v1/auth/login', ['email' => 'dewi@therapedia.test', 'password' => 'Pilihan12345'])->assertOk();
    }

    public function test_reset_own_password_is_rejected(): void
    {
        $this->actAs($this->master)->postJson('/api/v1/users/'.$this->master->id.'/reset-password')
            ->assertStatus(422)->assertJsonPath('code', 'use_change_password');
    }
}
