<?php

namespace App\Actions\Assessment;

use App\Models\AssessmentAnswer;
use App\Models\AssessmentResponse;
use App\Models\Client;
use App\Services\AssessmentSnapshotService;
use App\Support\AssessmentRespondent;

/**
 * Hasil kuesioner client untuk staf (`GET clients/{id}/assessment-responses`). Struktur yang dikembalikan adalah
 * SNAPSHOT yang dibekukan saat pengisian dimulai, bukan master terbaru, sehingga hasil lama tidak berubah oleh edit master.
 */
class ClientAssessmentResultsAction
{
    public function __construct(private readonly AssessmentSnapshotService $snapshots) {}

    /** @return array<int, array<string, mixed>> */
    public function handle(int $clientId): array
    {
        $client = Client::query()->findOrFail($clientId); // BranchScope: cabang lain -> 404

        return AssessmentResponse::query()->where('client_id', $client->id)
            ->with(['accessCode:id,code,structure_snapshot,category_id', 'category:id,name,type_code', 'assessmentAnswersViaResponse'])
            ->orderByDesc('submitted_at')->orderByDesc('id')->get()
            ->map(fn (AssessmentResponse $r) => [
                'id' => $r->id,
                'code' => $r->accessCode?->code,
                'category' => ['id' => $r->category_id, 'name' => $r->category?->name, 'type_code' => $r->category?->type_code],
                'submitted_at' => $r->submitted_at?->toIso8601String(),
                'consent_at' => $r->consent_at?->toIso8601String(),
                'answered_count' => $r->answered_count,
                'respondent' => AssessmentRespondent::fromModel($r),
                'structure' => $this->snapshots->publicStructure($r->accessCode?->structure_snapshot ?? $this->snapshots->live($r->category_id)),
                'answers' => $r->assessmentAnswersViaResponse->map(fn (AssessmentAnswer $a) => [
                    'question_id' => $a->question_id,
                    'item_no' => $a->item_no,
                    'answer_text' => $a->answer_text,
                    'answer_values' => $a->answer_values,
                    'score' => $a->score,
                ])->values()->all(),
            ])->values()->all();
    }
}
