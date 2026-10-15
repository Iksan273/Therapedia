<?php

namespace Tests\Feature\Client;

use App\Models\Client;
use App\Models\ClientPackage;
use App\Models\Invoice;
use App\Models\Schedule;
use App\Models\User;
use App\Services\ClientStatusService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Testing\TestResponse;
use Tests\Concerns\AuthFixtures;
use Tests\Concerns\OrganizationFixtures;
use Tests\TestCase;

class ClientTransitionAndDeleteTest extends TestCase
{
    use AuthFixtures, OrganizationFixtures, RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedFoundation();
        $this->admin = $this->makeStaff('admin_inquiry');
    }

    private function go(Client $client, string $to, array $extra = []): TestResponse
    {
        return $this->actAs($this->admin)->postJson("/api/v1/clients/{$client->id}/transition", array_merge(
            ['to_status' => $to, 'version' => $client->fresh()->version],
            $extra
        ));
    }

    // ---- aturan murni (padanan domain/client.js)

    public function test_automatic_advance_only_moves_forward(): void
    {
        $s = new ClientStatusService;

        $this->assertSame('service_selected', $s->advance('inquiry', 'service_selected'));
        $this->assertSame('assessment_done', $s->advance('assessment_scheduled', 'assessment_done'));
        $this->assertSame('admitted', $s->advance('admitted', 'service_selected')); // tidak mundur
        $this->assertSame('discontinued', $s->advance('discontinued', 'assessment_scheduled')); // hasil akhir dibiarkan
        $this->assertSame('inquiry', $s->advance('inquiry', 'done_consult')); // bukan alur utama
    }

    // ---- transisi manual

    public function test_manual_transition_can_jump_anywhere_including_backwards(): void
    {
        $client = $this->makeClient(['status' => 'assessment_done', 'final_outcome' => null]);

        $this->go($client, 'inquiry')->assertOk()->assertJsonPath('data.status', 'inquiry')->assertJsonPath('data.changed', true);
        $this->go($client, 'done_consult')->assertOk()->assertJsonPath('data.status', 'done_consult')->assertJsonPath('data.final_outcome', 'done_consult');
        $this->go($client, 'service_selected')->assertOk()->assertJsonPath('data.final_outcome', null); // koreksi: outcome dikosongkan
    }

    public function test_admit_sets_join_date_once_and_creates_no_package(): void
    {
        $client = $this->makeClient();

        $first = $this->go($client, 'admitted')->assertOk()
            ->assertJsonPath('data.status', 'admitted')->assertJsonPath('data.final_outcome', 'admitted')
            ->assertJsonPath('data.credit_balance', 0)->assertJsonPath('data.frozen', true);
        $this->assertSame(now()->toDateString(), $first->json('data.date_of_join'));
        $this->assertSame(0, ClientPackage::query()->count());

        // join date asli dipertahankan saat reaktivasi
        Client::query()->whereKey($client->id)->update(['date_of_join' => '2026-01-05']);
        $this->go($client, 'discharged', ['reason' => 'moving'])->assertOk();
        $this->go($client, 'admitted')->assertOk()
            ->assertJsonPath('data.date_of_join', '2026-01-05')
            ->assertJsonPath('data.date_of_discharge', null)
            ->assertJsonPath('data.discharge_reason', null);
    }

    public function test_discharge_and_discontinue_require_reason(): void
    {
        $client = $this->makeClient(['status' => 'admitted', 'final_outcome' => 'admitted']);

        $this->go($client, 'discharged')->assertStatus(422)->assertJsonValidationErrors(['reason']);
        $this->go($client, 'discontinued', ['reason' => '  '])->assertStatus(422)->assertJsonValidationErrors(['reason']);

        $this->go($client, 'discharged', ['reason' => 'financial', 'note' => 'Pindah kota'])->assertOk()
            ->assertJsonPath('data.status', 'discharged')
            ->assertJsonPath('data.discharge_reason', 'financial')
            ->assertJsonPath('data.final_outcome', 'admitted') // discharge tidak mengubah outcome
            ->assertJsonPath('data.date_of_discharge', now()->toDateString());
        $this->assertSame('Pindah kota', $client->fresh()->discharge_note);

        $this->go($client, 'discontinued', ['reason' => 'Tidak jadi lanjut'])->assertOk()
            ->assertJsonPath('data.status', 'discontinued')
            ->assertJsonPath('data.final_outcome', 'discontinued')
            ->assertJsonPath('data.discharge_reason', 'Tidak jadi lanjut')
            ->assertJsonPath('data.date_of_discontinue', now()->toDateString())
            ->assertJsonPath('data.date_of_discharge', null);
    }

    public function test_same_status_is_noop_and_stale_version_conflicts(): void
    {
        $client = $this->makeClient(['status' => 'admitted']);

        $this->go($client, 'admitted')->assertOk()->assertJsonPath('data.changed', false)->assertJsonPath('data.version', 1);

        $this->actAs($this->admin)->postJson("/api/v1/clients/{$client->id}/transition", ['to_status' => 'inquiry', 'version' => 99])
            ->assertStatus(409)->assertJsonPath('code', 'version_conflict');
        $this->actAs($this->admin)->postJson("/api/v1/clients/{$client->id}/transition", ['to_status' => 'inquiry'])
            ->assertStatus(422)->assertJsonValidationErrors(['version']);
        $this->actAs($this->admin)->postJson("/api/v1/clients/{$client->id}/transition", ['to_status' => 'bukan-status', 'version' => 1])
            ->assertStatus(422)->assertJsonValidationErrors(['to_status']);
    }

    public function test_roster_role_can_transition_but_finance_cannot(): void
    {
        $client = $this->makeClient(['status' => 'admitted']);
        $payload = ['to_status' => 'discharged', 'reason' => 'moving', 'version' => 1];

        $this->actAs($this->makeStaff('admin_schedule'))->postJson("/api/v1/clients/{$client->id}/transition", $payload)->assertOk(); // active_clients
        $this->actAs($this->makeStaff('therapist'))->postJson("/api/v1/clients/{$client->id}/transition", ['version' => 2] + $payload)->assertStatus(403);
    }

    public function test_transition_of_other_branch_client_is_not_found(): void
    {
        $west = $this->makeClient(['branch_id' => $this->branchId('WEST')]);

        $this->actAs($this->admin)->postJson("/api/v1/clients/{$west->id}/transition", ['to_status' => 'admitted', 'version' => 1])->assertNotFound();
    }

    // ---- hapus

    public function test_only_master_can_delete_a_client(): void
    {
        $client = $this->makeClient();

        foreach (['admin_inquiry', 'manager', 'admin_schedule', 'finance'] as $role) {
            $this->actAs($this->makeStaff($role))->deleteJson("/api/v1/clients/{$client->id}")->assertStatus(403);
        }
        $this->assertDatabaseHas('clients', ['id' => $client->id]);

        $this->actAs($this->makeStaff('master'))->deleteJson("/api/v1/clients/{$client->id}")->assertNoContent();
        $this->assertDatabaseMissing('clients', ['id' => $client->id]);
        $this->actAs($this->makeStaff('master'))->deleteJson("/api/v1/clients/{$client->id}")->assertNotFound();
    }

    public function test_delete_cascades_to_all_children_without_orphans(): void
    {
        $client = $this->makeClient(['status' => 'admitted']);
        $other = $this->makeClient();
        $therapist = $this->makeStaff('therapist');

        $client->clientDocuments()->create(['type' => 'gdrive_folder', 'url' => 'https://drive.google.com/x']);
        Schedule::query()->create([
            'branch_id' => $client->branch_id, 'client_id' => $client->id, 'therapist_id' => $therapist->id,
            'type' => 'therapy', 'session_date' => now()->addDay()->toDateString(), 'start_time' => '09:00', 'end_time' => '10:00',
        ]);
        Invoice::query()->create([
            'invoice_number' => 'INV-TEST-0001', 'client_id' => $client->id, 'branch_id' => $client->branch_id, 'type_code' => 'REG',
            'package_name' => 'Regular Therapist', 'credits' => 10, 'amount' => 2500000,
        ]);

        $this->actAs($this->makeStaff('master'))->deleteJson("/api/v1/clients/{$client->id}")->assertNoContent();

        foreach (['client_documents', 'client_services', 'schedules', 'invoices', 'client_packages', 'credit_ledger'] as $table) {
            $this->assertSame(0, DB::table($table)->where('client_id', $client->id)->count(), "baris yatim di $table");
        }
        $this->assertDatabaseHas('clients', ['id' => $other->id]);
        $this->assertDatabaseHas('users', ['id' => $therapist->id]); // terapis tidak ikut terhapus
    }
}
