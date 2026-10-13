<?php

namespace App\Models;

use App\Models\Concerns\TracksActors;
use App\Models\Concerns\Versioned;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SessionReport extends Model
{
    use TracksActors, Versioned;

    protected $table = 'session_reports';

    /** @var list<string> kolom pelaku yang diisi otomatis oleh TracksActors */
    protected array $actorColumns = ['updated_by'];

    /** @var list<string> */
    protected $fillable = [
        'schedule_id',
        'client_id',
        'therapist_id',
        'activity_section',
        'note_section',
        'homework_section',
    ];

    public function schedule(): BelongsTo
    {
        return $this->belongsTo(Schedule::class, 'schedule_id');
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class, 'client_id');
    }

    public function therapist(): BelongsTo
    {
        return $this->belongsTo(User::class, 'therapist_id');
    }
}
