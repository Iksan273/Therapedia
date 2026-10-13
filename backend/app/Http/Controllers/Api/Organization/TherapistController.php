<?php

namespace App\Http\Controllers\Api\Organization;

use App\Http\Controllers\Controller;
use App\Http\Requests\Organization\UpdateCapacityRequest;
use App\Http\Resources\Organization\TherapistResource;
use App\Services\UserService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** Daftar ringan terapis (dibaca semua staf) + kapasitas maks sesi per bulan (utilisasi, Q25). */
class TherapistController extends Controller
{
    public function __construct(private readonly UserService $service) {}

    public function index(Request $request): JsonResponse
    {
        return response()->json(['data' => $this->service->therapists($request)]);
    }

    public function updateCapacity(UpdateCapacityRequest $request, string $user): JsonResponse
    {
        $therapist = $this->service->updateCapacity($request->user(), (int) $user, $request->validated('max_sessions_per_month'));

        return response()->json(['data' => (new TherapistResource($therapist))->resolve()]);
    }
}
