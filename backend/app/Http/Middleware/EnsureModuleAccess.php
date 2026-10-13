<?php

namespace App\Http\Middleware;

use App\Models\User;
use App\Services\PermissionService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Pemakaian di route: `->middleware('module:finance')` atau `module:inquiry_pipeline,active_clients` (salah satu cukup).
 * Punya akses modul = boleh semua aksi non-hapus (keputusan klien); hapus client/cabang tambahan `master` (PermissionService).
 */
class EnsureModuleAccess
{
    public function __construct(private PermissionService $permissions) {}

    public function handle(Request $request, Closure $next, string ...$modules): Response
    {
        $user = $request->user();

        if (! $user instanceof User || ! $this->permissions->allowsAny($user, $modules)) {
            return response()->json(['message' => 'Anda tidak punya akses ke modul ini.', 'code' => 'forbidden'], 403);
        }

        return $next($request);
    }
}
