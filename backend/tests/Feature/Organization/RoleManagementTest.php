<?php

namespace Tests\Feature\Organization;

use App\Models\Role;
use App\Models\RolePermission;
use App\Models\User;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\AuthFixtures;
use Tests\Concerns\OrganizationFixtures;
use Tests\TestCase;

class RoleManagementTest extends TestCase
{
    use AuthFixtures, OrganizationFixtures, RefreshDatabase;

    private User $master;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedFoundation();
        $this->master = $this->makeStaff('master');
    }

    private function permissionsOf(string $roleCode): array
    {
        return $this->actAs($this->master)->getJson('/api/v1/roles/'.$this->roleId($roleCode))->json('data.permissions');
    }

    public function test_requires_rbac_module(): void
    {
        $this->getJson('/api/v1/roles')->assertStatus(401);
        $this->actAs($this->makeStaff('finance'))->getJson('/api/v1/roles')->assertStatus(403);
        $this->actAs($this->makeStaff('finance'))->getJson('/api/v1/access-modules')->assertStatus(403);
    }

    public function test_user_management_can_read_roles_but_not_change_them(): void
    {
        // Pengelola akun butuh daftar role untuk memilih role akun, tanpa boleh mengubah role/matriks.
        $hr = $this->makeStaffWithRole($this->makeCustomRole('hr', ['user_management']), 'EAST');
        $custom = $this->makeCustomRole('kustom', ['finance']);

        $this->actAs($hr);
        $this->getJson('/api/v1/roles')->assertOk();
        $this->getJson('/api/v1/roles/'.$custom->id)->assertOk();
        $this->getJson('/api/v1/access-modules')->assertOk();

        $this->postJson('/api/v1/roles', ['name' => 'Baru'])->assertStatus(403);
        $this->patchJson('/api/v1/roles/'.$custom->id, ['name' => 'Ubah'])->assertStatus(403);
        $this->deleteJson('/api/v1/roles/'.$custom->id)->assertStatus(403);
        $this->putJson('/api/v1/roles/'.$custom->id.'/permissions', ['permissions' => [['module_code' => 'finance', 'allowed' => false]]])->assertStatus(403);
    }

    public function test_index_lists_roles_with_counts_and_permission_lists(): void
    {
        $this->makeStaff('finance');
        $this->makeStaff('finance');

        $res = $this->actAs($this->master)->getJson('/api/v1/roles')->assertOk();
        $roles = collect($res->json('data'))->keyBy('code');

        $this->assertCount(6, $roles);
        $this->assertSame(2, $roles['finance']['users_count']);
        $this->assertTrue($roles['finance']['is_system']);
        $this->assertTrue(array_is_list($roles['finance']['permissions']), 'izin berupa daftar kode modul, bukan kamus');
        $this->assertContains('finance', $roles['finance']['permissions']);
        $this->assertNotContains('rbac', $roles['finance']['permissions']);
        $this->assertSame(array_keys(RbacSeeder::MODULES), $roles['master']['permissions'], 'master selalu semua modul');
    }

    public function test_access_modules_are_listed_in_order(): void
    {
        $codes = collect($this->actAs($this->master)->getJson('/api/v1/access-modules')->assertOk()->json('data'))->pluck('code')->all();

        $this->assertSame(array_keys(RbacSeeder::MODULES), $codes);
    }

    // ---- Buat

    public function test_create_custom_role_with_initial_permissions_and_generated_code(): void
    {
        $res = $this->actAs($this->master)->postJson('/api/v1/roles', [
            'name' => 'Koordinator Klinis',
            'badge' => 'Koordinasi',
            'description' => 'Mengawasi jadwal terapis',
            'permissions' => ['weekly_calendar', 'active_clients'],
        ])->assertCreated()
            ->assertJsonPath('data.code', 'koordinator_klinis')
            ->assertJsonPath('data.is_system', false)
            ->assertJsonPath('data.permissions', ['weekly_calendar', 'active_clients']);

        $role = Role::find($res->json('data.id'));
        $this->assertSame(count(RbacSeeder::MODULES), RolePermission::where('role_id', $role->id)->count(), 'matriks lengkap: semua modul punya baris');
        $this->assertSame(2, RolePermission::where('role_id', $role->id)->where('allowed', true)->count());
    }

    public function test_generated_code_is_unique_and_explicit_code_is_validated(): void
    {
        $this->actAs($this->master);

        $first = $this->postJson('/api/v1/roles', ['name' => 'Supervisor'])->assertCreated()->json('data.code');
        $second = $this->postJson('/api/v1/roles', ['name' => 'Supervisor'])->assertCreated()->json('data.code');
        $this->assertSame('supervisor', $first);
        $this->assertSame('supervisor_2', $second);

        $this->postJson('/api/v1/roles', ['name' => 'Eksplisit', 'code' => 'finance'])->assertStatus(422)->assertJsonPath('errors.code.0', 'Kode role ini sudah dipakai.');
        $this->postJson('/api/v1/roles', ['name' => 'Eksplisit', 'code' => 'Pakai Spasi'])->assertStatus(422)->assertJsonStructure(['errors' => ['code']]);
        $this->postJson('/api/v1/roles', ['name' => 'Eksplisit', 'code' => 'kode_baru'])->assertCreated()->assertJsonPath('data.code', 'kode_baru');
    }

    public function test_create_validation(): void
    {
        $this->actAs($this->master);

        $this->postJson('/api/v1/roles', [])->assertStatus(422)->assertJsonPath('errors.name.0', 'Nama role wajib diisi.');
        $this->postJson('/api/v1/roles', ['name' => 'X', 'permissions' => ['modul_ngawur']])->assertStatus(422)->assertJsonPath('errors', ['permissions.0' => ['Kode modul tidak dikenal.']]);
    }

    // ---- Ubah

    public function test_update_changes_label_badge_description_but_never_the_code(): void
    {
        $custom = $this->makeCustomRole('lama', ['finance'], 'Nama Lama');

        $this->actAs($this->master)->patchJson('/api/v1/roles/'.$custom->id, ['name' => ' Nama Baru ', 'badge' => 'Lencana', 'code' => 'hacked'])
            ->assertOk()->assertJsonPath('data.name', 'Nama Baru')->assertJsonPath('data.badge', 'Lencana')->assertJsonPath('data.code', 'lama');

        // Role sistem boleh diganti labelnya; kodenya tetap.
        $this->patchJson('/api/v1/roles/'.$this->roleId('finance'), ['name' => 'Tim Keuangan'])
            ->assertOk()->assertJsonPath('data.name', 'Tim Keuangan')->assertJsonPath('data.code', 'finance');

        $this->patchJson('/api/v1/roles/'.$custom->id, ['name' => ''])->assertStatus(422);
    }

    // ---- Hapus

    public function test_system_role_cannot_be_deleted(): void
    {
        $this->actAs($this->master)->deleteJson('/api/v1/roles/'.$this->roleId('finance'))
            ->assertStatus(422)->assertJsonPath('code', 'system_role');
    }

    public function test_role_in_use_cannot_be_deleted(): void
    {
        $custom = $this->makeCustomRole('dipakai', ['finance'], 'Role Dipakai');
        $this->makeStaffWithRole($custom);
        $this->makeStaffWithRole($custom);

        $this->actAs($this->master)->deleteJson('/api/v1/roles/'.$custom->id)
            ->assertStatus(409)->assertJsonPath('code', 'in_use')
            ->assertJsonPath('message', 'Role "Role Dipakai" masih dipakai 2 akun. Pindahkan akun tersebut ke role lain dulu.');
        $this->assertDatabaseHas('roles', ['id' => $custom->id]);
    }

    public function test_unused_custom_role_is_deleted_with_its_matrix(): void
    {
        $custom = $this->makeCustomRole('sementara', ['finance'], 'Sementara');

        $this->actAs($this->master)->deleteJson('/api/v1/roles/'.$custom->id)->assertNoContent();

        $this->assertDatabaseMissing('roles', ['id' => $custom->id]);
        $this->assertSame(0, RolePermission::where('role_id', $custom->id)->count(), 'izin ikut terhapus (cascade)');
    }

    // ---- Matriks izin

    public function test_sync_permissions_updates_only_the_sent_modules(): void
    {
        $custom = $this->makeCustomRole('kustom', ['finance', 'active_clients']);

        $res = $this->actAs($this->master)->putJson('/api/v1/roles/'.$custom->id.'/permissions', [
            'permissions' => [
                ['module_code' => 'finance', 'allowed' => false],
                ['module_code' => 'holidays', 'allowed' => true],
            ],
        ])->assertOk();

        // finance dicabut, holidays ditambah, active_clients tidak disentuh; urut sort_order
        $this->assertSame(['active_clients', 'holidays'], $res->json('data.permissions'));
    }

    public function test_permission_change_takes_effect_immediately_for_existing_sessions(): void
    {
        $custom = $this->makeCustomRole('kustom', ['holidays']);
        $staff = $this->makeStaffWithRole($custom);
        $token = $this->loginToken($staff);

        $this->getJson('/api/v1/users', $this->bearer($token))->assertStatus(403);

        $this->actAs($this->master)->putJson('/api/v1/roles/'.$custom->id.'/permissions', [
            'permissions' => [['module_code' => 'user_management', 'allowed' => true]],
        ])->assertOk();

        $this->app['auth']->forgetGuards();
        $this->getJson('/api/v1/users', $this->bearer($token))->assertOk();
    }

    public function test_master_role_is_locked(): void
    {
        $this->actAs($this->master)->putJson('/api/v1/roles/'.$this->roleId('master').'/permissions', [
            'permissions' => [['module_code' => 'finance', 'allowed' => false]],
        ])->assertStatus(422)->assertJsonPath('code', 'role_locked');
    }

    public function test_cannot_remove_own_rbac_access(): void
    {
        $custom = $this->makeCustomRole('admin_rbac', ['rbac', 'finance']);
        $self = $this->makeStaffWithRole($custom);

        $this->actAs($self)->putJson('/api/v1/roles/'.$custom->id.'/permissions', [
            'permissions' => [['module_code' => 'rbac', 'allowed' => false]],
        ])->assertStatus(422)->assertJsonPath('code', 'cannot_remove_own_rbac');

        // Mencabut modul lain dari role sendiri tetap boleh.
        $this->putJson('/api/v1/roles/'.$custom->id.'/permissions', [
            'permissions' => [['module_code' => 'finance', 'allowed' => false]],
        ])->assertOk();
    }

    public function test_sync_validation(): void
    {
        $custom = $this->makeCustomRole('kustom', []);
        $this->actAs($this->master);

        $this->putJson('/api/v1/roles/'.$custom->id.'/permissions', [])->assertStatus(422)->assertJsonStructure(['errors' => ['permissions']]);
        $this->putJson('/api/v1/roles/'.$custom->id.'/permissions', ['permissions' => [['module_code' => 'ngawur', 'allowed' => true]]])
            ->assertStatus(422)->assertJsonPath('errors', ['permissions.0.module_code' => ['Kode modul tidak dikenal.']]);
        $this->putJson('/api/v1/roles/'.$custom->id.'/permissions', ['permissions' => [
            ['module_code' => 'finance', 'allowed' => true],
            ['module_code' => 'finance', 'allowed' => false],
        ]])->assertStatus(422);
        $this->putJson('/api/v1/roles/'.$custom->id.'/permissions', ['permissions' => [['module_code' => 'finance']]])->assertStatus(422);

        // Kamus berkunci kode modul (bentuk lama) ditolak.
        $this->putJson('/api/v1/roles/'.$custom->id.'/permissions', ['permissions' => ['finance' => true]])->assertStatus(422);
        $this->assertSame([], $this->permissionsOf('kustom'));
    }

    public function test_unknown_role_is_404(): void
    {
        $this->actAs($this->master)->getJson('/api/v1/roles/99999')->assertStatus(404);
        $this->putJson('/api/v1/roles/99999/permissions', ['permissions' => [['module_code' => 'finance', 'allowed' => true]]])->assertStatus(404);
    }
}
