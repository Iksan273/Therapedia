<?php

namespace App\Models;

use App\Models\Concerns\BranchScoped;
use App\Models\Concerns\TracksActors;
use App\Models\Concerns\Versioned;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Schedule extends Model
{
    use BranchScoped, TracksActors, Versioned;

    protected $table = 'schedules';

    /** @var list<string> kolom pelaku yang diisi otomatis oleh TracksActors */
    protected array $actorColumns = ['created_by', 'updated_by'];

    /** @var list<string> */
    protected $fillable = [
        'branch_id',
        'client_id',
        'therapist_id',
        'series_id',
        'client_package_id',
        'service_code',
        'type',
        'session_date',
        'start_time',
        'end_time',
        'status',
        'previous_status',
        'client_status_from',
        'client_status_to',
        'reverted_at',
        'credit_effect',
        'booking_note',
        'history_note',
        'history_note_by',
        'leave_id',
        'cancel_reason',
        'cancel_note',
        'cancelled_at',
        'cancelled_by',
        'completed_at',
        'completed_by',
        'origin_date',
        'origin_start_time',
        'origin_end_time',
        'origin_therapist_id',
        'prev_date',
        'prev_start_time',
        'prev_end_time',
        'prev_therapist_id',
        'rescheduled_at',
        'pending_reason',
        'pending_note',
        'pending_at',
    ];

    protected function casts(): array
    {
        return [
            'session_date' => 'date',
            'reverted_at' => 'datetime',
            'cancelled_at' => 'datetime',
            'completed_at' => 'datetime',
            'origin_date' => 'date',
            'prev_date' => 'date',
            'rescheduled_at' => 'datetime',
            'pending_at' => 'datetime',
        ];
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class, 'branch_id');
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class, 'client_id');
    }

    public function therapist(): BelongsTo
    {
        return $this->belongsTo(User::class, 'therapist_id');
    }

    public function series(): BelongsTo
    {
        return $this->belongsTo(ScheduleSeries::class, 'series_id');
    }

    public function clientPackage(): BelongsTo
    {
        return $this->belongsTo(ClientPackage::class, 'client_package_id');
    }

    public function service(): BelongsTo
    {
        return $this->belongsTo(Service::class, 'service_code', 'code');
    }

    public function leave(): BelongsTo
    {
        return $this->belongsTo(ClientLeave::class, 'leave_id');
    }

    public function originTherapist(): BelongsTo
    {
        return $this->belongsTo(User::class, 'origin_therapist_id');
    }

    public function prevTherapist(): BelongsTo
    {
        return $this->belongsTo(User::class, 'prev_therapist_id');
    }

    public function invoicesViaLeaveSchedule(): HasMany
    {
        return $this->hasMany(Invoice::class, 'leave_schedule_id');
    }

    public function clientLeaveSessions(): HasMany
    {
        return $this->hasMany(ClientLeaveSession::class, 'schedule_id');
    }

    public function sessionReports(): HasMany
    {
        return $this->hasMany(SessionReport::class, 'schedule_id');
    }

    public function creditLedgers(): HasMany
    {
        return $this->hasMany(CreditLedger::class, 'schedule_id');
    }
}
