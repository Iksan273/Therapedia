<?php

namespace App\Actions\Master;

use App\Exceptions\ApiException;
use App\Models\AssessmentQuadrantScore;
use App\Models\AssessmentQuestion;
use App\Models\SensoryQuadrant;
use Illuminate\Support\Facades\DB;

/**
 * Hapus kuadran sensori. Dipakai soal kuesioner atau skor hasil → 409 `in_use`. Kuadran yang belum dipakai boleh
 * dihapus semuanya (tidak ada batas minimal).
 */
class DeleteQuadrantAction
{
    public function __invoke(string $code): void
    {
        DB::transaction(function () use ($code): void {
            $quadrant = SensoryQuadrant::query()->lockForUpdate()->findOrFail($code);

            $questions = AssessmentQuestion::query()->where('quadrant_code', $code)->count();
            $scores = AssessmentQuadrantScore::query()->where('quadrant_code', $code)->count();

            if ($questions + $scores > 0) {
                throw ApiException::inUse("Kuadran \"{$quadrant->title}\" dipakai di {$questions} soal dan {$scores} skor hasil asesmen.");
            }

            $quadrant->delete();
        });
    }
}
