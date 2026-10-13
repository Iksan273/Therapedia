<?php

namespace Tests\Concerns;

use App\Models\Branch;
use App\Models\Role;
use App\Models\RolePermission;
use App\Models\User;
use Database\Seeders\RbacSeeder;
use Laravel\Sanctum\Sanctum;

/** Data uji M2 (user, role, cabang). Dipakai bersama AuthFixtures. */
trait OrganizationFixtures
{
    /** Masuk sebagai staf (ability `staff`), tanpa lewat endpoint login. */
    protected function actAs(User $user): static
    {
        $this->app['auth']->forgetGuards();
        Sanctum::actingAs($user, ['staff']);

        return $this;
    }

    protected function branchId(string $code): int
    {
        return (int) Branch::where('code', $code)->value('id');
    }

    /** Role kustom dengan modul tertentu (modul lain = tidak diizinkan). */
    protected function makeCustomRole(string $code, array $allowedModules, string $name = 'Role Uji'): Role
    {
        $role = Role::create(['code' => $code, 'name' => $name, 'is_system' => false]);

        foreach (array_keys(RbacSeeder::MODULES) as $module) {
            RolePermission::query()->insert([
                'role_id' => $role->id,
                'module_code' => $module,
                'allowed' => in_array($module, $allowedModules, true),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        return $role;
    }

    /** Staf dengan role kustom (mis. pengelola akun satu cabang). */
    protected function makeStaffWithRole(Role $role, ?string $branchCode = 'EAST', array $overrides = []): User
    {
        static $n = 0;
        $n++;

        return User::create(array_merge([
            'role_id' => $role->id,
            'branch_id' => $branchCode === null ? null : $this->branchId($branchCode),
            'name' => 'Pengelola '.$n,
            'email' => "pengelola{$n}@therapedia.test",
            'password' => self::PASSWORD,
            'must_change_password' => false,
            'is_active' => true,
        ], $overrides));
    }

    protected function roleId(string $code): int
    {
        return (int) Role::where('code', $code)->value('id');
    }
}
