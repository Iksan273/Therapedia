<?php

namespace App\Models;

use App\Models\Concerns\TracksActors;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Branch extends Model
{
    use TracksActors;

    protected $table = 'branches';

    /** @var list<string> kolom pelaku yang diisi otomatis oleh TracksActors */
    protected array $actorColumns = ['updated_by'];

    /** @var list<string> */
    protected $fillable = [
        'code',
        'name',
        'city',
        'address',
        'phone',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class, 'branch_id');
    }

    public function holidaies(): HasMany
    {
        return $this->hasMany(Holiday::class, 'branch_id');
    }

    public function clients(): HasMany
    {
        return $this->hasMany(Client::class, 'branch_id');
    }

    public function invoices(): HasMany
    {
        return $this->hasMany(Invoice::class, 'branch_id');
    }

    public function scheduleSeries(): HasMany
    {
        return $this->hasMany(ScheduleSeries::class, 'branch_id');
    }

    public function clientLeaves(): HasMany
    {
        return $this->hasMany(ClientLeave::class, 'branch_id');
    }

    public function schedules(): HasMany
    {
        return $this->hasMany(Schedule::class, 'branch_id');
    }

    public function creditLedgers(): HasMany
    {
        return $this->hasMany(CreditLedger::class, 'branch_id');
    }
}
