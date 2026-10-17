<?php

namespace App\Actions\Assessment;

use App\Exceptions\ApiException;
use App\Models\AssessmentAccessCode;
use App\Models\AssessmentCategory;
use App\Models\AssessmentQuestion;
use App\Models\AssessmentResponse;
use App\Models\AssessmentSection;
use App\Services\AssessmentDocumentFiles;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/** CRUD kategori kuesioner (master asesmen). `type_code` tidak dapat diubah; hapus ditolak bila sudah ada kode/hasil. */
class CategoryActions
{
    public function create(array $data): AssessmentCategory
    {
        return AssessmentCategory::create($data)->refresh();
    }

    /**
     * Duplikat kategori (template mirip): salin seluruh section + soal ke kategori BARU (kode jenis & nama baru, version 1, tanpa kode/hasil/
     * snapshot milik asal). File PDF section ikut disalin ke file baru sehingga kedua kategori bisa diubah/dihapus tanpa saling memengaruhi.
     *
     * @param  array{type_code: string, name: string, domain?: ?string, respondent_profile?: string}  $data
     */
    public function duplicate(int $sourceId, array $data): AssessmentCategory
    {
        $source = AssessmentCategory::query()->findOrFail($sourceId);
        $copied = [];

        try {
            return DB::transaction(function () use ($source, $data, &$copied): AssessmentCategory {
                $category = AssessmentCategory::create([
                    'type_code' => $data['type_code'],
                    'name' => $data['name'],
                    'domain' => array_key_exists('domain', $data) ? $data['domain'] : $source->domain,
                    'respondent_profile' => $data['respondent_profile'] ?? $source->respondent_profile,
                ]);

                $sections = AssessmentSection::query()->where('category_id', $source->id)->orderBy('sort_order')->orderBy('id')->get();
                $questions = AssessmentQuestion::query()->where('category_id', $source->id)->get()->groupBy('section_id');

                foreach ($sections as $section) {
                    $path = $section->document_path;
                    if ($path !== null && Storage::exists($path)) {
                        $newPath = SectionActions::DOCUMENT_DIR.'/'.Str::uuid().'.pdf';
                        Storage::copy($path, $newPath);
                        $copied[] = $newPath;
                    } else {
                        $newPath = null;
                    }

                    $new = AssessmentSection::create([
                        'category_id' => $category->id,
                        'title' => $section->title,
                        'description' => $section->description,
                        'document_url' => $section->document_url,
                        'document_path' => $newPath,
                        'document_name' => $newPath ? $section->document_name : null,
                        'document_size' => $newPath ? $section->document_size : null,
                        'result_template' => $section->result_template,
                        'sort_order' => $section->sort_order,
                    ]);

                    $rows = ($questions->get($section->id) ?? collect())->map(fn (AssessmentQuestion $q) => [
                        'category_id' => $category->id,
                        'section_id' => $new->id,
                        'item_no' => $q->item_no,
                        'question_type' => $q->question_type,
                        'question' => $q->question,
                        'options' => $q->options === null ? null : json_encode($q->options, JSON_UNESCAPED_UNICODE),
                        'range_min' => $q->range_min,
                        'range_max' => $q->range_max,
                        'range_min_label' => $q->range_min_label,
                        'range_max_label' => $q->range_max_label,
                        'is_required' => $q->is_required,
                        'sort_order' => $q->sort_order,
                        'updated_by' => Auth::id(),
                        'created_at' => now(),
                        'updated_at' => now(),
                    ])->all();

                    foreach (array_chunk($rows, 100) as $chunk) {
                        AssessmentQuestion::query()->insert($chunk);
                    }
                }

                return $category->refresh();
            });
        } catch (\Throwable $e) {
            foreach ($copied as $file) {
                Storage::delete($file); // gagal: jangan tinggalkan salinan file yatim
            }
            throw $e;
        }
    }

    public function update(int $id, array $data): AssessmentCategory
    {
        return DB::transaction(function () use ($id, $data): AssessmentCategory {
            $category = AssessmentCategory::query()->lockForUpdate()->findOrFail($id);
            $category->assertVersion($data['version'] ?? null);
            unset($data['version']);

            // Kode jenis = awalan kode kuesioner: hanya boleh berubah selama belum ada kode yang terbit dari kategori ini
            if (isset($data['type_code']) && $data['type_code'] !== $category->type_code) {
                $codes = AssessmentAccessCode::query()->where('category_id', $id)->count();
                if ($codes > 0) {
                    throw ApiException::inUse("Kode jenis tidak dapat diubah karena sudah dipakai di {$codes} kode kuesioner.");
                }
            }
            $category->fill($data)->save();

            return $category->refresh();
        });
    }

    public function delete(int $id): void
    {
        $paths = [];

        DB::transaction(function () use ($id, &$paths): void {
            $category = AssessmentCategory::query()->lockForUpdate()->findOrFail($id);
            $codes = AssessmentAccessCode::query()->where('category_id', $id)->count();
            $responses = AssessmentResponse::query()->where('category_id', $id)->count();

            if ($codes + $responses > 0) {
                throw ApiException::inUse("Kategori \"{$category->name}\" sudah dipakai di {$codes} kode kuesioner. Nonaktifkan saja bila tidak dipakai lagi.");
            }

            $paths = $category->assessmentSectionsViaCategory()->whereNotNull('document_path')->pluck('document_path')->all();
            $category->delete(); // section & soal ikut terhapus (FK cascade)
        });

        // File PDF section ikut dibuang (kategori yang dipakai kode sudah ditolak di atas, jadi tidak ada snapshot yang merujuknya)
        foreach ($paths as $path) {
            app(AssessmentDocumentFiles::class)->release($path);
        }
    }
}
