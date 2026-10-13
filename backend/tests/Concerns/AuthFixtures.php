<?php

namespace Tests\Concerns;

use App\Models\Branch;
use App\Models\Client;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\BranchSeeder;
use Database\Seeders\RbacSeeder;

/** Data uji auth: cabang + role + matriks RBAC dari seeder wajib, lalu akun/client dibuat per test. */
trait AuthFixtures
{
    public const PASSWORD = 'Passw0rd2026';

    protected function seedFoundation(): void
    {
        $this->seed([BranchSeeder::class, RbacSeeder::class]);
    }

    protected function makeStaff(string $role = 'admin_schedule', array $overrides = []): User
    {
        static $n = 0;
        $n++;

        return User::create(array_merge([
            'role_id' => Role::where('code', $role)->value('id'),
            'branch_id' => $role === 'master' ? null : Branch::where('code', 'EAST')->value('id'),
            'name' => 'Staf '.$n,
            'email' => "staf{$n}@therapedia.test",
            'password' => self::PASSWORD,
            'must_change_password' => false,
            'is_active' => true,
        ], $overrides));
    }

    protected function makeClient(array $overrides = []): Client
    {
        static $n = 0;
        $n++;

        return Client::create(array_merge([
            'client_code' => sprintf('AE-%05d', $n),
            'branch_id' => Branch::where('code', 'EAST')->value('id'),
            'child_name' => 'Anak '.$n,
            'gender' => 'male',
            'date_of_birth' => '2018-05-17',
            'parent_name' => 'Ortu '.$n,
            'parent_phone' => '081234567890',
        ], $overrides));
    }

    protected function bearer(string $token): array
    {
        return ['Authorization' => 'Bearer '.$token];
    }

    protected function loginToken(User $user, string $password = self::PASSWORD): string
    {
        return $this->postJson('/api/v1/auth/login', ['email' => $user->email, 'password' => $password])
            ->assertOk()
            ->json('data.token');
    }
}
