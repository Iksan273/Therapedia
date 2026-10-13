<?php

namespace App\Models;

use App\Models\Concerns\TracksActors;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SensoryQuadrant extends Model
{
    use TracksActors;

    protected $table = 'sensory_quadrants';

    /** @var list<string> kolom pelaku yang diisi otomatis oleh TracksActors */
    protected array $actorColumns = ['updated_by'];

    protected $primaryKey = 'code';

    public $incrementing = false;

    protected $keyType = 'string';

    /** @var list<string> */
    protected $fillable = [
        'code',
        'title',
        'full_name',
        'description',
        'color',
        'sort_order',
    ];

    public function assessmentQuestionsViaQuadrantCode(): HasMany
    {
        return $this->hasMany(AssessmentQuestion::class, 'quadrant_code', 'code');
    }

    public function assessmentQuadrantScoresViaQuadrantCode(): HasMany
    {
        return $this->hasMany(AssessmentQuadrantScore::class, 'quadrant_code', 'code');
    }
}
