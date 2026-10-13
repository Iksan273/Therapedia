<?php

namespace App\Http\Controllers\Api\Finance;

use App\Http\Controllers\Controller;
use App\Services\CreditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Paket kredit milik client (M7), baca saja.
 * Tipis: validasi (Form Request) di sini nanti, logika bisnis di CreditService / Action.
 */
class ClientPackageController extends Controller
{
    public function __construct(private readonly CreditService $service) {}

    public function index(Request $request): JsonResponse
    {
        return response()->json(['data' => $this->service->paginatePackages($request->query())]);
    }

    public function show(Request $request, string $id): JsonResponse
    {
        return response()->json(['data' => $this->service->findPackage($id)]);
    }
}
