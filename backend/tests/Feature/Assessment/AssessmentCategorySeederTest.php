<?php

namespace Tests\Feature\Assessment;

use App\Models\AssessmentCategory;
use App\Models\AssessmentQuestion;
use Database\Seeders\AssessmentCategorySeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AssessmentCategorySeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_seeds_seven_categories_and_is_idempotent(): void
    {
        $this->seed(AssessmentCategorySeeder::class);

        $this->assertSame(['ADL', 'FMV', 'KON', 'SCP', 'SLC', 'SP2', 'TDL'], AssessmentCategory::query()->orderBy('type_code')->pluck('type_code')->all());
        $sp2 = AssessmentCategory::where('type_code', 'SP2')->firstOrFail();
        $this->assertSame(65, AssessmentQuestion::where('category_id', $sp2->id)->count());
        $this->assertSame('child_sensory', $sp2->assessmentSectionsViaCategory()->orderBy('sort_order')->first()->result_template);

        $choice = AssessmentQuestion::whereNotNull('options')->first();
        $this->assertIsArray($choice->options);

        // master diedit lalu seeder dijalankan ulang: tidak menimpa dan tidak menggandakan
        $sp2->update(['name' => 'Nama hasil edit master']);
        $this->seed(AssessmentCategorySeeder::class);
        $this->assertSame(7, AssessmentCategory::count());
        $this->assertSame('Nama hasil edit master', $sp2->fresh()->name);
        $this->assertSame(65, AssessmentQuestion::where('category_id', $sp2->id)->count());
    }
}
