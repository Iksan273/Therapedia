<?php

namespace App\Http\Controllers\Api\Finance;

use App\Http\Controllers\Controller;
use App\Services\InvoiceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Bukti bayar (M7), nested di invoice.
 * Tipis: validasi (Form Request) di sini nanti, logika bisnis di InvoiceService / Action.
 */
class PaymentProofController extends Controller
{
    public function __construct(private readonly InvoiceService $service) {}

    public function index(Request $request, string $id): JsonResponse
    {
        return response()->json(['data' => $this->service->proofs($id)]);
    }

    public function store(Request $request, string $id): JsonResponse
    {
        return response()->json(['data' => $this->service->uploadProof($id, $request->file('file'))], 201);
    }
}
