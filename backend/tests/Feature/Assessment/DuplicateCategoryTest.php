<?php

namespace Tests\Feature\Assessment;

use App\Models\AssessmentAccessCode;
use App\Models\AssessmentCategory;
use App\Models\AssessmentQuestion;
use App\Models\AssessmentSection;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\Concerns\AssessmentFixtures;
use Tests\Concerns\AuthFixtures;
use Tests\Concerns\OrganizationFixtures;
use Tests\TestCase;

/** Duplikat kategori: template mirip bisa disalin lalu diubah (hapus yang tidak perlu, tambah yang perlu) tanpa memengaruhi asal. */
class DuplicateCategoryTest extends TestCase
{
    use AssessmentFixtures, AuthFixtures, OrganizationFixtures, RefreshDatabase;

    private array $f;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake();
        $this->seedFoundation();
        $this->f = $this->makeCategory('SP2', 'parent');
        $this->actAs($this->makeStaff('master'));
    }

    private function dup(array $overrides = [])
    {
        return $this->postJson("/api/v1/assessment-categories/{$this->f['category']->id}/duplicate", $overrides + ['type_code' => 'sp3', 'name' => 'Salinan SP2']);
    }

    public function test_copies_sections_and_questions_into_a_fresh_category(): void
    {
        $this->f['questions']['multi']->update(['options' => ['Musik', 'Gambar', 'Gerak']]);

        $res = $this->dup()->assertCreated()
            ->assertJsonPath('data.type_code', 'SP3')->assertJsonPath('data.name', 'Salinan SP2')->assertJsonPath('data.version', 1)
            ->assertJsonPath('data.respondent_profile', 'parent')->assertJsonPath('data.section_count', 2)->assertJsonPath('data.question_count', 4);

        $copy = AssessmentCategory::findOrFail($res->json('data.id'));
        $this->assertNotSame($this->f['category']->id, $copy->id);

        $tree = $this->getJson("/api/v1/assessment-categories/{$copy->id}")->assertOk();
        $tree->assertJsonPath('data.sections.0.title', 'Auditori')->assertJsonPath('data.sections.0.result_template', 'child_sensory')
            ->assertJsonPath('data.sections.0.description', 'Bagian pendengaran')->assertJsonPath('data.sections.0.questions.0.question', 'Respon terhadap suara')
            ->assertJsonPath('data.sections.1.questions.0.options.2', 'Gerak')->assertJsonPath('data.sections.1.questions.0.is_required', false);

        // id section/soal baru dan terikat ke kategori baru
        $newSectionIds = AssessmentSection::where('category_id', $copy->id)->pluck('id')->all();
        $this->assertCount(2, $newSectionIds);
        $this->assertEmpty(array_intersect($newSectionIds, collect($this->f['sections'])->pluck('id')->all()));
        $this->assertSame(4, AssessmentQuestion::where('category_id', $copy->id)->whereIn('section_id', $newSectionIds)->count());

        // asal tidak berubah
        $this->assertSame(4, AssessmentQuestion::where('category_id', $this->f['category']->id)->count());
    }

    public function test_copy_is_independent_so_unneeded_questions_can_be_deleted_and_new_ones_added(): void
    {
        $copyId = $this->dup()->assertCreated()->json('data.id');
        $copySection = AssessmentSection::where('category_id', $copyId)->orderBy('sort_order')->first();
        $copyQuestion = AssessmentQuestion::where('section_id', $copySection->id)->orderBy('sort_order')->first();

        $this->deleteJson("/api/v1/assessment-questions/{$copyQuestion->id}")->assertNoContent();
        $this->postJson("/api/v1/assessment-sections/{$copySection->id}/questions", ['question' => 'Soal tambahan', 'question_type' => 'free_text'])->assertCreated();
        $this->patchJson("/api/v1/assessment-sections/{$copySection->id}", ['title' => 'Judul diubah'])->assertOk();

        // kategori asal utuh
        $this->assertSame(4, AssessmentQuestion::where('category_id', $this->f['category']->id)->count());
        $this->assertSame('Auditori', $this->f['sections'][0]->fresh()->title);
        $this->assertNotNull($this->f['questions']['scale']->fresh());
    }

    public function test_override_profile_domain_and_validation(): void
    {
        $this->dup(['type_code' => 'SCP2', 'respondent_profile' => 'teacher', 'domain' => 'School'])->assertCreated()
            ->assertJsonPath('data.respondent_profile', 'teacher')->assertJsonPath('data.domain', 'School');

        $this->dup(['type_code' => 'SP2'])->assertUnprocessable()->assertJsonValidationErrors('type_code'); // kode jenis sudah dipakai
        $this->dup(['type_code' => 'ZZ9', 'name' => ''])->assertUnprocessable();
        $this->dup(['type_code' => 'ZZ8', 'respondent_profile' => 'bukan'])->assertUnprocessable();
        $this->postJson('/api/v1/assessment-categories/99999/duplicate', ['type_code' => 'ZZ7', 'name' => 'x'])->assertNotFound();
    }

    public function test_does_not_copy_codes_results_or_snapshots_and_copies_pdf_to_separate_file(): void
    {
        $sectionId = $this->f['sections'][0]->id;
        $this->post("/api/v1/assessment-sections/{$sectionId}/document", ['file' => UploadedFile::fake()->createWithContent('panduan.pdf', '%PDF-ASAL')], ['Accept' => 'application/json'])->assertCreated();
        $client = $this->makeClient();
        AssessmentAccessCode::create(['code' => 'SP2-AAAAAA', 'client_id' => $client->id, 'category_id' => $this->f['category']->id, 'status' => 'issued', 'issued_at' => now(), 'invoice_required' => false]);

        $copyId = $this->dup()->assertCreated()->json('data.id');

        $this->assertSame(0, AssessmentAccessCode::where('category_id', $copyId)->count());

        $origPath = AssessmentSection::findOrFail($sectionId)->document_path;
        $copySection = AssessmentSection::where('category_id', $copyId)->orderBy('sort_order')->first();
        $this->assertNotNull($copySection->document_path);
        $this->assertNotSame($origPath, $copySection->document_path); // file terpisah
        $this->assertSame('panduan.pdf', $copySection->document_name);
        Storage::assertExists($copySection->document_path);
        $this->assertSame('%PDF-ASAL', Storage::get($copySection->document_path));

        // menghapus PDF di salinan tidak menyentuh file asal
        $this->deleteJson("/api/v1/assessment-sections/{$copySection->id}/document")->assertOk();
        Storage::assertExists($origPath);
    }

    public function test_only_assessment_master_can_duplicate(): void
    {
        $this->actAs($this->makeStaff('finance'));
        $this->dup()->assertForbidden();
        $this->assertSame(1, AssessmentCategory::count());
    }
}
