<?php

namespace Tests\Feature\Assessment;

use App\Models\AssessmentAccessCode;
use App\Models\AssessmentDraft;
use App\Models\Client;
use App\Models\Invoice;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\AssessmentFixtures;
use Tests\Concerns\AuthFixtures;
use Tests\Concerns\OrganizationFixtures;
use Tests\TestCase;

class AccessCodeTest extends TestCase
{
    use AssessmentFixtures, AuthFixtures, OrganizationFixtures, RefreshDatabase;

    private Client $client;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedFoundation();
        $this->actAs($this->makeStaff('admin_inquiry'));
        $this->client = $this->makeClient();
    }

    public function test_issue_code_with_invoice_advances_client_status(): void
    {
        $f = $this->makeCategory();
        $this->makeAssessmentPackage(750000);

        $res = $this->postJson("/api/v1/clients/{$this->client->id}/assessment-codes", ['category_id' => $f['category']->id, 'validity_days' => 14])
            ->assertCreated()->assertJsonPath('data.status', 'issued')->assertJsonPath('data.question_count', 4)->assertJsonPath('data.invoice_required', true);

        $this->assertMatchesRegularExpression('/^SP2-[A-HJ-NP-Z2-9]{6}$/', $res->json('data.code'));
        $this->assertSame('assessment_scheduled', $this->client->fresh()->status);

        $invoice = Invoice::withoutGlobalScopes()->where('assessment_access_code_id', $res->json('data.id'))->firstOrFail();
        $this->assertSame('unpaid', $invoice->status);
        $this->assertSame(750000, (int) $invoice->amount);
        $this->assertStringStartsWith('INV-ASM-', $invoice->invoice_number);
        $this->assertDatabaseHas('invoice_logs', ['invoice_id' => $invoice->id, 'action' => 'issued']);
        $this->assertNotNull(AssessmentAccessCode::first()->expires_at);
    }

    public function test_issue_without_invoice_and_without_package(): void
    {
        $f = $this->makeCategory();

        // tanpa paket asesmen aktif, terbit dengan invoice ditolak
        $this->postJson("/api/v1/clients/{$this->client->id}/assessment-codes", ['category_id' => $f['category']->id])->assertUnprocessable()->assertJsonValidationErrors('master_package_id');

        $this->postJson("/api/v1/clients/{$this->client->id}/assessment-codes", ['category_id' => $f['category']->id, 'with_invoice' => false])
            ->assertCreated()->assertJsonPath('data.invoice_required', false)->assertJsonPath('data.expires_at', null);
        $this->assertSame(0, Invoice::withoutGlobalScopes()->count());
    }

    public function test_status_never_moves_backwards_and_inactive_category_rejected(): void
    {
        $f = $this->makeCategory();
        $this->client->update(['status' => 'assessment_done']);

        $this->postJson("/api/v1/clients/{$this->client->id}/assessment-codes", ['category_id' => $f['category']->id, 'with_invoice' => false])->assertCreated();
        $this->assertSame('assessment_done', $this->client->fresh()->status);

        $f['category']->update(['is_active' => false]);
        $this->postJson("/api/v1/clients/{$this->client->id}/assessment-codes", ['category_id' => $f['category']->id, 'with_invoice' => false])->assertUnprocessable();
    }

    public function test_list_for_client_and_awaiting_queue(): void
    {
        $f = $this->makeCategory();
        $this->postJson("/api/v1/clients/{$this->client->id}/assessment-codes", ['category_id' => $f['category']->id, 'with_invoice' => false])->assertCreated();
        $other = $this->makeClient(['child_name' => 'Budi Santoso']);
        $this->postJson("/api/v1/clients/{$other->id}/assessment-codes", ['category_id' => $f['category']->id, 'with_invoice' => false])->assertCreated();

        $this->getJson("/api/v1/clients/{$this->client->id}/assessment-codes")->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.category.name', 'Kuesioner SP2');
        $this->getJson('/api/v1/assessment-codes?awaiting=1')->assertOk()->assertJsonPath('meta.total', 2)->assertJsonPath('data.0.client.child_name', 'Budi Santoso');
        $this->getJson('/api/v1/assessment-codes?q=Bud')->assertOk()->assertJsonPath('meta.total', 1);
    }

    public function test_delete_code_rules(): void
    {
        $f = $this->makeCategory();
        $this->makeAssessmentPackage();
        $id = $this->postJson("/api/v1/clients/{$this->client->id}/assessment-codes", ['category_id' => $f['category']->id])->json('data.id');

        // draft ada -> tolak
        AssessmentDraft::create(['access_code_id' => $id, 'answers' => [], 'started_at' => now()]);
        $this->deleteJson("/api/v1/assessment-codes/{$id}")->assertStatus(409)->assertJsonPath('code', 'draft_exists');
        AssessmentDraft::query()->delete();

        // kode belum terisi: terhapus beserta invoice unpaid-nya
        $this->deleteJson("/api/v1/assessment-codes/{$id}")->assertNoContent();
        $this->assertSame(0, Invoice::withoutGlobalScopes()->count());

        // submitted -> tolak
        $code = AssessmentAccessCode::create(['code' => 'SP2-ZZZZZZ', 'client_id' => $this->client->id, 'category_id' => $f['category']->id, 'status' => 'submitted', 'issued_at' => now(), 'submitted_at' => now()]);
        $this->deleteJson("/api/v1/assessment-codes/{$code->id}")->assertStatus(409)->assertJsonPath('code', 'already_submitted');
    }

    public function test_other_branch_client_is_404_and_roles_without_module_forbidden(): void
    {
        $f = $this->makeCategory();
        $west = $this->makeClient(['branch_id' => $this->branchId('WEST')]);

        $this->getJson("/api/v1/clients/{$west->id}/assessment-codes")->assertNotFound();
        $this->postJson("/api/v1/clients/{$west->id}/assessment-codes", ['category_id' => $f['category']->id, 'with_invoice' => false])->assertNotFound();
        $this->getJson("/api/v1/clients/{$west->id}/assessment-responses")->assertNotFound();

        $this->actAs($this->makeStaff('finance'));
        $this->getJson("/api/v1/clients/{$this->client->id}/assessment-codes")->assertForbidden();
    }
}
