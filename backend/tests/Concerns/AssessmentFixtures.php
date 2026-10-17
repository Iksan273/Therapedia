<?php

namespace Tests\Concerns;

use App\Models\AssessmentCategory;
use App\Models\AssessmentQuestion;
use App\Models\AssessmentSection;
use App\Models\MasterPackage;

/** Data uji M5: kategori + 2 section + soal berbagai tipe, dan paket asesmen untuk invoice. */
trait AssessmentFixtures
{
    /** @return array{category: AssessmentCategory, sections: list<AssessmentSection>, questions: array<string, AssessmentQuestion>} */
    protected function makeCategory(string $typeCode = 'SP2', string $profile = 'none'): array
    {
        $category = AssessmentCategory::create(['type_code' => $typeCode, 'name' => 'Kuesioner '.$typeCode, 'domain' => 'Sensori', 'respondent_profile' => $profile]);
        $s1 = AssessmentSection::create(['category_id' => $category->id, 'title' => 'Auditori', 'description' => 'Bagian pendengaran', 'sort_order' => 1, 'result_template' => 'child_sensory']);
        $s2 = AssessmentSection::create(['category_id' => $category->id, 'title' => 'Umum', 'sort_order' => 2]);

        $q = fn (AssessmentSection $s, int $no, array $attrs) => AssessmentQuestion::create($attrs + [
            'category_id' => $category->id, 'section_id' => $s->id, 'item_no' => $no, 'sort_order' => $no, 'is_required' => true,
        ]);

        $questions = [
            'scale' => $q($s1, 1, ['question_type' => 'scale_0_5', 'question' => 'Respon terhadap suara']),
            'scale2' => $q($s1, 2, ['question_type' => 'scale_0_5', 'question' => 'Menutup telinga']),
            'multi' => $q($s2, 1, ['question_type' => 'checkbox_multi', 'question' => 'Hal yang disukai', 'options' => ['Musik', 'Gambar', 'Gerak'], 'is_required' => false]),
            'text' => $q($s2, 2, ['question_type' => 'free_text', 'question' => 'Catatan orang tua', 'is_required' => false]),
        ];

        return ['category' => $category, 'sections' => [$s1, $s2], 'questions' => $questions];
    }

    protected function makeAssessmentPackage(int $price = 750000): MasterPackage
    {
        return MasterPackage::create([
            'code' => 'pkg-asesmen', 'invoice_code' => 'ASM', 'name' => 'Paket Asesmen', 'credits' => 0, 'price' => $price,
            'leave_quota' => 0, 'is_satuan' => true, 'is_assessment' => true, 'is_active' => true,
        ]);
    }
}
