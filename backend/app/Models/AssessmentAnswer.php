<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AssessmentAnswer extends Model
{
    protected $table = 'assessment_answers';

    public $timestamps = false;

    /** @var list<string> */
    protected $fillable = [
        'response_id',
        'question_id',
        'item_no',
        'quadrant_code',
        'answer_text',
        'answer_values',
        'score',
    ];

    protected function casts(): array
    {
        return [
            'answer_values' => 'array',
        ];
    }

    public function response(): BelongsTo
    {
        return $this->belongsTo(AssessmentResponse::class, 'response_id');
    }

    public function question(): BelongsTo
    {
        return $this->belongsTo(AssessmentQuestion::class, 'question_id');
    }
}
