<?php

namespace Tests\Feature\Assessment;

use App\Models\AssessmentAccessCode;
use App\Models\Client;
use App\Support\AssessmentRespondent;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\AssessmentFixtures;
use Tests\Concerns\AuthFixtures;
use Tests\Concerns\OrganizationFixtures;
use Tests\TestCase;

/** Langkah bawaan "Data Pengisi": profil per kategori, draft, submit, hasil, dan snapshot. */
class RespondentTest extends TestCase
{
    use AssessmentFixtures, AuthFixtures, OrganizationFixtures, RefreshDatabase;

    private Client $client;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedFoundation();
        $this->client = $this->makeClient();
    }

    private function codeFor(array $f, string $suffix): AssessmentAccessCode
    {
        return AssessmentAccessCode::create([
            'code' => $f['category']->type_code.'-'.$suffix, 'client_id' => $this->client->id, 'category_id' => $f['category']->id,
            'status' => 'issued', 'issued_at' => now(), 'invoice_required' => false,
        ]);
    }

    private function answers(array $f): array
    {
        return [(string) $f['questions']['scale']->id => ['t' => '4 - Sering'], (string) $f['questions']['scale2']->id => ['t' => '2 - Kadang']];
    }

    public function test_profile_field_definitions(): void
    {
        $this->assertSame([], AssessmentRespondent::fields('none'));
        $this->assertSame(['name', 'relation', 'phone', 'email'], array_keys(AssessmentRespondent::fields('parent')));
        $this->assertSame(['name', 'relation', 'school', 'class', 'phone', 'email'], array_keys(AssessmentRespondent::fields('teacher')));
        $this->assertSame(['name', 'relation'], AssessmentRespondent::missing('parent', ['phone' => '0812']));
        $this->assertSame(['school', 'class'], AssessmentRespondent::missing('teacher', ['name' => 'Bu Ani', 'relation' => 'Guru kelas']));
        $this->assertSame([], AssessmentRespondent::missing('none', []));
        $this->assertSame('none', AssessmentRespondent::profileOf(['category' => []])); // snapshot lama
    }

    public function test_open_exposes_profile_and_fields_and_empty_respondent(): void
    {
        $f = $this->makeCategory('SP2', 'parent');
        $code = $this->codeFor($f, 'AAAAAA');

        $res = $this->getJson("/api/v1/public/assessments/{$code->code}")->assertOk()
            ->assertJsonPath('data.structure.category.respondent_profile', 'parent')
            ->assertJsonPath('data.structure.category.respondent_fields.0.key', 'name')
            ->assertJsonPath('data.structure.category.respondent_fields.0.required', true);
        $this->assertCount(4, $res->json('data.structure.category.respondent_fields'));
    }

    public function test_draft_saves_respondent_patch_and_submit_requires_required_fields(): void
    {
        $f = $this->makeCategory('SP2', 'parent');
        $code = $this->codeFor($f, 'BBBBBB');
        $url = "/api/v1/public/assessments/{$code->code}";

        $draft = $this->putJson("{$url}/draft", ['respondent' => ['name' => '  Siti  ', 'phone' => '0812-3456', 'junk' => 'x'], 'answers' => $this->answers($f), 'consent' => true])
            ->assertOk()->assertJsonPath('data.respondent.name', 'Siti')->assertJsonPath('data.respondent.phone', '0812-3456');
        $this->assertArrayNotHasKey('junk', $draft->json('data.respondent'));

        // wajib belum lengkap (hubungan kosong) -> 422 incomplete
        $this->postJson("{$url}/responses", [])->assertUnprocessable()->assertJsonPath('code', 'incomplete')->assertJsonPath('missing_respondent_fields', ['relation']);

        // patch: isi hubungan, hapus telepon (kosong)
        $this->putJson("{$url}/draft", ['version' => 1, 'respondent' => ['relation' => 'Ibu', 'phone' => '']])->assertOk()
            ->assertJsonPath('data.respondent.relation', 'Ibu')->assertJsonMissingPath('data.respondent.phone');

        $this->postJson("{$url}/responses", [])->assertCreated();

        $this->actAs($this->makeStaff('admin_inquiry'))->getJson("/api/v1/clients/{$this->client->id}/assessment-responses")->assertOk()
            ->assertJsonPath('data.0.respondent.name', 'Siti')->assertJsonPath('data.0.respondent.relation', 'Ibu');
    }

    public function test_teacher_profile_needs_school_and_class(): void
    {
        $f = $this->makeCategory('SCP', 'teacher');
        $code = $this->codeFor($f, 'CCCCCC');

        $this->postJson("/api/v1/public/assessments/{$code->code}/responses", ['consent' => true, 'answers' => $this->answers($f), 'respondent' => ['name' => 'Bu Ani', 'relation' => 'Guru kelas']])
            ->assertUnprocessable()->assertJsonPath('missing_respondent_fields', ['school', 'class']);

        $this->postJson("/api/v1/public/assessments/{$code->code}/responses", ['consent' => true, 'answers' => $this->answers($f), 'respondent' => ['name' => 'Bu Ani', 'relation' => 'Guru kelas', 'school' => 'SD Harapan', 'class' => '2B', 'email' => 'ani@sekolah.test']])
            ->assertCreated();

        $this->assertDatabaseHas('assessment_responses', ['respondent_school' => 'SD Harapan', 'respondent_class' => '2B', 'respondent_email' => 'ani@sekolah.test']);
    }

    public function test_profile_none_has_no_respondent_step_and_ignores_input(): void
    {
        $f = $this->makeCategory('KON', 'none');
        $code = $this->codeFor($f, 'DDDDDD');
        $url = "/api/v1/public/assessments/{$code->code}";

        $this->getJson($url)->assertOk()->assertJsonPath('data.structure.category.respondent_fields', []);
        $this->postJson("{$url}/responses", ['consent' => true, 'answers' => $this->answers($f), 'respondent' => ['name' => 'Abaikan']])->assertCreated();
        $this->actAs($this->makeStaff('admin_inquiry'))->getJson("/api/v1/clients/{$this->client->id}/assessment-responses")->assertJsonPath('data.0.respondent', null);
    }

    public function test_invalid_email_or_phone_rejected(): void
    {
        $f = $this->makeCategory('SP2', 'parent');
        $code = $this->codeFor($f, 'EEEEEE');

        $this->putJson("/api/v1/public/assessments/{$code->code}/draft", ['respondent' => ['email' => 'bukan-email']])->assertUnprocessable()->assertJsonValidationErrors('respondent.email');
        $this->putJson("/api/v1/public/assessments/{$code->code}/draft", ['respondent' => ['phone' => 'abc']])->assertUnprocessable()->assertJsonValidationErrors('respondent.phone');
    }

    public function test_changing_profile_after_draft_does_not_affect_frozen_form(): void
    {
        $f = $this->makeCategory('SP2', 'parent');
        $code = $this->codeFor($f, 'FFFFFF');
        $url = "/api/v1/public/assessments/{$code->code}";

        $this->putJson("{$url}/draft", ['respondent' => ['name' => 'Siti']])->assertOk();
        $f['category']->update(['respondent_profile' => 'none']);

        $this->getJson($url)->assertOk()->assertJsonPath('data.structure.category.respondent_profile', 'parent');
        $this->postJson("{$url}/responses", ['consent' => true, 'answers' => $this->answers($f)])->assertUnprocessable()->assertJsonPath('missing_respondent_fields', ['relation']);
    }

    public function test_category_profile_is_editable_via_master_api(): void
    {
        $this->actAs($this->makeStaff('master'));
        $id = $this->postJson('/api/v1/assessment-categories', ['type_code' => 'NEW', 'name' => 'Baru', 'respondent_profile' => 'teacher'])
            ->assertCreated()->assertJsonPath('data.respondent_profile', 'teacher')->json('data.id');
        $this->patchJson("/api/v1/assessment-categories/{$id}", ['respondent_profile' => 'bukan', 'version' => 1])->assertUnprocessable();
        $this->patchJson("/api/v1/assessment-categories/{$id}", ['respondent_profile' => 'none', 'version' => 1])->assertOk()->assertJsonPath('data.respondent_profile', 'none');
    }
}
