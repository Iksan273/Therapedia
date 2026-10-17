<?php

namespace App\Actions\Assessment;

use App\Models\AssessmentQuestion;
use App\Models\AssessmentSection;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

/** CRUD soal kuesioner. Edit bebas (hasil lama aman karena snapshot); hapus hanya ditolak selama ada kuesioner yang sedang diisi (draft). */
class QuestionActions
{
    public function __construct(private readonly SectionActions $sections) {}

    public function create(int $sectionId, array $data): AssessmentQuestion
    {
        $section = AssessmentSection::query()->findOrFail($sectionId);
        $data['section_id'] = $sectionId;
        $data['category_id'] = $section->category_id;
        $data['item_no'] ??= ((int) AssessmentQuestion::query()->where('section_id', $sectionId)->max('item_no')) + 1;
        $data['sort_order'] ??= ((int) AssessmentQuestion::query()->where('section_id', $sectionId)->max('sort_order')) + 1;

        return AssessmentQuestion::create($this->normalize($data))->refresh();
    }

    public function update(int $id, array $data): AssessmentQuestion
    {
        return DB::transaction(function () use ($id, $data): AssessmentQuestion {
            $question = AssessmentQuestion::query()->lockForUpdate()->findOrFail($id);
            $question->fill($this->normalize($data + ['question_type' => $question->question_type]))->save();

            return $question->refresh();
        });
    }

    /** Urutan soal dalam satu section = posisi id di `$ids` (harus memuat semua soal section). */
    public function reorder(int $sectionId, array $ids): void
    {
        DB::transaction(function () use ($sectionId, $ids): void {
            $existing = AssessmentQuestion::query()->where('section_id', $sectionId)->lockForUpdate()->pluck('id')->all();
            $this->sections->assertSameSet($existing, $ids);
            foreach (array_values($ids) as $position => $id) {
                AssessmentQuestion::query()->whereKey($id)->update(['sort_order' => $position + 1, 'updated_by' => Auth::id()]);
            }
        });
    }

    public function delete(int $id): void
    {
        DB::transaction(function () use ($id): void {
            $question = AssessmentQuestion::query()->lockForUpdate()->findOrFail($id);
            // Jawaban lama aman (teks soal ada di snapshot tiap hasil); hanya kuesioner yang SEDANG diisi yang menahan hapus
            $this->sections->guardNotUsed($question->category_id, "Soal no. {$question->item_no}");
            $question->delete();
        });
    }

    /** Kolom yang tidak relevan untuk tipe soal dikosongkan agar data konsisten. */
    private function normalize(array $data): array
    {
        $type = $data['question_type'] ?? 'scale_0_5';
        if (! in_array($type, ['multiple_choice', 'checkbox_multi', 'dropdown', 'scale_0_5'], true)) {
            $data['options'] = null;
        }
        if (! in_array($type, ['scale_0_5', 'range'], true)) {
            $data['range_min'] = $data['range_max'] = $data['range_min_label'] = $data['range_max_label'] = null;
        }

        return $data;
    }
}
