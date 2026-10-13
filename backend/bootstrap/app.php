<?php

use App\Exceptions\ApiException;
use App\Exceptions\NotImplementedException;
use App\Http\Middleware\EnsureModuleAccess;
use App\Http\Middleware\EnsurePasswordChanged;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Exceptions\ThrottleRequestsException;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Laravel\Sanctum\Http\Middleware\CheckAbilities;
use Laravel\Sanctum\Http\Middleware\CheckForAnyAbility;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Laravel ada di belakang Nginx/Cloudflare/Caddy: percayai X-Forwarded-* (HTTPS, IP asli).
        // Aman karena origin hanya terjangkau lewat proxy (docs/guide/13-docker-deploy.md §9).
        $middleware->trustProxies(at: '*');

        // Hak akses modul RBAC + ability token Sanctum (staff = User, client = ortu).
        $middleware->alias([
            'module' => EnsureModuleAccess::class,
            'password.changed' => EnsurePasswordChanged::class,
            'abilities' => CheckAbilities::class,
            'ability' => CheckForAnyAbility::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // Semua galat rute /api dirender JSON dengan bentuk ApiError frontend (implementation_detail.md §1.2):
        // { message, code?, errors? }. 401, 403, 404, 409, 410, 422, 429, 503.
        $isApi = fn (Request $request): bool => $request->is('api/*') || $request->expectsJson();

        $exceptions->shouldRenderJsonWhen(fn (Request $request, Throwable $e): bool => $isApi($request));

        // Kerangka use-case yang belum ditulis: balas 501 JSON (bentuk ApiError: message + code).
        $exceptions->render(fn (NotImplementedException $e) => response()->json([
            'message' => 'Endpoint ini belum diimplementasi.',
            'code' => 'not_implemented',
        ], 501));

        // Error domain yang dilempar Action/Service (409 version_conflict, 422 already_reverted, 410 expired, dst.).
        $exceptions->render(fn (ApiException $e) => response()->json($e->toArray(), $e->status));

        // 422 validasi: `errors` per field → `fieldErrors` di frontend.
        $exceptions->render(function (ValidationException $e, Request $request) use ($isApi) {
            return $isApi($request)
                ? response()->json(['message' => 'Data yang dikirim tidak valid.', 'errors' => $e->errors()], 422)
                : null;
        });

        // 401: token hilang/kedaluwarsa → frontend logout.
        $exceptions->render(function (AuthenticationException $e, Request $request) use ($isApi) {
            return $isApi($request)
                ? response()->json(['message' => 'Sesi berakhir atau belum login. Silakan masuk kembali.'], 401)
                : null;
        });

        // 403: tanpa akses modul / ability token salah / bukan master untuk hapus client-cabang.
        $forbidden = function (Throwable $e, Request $request) use ($isApi) {
            return $isApi($request)
                ? response()->json(['message' => 'Anda tidak punya akses untuk aksi ini.', 'code' => 'forbidden'], 403)
                : null;
        };
        $exceptions->render(fn (AuthorizationException $e, Request $request) => $forbidden($e, $request));
        $exceptions->render(fn (AccessDeniedHttpException $e, Request $request) => $forbidden($e, $request));

        // 404: juga untuk data cabang lain (BranchScope menyaring query → findOrFail gagal; tidak membocorkan keberadaan).
        $notFound = function (Throwable $e, Request $request) use ($isApi) {
            return $isApi($request) ? response()->json(['message' => 'Data tidak ditemukan.'], 404) : null;
        };
        $exceptions->render(fn (ModelNotFoundException $e, Request $request) => $notFound($e, $request));
        $exceptions->render(fn (NotFoundHttpException $e, Request $request) => $notFound($e, $request));

        // 429: throttle login/publik/upload.
        $exceptions->render(function (ThrottleRequestsException $e, Request $request) use ($isApi) {
            return $isApi($request)
                ? response()->json(['message' => 'Terlalu banyak percobaan. Coba lagi beberapa saat lagi.'], 429, $e->getHeaders())
                : null;
        });
    })->create();
