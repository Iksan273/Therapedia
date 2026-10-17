<?php

namespace Tests\Feature\Assessment;

use App\Models\AssessmentAccessCode;
use App\Models\Client;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Storage;
use Tests\Concerns\AssessmentFixtures;
use Tests\Concerns\AuthFixtures;
use Tests\Concerns\OrganizationFixtures;
use Tests\TestCase;

/** PDF section yang dibekukan tetap sama bagi kuesioner yang sedang diisi + batas per IP yang dipisah per jenis rute. */
class FrozenDocumentAndThrottleTest extends TestCase
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
    }

    private function code(string $suffix): AssessmentAccessCode
    {
        return AssessmentAccessCode::create([
            'code' => 'SP2-'.$suffix, 'client_id' => $this->client->id, 'category_id' => $this->f['category']->id,
            'status' => 'issued', 'issued_at' => now(), 'invoice_required' => false,
        ]);
    }

    private function upload(string $content): void
    {
        $sectionId = $this->f['sections'][0]->id;
        $this->post("/api/v1/assessment-sections/{$sectionId}/document", ['file' => UploadedFile::fake()->createWithContent('panduan.pdf', $content)], ['Accept' => 'application/json'])->assertCreated();
    }

    private function docUrl(AssessmentAccessCode $code): string
    {
        return "/api/v1/public/assessments/{$code->code}/sections/{$this->f['sections'][0]->id}/document";
    }

    private function answers(): array
    {
        return [(string) $this->f['questions']['scale']->id => ['t' => '4 - Sering'], (string) $this->f['questions']['scale2']->id => ['t' => '2 - Kadang']];
    }

    public function test_frozen_questionnaire_keeps_original_pdf_after_replace_and_delete(): void
    {
        $this->actAs($this->makeStaff('master'));
        $this->upload('%PDF-VERSI-A');
        $oldPath = $this->f['sections'][0]->fresh()->document_path;

        $frozen = $this->code('FROZEN');
        $fresh = $this->code('FRESH1'); // belum dibuka: belum dibekukan

        // ortu mulai mengisi -> struktur (termasuk file PDF) dibekukan; path file tidak bocor ke respons
        $this->putJson("/api/v1/public/assessments/{$frozen->code}/draft", ['answers' => []])->assertOk();
        $open = $this->getJson("/api/v1/public/assessments/{$frozen->code}")->assertOk();
        $this->assertStringNotContainsString($oldPath, json_encode($open->json()));

        // master mengganti PDF: file lama dipertahankan untuk yang sudah dibekukan, yang belum dibekukan melihat yang baru
        $this->upload('%PDF-VERSI-B');
        Storage::assertExists($oldPath);
        $this->assertSame('%PDF-VERSI-A', $this->get($this->docUrl($frozen))->assertOk()->streamedContent());
        $this->assertSame('%PDF-VERSI-B', $this->get($this->docUrl($fresh))->assertOk()->streamedContent());

        // master menghapus PDF: yang dibekukan tetap melihat versi A
        $sectionId = $this->f['sections'][0]->id;
        $this->deleteJson("/api/v1/assessment-sections/{$sectionId}/document")->assertOk();
        $this->assertSame('%PDF-VERSI-A', $this->get($this->docUrl($frozen))->assertOk()->streamedContent());
        $this->get($this->docUrl($fresh))->assertNotFound();

        // kuesioner dikirim -> file beku tidak dibutuhkan lagi dan dibuang
        $this->postJson("/api/v1/public/assessments/{$frozen->code}/responses", ['consent' => true, 'answers' => $this->answers()])->assertCreated();
        Storage::assertMissing($oldPath);
    }

    public function test_pdf_is_served_inline_without_content_disposition_so_browsers_render_instead_of_download(): void
    {
        $this->actAs($this->makeStaff('master'));
        $this->upload('%PDF-VIEWER');
        $code = $this->code('VIEWER');

        $public = $this->get($this->docUrl($code))->assertOk();
        $this->assertSame('application/pdf', $public->headers->get('Content-Type'));
        $this->assertNull($public->headers->get('Content-Disposition')); // header ini membuat Chrome menganggapnya unduhan (fetch pdf.js diblokir)

        $staff = $this->get('/api/v1/assessment-sections/'.$this->f['sections'][0]->id.'/document')->assertOk();
        $this->assertNull($staff->headers->get('Content-Disposition'));
    }

    public function test_file_without_frozen_questionnaire_is_deleted_immediately(): void
    {
        $this->actAs($this->makeStaff('master'));
        $this->upload('%PDF-VERSI-A');
        $oldPath = $this->f['sections'][0]->fresh()->document_path;
        $this->code('NOFREZ');

        $this->upload('%PDF-VERSI-B');

        Storage::assertMissing($oldPath);
    }

    public function test_pdf_added_after_freeze_does_not_appear_for_frozen_questionnaire(): void
    {
        $this->actAs($this->makeStaff('master'));
        $frozen = $this->code('NOPDF1');
        $this->putJson("/api/v1/public/assessments/{$frozen->code}/draft", ['answers' => []])->assertOk();

        $this->upload('%PDF-BARU');

        $sections = $this->getJson("/api/v1/public/assessments/{$frozen->code}")->json('data.structure.sections');
        $this->assertFalse($sections[0]['has_document_file']);
        $this->get($this->docUrl($frozen))->assertNotFound();
    }

    public function test_open_is_throttled_separately_from_draft_saves(): void
    {
        $code = $this->code('THROTL');
        RateLimiter::clear('assess-open');

        foreach (range(1, 30) as $i) {
            $this->getJson("/api/v1/public/assessments/{$code->code}")->assertOk();
        }
        $this->getJson("/api/v1/public/assessments/{$code->code}")->assertStatus(429); // tebakan kode terhenti

        // simpan draft memakai ember berbeda: wifi bersama tidak terkunci oleh pembukaan kuesioner
        $version = null;
        foreach (range(1, 5) as $i) {
            $res = $this->putJson("/api/v1/public/assessments/{$code->code}/draft", ['version' => $version, 'answers' => [(string) $this->f['questions']['text']->id => ['t' => "catatan {$i}"]]])->assertOk();
            $version = $res->json('data.version');
        }
    }
}
