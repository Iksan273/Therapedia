<?php

use App\Exceptions\NotImplementedException;
use App\Http\Middleware\EnsureModuleAccess;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Laravel\Sanctum\Http\Middleware\CheckAbilities;
use Laravel\Sanctum\Http\Middleware\CheckForAnyAbility;

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
            'abilities' => CheckAbilities::class,
            'ability' => CheckForAnyAbility::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // Kerangka use-case yang belum ditulis: balas 501 JSON (bentuk ApiError: message + code).
        $exceptions->render(fn (NotImplementedException $e) => response()->json([
            'message' => 'Endpoint ini belum diimplementasi.',
            'code' => 'not_implemented',
        ], 501));
    })->create();
