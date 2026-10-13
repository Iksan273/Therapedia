<?php

namespace App\Models;

use App\Models\Concerns\TracksActors;
use Illuminate\Database\Eloquent\Model;

class LeaveReset extends Model
{
    use TracksActors;

    protected $table = 'leave_resets';

    /** @var list<string> kolom pelaku yang diisi otomatis oleh TracksActors */
    protected array $actorColumns = ['created_by'];

    /** @var list<string> */
    protected $fillable = [
        'reset_date',
        'clients_count',
        'forfeited_days',
    ];

    protected function casts(): array
    {
        return [
            'reset_date' => 'date',
        ];
    }
}
