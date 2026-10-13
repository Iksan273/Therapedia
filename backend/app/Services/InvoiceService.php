<?php

namespace App\Services;

use App\Exceptions\NotImplementedException;

/**
 * Invoice (M7, modul finance): terbit, bukti, Tandai Lunas, Void, Refund, renewal, konversi paket. Memakai InvoiceNumberService & CreditService.
 *
 * SKELETON setup: tanda tangan method saja; logika (transaksi, aturan bisnis) diisi per use-case.
 * Acuan aturan: schema.md §06 dan frontend/src/domain/*.
 */
class InvoiceService
{
    /** list ber-pagination (default 10, maks 50), pencarian prefix, BranchScope */
    public function paginate(array $filters = []): mixed
    {
        throw new NotImplementedException('InvoiceService::paginate');
    }

    public function find(string $id): mixed
    {
        throw new NotImplementedException('InvoiceService::find');
    }

    public function create(array $data): mixed
    {
        throw new NotImplementedException('InvoiceService::create');
    }

    /** kirim `version` bila entity ber-optimistic-lock */
    public function update(string $id, array $data): mixed
    {
        throw new NotImplementedException('InvoiceService::update');
    }

    public function delete(string $id): void
    {
        throw new NotImplementedException('InvoiceService::delete');
    }

    /** IssueInvoiceAction */
    public function issue(array $data): mixed
    {
        throw new NotImplementedException('InvoiceService::issue');
    }

    public function proofs(string $invoiceId): mixed
    {
        throw new NotImplementedException('InvoiceService::proofs');
    }

    /** UploadPaymentProofAction: JPG/PNG/PDF ≤ 5 MB */
    public function uploadProof(string $invoiceId, mixed $file): mixed
    {
        throw new NotImplementedException('InvoiceService::uploadProof');
    }

    /** VerifyPaymentAction: aktivasi paket + ledger + relink sesi */
    public function markPaid(string $id, array $data): mixed
    {
        throw new NotImplementedException('InvoiceService::markPaid');
    }

    /** VoidInvoiceAction: hanya bila kredit belum dipakai */
    public function void(string $id, array $data): mixed
    {
        throw new NotImplementedException('InvoiceService::void');
    }

    public function refund(string $id, array $data): mixed
    {
        throw new NotImplementedException('InvoiceService::refund');
    }

    /** DirectRenewalAction */
    public function directRenewal(array $data): mixed
    {
        throw new NotImplementedException('InvoiceService::directRenewal');
    }

    /** ConvertPackageAction */
    public function convertPackage(string $id, array $data): mixed
    {
        throw new NotImplementedException('InvoiceService::convertPackage');
    }
}
