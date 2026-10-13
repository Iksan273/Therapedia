<?php

namespace Tests\Feature\Auth;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\AuthFixtures;
use Tests\TestCase;

class ClientLoginTest extends TestCase
{
    use AuthFixtures, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedFoundation();
    }

    public function test_parent_logs_in_with_code_and_child_birth_date(): void
    {
        $client = $this->makeClient(['client_code' => 'AE-00006', 'date_of_birth' => '2018-05-17']);

        $this->postJson('/api/v1/auth/client-login', ['client_code' => 'ae-00006 ', 'date_of_birth' => '2018-05-17'])
            ->assertOk()
            ->assertJsonPath('data.token_type', 'Bearer')
            ->assertJsonPath('data.client.client_code', 'AE-00006')
            ->assertJsonPath('data.client.child_name', $client->child_name)
            ->assertJsonPath('data.client.branch.code', 'EAST')
            ->assertJsonPath('data.client.frozen', true)
            ->assertJsonMissingPath('data.client.date_of_birth');

        $this->assertSame(['client'], $client->tokens()->first()->abilities);
        $this->assertNotNull($client->fresh()->last_login_at);
    }

    public function test_failure_message_is_generic_for_wrong_date_and_unknown_code(): void
    {
        $this->makeClient(['client_code' => 'AE-00001']);

        $wrongDate = $this->postJson('/api/v1/auth/client-login', ['client_code' => 'AE-00001', 'date_of_birth' => '2019-01-01'])->assertStatus(422);
        $unknownCode = $this->postJson('/api/v1/auth/client-login', ['client_code' => 'ZZ-99999', 'date_of_birth' => '2018-05-17'])->assertStatus(422);

        $this->assertSame('Kode client atau tanggal lahir tidak sesuai.', $wrongDate->json('message'));
        $this->assertSame($wrongDate->json(), $unknownCode->json());
    }

    public function test_five_failures_lock_the_code_even_with_correct_birth_date(): void
    {
        $this->makeClient(['client_code' => 'AE-00001', 'date_of_birth' => '2018-05-17']);

        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/v1/auth/client-login', ['client_code' => 'AE-00001', 'date_of_birth' => '2017-0'.($i + 1).'-01'])->assertStatus(422);
        }

        $this->postJson('/api/v1/auth/client-login', ['client_code' => 'AE-00001', 'date_of_birth' => '2018-05-17'])
            ->assertStatus(429)
            ->assertJsonPath('code', 'too_many_attempts');
    }

    public function test_lockout_also_applies_to_codes_that_do_not_exist(): void
    {
        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/v1/auth/client-login', ['client_code' => 'AE-77777', 'date_of_birth' => '2018-05-17'])->assertStatus(422);
        }

        // Tidak bisa dipakai untuk menebak mana kode yang ada: kode tak terdaftar pun terkunci.
        $this->postJson('/api/v1/auth/client-login', ['client_code' => 'AE-77777', 'date_of_birth' => '2018-05-17'])->assertStatus(429);
    }

    public function test_validation_requires_iso_date(): void
    {
        $this->postJson('/api/v1/auth/client-login', ['client_code' => 'AE-00001', 'date_of_birth' => '17/05/2018'])
            ->assertStatus(422)
            ->assertJsonStructure(['errors' => ['date_of_birth']]);
    }

    public function test_me_for_client_returns_type_client(): void
    {
        $this->makeClient(['client_code' => 'AE-00002']);
        $token = $this->postJson('/api/v1/auth/client-login', ['client_code' => 'AE-00002', 'date_of_birth' => '2018-05-17'])->json('data.token');

        $this->getJson('/api/v1/auth/me', $this->bearer($token))
            ->assertOk()
            ->assertJsonPath('data.type', 'client')
            ->assertJsonPath('data.client.client_code', 'AE-00002');
    }

    public function test_client_token_cannot_reach_staff_routes(): void
    {
        $this->makeClient(['client_code' => 'AE-00003']);
        $token = $this->postJson('/api/v1/auth/client-login', ['client_code' => 'AE-00003', 'date_of_birth' => '2018-05-17'])->json('data.token');

        $this->getJson('/api/v1/branches', $this->bearer($token))->assertStatus(403);
    }

    public function test_staff_token_cannot_reach_parent_portal(): void
    {
        $token = $this->loginToken($this->makeStaff('master'));

        $this->getJson('/api/v1/portal/profile', $this->bearer($token))->assertStatus(403);
    }
}
