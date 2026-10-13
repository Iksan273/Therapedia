<?php

namespace Tests\Feature\Auth;

use App\Mail\PasswordOtpMail;
use App\Models\PasswordResetOtp;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Routing\Middleware\ThrottleRequests;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use RuntimeException;
use Tests\Concerns\AuthFixtures;
use Tests\TestCase;

class PasswordOtpTest extends TestCase
{
    use AuthFixtures, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedFoundation();
    }

    /** Minta OTP lalu ambil kodenya dari email yang "terkirim". */
    private function requestOtp(string $email): string
    {
        $this->postJson('/api/v1/auth/forgot-password', ['email' => $email])->assertNoContent();

        $otp = null;
        Mail::assertSent(PasswordOtpMail::class, function (PasswordOtpMail $mail) use (&$otp, $email) {
            if ($mail->hasTo($email)) {
                $otp = $mail->otp;
            }

            return $mail->hasTo($email);
        });

        return $otp;
    }

    public function test_request_sends_one_email_and_stores_only_a_hash(): void
    {
        Mail::fake();
        $staff = $this->makeStaff();

        $otp = $this->requestOtp($staff->email);

        Mail::assertSent(PasswordOtpMail::class, 1);
        $this->assertMatchesRegularExpression('/^\d{6}$/', $otp);

        $row = PasswordResetOtp::where('user_id', $staff->id)->sole();
        $this->assertNotSame($otp, $row->otp_hash);
        $this->assertTrue(Hash::check($otp, $row->otp_hash));
        $this->assertSame(0, $row->attempts);
        $this->assertEqualsWithDelta(10 * 60, now()->diffInSeconds($row->expires_at, false), 5);
    }

    public function test_unknown_or_inactive_email_gets_same_generic_response_without_email(): void
    {
        Mail::fake();
        $inactive = $this->makeStaff('admin_schedule', ['is_active' => false]);

        $this->postJson('/api/v1/auth/forgot-password', ['email' => 'tidak-ada@therapedia.test'])->assertNoContent();
        $this->postJson('/api/v1/auth/forgot-password', ['email' => $inactive->email])->assertNoContent();

        Mail::assertNothingSent();
        $this->assertSame(0, PasswordResetOtp::count());
    }

    public function test_new_request_invalidates_the_previous_otp(): void
    {
        Mail::fake();
        $staff = $this->makeStaff();

        $first = $this->requestOtp($staff->email);
        $this->postJson('/api/v1/auth/forgot-password', ['email' => $staff->email])->assertNoContent();

        $this->postJson('/api/v1/auth/reset-password', ['email' => $staff->email, 'otp' => $first, 'password' => 'PasswordBaru123'])
            ->assertStatus(422)->assertJsonPath('message', 'Kode OTP salah atau sudah kedaluwarsa.');
    }

    public function test_request_is_throttled_per_email(): void
    {
        // Yang diuji limiter bisnis (3 per email); throttle rute (5/menit per IP) dimatikan agar tidak ikut terhitung.
        $this->withoutMiddleware(ThrottleRequests::class);
        Mail::fake();
        $staff = $this->makeStaff();

        for ($i = 0; $i < 3; $i++) {
            $this->postJson('/api/v1/auth/forgot-password', ['email' => $staff->email])->assertNoContent();
        }

        $this->postJson('/api/v1/auth/forgot-password', ['email' => $staff->email])
            ->assertStatus(429)->assertJsonPath('code', 'too_many_attempts');

        // Email yang tidak terdaftar ikut dihitung (tidak membocorkan akun).
        for ($i = 0; $i < 3; $i++) {
            $this->postJson('/api/v1/auth/forgot-password', ['email' => 'x@therapedia.test'])->assertNoContent();
        }
        $this->postJson('/api/v1/auth/forgot-password', ['email' => 'x@therapedia.test'])->assertStatus(429);
    }

    public function test_smtp_failure_is_503_and_otp_row_is_removed(): void
    {
        $staff = $this->makeStaff();
        Mail::shouldReceive('to')->once()->andThrow(new RuntimeException('SMTP down'));

        $this->postJson('/api/v1/auth/forgot-password', ['email' => $staff->email])
            ->assertStatus(503)
            ->assertJsonStructure(['message']);

        $this->assertSame(0, PasswordResetOtp::count(), 'OTP yang tidak terkirim tidak boleh tersisa');
    }

    public function test_reset_with_correct_otp_changes_password_and_revokes_tokens(): void
    {
        Mail::fake();
        $staff = $this->makeStaff('admin_schedule', ['must_change_password' => true]);
        $this->loginToken($staff);
        $otp = $this->requestOtp($staff->email);

        $this->postJson('/api/v1/auth/reset-password', ['email' => $staff->email, 'otp' => $otp, 'password' => 'PasswordBaru123'])->assertNoContent();

        $staff->refresh();
        $this->assertFalse($staff->must_change_password);
        $this->assertSame(0, $staff->tokens()->count(), 'semua token harus dihapus');
        $this->postJson('/api/v1/auth/login', ['email' => $staff->email, 'password' => 'PasswordBaru123'])->assertOk();

        // OTP hanya sekali pakai.
        $this->postJson('/api/v1/auth/reset-password', ['email' => $staff->email, 'otp' => $otp, 'password' => 'LainLagi12345'])->assertStatus(422);
    }

    public function test_wrong_otp_is_422_and_five_wrong_attempts_burn_the_otp(): void
    {
        $this->withoutMiddleware(ThrottleRequests::class); // uji batas percobaan OTP, bukan throttle rute
        Mail::fake();
        $staff = $this->makeStaff();
        $otp = $this->requestOtp($staff->email);
        $wrong = $otp === '000000' ? '111111' : '000000';

        for ($i = 0; $i < 4; $i++) {
            $this->postJson('/api/v1/auth/reset-password', ['email' => $staff->email, 'otp' => $wrong, 'password' => 'PasswordBaru123'])
                ->assertStatus(422)->assertJsonPath('message', 'Kode OTP salah atau sudah kedaluwarsa.');
        }
        $this->assertSame(4, PasswordResetOtp::where('user_id', $staff->id)->value('attempts'));

        // Percobaan ke-5 salah: OTP hangus.
        $this->postJson('/api/v1/auth/reset-password', ['email' => $staff->email, 'otp' => $wrong, 'password' => 'PasswordBaru123'])
            ->assertStatus(422)->assertJsonPath('message', 'Kode OTP sudah tidak berlaku. Minta kode baru.');

        // Kode yang benar pun sudah tidak diterima.
        $this->postJson('/api/v1/auth/reset-password', ['email' => $staff->email, 'otp' => $otp, 'password' => 'PasswordBaru123'])
            ->assertStatus(422)->assertJsonPath('message', 'Kode OTP sudah tidak berlaku. Minta kode baru.');

        $this->assertTrue(Hash::check(self::PASSWORD, $staff->fresh()->password), 'password tidak boleh berubah');
    }

    public function test_expired_otp_is_rejected(): void
    {
        Mail::fake();
        $staff = $this->makeStaff();
        $otp = $this->requestOtp($staff->email);

        $this->travel(11)->minutes();

        $this->postJson('/api/v1/auth/reset-password', ['email' => $staff->email, 'otp' => $otp, 'password' => 'PasswordBaru123'])
            ->assertStatus(422)->assertJsonPath('message', 'Kode OTP salah atau sudah kedaluwarsa.');
    }

    public function test_unknown_email_on_reset_gets_same_generic_error(): void
    {
        $this->postJson('/api/v1/auth/reset-password', ['email' => 'tidak-ada@therapedia.test', 'otp' => '123456', 'password' => 'PasswordBaru123'])
            ->assertStatus(422)->assertJsonPath('message', 'Kode OTP salah atau sudah kedaluwarsa.');
    }

    public function test_weak_new_password_is_rejected_without_consuming_the_otp(): void
    {
        Mail::fake();
        $staff = $this->makeStaff();
        $otp = $this->requestOtp($staff->email);

        $this->postJson('/api/v1/auth/reset-password', ['email' => $staff->email, 'otp' => $otp, 'password' => 'pendek'])
            ->assertStatus(422)->assertJsonStructure(['errors' => ['password']]);

        $this->postJson('/api/v1/auth/reset-password', ['email' => $staff->email, 'otp' => $otp, 'password' => 'PasswordBaru123'])->assertNoContent();
    }

    public function test_otp_must_be_six_digits(): void
    {
        $this->postJson('/api/v1/auth/reset-password', ['email' => 'a@b.test', 'otp' => '12ab', 'password' => 'PasswordBaru123'])
            ->assertStatus(422)->assertJsonPath('errors.otp.0', 'Kode OTP terdiri dari 6 angka.');
    }

    public function test_email_content_has_logo_otp_and_security_notice(): void
    {
        $mail = new PasswordOtpMail('Dewi Lestari', '482915', 10, '203.0.113.7');

        $html = $mail->render();
        $this->assertStringContainsString('Therapedia', $html);
        $this->assertStringContainsString('Dewi Lestari', $html);
        foreach (['4', '8', '2', '9', '1', '5'] as $digit) {
            $this->assertStringContainsString('>'.$digit.'<', preg_replace('/\s+/', '', $html));
        }
        $this->assertStringContainsString('10 menit', $html);
        $this->assertStringContainsString('Jaga kerahasiaan kode ini', $html);
        $this->assertStringContainsString('203.0.113.7', $html);
        $this->assertStringContainsString('data:image/png;base64,', $html, 'logo tertanam pada pratinjau');

        $mail->assertSeeInText('482915');
        $mail->assertSeeInText('Jangan bagikan kepada siapa pun');
    }
}
