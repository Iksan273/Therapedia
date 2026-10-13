<?php

namespace App\Http\Controllers\Api\Finance;

use App\Http\Controllers\Controller;
use App\Services\CreditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Riwayat mutasi kredit, keyset pagination (M7), baca saja.
 * Tipis: validasi (Form Request) di sini nanti, logika bisnis di CreditService / Action.
 */
class CreditLedgerController extends Controller
{
    public function __construct(private readonly CreditService $service) {}

    public function index(Request $request): JsonResponse
    {
        return response()->json(['data' => $this->service->ledger($request->query())]);
    }
}
