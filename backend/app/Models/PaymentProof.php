<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PaymentProof extends Model
{
    protected $table = 'payment_proofs';

    public $timestamps = false;

    /** @var list<string> */
    protected $fillable = [
        'invoice_id',
        'file_path',
        'file_name',
        'mime_type',
        'file_size',
        'uploaded_by_type',
        'uploaded_by_id',
        'uploaded_at',
    ];

    protected function casts(): array
    {
        return [
            'uploaded_at' => 'datetime',
        ];
    }

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class, 'invoice_id');
    }
}
