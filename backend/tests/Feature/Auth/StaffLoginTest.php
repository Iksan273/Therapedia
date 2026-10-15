<?php

namespace Tests\Feature\Auth;

use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\AuthFixtures;
use Tests\TestCase;

class StaffLoginTest extends TestCase
{
    use AuthFixtures, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedFoundation();
    }

    public function test_login_returns_token_and_session_with_permission_matrix(): void
    {
        $staff = $this->makeStaff('finance');

        $res = $this->postJson('/api/v1/auth/login', ['email' => $staff->email, 'password' => self::PASSWORD])
            ->assertOk()
            ->assertJsonPath('data.token_type', 'Bearer')
            ->assertJsonPath('data.user.email', $staff->email)
            ->assertJsonPath('data.user.role.code', 'finance')
            ->assertJsonPath('data.user.is_master', false)
            ->assertJsonPath('data.user.branch.code', 'EAST')
            ->assertJsonPath('data.user.must_change_password', false)
            ->assertJsonMissingPath('data.user.password');

        // Izin = DAFTAR kode modul (bukan kamus berkunci kode modul), urut access_modules.sort_order.
        $permissions = $res->json('data.user.permissions');
        $this->assertTrue(array_is_list($permissions));
        $this->assertContains('finance', $permissions);
        $this->assertContains('weekly_calendar', $permissions);
        $this->assertNotContains('revenue', $permissions);
        $this->assertNotContains('rbac', $permissions);
        $this->assertSame(
            array_values(array_intersect(array_keys(RbacSeeder::MODULES), $permissions)),
            $permissions,
            'urutan harus mengikuti sort_order modul'
        );

        $this->assertNotEmpty($res->json('data.token'));
        $this->assertNotNull($staff->fresh()->last_login_at);
        $this->assertSame(['staff'], $staff->tokens()->first()->abilities);
    }

    public function test_master_gets_every_module_and_no_branch(): void
    {
        $master = $this->makeStaff('master', ['email' => 'master@gmail.com']);

        $res = $this->postJson('/api/v1/auth/login', ['email' => 'master@gmail.com', 'password' => self::PASSWORD])
            ->assertOk()
            ->assertJsonPath('data.user.is_master', true)
            ->assertJsonPath('data.user.branch_id', null)
            ->assertJsonPath('data.user.branch', null);

        // Master: semua modul, termasuk yang tidak ada di tabel role_permissions
        $this->assertSame(array_keys(RbacSeeder::MODULES), $res->json('data.user.permissions'));
    }

    public function test_email_is_case_insensitive_and_trimmed(): void
    {
        $staff = $this->makeStaff();

        $this->postJson('/api/v1/auth/login', ['email' => '  '.strtoupper($staff->email).' ', 'password' => self::PASSWORD])->assertOk();
    }

    public function test_failures_are_generic_and_identical_for_wrong_password_and_unknown_email(): void
    {
        $active = $this->makeStaff();
        $inactive = $this->makeStaff('admin_schedule', ['is_active' => false]);

        $wrongPassword = $this->postJson('/api/v1/auth/login', ['email' => $active->email, 'password' => 'salah123'])->assertStatus(422);
        $unknown = $this->postJson('/api/v1/auth/login', ['email' => 'tidak-ada@therapedia.test', 'password' => 'salah123'])->assertStatus(422);
        $inactiveWrongPassword = $this->postJson('/api/v1/auth/login', ['email' => $inactive->email, 'password' => 'salah123'])->assertStatus(422);

        $this->assertSame('Email atau password salah.', $wrongPassword->json('message'));
        $this->assertSame($wrongPassword->json(), $unknown->json());
        $this->assertSame($wrongPassword->json(), $inactiveWrongPassword->json());
    }

    public function test_inactive_account_with_correct_password_reports_account_inactive(): void
    {
        $inactive = $this->makeStaff('admin_schedule', ['is_active' => false]);

        $this->postJson('/api/v1/auth/login', ['email' => $inactive->email, 'password' => self::PASSWORD])
            ->assertStatus(422)
            ->assertJsonPath('code', 'account_inactive')
            ->assertJsonPath('message', 'Akun Anda tidak aktif. Hubungi admin untuk mengaktifkannya kembali.');

        $this->assertDatabaseCount('personal_access_tokens', 0);
    }

    public function test_five_failures_lock_the_email_ip_pair_even_for_correct_password(): void
    {
        $staff = $this->makeStaff();

        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/v1/auth/login', ['email' => $staff->email, 'password' => 'salah123'])->assertStatus(422);
        }

        $this->postJson('/api/v1/auth/login', ['email' => $staff->email, 'password' => self::PASSWORD])
            ->assertStatus(429)
            ->assertJsonPath('code', 'too_many_attempts')
            ->assertJsonStructure(['retry_after']);
    }

    public function test_successful_login_resets_failure_counter(): void
    {
        $staff = $this->makeStaff();

        for ($i = 0; $i < 4; $i++) {
            $this->postJson('/api/v1/auth/login', ['email' => $staff->email, 'password' => 'salah123']);
        }
        $this->postJson('/api/v1/auth/login', ['email' => $staff->email, 'password' => self::PASSWORD])->assertOk();

        // Setelah sukses, kegagalan berikutnya mulai dari nol lagi.
        for ($i = 0; $i < 4; $i++) {
            $this->postJson('/api/v1/auth/login', ['email' => $staff->email, 'password' => 'salah123'])->assertStatus(422);
        }
    }

    public function test_validation_errors_per_field(): void
    {
        $this->postJson('/api/v1/auth/login', [])
            ->assertStatus(422)
            ->assertJsonStructure(['message', 'errors' => ['email', 'password']]);
    }

    public function test_me_returns_session_and_requires_token(): void
    {
        $staff = $this->makeStaff('therapist');
        $token = $this->loginToken($staff);

        $this->getJson('/api/v1/auth/me', $this->bearer($token))
            ->assertOk()
            ->assertJsonPath('data.type', 'staff')
            ->assertJsonPath('data.user.role.code', 'therapist')
            ->assertJsonPath('data.user.permissions', ['therapist_module']);
    }

    public function test_me_without_token_is_401(): void
    {
        $this->getJson('/api/v1/auth/me')->assertStatus(401);
    }

    public function test_logout_deletes_only_the_current_token(): void
    {
        $staff = $this->makeStaff();
        $tokenA = $this->loginToken($staff);
        $tokenB = $this->loginToken($staff);

        $this->postJson('/api/v1/auth/logout', [], $this->bearer($tokenA))->assertNoContent();

        $this->assertSame(1, $staff->tokens()->count());

        // Guard meng-cache user per aplikasi; lepas agar tiap request menilai token dari awal.
        $this->app['auth']->forgetGuards();
        $this->getJson('/api/v1/auth/me', $this->bearer($tokenA))->assertStatus(401);

        $this->app['auth']->forgetGuards();
        $this->getJson('/api/v1/auth/me', $this->bearer($tokenB))->assertOk();
    }

    public function test_temporary_password_blocks_everything_except_auth_endpoints(): void
    {
        $staff = $this->makeStaff('master', ['must_change_password' => true]);
        $token = $this->loginToken($staff);

        $this->postJson('/api/v1/auth/login', ['email' => $staff->email, 'password' => self::PASSWORD])
            ->assertJsonPath('data.user.must_change_password', true);

        $this->getJson('/api/v1/clients', $this->bearer($token))
            ->assertStatus(403)
            ->assertJsonPath('code', 'must_change_password');

        $this->getJson('/api/v1/auth/me', $this->bearer($token))->assertOk();

        $this->postJson('/api/v1/auth/change-password', [
            'current_password' => self::PASSWORD,
            'password' => 'PasswordBaru123',
            'password_confirmation' => 'PasswordBaru123',
        ], $this->bearer($token))->assertNoContent();

        // Lolos middleware (bukan 403 must_change_password): daftar client kini sudah diimplementasi (M4) → 200.
        $this->getJson('/api/v1/clients', $this->bearer($token))->assertOk();
    }
}
