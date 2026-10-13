<?php

namespace App\Models\Concerns;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Auth;

/**
 * Mengisi `created_by` / `updated_by` dari staf yang sedang login (schema.md §05, tanpa audit log).
 * Model mendeklarasikan kolom yang ada lewat `$actorColumns`. Ortu (guard client) dan proses tanpa login tidak mengisi pelaku.
 */
trait TracksActors
{
    public static function bootTracksActors(): void
    {
        static::creating(function (Model $model): void {
            $id = static::currentActorId();
            if ($id === null) {
                return;
            }
            foreach ($model->actorColumns as $column) {
                if ($model->getAttribute($column) === null) {
                    $model->setAttribute($column, $id);
                }
            }
        });

        static::updating(function (Model $model): void {
            $id = static::currentActorId();
            if ($id !== null && in_array('updated_by', $model->actorColumns, true)) {
                $model->setAttribute('updated_by', $id);
            }
        });
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    protected static function currentActorId(): ?int
    {
        $user = Auth::user();

        return $user instanceof User ? $user->getKey() : null;
    }
}
