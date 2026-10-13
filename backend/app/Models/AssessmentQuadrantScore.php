<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AssessmentQuadrantScore extends Model
{
    protected $table = 'assessment_quadrant_scores';

    // PK komposit (response_id, quadrant_code): Eloquent hanya mengenali satu kunci; akses lewat query builder / where dua kolom.
    protected $primaryKey = 'response_id';

    public $incrementing = false;

    public $timestamps = false;

    /** @var list<string> */
    protected $fillable = [
        'response_id',
        'quadrant_code',
        'raw_score',
        'item_count',
        'classification',
    ];

    public function response(): BelongsTo
    {
        return $this->belongsTo(AssessmentResponse::class, 'response_id');
    }

    public function quadrant(): BelongsTo
    {
        return $this->belongsTo(SensoryQuadrant::class, 'quadrant_code', 'code');
    }
}
