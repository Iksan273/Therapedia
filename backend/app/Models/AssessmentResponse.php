<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AssessmentResponse extends Model
{
    protected $table = 'assessment_responses';

    /** @var list<string> */
    protected $fillable = [
        'access_code_id',
        'client_id',
        'category_id',
        'answered_count',
        'consent_at',
        'submitted_at',
        'ip_address',
    ];

    protected function casts(): array
    {
        return [
            'consent_at' => 'datetime',
            'submitted_at' => 'datetime',
        ];
    }

    public function accessCode(): BelongsTo
    {
        return $this->belongsTo(AssessmentAccessCode::class, 'access_code_id');
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class, 'client_id');
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(AssessmentCategory::class, 'category_id');
    }

    public function assessmentAnswersViaResponse(): HasMany
    {
        return $this->hasMany(AssessmentAnswer::class, 'response_id');
    }

    public function assessmentQuadrantScoresViaResponse(): HasMany
    {
        return $this->hasMany(AssessmentQuadrantScore::class, 'response_id');
    }
}
