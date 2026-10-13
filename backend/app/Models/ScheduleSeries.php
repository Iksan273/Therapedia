<?php

namespace App\Models;

use App\Models\Concerns\BranchScoped;
use App\Models\Concerns\TracksActors;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ScheduleSeries extends Model
{
    use BranchScoped, TracksActors;

    protected $table = 'schedule_series';

    /** @var list<string> kolom pelaku yang diisi otomatis oleh TracksActors */
    protected array $actorColumns = ['created_by', 'updated_by'];

    /** @var list<string> */
    protected $fillable = [
        'client_id',
        'branch_id',
        'pattern',
        'weeks',
        'starts_on',
        'ends_on',
    ];

    protected function casts(): array
    {
        return [
            'pattern' => 'array',
            'starts_on' => 'date',
            'ends_on' => 'date',
        ];
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class, 'client_id');
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class, 'branch_id');
    }

    public function schedulesViaSeries(): HasMany
    {
        return $this->hasMany(Schedule::class, 'series_id');
    }
}
