<?php

namespace App\Models;

use App\Models\Concerns\TracksActors;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MasterPackage extends Model
{
    use TracksActors;

    protected $table = 'master_packages';

    /** @var list<string> kolom pelaku yang diisi otomatis oleh TracksActors */
    protected array $actorColumns = ['updated_by'];

    /** @var list<string> */
    protected $fillable = [
        'code',
        'invoice_code',
        'name',
        'credits',
        'price',
        'description',
        'leave_quota',
        'is_satuan',
        'is_assessment',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'is_satuan' => 'boolean',
            'is_assessment' => 'boolean',
            'is_active' => 'boolean',
        ];
    }

    public function invoices(): HasMany
    {
        return $this->hasMany(Invoice::class, 'master_package_id');
    }

    public function clientPackages(): HasMany
    {
        return $this->hasMany(ClientPackage::class, 'master_package_id');
    }
}
