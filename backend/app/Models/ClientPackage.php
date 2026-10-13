<?php

namespace App\Models;

use App\Models\Concerns\TracksActors;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ClientPackage extends Model
{
    use TracksActors;

    protected $table = 'client_packages';

    /** @var list<string> kolom pelaku yang diisi otomatis oleh TracksActors */
    protected array $actorColumns = ['updated_by'];

    /** @var list<string> */
    protected $fillable = [
        'client_id',
        'invoice_id',
        'master_package_id',
        'package_name',
        'package_price',
        'total_credit',
        'remaining_credit',
        'cancel_count',
        'leave_total',
        'leave_used',
        'is_refunded',
        'status',
        'converted_from_package_id',
        'converted_to_package_id',
        'activated_at',
    ];

    protected function casts(): array
    {
        return [
            'is_refunded' => 'boolean',
            'activated_at' => 'datetime',
        ];
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class, 'client_id');
    }

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class, 'invoice_id');
    }

    public function masterPackage(): BelongsTo
    {
        return $this->belongsTo(MasterPackage::class, 'master_package_id');
    }

    public function convertedFromPackage(): BelongsTo
    {
        return $this->belongsTo(ClientPackage::class, 'converted_from_package_id');
    }

    public function convertedToPackage(): BelongsTo
    {
        return $this->belongsTo(ClientPackage::class, 'converted_to_package_id');
    }

    public function schedules(): HasMany
    {
        return $this->hasMany(Schedule::class, 'client_package_id');
    }

    public function packageConversionsViaFromPackage(): HasMany
    {
        return $this->hasMany(PackageConversion::class, 'from_package_id');
    }

    public function packageConversionsViaToPackage(): HasMany
    {
        return $this->hasMany(PackageConversion::class, 'to_package_id');
    }

    public function creditLedgers(): HasMany
    {
        return $this->hasMany(CreditLedger::class, 'client_package_id');
    }
}
