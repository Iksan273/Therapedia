<?php

namespace Tests\Feature\Client;

use App\Models\User;
use Database\Seeders\MasterDataSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\AuthFixtures;
use Tests\Concerns\OrganizationFixtures;
use Tests\TestCase;

class ClientServicesAndLinksTest extends TestCase
{
    use AuthFixtures, OrganizationFixtures, RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedFoundation();
        $this->seed(MasterDataSeeder::class);
        $this->admin = $this->makeStaff('admin_inquiry');
    }

    public function test_sync_services_adds_removes_and_advances_status_once(): void
    {
        $client = $this->makeClient();
        $this->actAs($this->admin);

        $this->putJson("/api/v1/clients/{$client->id}/services", ['service_codes' => ['b_ota', 'school_companion']])
            ->assertOk()
            ->assertJsonPath('data.status', 'service_selected')
            ->assertJsonCount(2, 'data.service_codes');

        $this->putJson("/api/v1/clients/{$client->id}/services", ['service_codes' => ['school_companion']])
            ->assertOk()->assertJsonPath('data.service_codes', ['school_companion']);
        $this->assertDatabaseCount('client_services', 1);
    }

    public function test_removing_all_services_does_not_move_status_backwards(): void
    {
        $client = $this->makeClient(['status' => 'assessment_scheduled']);
        $client->clientServices()->create(['service_code' => 'b_ota', 'selected_at' => now()]);
        $this->actAs($this->admin);

        $this->putJson("/api/v1/clients/{$client->id}/services", ['service_codes' => []])
            ->assertOk()->assertJsonPath('data.status', 'assessment_scheduled')->assertJsonPath('data.service_codes', []);
    }

    public function test_sync_never_moves_a_later_status_and_rejects_inactive_or_unknown_services(): void
    {
        $client = $this->makeClient(['status' => 'admitted']);
        $this->actAs($this->admin);

        $this->putJson("/api/v1/clients/{$client->id}/services", ['service_codes' => ['b_ota']])->assertOk()->assertJsonPath('data.status', 'admitted');

        $this->actAs($this->makeStaff('master'))->patchJson('/api/v1/master/services/f_ota', ['is_active' => false])->assertOk();
        $this->actAs($this->admin);
        $this->putJson("/api/v1/clients/{$client->id}/services", ['service_codes' => ['b_ota', 'f_ota']])
            ->assertStatus(422)->assertJsonValidationErrors(['service_codes']);
        $this->putJson("/api/v1/clients/{$client->id}/services", ['service_codes' => ['tidak-ada']])
            ->assertStatus(422)->assertJsonValidationErrors(['service_codes']);
        $this->putJson("/api/v1/clients/{$client->id}/services", [])->assertStatus(422)->assertJsonValidationErrors(['service_codes']);
    }

    public function test_gdrive_links_add_list_in_detail_and_delete(): void
    {
        $client = $this->makeClient();
        $this->actAs($this->admin);

        $doc = $this->postJson("/api/v1/clients/{$client->id}/gdrive-links", ['url' => 'https://drive.google.com/drive/folders/abc', 'label' => 'Rekam observasi'])
            ->assertCreated()->assertJsonPath('data.type', 'gdrive_folder')->json('data');

        $this->getJson("/api/v1/clients/{$client->id}")->assertOk()
            ->assertJsonCount(1, 'data.gdrive_links')->assertJsonPath('data.gdrive_links.0.label', 'Rekam observasi');

        $this->postJson("/api/v1/clients/{$client->id}/gdrive-links", ['url' => 'bukan-url'])->assertStatus(422)->assertJsonValidationErrors(['url']);

        $this->deleteJson("/api/v1/clients/{$client->id}/gdrive-links/{$doc['id']}")->assertNoContent();
        $this->assertDatabaseCount('client_documents', 0);
        $this->deleteJson("/api/v1/clients/{$client->id}/gdrive-links/{$doc['id']}")->assertNotFound();
    }

    public function test_gdrive_link_of_another_branch_client_is_not_found(): void
    {
        $west = $this->makeClient(['branch_id' => $this->branchId('WEST')]);
        $this->actAs($this->admin); // EAST

        $this->postJson("/api/v1/clients/{$west->id}/gdrive-links", ['url' => 'https://drive.google.com/x'])->assertNotFound();
        $this->putJson("/api/v1/clients/{$west->id}/services", ['service_codes' => ['b_ota']])->assertNotFound();
    }

    public function test_check_duplicate_matches_exact_name_and_birth_date_only(): void
    {
        $this->makeClient(['child_name' => 'Aisyah  Putri', 'date_of_birth' => '2019-03-10', 'client_code' => 'AE-00001']);
        $this->makeClient(['child_name' => 'Aisyah Putri', 'date_of_birth' => '2020-01-01', 'client_code' => 'AE-00002']);
        $this->makeClient(['child_name' => 'Aisyah', 'date_of_birth' => '2019-03-10', 'client_code' => 'AE-00003']);
        $this->actAs($this->admin);

        $res = $this->getJson('/api/v1/clients/check-duplicate?child_name='.urlencode(' aisyah putri ').'&date_of_birth=2019-03-10')->assertOk();
        $this->assertSame(['AE-00001'], collect($res->json('data.duplicates'))->pluck('client_code')->all());

        $this->getJson('/api/v1/clients/check-duplicate?child_name=Zzz&date_of_birth=2019-03-10')->assertOk()->assertJsonPath('data.duplicates', []);
        $this->getJson('/api/v1/clients/check-duplicate')->assertStatus(422)->assertJsonValidationErrors(['child_name', 'date_of_birth']);
    }
}
