<?php

namespace App\Http\Controllers\Api\Finance;

use App\Actions\Finance\InvoiceActions;
use App\Http\Controllers\Controller;
use App\Http\Requests\Assessment\ProofUploadRequest;
use App\Http\Resources\Finance\InvoiceResource;
use App\Services\InvoiceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

/**
 * Invoice (M7). Aktif sekarang: daftar, detail, unggah bukti Finance, lihat file bukti, Tandai Lunas (hanya invoice asesmen).
 * Terbit manual, void, refund, renewal, konversi, hapus: menyusul di modul Finance (masih kerangka 501 di InvoiceService).
 */
class InvoiceController extends Controller
{
    public function __construct(private readonly InvoiceService $service, private readonly InvoiceActions $actions) {}

    public function index(Request $request): JsonResponse
    {
        return response()->json($this->actions->list($request));
    }

    public function store(Request $request): JsonResponse
    {
        return response()->json(['data' => $this->service->issue($request->all())], 201);
    }

    public function show(string $id): JsonResponse
    {
        return response()->json(['data' => (new InvoiceResource($this->actions->find((int) $id)))->resolve()]);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        return response()->json(['data' => $this->service->update($id, $request->all())]);
    }

    public function destroy(Request $request, string $id): Response
    {
        $this->service->delete($id);

        return response()->noContent();
    }

    /** 7.5: Finance mengunggah bukti (JPG/PNG/PDF ≤ 5 MB). Status invoice tidak berubah. */
    public function uploadProof(ProofUploadRequest $request, string $id): JsonResponse
    {
        return response()->json(['data' => (new InvoiceResource($this->actions->uploadProof((int) $id, $request->file('file'))))->resolve()], 201);
    }

    /** 7.6: stream file bukti untuk Finance (dibaca sebagai Blob oleh frontend karena butuh bearer). */
    public function proofFile(string $id, string $proofId): BinaryFileResponse
    {
        [$path, $mime] = $this->actions->proofFilePath((int) $id, (int) $proofId);

        return response()->file($path, ['Content-Type' => $mime, 'Cache-Control' => 'private, max-age=300']);
    }

    /** 7.7: Tandai Lunas (sekarang hanya invoice asesmen). Body: `version`. */
    public function verify(Request $request, string $id): JsonResponse
    {
        return response()->json(['data' => (new InvoiceResource($this->actions->verify((int) $id, $request->input('version'))))->resolve()]);
    }
}
