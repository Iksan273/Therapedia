<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AssessmentDraft extends Model
{
    protected $table = 'assessment_drafts';

    protected $primaryKey = 'access_code_id';

    public $incrementing = false;

    public $timestamps = false;

    /** @var list<string> */
    protected $fillable = [
        'access_code_id',
        'answers',
        'answered_count',
        'last_section_id',
        'consent_at',
        'ip_address',
        'started_at',
    ];

    protected function casts(): array
    {
        return [
            'answers' => 'array',
            'consent_at' => 'datetime',
            'started_at' => 'datetime',
        ];
    }

    public function accessCode(): BelongsTo
    {
        return $this->belongsTo(AssessmentAccessCode::class, 'access_code_id');
    }

    public function lastSection(): BelongsTo
    {
        return $this->belongsTo(AssessmentSection::class, 'last_section_id');
    }
}
