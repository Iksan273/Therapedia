<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InvoiceLog extends Model
{
    protected $table = 'invoice_logs';

    public $timestamps = false;

    /** @var list<string> */
    protected $fillable = [
        'invoice_id',
        'action',
        'actor_name',
        'actor_id',
        'note',
        'data',
    ];

    protected function casts(): array
    {
        return [
            'data' => 'array',
        ];
    }

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class, 'invoice_id');
    }
}
