<?php

namespace App\Services;

use App\Models\AssessmentAccessCode;
use App\Models\AssessmentCategory;
use App\Models\AssessmentQuestion;
use App\Models\AssessmentSection;
use App\Support\AssessmentRespondent;

/**
 * Snapshot struktur kuesioner (kategori → section → soal). Dibuat sekali per kode saat pengisian dimulai (draft pertama /
 * submit) lalu dibekukan di `assessment_access_codes.structure_snapshot`: edit master sesudahnya tidak mengubah draft
 * maupun hasil lama. Kode yang belum diisi memakai struktur master terbaru (`live`).
 */
class AssessmentSnapshotService
{
    /** @return array<string, mixed> struktur master saat ini (tanpa menyimpan) */
    public function live(int $categoryId): array
    {
        $category = AssessmentCategory::query()->findOrFail($categoryId);
        $questions = AssessmentQuestion::query()->where('category_id', $categoryId)
            ->orderBy('sort_order')->orderBy('item_no')->orderBy('id')->get()->groupBy('section_id');

        $sections = AssessmentSection::query()->where('category_id', $categoryId)->orderBy('sort_order')->orderBy('id')->get()
            ->map(fn (AssessmentSection $s) => [
                'id' => $s->id,
                'title' => $s->title,
                'description' => $s->description,
                'document_url' => $s->document_url,
                'document_name' => $s->document_path ? $s->document_name : null,
                'document_path' => $s->document_path, // internal (file yang dibekukan); dibuang dari respons lewat publicStructure()
                'has_document_file' => $s->document_path !== null,
                'result_template' => $s->result_template,
                'sort_order' => $s->sort_order,
                'questions' => ($questions->get($s->id) ?? collect())->map(fn (AssessmentQuestion $q) => [
                    'id' => $q->id,
                    'item_no' => $q->item_no,
                    'question_type' => $q->question_type,
                    'question' => $q->question,
                    'options' => $q->options,
                    'range_min' => $q->range_min,
                    'range_max' => $q->range_max,
                    'range_min_label' => $q->range_min_label,
                    'range_max_label' => $q->range_max_label,
                    'is_required' => (bool) $q->is_required,
                    'sort_order' => $q->sort_order,
                ])->values()->all(),
            ])->values()->all();

        return [
            'category' => [
                'id' => $category->id, 'type_code' => $category->type_code, 'name' => $category->name, 'domain' => $category->domain,
                'respondent_profile' => $category->respondent_profile,
                'respondent_fields' => array_values(AssessmentRespondent::fields($category->respondent_profile)),
            ],
            'sections' => $sections,
        ];
    }

    /** Struktur untuk respons API: path file di storage tidak ikut terkirim. */
    public function publicStructure(array $structure): array
    {
        $structure['sections'] = array_map(function (array $section): array {
            unset($section['document_path']);

            return $section;
        }, $structure['sections'] ?? []);

        return $structure;
    }

    /** Struktur yang berlaku untuk kode: snapshot bila sudah dibekukan, kalau belum master terbaru. */
    public function structureFor(AssessmentAccessCode $code): array
    {
        return $code->structure_snapshot ?? $this->live($code->category_id);
    }

    /** Bekukan struktur master saat ini bila belum (idempoten). Panggil di dalam transaksi dengan baris kode terkunci. */
    public function freeze(AssessmentAccessCode $code): array
    {
        if ($code->structure_snapshot !== null) {
            return $code->structure_snapshot;
        }

        $snapshot = $this->live($code->category_id);
        $code->forceFill(['structure_snapshot' => $snapshot, 'snapshot_at' => now()])->save();

        return $snapshot;
    }

    /**
     * Peta id soal → definisi soal (dengan `section_id`) dari sebuah struktur.
     *
     * @return array<int, array<string, mixed>>
     */
    public function questionIndex(array $structure): array
    {
        $index = [];
        foreach ($structure['sections'] ?? [] as $section) {
            foreach ($section['questions'] ?? [] as $question) {
                $index[(int) $question['id']] = $question + ['section_id' => (int) $section['id']];
            }
        }

        return $index;
    }

    public function questionCount(array $structure): int
    {
        return count($this->questionIndex($structure));
    }
}
