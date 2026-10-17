<?php

namespace App\Http\Controllers\Api\Assessment;

use App\Actions\Assessment\AccessCodeActions;
use App\Actions\Assessment\ClientAssessmentResultsAction;
use App\Actions\Assessment\ListAccessCodesAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Assessment\IssueAccessCodeRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/**
 * Kode kuesioner (M5, 5.6–5.8, 4.15) + hasil per client (5.11). Modul `inquiry_pipeline`.
 * Kode dibuat server (tidak diterima dari klien); hapus kode yang sudah terisi / berdraft ditolak 409.
 */
class AssessmentAccessCodeController extends Controller
{
    public function index(Request $request, ListAccessCodesAction $list, ?string $clientId = null): JsonResponse
    {
        if ($clientId !== null) {
            return response()->json(['data' => $list->forClient((int) $clientId)]);
        }

        return response()->json($list->awaiting($request)); // antrean "menunggu diisi" (4.15)
    }

    public function store(IssueAccessCodeRequest $request, AccessCodeActions $actions, ListAccessCodesAction $list, string $clientId): JsonResponse
    {
        $code = $actions->issue((int) $clientId, $request->validated());
        $row = collect($list->forClient((int) $clientId))->firstWhere('id', $code->id);

        return response()->json(['data' => $row], 201);
    }

    public function destroy(AccessCodeActions $actions, string $id): Response
    {
        $actions->delete((int) $id);

        return response()->noContent();
    }

    public function results(ClientAssessmentResultsAction $results, string $clientId): JsonResponse
    {
        return response()->json(['data' => $results->handle((int) $clientId)]);
    }
}
