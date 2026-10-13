<?php

namespace App\Models;

use App\Models\Concerns\TracksActors;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Service extends Model
{
    use TracksActors;

    protected $table = 'services';

    /** @var list<string> kolom pelaku yang diisi otomatis oleh TracksActors */
    protected array $actorColumns = ['updated_by'];

    protected $primaryKey = 'code';

    public $incrementing = false;

    protected $keyType = 'string';

    /** @var list<string> */
    protected $fillable = [
        'code',
        'label',
        'category',
        'description',
        'is_active',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    public function clientServicesViaServiceCode(): HasMany
    {
        return $this->hasMany(ClientService::class, 'service_code', 'code');
    }

    public function schedulesViaServiceCode(): HasMany
    {
        return $this->hasMany(Schedule::class, 'service_code', 'code');
    }
}
