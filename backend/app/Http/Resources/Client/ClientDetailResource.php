<?php

namespace App\Http\Resources\Client;

use App\Models\Client;
use Illuminate\Http\Request;

/**
 * Satu payload Client Detail: biodata lengkap + layanan + link GDrive (+ ringkasan invoice & paket bila dimuat).
 * Kode kuesioner ditambahkan di M5.
 *
 * @mixin Client
 */
class ClientDetailResource extends ClientListResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return parent::toArray($request) + [
            'parent_email' => $this->parent_email,
            'address' => $this->address,
            'intake_note' => $this->intake_note,
            'discharge_note' => $this->discharge_note,
            'leave_granted' => (int) $this->leave_granted,
            'leave_credit_balance' => (int) $this->leave_credit_balance,
            'leftover_balance' => (int) $this->leftover_balance,
            'gdrive_links' => $this->whenLoaded('clientDocuments', fn () => ClientDocumentResource::collection(
                $this->clientDocuments->where('type', 'gdrive_folder')->values()
            )->resolve()),
            'invoices' => $this->whenLoaded('invoices', fn () => $this->invoices->map(fn ($i) => [
                'id' => $i->id,
                'invoice_number' => $i->invoice_number,
                'invoice_type' => $i->invoice_type,
                'package_name' => $i->package_name,
                'amount' => (int) $i->amount,
                'status' => $i->status,
                'issued_at' => $i->issued_at?->toIso8601String(),
            ])->values()->all()),
            'packages' => $this->whenLoaded('clientPackages', fn () => $this->clientPackages->map(fn ($p) => [
                'id' => $p->id,
                'package_name' => $p->package_name,
                'total_credit' => (int) $p->total_credit,
                'remaining_credit' => (int) $p->remaining_credit,
                'status' => $p->status,
            ])->values()->all()),
        ];
    }
}
