<?php

namespace App\Models;

use App\Models\Concerns\BranchScoped;
use App\Models\Concerns\TracksActors;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Holiday extends Model
{
    use BranchScoped, TracksActors;

    protected $table = 'holidays';

    /** @var list<string> kolom pelaku yang diisi otomatis oleh TracksActors */
    protected array $actorColumns = ['created_by', 'updated_by'];

    /** NULL = libur semua cabang: tetap terlihat oleh staf cabang mana pun (BranchScope). */
    public bool $branchScopeIncludesNull = true;

    /** @var list<string> */
    protected $fillable = [
        'branch_id',
        'holiday_date',
        'name',
    ];

    protected function casts(): array
    {
        return [
            'holiday_date' => 'date',
        ];
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class, 'branch_id');
    }
}
