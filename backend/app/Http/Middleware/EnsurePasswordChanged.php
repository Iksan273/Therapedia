<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Staf dengan `must_change_password = 1` (password sementara) hanya boleh memanggil endpoint `auth/*`
 * (ganti password, me, logout). Selain itu → 403 `must_change_password`; frontend mengarahkan ke dialog ganti password.
 * Dipasang pada grup rute staf (alias `password.changed`).
 */
class EnsurePasswordChanged
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user instanceof User && $user->must_change_password && ! $request->is('api/v1/auth/*')) {
            return response()->json([
                'message' => 'Anda harus mengganti password sementara sebelum melanjutkan.',
                'code' => 'must_change_password',
            ], 403);
        }

        return $next($request);
    }
}
