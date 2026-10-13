<?php

namespace App\Models;

use App\Models\Concerns\BranchScoped;
use App\Models\Concerns\TracksActors;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ClientLeave extends Model
{
    use BranchScoped, TracksActors;

    protected $table = 'client_leaves';

    /** @var list<string> kolom pelaku yang diisi otomatis oleh TracksActors */
    protected array $actorColumns = ['created_by', 'updated_by'];

    /** @var list<string> */
    protected $fillable = [
        'branch_id',
        'client_id',
        'start_date',
        'end_date',
        'counted_start',
        'counted_end',
        'return_date',
        'return_note',
        'returned_at',
        'returned_by',
        'status',
        'reason',
        'note',
        'void_reason',
        'voided_at',
        'voided_by',
    ];

    protected function casts(): array
    {
        return [
            'start_date' => 'date',
            'end_date' => 'date',
            'counted_start' => 'date',
            'counted_end' => 'date',
            'return_date' => 'date',
            'returned_at' => 'datetime',
            'voided_at' => 'datetime',
        ];
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class, 'branch_id');
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class, 'client_id');
    }

    public function invoicesViaLeave(): HasMany
    {
        return $this->hasMany(Invoice::class, 'leave_id');
    }

    public function schedulesViaLeave(): HasMany
    {
        return $this->hasMany(Schedule::class, 'leave_id');
    }

    public function clientLeaveSessionsViaLeave(): HasMany
    {
        return $this->hasMany(ClientLeaveSession::class, 'leave_id');
    }
}
