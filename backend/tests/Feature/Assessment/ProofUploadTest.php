<?php

namespace Tests\Feature\Assessment;

use App\Models\AssessmentAccessCode;
use App\Models\Client;
use App\Models\Invoice;
use App\Models\MasterPackage;
use App\Models\PaymentProof;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\Concerns\AssessmentFixtures;
use Tests\Concerns\AuthFixtures;
use Tests\Concerns\OrganizationFixtures;
use Tests\TestCase;

/** Invoice asesmen otomatis saat terbit kode + unggah bukti transfer oleh ortu dari halaman kuesioner publik. */
class ProofUploadTest extends TestCase
{
    use AssessmentFixtures, AuthFixtures, OrganizationFixtures, RefreshDatabase;

    private Client $client;

    private array $f;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake();
        $this->seedFoundation();
        $this->client = $this->makeClient();
        $this->f = $this->makeCategory('SP2', 'none');
        $this->actAs($this->makeStaff('admin_inquiry'));
    }

    private function issue(array $extra = []): array
    {
        return $this->postJson("/api/v1/clients/{$this->client->id}/assessment-codes", ['category_id' => $this->f['category']->id] + $extra)->assertCreated()->json('data');
    }

    private function proof(string $code, ?UploadedFile $file = null)
    {
        return $this->post("/api/v1/public/assessments/{$code}/proof", ['file' => $file ?? UploadedFile::fake()->image('slip.jpg')], ['Accept' => 'application/json']);
    }

    public function test_only_assessment_packages_are_selectable_and_set_invoice_amount(): void
    {
        $reg = MasterPackage::create(['code' => 'pkg-reg', 'invoice_code' => 'REG', 'name' => 'Regular Therapist', 'credits' => 10, 'price' => 2500000, 'leave_quota' => 3, 'is_active' => true]);
        $asm = MasterPackage::create(['code' => 'pkg-asm', 'invoice_code' => 'ASM', 'name' => 'Paket Asesmen', 'credits' => 0, 'price' => 750000, 'leave_quota' => 0, 'is_assessment' => true, 'is_active' => true]);

        // paket non-asesmen ditolak
        $this->postJson("/api/v1/clients/{$this->client->id}/assessment-codes", ['category_id' => $this->f['category']->id, 'master_package_id' => $reg->id])
            ->assertUnprocessable()->assertJsonValidationErrors('master_package_id');
        $this->assertSame(0, Invoice::withoutGlobalScopes()->count());

        $code = $this->issue(['master_package_id' => $asm->id]);

        $invoice = Invoice::withoutGlobalScopes()->where('assessment_access_code_id', $code['id'])->firstOrFail();
        $this->assertSame(750000, (int) $invoice->amount);
        $this->assertNull($invoice->master_package_id); // asesmen tidak membuat paket kredit
        $this->assertSame('ASM', $invoice->type_code);
        $this->assertStringStartsWith('INV-ASM-', $invoice->invoice_number);
        $this->assertSame('Assessment Kuesioner SP2 — Paket Asesmen', $invoice->package_name);
        $this->assertSame('unpaid', $invoice->status);
        $this->assertSame(0, (int) $invoice->credits);

        // daftar kode memuat ringkasan invoice
        $row = $this->getJson("/api/v1/clients/{$this->client->id}/assessment-codes")->assertOk()->json('data.0');
        $this->assertSame($invoice->invoice_number, $row['invoice']['invoice_number']);
        $this->assertSame(0, $row['invoice']['proof_upload_count']);

        // paket asesmen nonaktif ditolak
        $asm->update(['is_active' => false]);
        $this->postJson("/api/v1/clients/{$this->client->id}/assessment-codes", ['category_id' => $this->f['category']->id, 'master_package_id' => $asm->id])->assertUnprocessable();
    }

    public function test_parent_uploads_proof_and_form_opens(): void
    {
        $pkg = $this->makeAssessmentPackage();
        $code = $this->issue(['master_package_id' => $pkg->id]);
        $url = "/api/v1/public/assessments/{$code['code']}";

        $this->getJson($url)->assertForbidden()->assertJsonPath('code', 'proof_required');

        $this->proof($code['code'])->assertCreated()->assertJsonPath('data.proof_upload_count', 1)->assertJsonPath('data.remaining_uploads', 3);

        $invoice = Invoice::withoutGlobalScopes()->where('assessment_access_code_id', $code['id'])->firstOrFail();
        $this->assertSame('unpaid', $invoice->status); // status tidak berubah
        $this->assertDatabaseHas('payment_proofs', ['invoice_id' => $invoice->id, 'uploaded_by_type' => 'client', 'uploaded_by_id' => $this->client->id, 'file_name' => 'slip.jpg']);
        $this->assertDatabaseHas('invoice_logs', ['invoice_id' => $invoice->id, 'action' => 'proof_uploaded']);
        Storage::assertExists(PaymentProof::first()->file_path);

        $this->getJson($url)->assertOk();
        $this->getJson("/api/v1/clients/{$this->client->id}/assessment-codes")->assertJsonPath('data.0.invoice.proof_upload_count', 1);
    }

    public function test_reupload_limit_is_four(): void
    {
        $code = $this->issue(['master_package_id' => $this->makeAssessmentPackage()->id]);

        foreach (range(1, 4) as $i) {
            $this->proof($code['code'], UploadedFile::fake()->create("slip{$i}.pdf", 50, 'application/pdf'))->assertCreated()->assertJsonPath('data.proof_upload_count', $i);
        }
        $this->proof($code['code'])->assertUnprocessable()->assertJsonPath('code', 'proof_limit_reached');
        $this->assertSame(4, PaymentProof::count());
    }

    public function test_validation_and_edge_cases(): void
    {
        $code = $this->issue(['master_package_id' => $this->makeAssessmentPackage()->id]);

        $this->proof($code['code'], UploadedFile::fake()->create('virus.exe', 10, 'application/octet-stream'))->assertUnprocessable()->assertJsonValidationErrors('file');
        $this->proof($code['code'], UploadedFile::fake()->create('besar.pdf', 6000, 'application/pdf'))->assertUnprocessable()->assertJsonValidationErrors('file');
        $this->proof('SP2-NOPE00')->assertNotFound();
        $this->assertSame(0, PaymentProof::count());

        // kode gratis (tanpa invoice) -> tidak ada yang perlu diunggah
        $free = $this->issue(['with_invoice' => false]);
        $this->proof($free['code'])->assertStatus(409)->assertJsonPath('code', 'proof_not_needed');

        // invoice sudah lunas -> tidak menerima bukti
        Invoice::withoutGlobalScopes()->where('assessment_access_code_id', $code['id'])->update(['status' => 'paid']);
        $this->proof($code['code'])->assertStatus(409)->assertJsonPath('code', 'proof_not_needed');
    }

    public function test_cannot_upload_after_submitted(): void
    {
        $code = $this->issue(['with_invoice' => false]);
        AssessmentAccessCode::whereKey($code['id'])->update(['status' => 'submitted']);

        $this->proof($code['code'])->assertStatus(409)->assertJsonPath('code', 'already_submitted');
    }
}
