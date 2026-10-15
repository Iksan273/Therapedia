<?php

namespace App\Http\Controllers\Api\Client;

use App\Actions\Client\GdriveLinkActions;
use App\Http\Controllers\Controller;
use App\Http\Requests\Client\GdriveLinkRequest;
use App\Http\Resources\Client\ClientDocumentResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;

/** Link Google Drive client (modul inquiry_pipeline). Dokumen = link saja. */
class ClientGdriveLinkController extends Controller
{
    public function store(GdriveLinkRequest $request, string $client, GdriveLinkActions $actions): JsonResponse
    {
        $doc = $actions->add((int) $client, $request->validated('url'), $request->validated('label'));

        return response()->json(['data' => (new ClientDocumentResource($doc))->resolve()], 201);
    }

    public function destroy(string $client, string $document, GdriveLinkActions $actions): Response
    {
        $actions->delete((int) $client, (int) $document);

        return response()->noContent();
    }
}
