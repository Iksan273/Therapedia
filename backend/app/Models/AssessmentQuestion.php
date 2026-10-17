<?php

namespace App\Models;

use App\Models\Concerns\TracksActors;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AssessmentQuestion extends Model
{
    use TracksActors;

    protected $table = 'assessment_questions';

    /** @var list<string> kolom pelaku yang diisi otomatis oleh TracksActors */
    protected array $actorColumns = ['updated_by'];

    /** @var list<string> */
    protected $fillable = [
        'category_id',
        'section_id',
        'item_no',
        'question_type',
        'question',
        'options',
        'range_min',
        'range_max',
        'range_min_label',
        'range_max_label',
        'is_required',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'options' => 'array',
            'is_required' => 'boolean',
        ];
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(AssessmentCategory::class, 'category_id');
    }

    public function section(): BelongsTo
    {
        return $this->belongsTo(AssessmentSection::class, 'section_id');
    }

    public function assessmentAnswersViaQuestion(): HasMany
    {
        return $this->hasMany(AssessmentAnswer::class, 'question_id');
    }
}
