<?php

namespace App\Models;

use App\Models\Concerns\TracksActors;
use Illuminate\Database\Eloquent\Model;

class CancelReason extends Model
{
    use TracksActors;

    protected $table = 'cancel_reasons';

    /** @var list<string> kolom pelaku yang diisi otomatis oleh TracksActors */
    protected array $actorColumns = ['updated_by'];

    protected $primaryKey = 'code';

    public $incrementing = false;

    protected $keyType = 'string';

    /** @var list<string> */
    protected $fillable = [
        'code',
        'label',
        'is_active',
        'is_therapist_off',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'is_therapist_off' => 'boolean',
        ];
    }
}
