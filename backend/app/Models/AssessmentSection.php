<?php

namespace App\Models;

use App\Models\Concerns\TracksActors;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AssessmentSection extends Model
{
    use TracksActors;

    protected $table = 'assessment_sections';

    /** @var list<string> kolom pelaku yang diisi otomatis oleh TracksActors */
    protected array $actorColumns = ['updated_by'];

    /** @var list<string> */
    protected $fillable = [
        'category_id',
        'title',
        'description',
        'document_url',
        'result_template',
        'sort_order',
    ];

    public function category(): BelongsTo
    {
        return $this->belongsTo(AssessmentCategory::class, 'category_id');
    }

    public function assessmentQuestionsViaSection(): HasMany
    {
        return $this->hasMany(AssessmentQuestion::class, 'section_id');
    }

    public function assessmentDraftsViaLastSection(): HasMany
    {
        return $this->hasMany(AssessmentDraft::class, 'last_section_id');
    }
}
