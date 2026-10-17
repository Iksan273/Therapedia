<?php

namespace Tests\Feature\Assessment;

use App\Models\AssessmentAccessCode;
use App\Models\AssessmentDraft;
use App\Models\Client;
use App\Models\Invoice;
use App\Models\PaymentProof;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\AssessmentFixtures;
use Tests\Concerns\AuthFixtures;
use Tests\Concerns\OrganizationFixtures;
use Tests\TestCase;

/** Alur publik ortu + snapshot: edit master setelah pengisian dimulai tidak mengubah draft / hasil. */
class PublicAssessmentTest extends TestCase
{
    use AssessmentFixtures, AuthFixtures, OrganizationFixtures, RefreshDatabase;

    private Client $client;

    private array $f;

    private AssessmentAccessCode $code;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedFoundation();
        $this->client = $this->makeClient();
        $this->f = $this->makeCategory();
        $this->code = $this->makeCode();
    }

    private function makeCode(array $overrides = []): AssessmentAccessCode
    {
        static $n = 0;
        $n++;

        return AssessmentAccessCode::create($overrides + [
            'code' => 'SP2-AAAA'.str_pad((string) $n, 2, '0', STR_PAD_LEFT),
            'client_id' => $this->client->id, 'category_id' => $this->f['category']->id,
            'status' => 'issued', 'issued_at' => now(), 'invoice_required' => false,
        ]);
    }

    private function url(?AssessmentAccessCode $code = null, string $suffix = ''): string
    {
        return '/api/v1/public/assessments/'.($code ?? $this->code)->code.$suffix;
    }

    private function q(string $key): int
    {
        return $this->f['questions'][$key]->id;
    }

    private function fillRequired(): array
    {
        return [(string) $this->q('scale') => ['t' => '4 - Sering (75%)'], (string) $this->q('scale2') => ['t' => '2 - Kadang']];
    }

    public function test_open_returns_structure_client_and_no_draft(): void
    {
        $this->getJson($this->url())->assertOk()
            ->assertJsonPath('data.status', 'issued')->assertJsonPath('data.client.child_name', $this->client->child_name)
            ->assertJsonPath('data.structure.category.type_code', 'SP2')->assertJsonPath('data.structure.sections.0.questions.0.question', 'Respon terhadap suara')
            ->assertJsonPath('data.draft', null)->assertJsonPath('data.frozen', false);
        $this->getJson('/api/v1/public/assessments/ASM-NOPE00')->assertNotFound();
    }

    public function test_before_draft_parent_sees_latest_master(): void
    {
        $this->f['questions']['scale']->update(['question' => 'Teks versi baru']);

        $this->getJson($this->url())->assertOk()->assertJsonPath('data.structure.sections.0.questions.0.question', 'Teks versi baru');
    }

    public function test_draft_roundtrip_with_patch_and_version_lock(): void
    {
        $first = $this->putJson($this->url(null, '/draft'), ['answers' => $this->fillRequired(), 'consent' => true, 'last_section_id' => $this->f['sections'][0]->id])
            ->assertOk()->assertJsonPath('data.answered_count', 2)->assertJsonPath('data.version', 1);
        $this->assertNotNull($first->json('data.consent_at'));

        // patch: hapus satu jawaban (null) + tambah checkbox; id asing dibuang
        $res = $this->putJson($this->url(null, '/draft'), [
            'version' => 1,
            'answers' => [(string) $this->q('scale2') => null, (string) $this->q('multi') => ['t' => '', 'v' => ['Musik', 'Gerak']], '99999' => ['t' => 'x']],
        ])->assertOk()->assertJsonPath('data.answered_count', 2)->assertJsonPath('data.version', 2);
        $this->assertSame(['Musik', 'Gerak'], $res->json('data.answers.'.$this->q('multi').'.v'));
        $this->assertArrayNotHasKey('99999', $res->json('data.answers'));

        $this->putJson($this->url(null, '/draft'), ['version' => 1, 'answers' => []])->assertStatus(409)->assertJsonPath('code', 'version_conflict');
        $this->putJson($this->url(null, '/draft'), ['answers' => []])->assertUnprocessable(); // draft ada: version wajib

        $this->getJson($this->url())->assertOk()->assertJsonPath('data.draft.version', 2)->assertJsonPath('data.draft.answered_count', 2)->assertJsonPath('data.frozen', true);
    }

    public function test_invalid_answer_format_rejected(): void
    {
        $dateQ = $this->f['questions']['text']->replicate();
        $dateQ->fill(['question_type' => 'birth_date', 'question' => 'Tgl lahir', 'item_no' => 9, 'sort_order' => 9])->save();

        $this->putJson($this->url(null, '/draft'), ['answers' => [(string) $dateQ->id => ['t' => '17/05/2018']]])->assertUnprocessable();
        $this->putJson($this->url(null, '/draft'), ['answers' => [(string) $dateQ->id => ['t' => '2018-05-17']]])->assertOk();
    }

    public function test_snapshot_keeps_draft_structure_after_master_edit(): void
    {
        $this->putJson($this->url(null, '/draft'), ['answers' => [(string) $this->q('scale') => ['t' => '3 - Sering']], 'consent' => true])->assertOk();

        // master mengubah teks soal, judul section, template, menambah soal WAJIB baru, dan mengganti urutan
        $this->f['questions']['scale']->update(['question' => 'DIUBAH master']);
        $this->f['sections'][0]->update(['title' => 'Judul baru', 'result_template' => 'toddler_sensory', 'description' => 'Deskripsi baru']);
        $newQ = $this->f['questions']['scale']->replicate();
        $newQ->fill(['question' => 'Soal wajib baru', 'item_no' => 50, 'sort_order' => 50])->save();

        $open = $this->getJson($this->url())->assertOk();
        $open->assertJsonPath('data.structure.sections.0.title', 'Auditori')
            ->assertJsonPath('data.structure.sections.0.result_template', 'child_sensory')
            ->assertJsonPath('data.structure.sections.0.description', 'Bagian pendengaran')
            ->assertJsonPath('data.structure.sections.0.questions.0.question', 'Respon terhadap suara');
        $this->assertNotContains('Soal wajib baru', collect($open->json('data.structure.sections.0.questions'))->pluck('question')->all());

        // soal baru di luar snapshot dibuang saat draft disimpan; submit tidak menuntut soal wajib baru
        $draft = $this->putJson($this->url(null, '/draft'), ['version' => 1, 'answers' => [(string) $newQ->id => ['t' => '5'], (string) $this->q('scale2') => ['t' => '1 - Jarang']]])->assertOk();
        $this->assertArrayNotHasKey((string) $newQ->id, $draft->json('data.answers'));

        $this->postJson($this->url(null, '/responses'), [])->assertCreated()->assertJsonPath('data.status', 'submitted');
    }

    public function test_submitted_result_stays_unchanged_after_master_edit(): void
    {
        $this->postJson($this->url(null, '/responses'), ['consent' => true, 'answers' => $this->fillRequired() + [(string) $this->q('multi') => ['t' => '', 'v' => ['Gambar', 'Gerak']]]])
            ->assertCreated()->assertJsonPath('data.answered_count', 3);

        $this->f['questions']['scale']->update(['question' => 'DIUBAH master', 'options' => null]);
        $this->f['sections'][0]->update(['title' => 'Judul baru', 'result_template' => null]);

        $this->actAs($this->makeStaff('admin_inquiry'));
        $res = $this->getJson("/api/v1/clients/{$this->client->id}/assessment-responses")->assertOk()->assertJsonCount(1, 'data');
        $res->assertJsonPath('data.0.structure.sections.0.title', 'Auditori')
            ->assertJsonPath('data.0.structure.sections.0.result_template', 'child_sensory')
            ->assertJsonPath('data.0.structure.sections.0.questions.0.question', 'Respon terhadap suara')
            ->assertJsonPath('data.0.category.type_code', 'SP2');

        $answers = collect($res->json('data.0.answers'))->keyBy('question_id');
        $this->assertSame(4, $answers[$this->q('scale')]['score']);
        $this->assertSame('4 - Sering (75%)', $answers[$this->q('scale')]['answer_text']);
        $this->assertSame(['Gambar', 'Gerak'], $answers[$this->q('multi')]['answer_values']);
        $this->assertSame('Gambar, Gerak', $answers[$this->q('multi')]['answer_text']);
        $this->assertNull($answers[$this->q('multi')]['score']);
        $this->assertArrayNotHasKey($this->q('text'), $answers->all()); // opsional kosong tidak disimpan
    }

    public function test_cannot_delete_question_or_section_while_a_questionnaire_is_being_filled(): void
    {
        $this->putJson($this->url(null, '/draft'), ['answers' => []])->assertOk();
        $this->actAs($this->makeStaff('admin_inquiry'));

        $this->deleteJson('/api/v1/assessment-questions/'.$this->q('text'))->assertStatus(409)->assertJsonPath('code', 'in_use');
        $this->deleteJson('/api/v1/assessment-sections/'.$this->f['sections'][1]->id)->assertStatus(409)->assertJsonPath('code', 'in_use');
    }

    public function test_answered_question_and_section_can_be_deleted_once_nothing_is_being_filled_and_results_stay_intact(): void
    {
        $this->postJson($this->url(null, '/responses'), ['consent' => true, 'answers' => $this->fillRequired() + [(string) $this->q('text') => ['t' => 'Catatan penting']]])->assertCreated();
        $answeredId = $this->q('scale');
        $textId = $this->q('text');
        $sectionId = $this->f['sections'][0]->id;
        $this->actAs($this->makeStaff('admin_inquiry'));

        // semua kuesioner sudah dikirim (tidak ada draft): soal yang pernah dijawab dan section-nya boleh dihapus
        $this->deleteJson('/api/v1/assessment-questions/'.$textId)->assertNoContent();
        $this->deleteJson("/api/v1/assessment-sections/{$sectionId}")->assertNoContent();
        $this->assertDatabaseMissing('assessment_questions', ['id' => $answeredId]);

        // hasil lama utuh: jawaban tersimpan dan struktur (teks soal, judul section, template) tetap dari snapshot
        $res = $this->getJson("/api/v1/clients/{$this->client->id}/assessment-responses")->assertOk();
        $res->assertJsonPath('data.0.structure.sections.0.title', 'Auditori')
            ->assertJsonPath('data.0.structure.sections.0.result_template', 'child_sensory')
            ->assertJsonPath('data.0.structure.sections.0.questions.0.question', 'Respon terhadap suara');
        $answers = collect($res->json('data.0.answers'))->keyBy('question_id');
        $this->assertSame(4, $answers[$answeredId]['score']);
        $this->assertSame('Catatan penting', $answers[$textId]['answer_text']);
    }

    public function test_submit_validations(): void
    {
        // soal wajib kosong -> 422 incomplete + daftar id
        $res = $this->postJson($this->url(null, '/responses'), ['consent' => true, 'answers' => [(string) $this->q('scale') => ['t' => '4 - Sering']]])->assertUnprocessable()->assertJsonPath('code', 'incomplete');
        $this->assertSame([$this->q('scale2')], $res->json('missing_question_ids'));

        // tanpa persetujuan
        $this->postJson($this->url(null, '/responses'), ['answers' => $this->fillRequired()])->assertUnprocessable()->assertJsonValidationErrors('consent');

        // sukses sekali, lalu semua operasi ditolak 409
        $this->postJson($this->url(null, '/responses'), ['consent' => true, 'answers' => $this->fillRequired()])->assertCreated();
        $this->assertSame('submitted', $this->code->fresh()->status);
        $this->assertNull(AssessmentDraft::find($this->code->id));
        $this->postJson($this->url(null, '/responses'), ['consent' => true, 'answers' => $this->fillRequired()])->assertStatus(409)->assertJsonPath('code', 'already_submitted');
        $this->putJson($this->url(null, '/draft'), ['answers' => []])->assertStatus(409);
        $this->getJson($this->url())->assertStatus(409);
        $this->assertSame('inquiry', $this->client->fresh()->status); // submit tidak mengubah status client
    }

    public function test_expired_code_gone_unless_draft_started_before_expiry(): void
    {
        $expired = $this->makeCode(['expires_at' => now()->subDay()]);
        $this->getJson($this->url($expired))->assertStatus(410)->assertJsonPath('code', 'expired');
        $this->putJson($this->url($expired, '/draft'), ['answers' => []])->assertStatus(410);

        // draft dimulai sebelum kedaluwarsa -> tetap boleh diselesaikan
        $withDraft = $this->makeCode(['expires_at' => now()->subHour()]);
        AssessmentDraft::create(['access_code_id' => $withDraft->id, 'answers' => [], 'started_at' => now()->subDay()]);
        $this->getJson($this->url($withDraft))->assertOk();
        $this->postJson($this->url($withDraft, '/responses'), ['consent' => true, 'answers' => $this->fillRequired()])->assertCreated();
    }

    public function test_proof_required_gating_with_bank_accounts(): void
    {
        $code = $this->makeCode(['invoice_required' => true]);
        $invoice = Invoice::create([
            'invoice_number' => 'INV-ASM-20261017-001', 'client_id' => $this->client->id, 'branch_id' => $this->client->branch_id,
            'invoice_type' => 'assessment', 'assessment_access_code_id' => $code->id, 'type_code' => 'ASM', 'package_name' => 'Paket Asesmen',
            'amount' => 750000, 'status' => 'unpaid',
        ]);
        $this->actAs($this->makeStaff('master'))->postJson('/api/v1/branches/'.$this->client->branch_id.'/bank-accounts', ['bank_name' => 'BCA', 'account_number' => '123456', 'account_holder' => 'Therapedia'])->assertCreated();

        $this->getJson($this->url($code))->assertForbidden()->assertJsonPath('code', 'proof_required')
            ->assertJsonPath('invoice.invoice_number', 'INV-ASM-20261017-001')->assertJsonPath('bank_accounts.0.bank_name', 'BCA');
        $this->putJson($this->url($code, '/draft'), ['answers' => []])->assertForbidden();

        // bukti terunggah (belum lunas) sudah cukup membuka kuesioner
        PaymentProof::create(['invoice_id' => $invoice->id, 'file_path' => 'proofs/x.jpg', 'file_name' => 'x.jpg', 'mime_type' => 'image/jpeg', 'file_size' => 100, 'uploaded_by_type' => 'client', 'uploaded_by_id' => $this->client->id, 'uploaded_at' => now()]);
        $this->getJson($this->url($code))->assertOk()->assertJsonPath('data.bank_accounts.0.bank_name', 'BCA');
    }

    public function test_code_lookup_is_case_insensitive(): void
    {
        $this->getJson('/api/v1/public/assessments/'.strtolower($this->code->code))->assertOk();
    }
}
