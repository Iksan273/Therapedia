<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AssessmentAccessCode extends Model
{
    protected $table = 'assessment_access_codes';

    /** @var list<string> */
    protected $fillable = [
        'code',
        'client_id',
        'category_id',
        'status',
        'issued_by',
        'issued_at',
        'expires_at',
        'submitted_at',
        'invoice_required',
    ];

    protected function casts(): array
    {
        return [
            'issued_at' => 'datetime',
            'expires_at' => 'datetime',
            'submitted_at' => 'datetime',
            'invoice_required' => 'boolean',
        ];
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class, 'client_id');
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(AssessmentCategory::class, 'category_id');
    }

    public function assessmentDraftsViaAccessCode(): HasMany
    {
        return $this->hasMany(AssessmentDraft::class, 'access_code_id');
    }

    public function assessmentResponsesViaAccessCode(): HasMany
    {
        return $this->hasMany(AssessmentResponse::class, 'access_code_id');
    }

    public function invoices(): HasMany
    {
        return $this->hasMany(Invoice::class, 'assessment_access_code_id');
    }
}
