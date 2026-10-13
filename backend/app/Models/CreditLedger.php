<?php

namespace App\Models;

use App\Models\Concerns\BranchScoped;
use App\Models\Concerns\TracksActors;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CreditLedger extends Model
{
    use BranchScoped, TracksActors;

    protected $table = 'credit_ledger';

    /** @var list<string> kolom pelaku yang diisi otomatis oleh TracksActors */
    protected array $actorColumns = ['created_by'];

    public $timestamps = false;

    /** @var list<string> */
    protected $fillable = [
        'client_id',
        'branch_id',
        'client_package_id',
        'schedule_id',
        'invoice_id',
        'action',
        'conversion_id',
        'credit_change',
        'leave_change',
        'package_balance_after',
        'client_balance_after',
        'cancel_count_after',
        'cancel_reason',
        'package_name',
        'note',
        'reverses_ledger_id',
        'idempotency_key',
        'batch_id',
    ];

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class, 'client_id');
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class, 'branch_id');
    }

    public function clientPackage(): BelongsTo
    {
        return $this->belongsTo(ClientPackage::class, 'client_package_id');
    }

    public function schedule(): BelongsTo
    {
        return $this->belongsTo(Schedule::class, 'schedule_id');
    }

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class, 'invoice_id');
    }

    public function conversion(): BelongsTo
    {
        return $this->belongsTo(PackageConversion::class, 'conversion_id');
    }

    public function reversesLedger(): BelongsTo
    {
        return $this->belongsTo(CreditLedger::class, 'reverses_ledger_id');
    }
}
