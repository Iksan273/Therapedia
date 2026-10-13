<?php

namespace App\Models;

use App\Models\Concerns\BranchScoped;
use App\Models\Concerns\TracksActors;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;

class Client extends Authenticatable
{
    use BranchScoped, HasApiTokens, TracksActors;

    protected $table = 'clients';

    /** @var list<string> kolom pelaku yang diisi otomatis oleh TracksActors */
    protected array $actorColumns = ['created_by', 'updated_by'];

    /** @var list<string> */
    protected $fillable = [
        'client_code',
        'branch_id',
        'child_name',
        'gender',
        'date_of_birth',
        'parent_name',
        'parent_phone',
        'parent_email',
        'address',
        'intake_note',
        'status',
        'final_outcome',
        'status_changed_at',
        'date_of_join',
        'date_of_discharge',
        'date_of_discontinue',
        'discharge_reason',
        'discharge_note',
        'credit_balance',
        'leave_granted',
        'leave_credit_balance',
        'leave_reset_at',
        'leftover_balance',
        'last_login_at',
    ];

    protected function casts(): array
    {
        return [
            'date_of_birth' => 'date',
            'status_changed_at' => 'datetime',
            'date_of_join' => 'date',
            'date_of_discharge' => 'date',
            'date_of_discontinue' => 'date',
            'leave_reset_at' => 'date',
            'last_login_at' => 'datetime',
        ];
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class, 'branch_id');
    }

    public function clientServices(): HasMany
    {
        return $this->hasMany(ClientService::class, 'client_id');
    }

    public function clientDocuments(): HasMany
    {
        return $this->hasMany(ClientDocument::class, 'client_id');
    }

    public function assessmentAccessCodes(): HasMany
    {
        return $this->hasMany(AssessmentAccessCode::class, 'client_id');
    }

    public function assessmentResponses(): HasMany
    {
        return $this->hasMany(AssessmentResponse::class, 'client_id');
    }

    public function invoices(): HasMany
    {
        return $this->hasMany(Invoice::class, 'client_id');
    }

    public function clientPackages(): HasMany
    {
        return $this->hasMany(ClientPackage::class, 'client_id');
    }

    public function scheduleSeries(): HasMany
    {
        return $this->hasMany(ScheduleSeries::class, 'client_id');
    }

    public function clientLeaves(): HasMany
    {
        return $this->hasMany(ClientLeave::class, 'client_id');
    }

    public function schedules(): HasMany
    {
        return $this->hasMany(Schedule::class, 'client_id');
    }

    public function sessionReports(): HasMany
    {
        return $this->hasMany(SessionReport::class, 'client_id');
    }

    public function packageConversions(): HasMany
    {
        return $this->hasMany(PackageConversion::class, 'client_id');
    }

    public function creditLedgers(): HasMany
    {
        return $this->hasMany(CreditLedger::class, 'client_id');
    }
}
