<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ClientLeaveSession extends Model
{
    protected $table = 'client_leave_sessions';

    // PK komposit (leave_id, schedule_id): Eloquent hanya mengenali satu kunci; akses lewat query builder / where dua kolom.
    protected $primaryKey = 'leave_id';

    public $incrementing = false;

    public $timestamps = false;

    /** @var list<string> */
    protected $fillable = [
        'leave_id',
        'schedule_id',
    ];

    public function leave(): BelongsTo
    {
        return $this->belongsTo(ClientLeave::class, 'leave_id');
    }

    public function schedule(): BelongsTo
    {
        return $this->belongsTo(Schedule::class, 'schedule_id');
    }
}
