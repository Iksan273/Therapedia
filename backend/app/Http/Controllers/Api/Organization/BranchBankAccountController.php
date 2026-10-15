<?php

namespace App\Http\Controllers\Api\Organization;

use App\Actions\Organization\CreateBranchBankAccountAction;
use App\Actions\Organization\DeleteBranchBankAccountAction;
use App\Actions\Organization\SetBranchBankAccountActiveAction;
use App\Actions\Organization\UpdateBranchBankAccountAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Organization\SetActiveRequest;
use App\Http\Requests\Organization\StoreBranchBankAccountRequest;
use App\Http\Requests\Organization\UpdateBranchBankAccountRequest;
use App\Http\Resources\Organization\BranchBankAccountResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;

/** Rekening bank pembayaran per cabang (modul branch_master). Daftar dibaca lewat `GET /branches` (`bank_accounts`). */
class BranchBankAccountController extends Controller
{
    public function store(StoreBranchBankAccountRequest $request, string $branch, CreateBranchBankAccountAction $action): JsonResponse
    {
        return response()->json(['data' => (new BranchBankAccountResource($action->handle((int) $branch, $request->validated())))->resolve()], 201);
    }

    public function update(UpdateBranchBankAccountRequest $request, string $branch, string $account, UpdateBranchBankAccountAction $action): JsonResponse
    {
        return response()->json(['data' => (new BranchBankAccountResource($action->handle((int) $branch, (int) $account, $request->validated())))->resolve()]);
    }

    public function setActive(SetActiveRequest $request, string $branch, string $account, SetBranchBankAccountActiveAction $action): JsonResponse
    {
        return response()->json(['data' => (new BranchBankAccountResource($action->handle((int) $branch, (int) $account, $request->boolean('is_active'))))->resolve()]);
    }

    public function destroy(string $branch, string $account, DeleteBranchBankAccountAction $action): Response
    {
        $action->handle((int) $branch, (int) $account);

        return response()->noContent();
    }
}
