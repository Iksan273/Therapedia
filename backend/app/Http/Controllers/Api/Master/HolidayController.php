<?php

namespace App\Http\Controllers\Api\Master;

use App\Actions\Master\CreateHolidaysAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Master\HolidayRequest;
use App\Http\Resources\Master\HolidayResource;
use App\Models\Holiday;
use App\Services\HolidayService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/**
 * Hari libur (M3, modul holidays). POST menerima satu tanggal atau rentang (1 baris per tanggal) dan membalas DAFTAR baris
 * baru, tiap baris memuat `affected_sessions`. Efek pembatalan sesi ditambah di Sprint 2.
 */
class HolidayController extends Controller
{
    public function __construct(private readonly HolidayService $service) {}

    public function index(Request $request): JsonResponse
    {
        return response()->json(['data' => HolidayResource::collection($this->service->all($request))->resolve()]);
    }

    public function show(string $holiday): JsonResponse
    {
        return response()->json(['data' => (new HolidayResource($this->service->find((int) $holiday)))->resolve()]);
    }

    public function store(HolidayRequest $request, CreateHolidaysAction $create): JsonResponse
    {
        $holidays = $create($request->user(), $request->validated());
        $holidays->each(fn (Holiday $h) => $h->setAttribute('affected_sessions', $this->service->affectedSessions($h)));

        return response()->json(['data' => HolidayResource::collection($holidays)->resolve()], 201);
    }

    public function update(HolidayRequest $request, string $holiday): JsonResponse
    {
        $updated = $this->service->update($request->user(), (int) $holiday, $request->validated());
        $updated->setAttribute('affected_sessions', $this->service->affectedSessions($updated));

        return response()->json(['data' => (new HolidayResource($updated))->resolve()]);
    }

    public function destroy(Request $request, string $holiday): Response
    {
        $this->service->delete($request->user(), (int) $holiday);

        return response()->noContent();
    }
}
