<?php

namespace App\Models;

use App\Models\Concerns\TracksActors;
use App\Models\Concerns\Versioned;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AssessmentCategory extends Model
{
    use TracksActors, Versioned;

    protected $table = 'assessment_categories';

    /** @var list<string> kolom pelaku yang diisi otomatis oleh TracksActors */
    protected array $actorColumns = ['updated_by'];

    /** @var list<string> */
    protected $fillable = [
        'type_code',
        'name',
        'domain',
        'respondent_profile',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    public function assessmentSectionsViaCategory(): HasMany
    {
        return $this->hasMany(AssessmentSection::class, 'category_id');
    }

    public function assessmentQuestionsViaCategory(): HasMany
    {
        return $this->hasMany(AssessmentQuestion::class, 'category_id');
    }

    public function assessmentAccessCodesViaCategory(): HasMany
    {
        return $this->hasMany(AssessmentAccessCode::class, 'category_id');
    }

    public function assessmentResponsesViaCategory(): HasMany
    {
        return $this->hasMany(AssessmentResponse::class, 'category_id');
    }
}
