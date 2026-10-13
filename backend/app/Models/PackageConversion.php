<?php

namespace App\Models;

use App\Models\Concerns\TracksActors;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PackageConversion extends Model
{
    use TracksActors;

    protected $table = 'package_conversions';

    /** @var list<string> kolom pelaku yang diisi otomatis oleh TracksActors */
    protected array $actorColumns = ['created_by'];

    public $timestamps = false;

    /** @var list<string> */
    protected $fillable = [
        'client_id',
        'invoice_id',
        'from_package_id',
        'to_package_id',
        'from_remaining',
        'to_sessions',
        'remaining_value',
        'leftover_amount',
        'mode',
        'reason',
        'deleted_schedule_count',
    ];

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class, 'client_id');
    }

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class, 'invoice_id');
    }

    public function fromPackage(): BelongsTo
    {
        return $this->belongsTo(ClientPackage::class, 'from_package_id');
    }

    public function toPackage(): BelongsTo
    {
        return $this->belongsTo(ClientPackage::class, 'to_package_id');
    }

    public function creditLedgersViaConversion(): HasMany
    {
        return $this->hasMany(CreditLedger::class, 'conversion_id');
    }
}
