<?php

namespace Tests\Feature\Finance;

use App\Models\Client;
use App\Models\Invoice;
use App\Models\PaymentProof;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\Concerns\AssessmentFixtures;
use Tests\Concerns\AuthFixtures;
use Tests\Concerns\OrganizationFixtures;
use Tests\TestCase;

/** Finance tahap awal: daftar "Menunggu Pembayaran", unggah/lihat bukti, dan Tandai Lunas KHUSUS invoice asesmen. */
class AssessmentInvoiceFinanceTest extends TestCase
{
    use AssessmentFixtures, AuthFixtures, OrganizationFixtures, RefreshDatabase;

    private User $inquiry;

    private User $finance;

    private Client $client;

    private array $f;

    private int $packageId;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake();
        $this->seedFoundation();
        $this->inquiry = $this->makeStaff('admin_inquiry');
        $this->finance = $this->makeStaff('finance');
        $this->client = $this->makeClient(['child_name' => 'Kenzo Wirawan', 'parent_name' => 'Hendra Wirawan']);
        $this->f = $this->makeCategory('SP2', 'none');
        $this->packageId = $this->makeAssessmentPackage(750000)->id;
    }

    /** Terbitkan kode berinvoice (sebagai admin inquiry) lalu kembali sebagai Finance. */
    private function issueInvoice(?Client $client = null): Invoice
    {
        $client ??= $this->client;
        $res = $this->actAs($this->inquiry)->postJson("/api/v1/clients/{$client->id}/assessment-codes", ['category_id' => $this->f['category']->id, 'master_package_id' => $this->packageId])->assertCreated();
        $this->actAs($this->finance);

        return Invoice::withoutGlobalScopes()->where('assessment_access_code_id', $res->json('data.id'))->firstOrFail();
    }

    private function upload(Invoice $invoice, ?UploadedFile $file = null)
    {
        return $this->post("/api/v1/invoices/{$invoice->id}/proof", ['file' => $file ?? UploadedFile::fake()->image('slip.jpg')], ['Accept' => 'application/json']);
    }

    public function test_pending_queue_lists_unpaid_assessment_invoices_with_search_and_pagination(): void
    {
        $a = $this->issueInvoice();
        $other = $this->makeClient(['child_name' => 'Zahra Farzana', 'parent_name' => 'Budi']);
        $b = $this->issueInvoice($other);
        $b->update(['status' => 'paid']);

        $res = $this->getJson('/api/v1/invoices?status[]=unpaid&type=assessment')->assertOk()->assertJsonPath('meta.total', 1);
        $row = $res->json('data.0');
        $this->assertSame($a->invoice_number, $row['invoice_number']);
        $this->assertSame('assessment', $row['invoice_type']);
        $this->assertSame(750000, $row['amount']);
        $this->assertSame('Kenzo Wirawan', $row['client']['child_name']);
        $this->assertNotNull($row['assessment_code']);
        $this->assertFalse($row['has_proof']);
        $this->assertSame($a->version, $row['version']);

        // pencarian: nama anak (awal kata), nama ortu, kode client, nomor invoice
        $this->getJson('/api/v1/invoices?status[]=unpaid&q=Kenz')->assertJsonPath('meta.total', 1);
        $this->getJson('/api/v1/invoices?status[]=unpaid&q=hendra')->assertJsonPath('meta.total', 1);
        $this->getJson('/api/v1/invoices?status[]=unpaid&q='.$this->client->client_code)->assertJsonPath('meta.total', 1);
        $this->getJson('/api/v1/invoices?status[]=unpaid&q='.$a->invoice_number)->assertJsonPath('meta.total', 1);
        $this->getJson('/api/v1/invoices?status[]=unpaid&q=Zahra')->assertJsonPath('meta.total', 0); // yang itu sudah lunas
        $this->getJson('/api/v1/invoices?status[]=paid&q=Zahra')->assertJsonPath('meta.total', 1);

        // semua status
        $this->getJson('/api/v1/invoices?type=assessment')->assertJsonPath('meta.total', 2)->assertJsonPath('meta.per_page', 10);
    }

    public function test_only_finance_module_can_access_and_branch_scope_applies(): void
    {
        $invoice = $this->issueInvoice();

        foreach ([['getJson', '/api/v1/invoices'], ['getJson', "/api/v1/invoices/{$invoice->id}"], ['postJson', "/api/v1/invoices/{$invoice->id}/verify"]] as [$method, $url]) {
            $this->actAs($this->inquiry)->{$method}($url, $method === 'postJson' ? ['version' => 1] : [])->assertForbidden();
        }

        // Finance cabang lain tidak melihat invoice cabang ini
        $west = $this->makeStaff('finance', ['branch_id' => $this->branchId('WEST')]);
        $this->actAs($west)->getJson('/api/v1/invoices?status[]=unpaid')->assertOk()->assertJsonPath('meta.total', 0);
        $this->actAs($west)->getJson("/api/v1/invoices/{$invoice->id}")->assertNotFound();
        $this->actAs($west)->postJson("/api/v1/invoices/{$invoice->id}/verify", ['version' => $invoice->version])->assertNotFound();
    }

    public function test_finance_uploads_proof_views_file_and_status_stays_unpaid(): void
    {
        $invoice = $this->issueInvoice();

        $this->upload($invoice, UploadedFile::fake()->createWithContent('mutasi.pdf', '%PDF-MUTASI'))->assertCreated()
            ->assertJsonPath('data.proof_upload_count', 1)->assertJsonPath('data.has_proof', true)->assertJsonPath('data.status', 'unpaid')
            ->assertJsonPath('data.proofs.0.file_name', 'mutasi.pdf')->assertJsonPath('data.proofs.0.uploaded_by_type', 'user');
        $this->assertDatabaseHas('invoice_logs', ['invoice_id' => $invoice->id, 'action' => 'proof_uploaded']);

        // file bukti: stream tanpa Content-Disposition (tampil di penampil, bukan unduhan)
        $proof = PaymentProof::firstOrFail();
        $file = $this->get("/api/v1/invoices/{$invoice->id}/proofs/{$proof->id}/file")->assertOk();
        $this->assertSame('%PDF-MUTASI', $file->streamedContent());
        $this->assertSame('application/pdf', $file->headers->get('Content-Type'));
        $this->assertNull($file->headers->get('Content-Disposition'));

        // Finance tidak dibatasi 4x (batas 4x hanya untuk ortu)
        foreach (range(1, 5) as $i) {
            $this->upload($invoice)->assertCreated();
        }
        $this->assertSame(6, (int) $invoice->fresh()->proof_upload_count);

        // daftar memuat last_proof_id; detail memuat semua bukti
        $row = $this->getJson('/api/v1/invoices?status[]=unpaid')->json('data.0');
        $this->assertSame(PaymentProof::max('id'), $row['last_proof_id']);
        $this->assertCount(6, $this->getJson("/api/v1/invoices/{$invoice->id}")->json('data.proofs'));
    }

    public function test_proof_upload_validation_and_void_and_wrong_invoice(): void
    {
        $invoice = $this->issueInvoice();

        $this->upload($invoice, UploadedFile::fake()->create('virus.exe', 10, 'application/octet-stream'))->assertUnprocessable()->assertJsonValidationErrors('file');
        $this->upload($invoice, UploadedFile::fake()->create('besar.pdf', 6000, 'application/pdf'))->assertUnprocessable();
        $this->assertSame(0, PaymentProof::count());

        // bukti paid masih boleh ditambah; void ditolak
        $invoice->update(['status' => 'paid']);
        $this->upload($invoice)->assertCreated();
        $invoice->update(['status' => 'void']);
        $this->upload($invoice)->assertUnprocessable()->assertJsonPath('code', 'invoice_void');

        // file bukti invoice lain / tidak ada -> 404
        $other = $this->issueInvoice($this->makeClient());
        $proofId = PaymentProof::first()->id;
        $this->get("/api/v1/invoices/{$other->id}/proofs/{$proofId}/file")->assertNotFound();
        $this->get("/api/v1/invoices/{$invoice->id}/proofs/99999/file")->assertNotFound();
    }

    public function test_verify_marks_assessment_invoice_paid_and_opens_questionnaire_without_proof(): void
    {
        $invoice = $this->issueInvoice();
        $code = $invoice->assessmentAccessCode()->value('code');

        // belum ada bukti: kuesioner terkunci
        $this->getJson("/api/v1/public/assessments/{$code}")->assertForbidden()->assertJsonPath('code', 'proof_required');

        $this->postJson("/api/v1/invoices/{$invoice->id}/verify", ['version' => $invoice->version])->assertOk()
            ->assertJsonPath('data.status', 'paid')->assertJsonPath('data.verified_at', fn ($v) => $v !== null)->assertJsonPath('data.paid_at', fn ($v) => $v !== null);
        $fresh = $invoice->fresh();
        $this->assertSame('paid', $fresh->status);
        $this->assertSame($this->finance->id, (int) $fresh->verified_by);
        $this->assertDatabaseHas('invoice_logs', ['invoice_id' => $invoice->id, 'action' => 'verified', 'actor_id' => $this->finance->id]);

        // lunas: kuesioner terbuka walau ortu tidak pernah mengunggah bukti
        $this->getJson("/api/v1/public/assessments/{$code}")->assertOk();
    }

    public function test_verify_rules_version_status_and_type(): void
    {
        $invoice = $this->issueInvoice();

        $this->postJson("/api/v1/invoices/{$invoice->id}/verify", [])->assertUnprocessable(); // version wajib
        $this->postJson("/api/v1/invoices/{$invoice->id}/verify", ['version' => $invoice->version + 5])->assertStatus(409)->assertJsonPath('code', 'version_conflict');

        $version = $invoice->fresh()->version;
        $this->postJson("/api/v1/invoices/{$invoice->id}/verify", ['version' => $version])->assertOk();
        $this->postJson("/api/v1/invoices/{$invoice->id}/verify", ['version' => $invoice->fresh()->version])->assertStatus(409)->assertJsonPath('code', 'already_paid');

        // void ditolak; paket/cuti belum didukung (menyusul modul Finance)
        $void = $this->issueInvoice($this->makeClient());
        $void->update(['status' => 'void']);
        $this->postJson("/api/v1/invoices/{$void->id}/verify", ['version' => $void->fresh()->version])->assertStatus(409)->assertJsonPath('code', 'invoice_void');

        $package = $this->issueInvoice($this->makeClient());
        $package->update(['invoice_type' => 'package']);
        $this->postJson("/api/v1/invoices/{$package->id}/verify", ['version' => $package->fresh()->version])->assertUnprocessable()->assertJsonPath('code', 'not_supported_yet');
        $this->assertSame('unpaid', $package->fresh()->status);
    }
}
