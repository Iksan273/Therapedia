<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class InvoiceCounter extends Model
{
    protected $table = 'invoice_counters';

    // PK komposit (type_code, counter_date): Eloquent hanya mengenali satu kunci; akses lewat query builder / where dua kolom.
    protected $primaryKey = 'type_code';

    public $incrementing = false;

    protected $keyType = 'string';

    public $timestamps = false;

    /** @var list<string> */
    protected $fillable = [
        'type_code',
        'counter_date',
        'last_number',
    ];

    protected function casts(): array
    {
        return [
            'counter_date' => 'date',
        ];
    }
}
