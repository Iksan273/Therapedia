<?php

namespace App\Services;

use App\Exceptions\NotImplementedException;

/**
 * Mesin & kuesioner (M5): kategori, section, soal, kode, kuesioner publik (buka, draft, submit sekali).
 *
 * SKELETON setup: tanda tangan method saja; logika (transaksi, aturan bisnis) diisi per use-case.
 * Acuan aturan: schema.md §06 dan frontend/src/domain/*.
 */
class AssessmentService
{
    /** list ber-pagination (default 10, maks 50), pencarian prefix, BranchScope */
    public function paginateCategory(array $filters = []): mixed
    {
        throw new NotImplementedException('AssessmentService::paginateCategory');
    }

    public function findCategory(string $id): mixed
    {
        throw new NotImplementedException('AssessmentService::findCategory');
    }

    public function createCategory(array $data): mixed
    {
        throw new NotImplementedException('AssessmentService::createCategory');
    }

    /** kirim `version` bila entity ber-optimistic-lock */
    public function updateCategory(string $id, array $data): mixed
    {
        throw new NotImplementedException('AssessmentService::updateCategory');
    }

    public function deleteCategory(string $id): void
    {
        throw new NotImplementedException('AssessmentService::deleteCategory');
    }

    public function sections(string $categoryId): mixed
    {
        throw new NotImplementedException('AssessmentService::sections');
    }

    public function createSection(string $categoryId, array $data): mixed
    {
        throw new NotImplementedException('AssessmentService::createSection');
    }

    public function findSection(string $id): mixed
    {
        throw new NotImplementedException('AssessmentService::findSection');
    }

    public function updateSection(string $id, array $data): mixed
    {
        throw new NotImplementedException('AssessmentService::updateSection');
    }

    public function deleteSection(string $id): void
    {
        throw new NotImplementedException('AssessmentService::deleteSection');
    }

    public function questions(string $sectionId): mixed
    {
        throw new NotImplementedException('AssessmentService::questions');
    }

    public function createQuestion(string $sectionId, array $data): mixed
    {
        throw new NotImplementedException('AssessmentService::createQuestion');
    }

    public function findQuestion(string $id): mixed
    {
        throw new NotImplementedException('AssessmentService::findQuestion');
    }

    public function updateQuestion(string $id, array $data): mixed
    {
        throw new NotImplementedException('AssessmentService::updateQuestion');
    }

    public function deleteQuestion(string $id): void
    {
        throw new NotImplementedException('AssessmentService::deleteQuestion');
    }

    public function codes(string $clientId): mixed
    {
        throw new NotImplementedException('AssessmentService::codes');
    }

    /** IssueAssessmentCodeAction (+ invoice assessment bila berbayar) */
    public function issueCode(string $clientId, array $data): mixed
    {
        throw new NotImplementedException('AssessmentService::issueCode');
    }

    /** ditolak 409 `draft_exists` bila sudah punya draft */
    public function deleteCode(string $id): void
    {
        throw new NotImplementedException('AssessmentService::deleteCode');
    }

    /** OpenAssessmentAction: cek expiry, bukti bayar, muat draft */
    public function open(string $code): mixed
    {
        throw new NotImplementedException('AssessmentService::open');
    }

    /** upsert 1 baris per kode, cek `version` */
    public function saveDraft(string $code, array $data): mixed
    {
        throw new NotImplementedException('AssessmentService::saveDraft');
    }

    /** SubmitAssessmentAction: validasi wajib + consent, skor kuadran server, hapus draft */
    public function submit(string $code, array $data): mixed
    {
        throw new NotImplementedException('AssessmentService::submit');
    }
}
