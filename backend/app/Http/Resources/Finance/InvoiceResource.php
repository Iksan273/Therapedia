<?php

namespace App\Http\Resources\Finance;

use App\Models\Invoice;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Invoice untuk Finance (daftar "Menunggu Pembayaran" / detail). `proofs` hanya ada bila dimuat (detail). `has_proof` turunan dari
 * `proof_upload_count`. `assessment_code` = kode kuesioner pemicu (invoice asesmen otomatis).
 *
 * @mixin Invoice
 */
class InvoiceResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'invoice_number' => $this->invoice_number,
            'invoice_type' => $this->invoice_type,
            'type_code' => $this->type_code,
            'status' => $this->status,
            'package_name' => $this->package_name,
            'credits' => (int) $this->credits,
            'amount' => (int) $this->amount,
            'gross_amount' => $this->gross_amount === null ? null : (int) $this->gross_amount,
            'is_renewal' => (bool) $this->is_renewal,
            'issued_at' => $this->issued_at?->toIso8601String(),
            'paid_at' => $this->paid_at?->toIso8601String(),
            'verified_at' => $this->verified_at?->toIso8601String(),
            'proof_upload_count' => (int) $this->proof_upload_count,
            'has_proof' => (int) $this->proof_upload_count > 0,
            'last_proof_id' => $this->when(isset($this->resource->last_proof_id), fn () => $this->resource->last_proof_id),
            'assessment_code' => $this->whenLoaded('assessmentAccessCode', fn () => $this->assessmentAccessCode?->code),
            'client' => $this->whenLoaded('client', fn () => $this->client ? [
                'id' => $this->client->id,
                'client_code' => $this->client->client_code,
                'child_name' => $this->client->child_name,
                'parent_name' => $this->client->parent_name,
            ] : null),
            'branch_id' => $this->branch_id,
            'branch' => $this->whenLoaded('branch', fn () => $this->branch ? ['id' => $this->branch->id, 'name' => $this->branch->name] : null),
            'proofs' => $this->whenLoaded('paymentProofs', fn () => $this->paymentProofs->map(fn ($p) => [
                'id' => $p->id,
                'file_name' => $p->file_name,
                'mime_type' => $p->mime_type,
                'file_size' => (int) $p->file_size,
                'uploaded_by_type' => $p->uploaded_by_type,
                'uploaded_at' => $p->uploaded_at?->toIso8601String(),
            ])->values()->all()),
            'version' => (int) $this->version,
        ];
    }
}
