<?php

namespace App\Http\Controllers\Api\Client;

use App\Actions\Client\CheckDuplicateClientAction;
use App\Actions\Client\CreateClientAction;
use App\Actions\Client\DeleteClientAction;
use App\Actions\Client\ListClientsAction;
use App\Actions\Client\ListPipelineBoardAction;
use App\Actions\Client\PipelineSummaryAction;
use App\Actions\Client\SyncClientServicesAction;
use App\Actions\Client\TransitionClientAction;
use App\Actions\Client\UpdateClientAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Client\CheckDuplicateRequest;
use App\Http\Requests\Client\StoreClientRequest;
use App\Http\Requests\Client\SyncClientServicesRequest;
use App\Http\Requests\Client\TransitionClientRequest;
use App\Http\Requests\Client\UpdateClientRequest;
use App\Http\Resources\Client\ClientDetailResource;
use App\Http\Resources\Client\ClientListResource;
use App\Models\Client;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/**
 * Intake & pipeline client (M4). Tipis: validasi di Form Request, aturan di Action. Hapus client hanya Master.
 */
class ClientController extends Controller
{
    public function index(Request $request, ListClientsAction $action): JsonResponse
    {
        return response()->json($action->handle($request));
    }

    /** Papan pipeline: semua tahap (total + kartu terbaru) dalam satu request. */
    public function board(Request $request, ListPipelineBoardAction $action): JsonResponse
    {
        return response()->json(['data' => ['stages' => $action->handle($request)]]);
    }

    public function pipelineSummary(Request $request, PipelineSummaryAction $action): JsonResponse
    {
        return response()->json(['data' => $action->handle($request)]);
    }

    public function checkDuplicate(CheckDuplicateRequest $request, CheckDuplicateClientAction $action): JsonResponse
    {
        $duplicates = $action->handle($request->validated('child_name'), $request->validated('date_of_birth'));

        return response()->json(['data' => ['duplicates' => ClientListResource::collection($duplicates)->resolve()]]);
    }

    public function store(StoreClientRequest $request, CreateClientAction $action): JsonResponse
    {
        $client = $action->handle($request->user(), $request->validated());

        return response()->json(['data' => (new ClientDetailResource($client))->resolve()], 201);
    }

    public function show(string $client): JsonResponse
    {
        $model = Client::query()->with(['branch', 'clientServices', 'clientDocuments', 'invoices', 'clientPackages'])->findOrFail((int) $client);

        return response()->json(['data' => (new ClientDetailResource($model))->resolve()]);
    }

    public function update(UpdateClientRequest $request, string $client, UpdateClientAction $action): JsonResponse
    {
        $updated = $action->handle((int) $client, $request->validated());

        return response()->json(['data' => (new ClientDetailResource($updated))->resolve()]);
    }

    public function syncServices(SyncClientServicesRequest $request, string $client, SyncClientServicesAction $action): JsonResponse
    {
        $updated = $action->handle((int) $client, $request->validated('service_codes'), $request->user()?->id);

        return response()->json(['data' => (new ClientDetailResource($updated))->resolve()]);
    }

    public function transition(TransitionClientRequest $request, string $client, TransitionClientAction $action): JsonResponse
    {
        $result = $action->handle((int) $client, $request->validated());
        $detail = (new ClientDetailResource($result['client']->load(['branch', 'clientServices'])))->resolve();

        return response()->json(['data' => $detail + ['changed' => $result['changed']]]);
    }

    public function destroy(Request $request, string $client, DeleteClientAction $action): Response
    {
        $action($request->user(), (int) $client);

        return response()->noContent();
    }
}
