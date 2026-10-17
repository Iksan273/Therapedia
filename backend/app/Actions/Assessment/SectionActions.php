<?php

namespace App\Actions\Assessment;

use App\Exceptions\ApiException;
use App\Models\AssessmentAccessCode;
use App\Models\AssessmentCategory;
use App\Models\AssessmentSection;
use App\Services\AssessmentDocumentFiles;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

/**
 * CRUD section + dokumen PDF (ADR 0007: file di storage privat; satu sumber saja, link ATAU file).
 */
class SectionActions
{
    public const DOCUMENT_DIR = 'assessment-documents';

    public function __construct(private readonly AssessmentDocumentFiles $files) {}

    public function create(int $categoryId, array $data): AssessmentSection
    {
        AssessmentCategory::query()->findOrFail($categoryId);
        $data['category_id'] = $categoryId;
        $data['sort_order'] ??= ((int) AssessmentSection::query()->where('category_id', $categoryId)->max('sort_order')) + 1;

        return AssessmentSection::create($data)->refresh();
    }

    public function update(int $id, array $data): AssessmentSection
    {
        $oldPath = null;
        $section = DB::transaction(function () use ($id, $data, &$oldPath): AssessmentSection {
            $section = AssessmentSection::query()->lockForUpdate()->findOrFail($id);
            // Mengisi link menggantikan file yang ada (satu sumber)
            if (! empty($data['document_url'])) {
                $oldPath = $section->document_path;
                $data += ['document_path' => null, 'document_name' => null, 'document_size' => null];
            }
            $section->fill($data)->save();

            return $section->refresh();
        });

        $this->deleteStored($oldPath);

        return $section;
    }

    public function delete(int $id): void
    {
        $path = DB::transaction(function () use ($id): ?string {
            $section = AssessmentSection::query()->lockForUpdate()->findOrFail($id);
            $this->guardNotUsed($section->category_id, "Section \"{$section->title}\"");
            $path = $section->document_path;
            $section->delete();

            return $path;
        });

        $this->deleteStored($path);
    }

    /** Urutan section = posisi id di `$ids` (harus memuat semua section kategori ini). */
    public function reorder(int $categoryId, array $ids): void
    {
        DB::transaction(function () use ($categoryId, $ids): void {
            $existing = AssessmentSection::query()->where('category_id', $categoryId)->lockForUpdate()->pluck('id')->all();
            $this->assertSameSet($existing, $ids);
            foreach (array_values($ids) as $position => $id) {
                AssessmentSection::query()->whereKey($id)->update(['sort_order' => $position + 1, 'updated_by' => Auth::id()]);
            }
        });
    }

    /** @param  list<int>  $existing */
    public function assertSameSet(array $existing, array $ids): void
    {
        $given = array_map('intval', $ids);
        sort($existing);
        sort($given);
        if ($existing !== $given) {
            throw ApiException::validation(['ids' => ['Daftar urutan harus memuat semua item tepat satu kali.']]);
        }
    }

    public function uploadDocument(int $id, UploadedFile $file): AssessmentSection
    {
        $stored = $file->store(self::DOCUMENT_DIR);
        $old = null;

        $section = DB::transaction(function () use ($id, $file, $stored, &$old): AssessmentSection {
            $section = AssessmentSection::query()->lockForUpdate()->findOrFail($id);
            $old = $section->document_path;
            $section->fill([
                'document_url' => null,
                'document_path' => $stored,
                'document_name' => mb_substr($file->getClientOriginalName(), 0, 255),
                'document_size' => (int) $file->getSize(),
            ])->save();

            return $section->refresh();
        });

        $this->deleteStored($old);

        return $section;
    }

    public function deleteDocument(int $id): AssessmentSection
    {
        $old = null;
        $section = DB::transaction(function () use ($id, &$old): AssessmentSection {
            $section = AssessmentSection::query()->lockForUpdate()->findOrFail($id);
            $old = $section->document_path;
            $section->fill(['document_url' => null, 'document_path' => null, 'document_name' => null, 'document_size' => null])->save();

            return $section->refresh();
        });

        $this->deleteStored($old);

        return $section;
    }

    /**
     * Hapus soal/section hanya bila tidak ada kuesioner kategori itu yang SEDANG diisi (draft; struktur dibekukan). Yang sudah dikirim
     * tidak menahan: hasilnya memakai salinan beku lengkap, bukan soal di master.
     */
    public function guardNotUsed(int $categoryId, string $label): void
    {
        $filling = AssessmentAccessCode::query()->where('category_id', $categoryId)->where('status', 'issued')->whereNotNull('snapshot_at')->count();
        if ($filling > 0) {
            throw ApiException::inUse("{$label} masih dipakai {$filling} kuesioner yang sedang diisi. Tunggu selesai diisi lalu hapus.");
        }
    }

    // File lama dipertahankan selama masih dirujuk kuesioner yang sedang diisi (struktur beku); lihat AssessmentDocumentFiles
    private function deleteStored(?string $path): void
    {
        $this->files->release($path);
    }
}
