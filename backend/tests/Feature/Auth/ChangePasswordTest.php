<?php

namespace Tests\Feature\Auth;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\AuthFixtures;
use Tests\TestCase;

class ChangePasswordTest extends TestCase
{
    use AuthFixtures, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedFoundation();
    }

    private function payload(array $override = []): array
    {
        return array_merge([
            'current_password' => self::PASSWORD,
            'password' => 'PasswordBaru123',
            'password_confirmation' => 'PasswordBaru123',
        ], $override);
    }

    public function test_changes_password_clears_flag_and_keeps_only_current_token(): void
    {
        $staff = $this->makeStaff('admin_schedule', ['must_change_password' => true]);
        $current = $this->loginToken($staff);
        $this->loginToken($staff); // perangkat lain
        $this->assertSame(2, $staff->tokens()->count());

        $this->postJson('/api/v1/auth/change-password', $this->payload(), $this->bearer($current))->assertNoContent();

        $staff->refresh();
        $this->assertFalse($staff->must_change_password);
        $this->assertNotNull($staff->password_changed_at);
        $this->assertSame(1, $staff->tokens()->count(), 'token perangkat lain harus dihapus, token sekarang tetap');

        $this->postJson('/api/v1/auth/login', ['email' => $staff->email, 'password' => 'PasswordBaru123'])->assertOk();
        $this->postJson('/api/v1/auth/login', ['email' => $staff->email, 'password' => self::PASSWORD])->assertStatus(422);
    }

    public function test_wrong_current_password_is_422_on_that_field(): void
    {
        $token = $this->loginToken($this->makeStaff());

        $this->postJson('/api/v1/auth/change-password', $this->payload(['current_password' => 'salah123']), $this->bearer($token))
            ->assertStatus(422)
            ->assertJsonPath('errors.current_password.0', 'Password saat ini salah.');
    }

    public function test_new_password_rules(): void
    {
        $token = $this->loginToken($this->makeStaff());
        $headers = $this->bearer($token);

        $this->postJson('/api/v1/auth/change-password', $this->payload(['password' => 'Pendek1', 'password_confirmation' => 'Pendek1']), $headers)
            ->assertStatus(422)->assertJsonPath('errors.password.0', 'Password minimal 8 karakter.');

        $this->postJson('/api/v1/auth/change-password', $this->payload(['password' => 'HurufSajaPanjang', 'password_confirmation' => 'HurufSajaPanjang']), $headers)
            ->assertStatus(422)->assertJsonPath('errors.password.0', 'Password harus mengandung huruf dan angka.');

        $this->postJson('/api/v1/auth/change-password', $this->payload(['password_confirmation' => 'Beda12345']), $headers)
            ->assertStatus(422)->assertJsonPath('errors.password.0', 'Konfirmasi password tidak sama.');

        $this->postJson('/api/v1/auth/change-password', $this->payload(['password' => self::PASSWORD, 'password_confirmation' => self::PASSWORD]), $headers)
            ->assertStatus(422)->assertJsonPath('errors.password.0', 'Password baru harus berbeda dari password saat ini.');
    }

    public function test_requires_login(): void
    {
        $this->postJson('/api/v1/auth/change-password', $this->payload())->assertStatus(401);
    }
}
