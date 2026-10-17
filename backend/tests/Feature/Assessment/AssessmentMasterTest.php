<?php

namespace Tests\Feature\Assessment;

use App\Models\AssessmentAccessCode;
use App\Models\AssessmentCategory;
use App\Models\AssessmentSection;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\Concerns\AssessmentFixtures;
use Tests\Concerns\AuthFixtures;
use Tests\Concerns\OrganizationFixtures;
use Tests\TestCase;

class AssessmentMasterTest extends TestCase
{
    use AssessmentFixtures, AuthFixtures, OrganizationFixtures, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedFoundation();
        $this->actAs($this->makeStaff('master'));
    }

    public function test_category_crud_with_version_lock(): void
    {
        $id = $this->postJson('/api/v1/assessment-categories', ['type_code' => 'tdl', 'name' => 'Tumbuh Kembang', 'domain' => 'Umum'])
            ->assertCreated()->assertJsonPath('data.type_code', 'TDL')->assertJsonPath('data.version', 1)->json('data.id');

        $this->postJson('/api/v1/assessment-categories', ['type_code' => 'TDL', 'name' => 'Lagi'])->assertUnprocessable()->assertJsonValidationErrors('type_code');
        $this->patchJson("/api/v1/assessment-categories/{$id}", ['name' => 'Baru', 'version' => 1])->assertOk()->assertJsonPath('data.version', 2);
        $this->patchJson("/api/v1/assessment-categories/{$id}", ['name' => 'Usang', 'version' => 1])->assertStatus(409)->assertJsonPath('code', 'version_conflict');
        $this->patchJson("/api/v1/assessment-categories/{$id}", ['name' => 'Tanpa versi'])->assertUnprocessable();

        $this->deleteJson("/api/v1/assessment-categories/{$id}")->assertNoContent();
    }

    public function test_type_code_is_editable_until_a_code_is_issued(): void
    {
        $id = $this->postJson('/api/v1/assessment-categories', ['type_code' => 'SPC', 'name' => 'Salinan'])->assertCreated()->json('data.id');
        $other = AssessmentCategory::create(['type_code' => 'TAKEN', 'name' => 'Lain']);

        $this->patchJson("/api/v1/assessment-categories/{$id}", ['type_code' => 'taken', 'version' => 1])->assertUnprocessable()->assertJsonValidationErrors('type_code'); // sudah dipakai kategori lain
        $this->patchJson("/api/v1/assessment-categories/{$id}", ['type_code' => 'baru1', 'version' => 1])->assertOk()->assertJsonPath('data.type_code', 'BARU1');
        $this->patchJson("/api/v1/assessment-categories/{$id}", ['type_code' => 'BARU1', 'name' => 'Sama saja', 'version' => 2])->assertOk(); // kode sendiri tidak dianggap duplikat

        // setelah ada kode terbit, kode jenis dikunci
        $client = $this->makeClient();
        AssessmentAccessCode::create(['code' => 'BARU1-AAAAAA', 'client_id' => $client->id, 'category_id' => $id, 'status' => 'issued', 'issued_at' => now(), 'invoice_required' => false]);
        $this->patchJson("/api/v1/assessment-categories/{$id}", ['type_code' => 'LAIN2', 'version' => 3])->assertStatus(409)->assertJsonPath('code', 'in_use');
        $this->patchJson("/api/v1/assessment-categories/{$id}", ['name' => 'Nama boleh', 'version' => 3])->assertOk();
        $this->assertNotNull($other->fresh());
    }

    public function test_category_tree_and_list_counts(): void
    {
        $f = $this->makeCategory();

        $this->getJson('/api/v1/assessment-categories')->assertOk()->assertJsonPath('data.0.section_count', 2)->assertJsonPath('data.0.question_count', 4);
        $tree = $this->getJson("/api/v1/assessment-categories/{$f['category']->id}")->assertOk();
        $tree->assertJsonPath('data.sections.0.title', 'Auditori')->assertJsonPath('data.sections.0.questions.0.item_no', 1)->assertJsonPath('data.sections.1.questions.0.question_type', 'checkbox_multi');
    }

    public function test_section_and_question_crud_and_validation(): void
    {
        $category = AssessmentCategory::create(['type_code' => 'KON', 'name' => 'Konsul']);
        $sectionId = $this->postJson("/api/v1/assessment-categories/{$category->id}/sections", ['title' => 'Bagian A', 'result_template' => 'toddler_sensory'])
            ->assertCreated()->assertJsonPath('data.sort_order', 1)->json('data.id');
        $this->postJson("/api/v1/assessment-categories/{$category->id}/sections", ['title' => 'Bagian B'])->assertCreated()->assertJsonPath('data.sort_order', 2);
        $this->postJson("/api/v1/assessment-categories/{$category->id}/sections", ['title' => 'X', 'result_template' => 'nope'])->assertUnprocessable();
        $this->postJson("/api/v1/assessment-categories/{$category->id}/sections", ['title' => 'X', 'document_url' => 'ftp://x'])->assertUnprocessable();

        // tipe pilihan wajib punya opsi; rentang harus min < max
        $this->postJson("/api/v1/assessment-sections/{$sectionId}/questions", ['question' => 'Pilih', 'question_type' => 'multiple_choice'])->assertUnprocessable()->assertJsonValidationErrors('options');
        $this->postJson("/api/v1/assessment-sections/{$sectionId}/questions", ['question' => 'Skala', 'question_type' => 'range', 'range_min' => 5, 'range_max' => 1])->assertUnprocessable();

        $qid = $this->postJson("/api/v1/assessment-sections/{$sectionId}/questions", ['question' => 'Pilih', 'question_type' => 'multiple_choice', 'options' => ['A', 'B']])
            ->assertCreated()->assertJsonPath('data.item_no', 1)->assertJsonPath('data.options.1', 'B')->json('data.id');

        // ganti tipe ke teks: opsi dikosongkan
        $this->patchJson("/api/v1/assessment-questions/{$qid}", ['question_type' => 'free_text'])->assertOk()->assertJsonPath('data.options', null);
        $this->deleteJson("/api/v1/assessment-questions/{$qid}")->assertNoContent();
        $this->deleteJson("/api/v1/assessment-sections/{$sectionId}")->assertNoContent();
    }

    public function test_sections_and_questions_can_be_reordered(): void
    {
        $f = $this->makeCategory();
        $third = AssessmentSection::create(['category_id' => $f['category']->id, 'title' => 'Taktil', 'sort_order' => 3]);
        [$s1, $s2] = $f['sections'];

        // urutan baru: Taktil, Auditori, Umum
        $res = $this->putJson("/api/v1/assessment-categories/{$f['category']->id}/sections/order", ['ids' => [$third->id, $s1->id, $s2->id]])->assertOk();
        $this->assertSame(['Taktil', 'Auditori', 'Umum'], collect($res->json('data'))->pluck('title')->all());
        $this->assertSame(['Taktil', 'Auditori', 'Umum'], collect($this->getJson("/api/v1/assessment-categories/{$f['category']->id}")->json('data.sections'))->pluck('title')->all());

        // harus memuat semua section tepat satu kali
        $this->putJson("/api/v1/assessment-categories/{$f['category']->id}/sections/order", ['ids' => [$s1->id, $s2->id]])->assertUnprocessable()->assertJsonValidationErrors('ids');
        $this->putJson("/api/v1/assessment-categories/{$f['category']->id}/sections/order", ['ids' => [$s1->id, $s1->id, $s2->id, $third->id]])->assertUnprocessable();

        // soal dalam satu section
        $q1 = $f['questions']['scale'];
        $q2 = $f['questions']['scale2'];
        $res = $this->putJson("/api/v1/assessment-sections/{$s1->id}/questions/order", ['ids' => [$q2->id, $q1->id]])->assertOk();
        $this->assertSame([$q2->id, $q1->id], collect($res->json('data'))->pluck('id')->all());

        // id dari section lain ditolak
        $this->putJson("/api/v1/assessment-sections/{$s1->id}/questions/order", ['ids' => [$q2->id, $f['questions']['text']->id]])->assertUnprocessable();
    }

    public function test_delete_blocked_when_used(): void
    {
        $f = $this->makeCategory();
        $client = $this->makeClient();
        AssessmentAccessCode::create(['code' => 'SP2-AAAAAA', 'client_id' => $client->id, 'category_id' => $f['category']->id, 'status' => 'issued', 'issued_at' => now()]);

        $this->deleteJson("/api/v1/assessment-categories/{$f['category']->id}")->assertStatus(409)->assertJsonPath('code', 'in_use');
    }

    public function test_section_document_is_link_or_pdf_not_both(): void
    {
        Storage::fake();
        $f = $this->makeCategory();
        $id = $f['sections'][0]->id;

        $this->post("/api/v1/assessment-sections/{$id}/document", ['file' => UploadedFile::fake()->create('panduan.txt', 10, 'text/plain')], ['Accept' => 'application/json'])->assertUnprocessable();

        $res = $this->post("/api/v1/assessment-sections/{$id}/document", ['file' => UploadedFile::fake()->create('panduan.pdf', 100, 'application/pdf')], ['Accept' => 'application/json'])
            ->assertCreated()->assertJsonPath('data.has_document_file', true)->assertJsonPath('data.document_name', 'panduan.pdf');
        $path = $f['sections'][0]->fresh()->document_path;
        Storage::assertExists($path);
        $res->assertJsonPath('data.document_url', null);

        $this->get("/api/v1/assessment-sections/{$id}/document")->assertOk();

        // mengisi link menggantikan file
        $this->patchJson("/api/v1/assessment-sections/{$id}", ['document_url' => 'https://docs.google.com/document/d/abc'])->assertOk()->assertJsonPath('data.has_document_file', false);
        Storage::assertMissing($path);

        // unggah lagi lalu hapus
        $this->post("/api/v1/assessment-sections/{$id}/document", ['file' => UploadedFile::fake()->create('lagi.pdf', 50, 'application/pdf')], ['Accept' => 'application/json'])->assertCreated()->assertJsonPath('data.document_url', null);
        $this->deleteJson("/api/v1/assessment-sections/{$id}/document")->assertOk()->assertJsonPath('data.has_document_file', false);
    }

    public function test_non_master_roles_authorization(): void
    {
        $this->actAs($this->makeStaff('finance'));
        $this->getJson('/api/v1/assessment-categories')->assertForbidden();
        $this->postJson('/api/v1/assessment-categories', ['type_code' => 'ZZZ', 'name' => 'x'])->assertForbidden();

        $this->actAs($this->makeStaff('admin_inquiry'));
        $this->getJson('/api/v1/assessment-categories')->assertOk();
    }
}
