<?php

namespace Tests\Feature\Foundation;

use App\Exceptions\ApiException;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Tests\Concerns\AuthFixtures;
use Tests\Concerns\OrganizationFixtures;
use Tests\TestCase;

/**
 * Bentuk error JSON harus cocok dengan `ApiError` frontend (implementation_detail.md §1.2).
 * Tidak menyentuh database: rute uji didaftarkan di setUp.
 */
class ApiErrorFormatTest extends TestCase
{
    use AuthFixtures, OrganizationFixtures, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Route::middleware('api')->prefix('api/v1/_t')->group(function (): void {
            Route::get('version-conflict', fn () => throw ApiException::versionConflict());
            Route::get('in-use', fn () => throw ApiException::inUse('Layanan dipakai di 3 client. Nonaktifkan saja.'));
            Route::get('schedule-conflict', fn () => throw ApiException::conflict('schedule_conflict', 'Jadwal bentrok.', ['conflicts' => [['id' => 7]]]));
            Route::get('gone', fn () => throw ApiException::gone('expired', 'Kode kuesioner kedaluwarsa.'));
            Route::get('domain-422', fn () => throw ApiException::unprocessable('already_reverted', 'Sesi sudah pernah di-revert.'));
            Route::get('unavailable', fn () => throw ApiException::unavailable('Email OTP gagal dikirim.'));
            Route::get('validation', fn (Request $r) => $r->validate(['name' => 'required']));
            Route::get('model-not-found', fn () => throw new ModelNotFoundException);
            Route::get('authorization', fn () => throw new AuthorizationException);
            Route::get('protected', fn () => 'ok')->middleware('auth:sanctum');
            Route::get('throttled', fn () => 'ok')->middleware('throttle:1,1');
        });
    }

    public function test_version_conflict_is_409_with_code(): void
    {
        $this->getJson('/api/v1/_t/version-conflict')
            ->assertStatus(409)
            ->assertJsonPath('code', 'version_conflict')
            ->assertJsonStructure(['message', 'code']);
    }

    public function test_in_use_is_409_with_friendly_message(): void
    {
        $this->getJson('/api/v1/_t/in-use')
            ->assertStatus(409)
            ->assertJsonPath('code', 'in_use')
            ->assertJsonPath('message', 'Layanan dipakai di 3 client. Nonaktifkan saja.');
    }

    public function test_extra_payload_is_merged_into_response(): void
    {
        $this->getJson('/api/v1/_t/schedule-conflict')
            ->assertStatus(409)
            ->assertJsonPath('code', 'schedule_conflict')
            ->assertJsonPath('conflicts.0.id', 7);
    }

    public function test_gone_is_410(): void
    {
        $this->getJson('/api/v1/_t/gone')->assertStatus(410)->assertJsonPath('code', 'expired');
    }

    public function test_domain_unprocessable_is_422_with_code(): void
    {
        $this->getJson('/api/v1/_t/domain-422')->assertStatus(422)->assertJsonPath('code', 'already_reverted');
    }

    public function test_unavailable_is_503(): void
    {
        $this->getJson('/api/v1/_t/unavailable')->assertStatus(503)->assertJsonPath('message', 'Email OTP gagal dikirim.');
    }

    public function test_validation_error_has_errors_per_field(): void
    {
        $this->getJson('/api/v1/_t/validation')
            ->assertStatus(422)
            ->assertJsonPath('message', 'Data yang dikirim tidak valid.')
            ->assertJsonStructure(['message', 'errors' => ['name']]);
    }

    public function test_missing_token_is_401(): void
    {
        $this->getJson('/api/v1/_t/protected')
            ->assertStatus(401)
            ->assertJsonStructure(['message']);
    }

    public function test_authorization_failure_is_403_forbidden(): void
    {
        $this->getJson('/api/v1/_t/authorization')->assertStatus(403)->assertJsonPath('code', 'forbidden');
    }

    public function test_model_not_found_and_unknown_route_are_404_without_leaking(): void
    {
        $this->getJson('/api/v1/_t/model-not-found')->assertStatus(404)->assertExactJson(['message' => 'Data tidak ditemukan.']);
        $this->getJson('/api/v1/_t/tidak-ada')->assertStatus(404)->assertExactJson(['message' => 'Data tidak ditemukan.']);
    }

    public function test_throttle_is_429_json(): void
    {
        $this->getJson('/api/v1/_t/throttled')->assertOk();
        $this->getJson('/api/v1/_t/throttled')->assertStatus(429)->assertJsonStructure(['message']);
    }

    public function test_not_implemented_skeleton_is_still_501(): void
    {
        // Kerangka route yang belum ada use-case-nya: tetap 501 dengan code `not_implemented`.
        $this->seedFoundation();
        $this->actAs($this->makeStaff('master'))->getJson('/api/v1/schedules')->assertStatus(501)->assertJsonPath('code', 'not_implemented');
    }
}
