<?php

namespace App\Models;

use App\Models\Concerns\BranchScoped;
use App\Models\Concerns\TracksActors;
use App\Models\Concerns\Versioned;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Invoice extends Model
{
    use BranchScoped, TracksActors, Versioned;

    protected $table = 'invoices';

    /** @var list<string> kolom pelaku yang diisi otomatis oleh TracksActors */
    protected array $actorColumns = ['created_by', 'updated_by'];

    /** @var list<string> */
    protected $fillable = [
        'invoice_number',
        'client_id',
        'branch_id',
        'master_package_id',
        'invoice_type',
        'assessment_access_code_id',
        'leave_id',
        'leave_schedule_id',
        'type_code',
        'is_renewal',
        'package_name',
        'credits',
        'amount',
        'gross_amount',
        'balance_applied',
        'status',
        'void_reason',
        'void_credit_action',
        'reset_leave',
        'refund_amount',
        'refunded_at',
        'refunded_by',
        'refund_reason',
        'refund_credits',
        'voided_at',
        'voided_by',
        'replaces_invoice_id',
        'issued_at',
        'paid_at',
        'verified_by',
        'verified_at',
        'payment_method',
        'renewal_reason',
        'proof_upload_count',
    ];

    protected function casts(): array
    {
        return [
            'is_renewal' => 'boolean',
            'reset_leave' => 'boolean',
            'refunded_at' => 'datetime',
            'voided_at' => 'datetime',
            'issued_at' => 'datetime',
            'paid_at' => 'datetime',
            'verified_at' => 'datetime',
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

    public function masterPackage(): BelongsTo
    {
        return $this->belongsTo(MasterPackage::class, 'master_package_id');
    }

    public function assessmentAccessCode(): BelongsTo
    {
        return $this->belongsTo(AssessmentAccessCode::class, 'assessment_access_code_id');
    }

    public function leave(): BelongsTo
    {
        return $this->belongsTo(ClientLeave::class, 'leave_id');
    }

    public function leaveSchedule(): BelongsTo
    {
        return $this->belongsTo(Schedule::class, 'leave_schedule_id');
    }

    public function replacesInvoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class, 'replaces_invoice_id');
    }

    public function paymentProofs(): HasMany
    {
        return $this->hasMany(PaymentProof::class, 'invoice_id');
    }

    public function clientPackages(): HasMany
    {
        return $this->hasMany(ClientPackage::class, 'invoice_id');
    }

    public function packageConversions(): HasMany
    {
        return $this->hasMany(PackageConversion::class, 'invoice_id');
    }

    public function creditLedgers(): HasMany
    {
        return $this->hasMany(CreditLedger::class, 'invoice_id');
    }

    public function invoiceLogs(): HasMany
    {
        return $this->hasMany(InvoiceLog::class, 'invoice_id');
    }
}
