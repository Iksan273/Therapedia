<?php

namespace Database\Seeders;

use App\Models\AssessmentCategory;
use App\Models\AssessmentQuestion;
use App\Models\AssessmentSection;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Tujuh kategori kuesioner bawaan (SP2, SCP, FMV, SLC, ADL, KON, TDL) dari `data/assessment_categories.json`
 * (salinan seed demo frontend). Idempoten: kategori dengan `type_code` yang sudah ada TIDAK disentuh, jadi aman
 * dijalankan ulang di server yang master-nya sudah diedit.
 */
class AssessmentCategorySeeder extends Seeder
{
    public function run(): void
    {
        $data = json_decode((string) file_get_contents(__DIR__.'/data/assessment_categories.json'), true, flags: JSON_THROW_ON_ERROR);

        foreach ($data as $row) {
            if (AssessmentCategory::query()->where('type_code', $row['type_code'])->exists()) {
                continue;
            }

            DB::transaction(function () use ($row): void {
                $category = AssessmentCategory::create(['type_code' => $row['type_code'], 'name' => $row['name'], 'domain' => $row['domain'], 'respondent_profile' => $row['respondent_profile'] ?? 'parent']);

                foreach ($row['sections'] as $section) {
                    $created = AssessmentSection::create([
                        'category_id' => $category->id,
                        'title' => $section['title'],
                        'description' => $section['description'],
                        'document_url' => $section['document_url'],
                        'result_template' => $section['result_template'],
                        'sort_order' => $section['sort_order'],
                    ]);

                    $rows = array_map(fn (array $q) => array_merge($q, [
                        'category_id' => $category->id,
                        'section_id' => $created->id,
                        'options' => isset($q['options']) ? json_encode($q['options'], JSON_UNESCAPED_UNICODE) : null,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]), $section['questions']);

                    foreach (array_chunk($rows, 100) as $chunk) {
                        AssessmentQuestion::query()->insert($chunk);
                    }
                }
            });
        }
    }
}
