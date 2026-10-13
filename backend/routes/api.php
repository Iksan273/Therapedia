<?php

use App\Http\Controllers\Api\Assessment\AssessmentAccessCodeController;
use App\Http\Controllers\Api\Assessment\AssessmentCategoryController;
use App\Http\Controllers\Api\Assessment\AssessmentQuestionController;
use App\Http\Controllers\Api\Assessment\AssessmentSectionController;
use App\Http\Controllers\Api\Assessment\PublicAssessmentController;
use App\Http\Controllers\Api\Auth\AuthController;
use App\Http\Controllers\Api\Client\ClientController;
use App\Http\Controllers\Api\Client\ClientDocumentController;
use App\Http\Controllers\Api\Dashboard\DashboardController;
use App\Http\Controllers\Api\Finance\ClientPackageController;
use App\Http\Controllers\Api\Finance\CreditLedgerController;
use App\Http\Controllers\Api\Finance\InvoiceController;
use App\Http\Controllers\Api\Finance\PaymentProofController;
use App\Http\Controllers\Api\Master\CancelReasonController;
use App\Http\Controllers\Api\Master\DischargeReasonController;
use App\Http\Controllers\Api\Master\HolidayController;
use App\Http\Controllers\Api\Master\MasterPackageController;
use App\Http\Controllers\Api\Master\SensoryQuadrantController;
use App\Http\Controllers\Api\Master\ServiceController;
use App\Http\Controllers\Api\Organization\BranchController;
use App\Http\Controllers\Api\Organization\RoleController;
use App\Http\Controllers\Api\Organization\UserController;
use App\Http\Controllers\Api\Portal\PortalController;
use App\Http\Controllers\Api\Schedule\ClientLeaveController;
use App\Http\Controllers\Api\Schedule\ScheduleController;
use App\Http\Controllers\Api\Schedule\SessionReportController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API v1 (SKELETON setup)
|--------------------------------------------------------------------------
| Peta endpoint rinci: implementation_detail.md. Dua jenis token Sanctum: ability `staff` (User) dan `client` (ortu).
| Hak akses modul: middleware `module:<kode>` (EnsureModuleAccess). Baca master data cukup login staf; tulis butuh modul.
*/

Route::prefix('v1')->group(function () {
    // ---- Publik
    Route::post('auth/login', [AuthController::class, 'login'])->middleware('throttle:10,1');
    Route::post('auth/client-login', [AuthController::class, 'clientLogin'])->middleware('throttle:10,1');
    Route::post('auth/forgot-password', [AuthController::class, 'forgotPassword'])->middleware('throttle:5,1');
    Route::post('auth/reset-password', [AuthController::class, 'resetPassword'])->middleware('throttle:5,1');

    Route::prefix('public/assessments/{code}')->middleware('throttle:60,1')->group(function () {
        Route::get('/', [PublicAssessmentController::class, 'show']);
        Route::put('draft', [PublicAssessmentController::class, 'saveDraft']);
        Route::post('responses', [PublicAssessmentController::class, 'submit']);
    });

    // ---- Login (staf atau ortu)
    Route::middleware('auth:sanctum')->group(function () {
        Route::post('auth/logout', [AuthController::class, 'logout']);
        Route::get('auth/me', [AuthController::class, 'me']);
    });

    // ---- Portal orang tua
    Route::prefix('portal')->middleware(['auth:sanctum', 'ability:client'])->group(function () {
        Route::get('profile', [PortalController::class, 'profile']);
        Route::get('invoices', [PortalController::class, 'invoices']);
        Route::get('credits', [PortalController::class, 'credits']);
        Route::get('sessions', [PortalController::class, 'sessions']);
    });

    // ---- Staf
    Route::middleware(['auth:sanctum', 'ability:staff'])->group(function () {
        Route::post('auth/change-password', [AuthController::class, 'changePassword']);

        // Helper: baca = login staf; tulis = akses modul.
        $masterResource = function (string $uri, string $controller, string $modules, array $writeOnly = ['store', 'update', 'destroy']) {
            Route::apiResource($uri, $controller)->only(['index', 'show']);
            Route::apiResource($uri, $controller)->only($writeOnly)->middleware("module:$modules");
        };

        // M2 Organisasi & akses
        Route::apiResource('users', UserController::class)->middleware('module:user_management');
        Route::apiResource('roles', RoleController::class)->middleware('module:rbac');
        Route::apiResource('branches', BranchController::class)->middleware('module:branch_master');

        // M3 Master data
        $masterResource('master/services', ServiceController::class, 'inquiry_pipeline,inquiry_dashboard');
        $masterResource('master/quadrants', SensoryQuadrantController::class, 'inquiry_pipeline,inquiry_dashboard');
        $masterResource('master/cancel-reasons', CancelReasonController::class, 'weekly_calendar,inquiry_pipeline,inquiry_dashboard');
        $masterResource('master/discharge-reasons', DischargeReasonController::class, 'inquiry_pipeline,inquiry_dashboard');
        $masterResource('master/packages', MasterPackageController::class, 'finance');
        $masterResource('holidays', HolidayController::class, 'holidays');

        // M4 Inquiry & client
        Route::middleware('module:inquiry_pipeline,active_clients,weekly_calendar,finance')->group(function () {
            Route::apiResource('clients', ClientController::class);
            Route::apiResource('clients.documents', ClientDocumentController::class)->shallow();
        });

        // M5 Asesmen (mesin kuesioner + kode)
        Route::middleware('module:inquiry_pipeline')->group(function () {
            Route::apiResource('assessment-categories', AssessmentCategoryController::class);
            Route::apiResource('assessment-categories.sections', AssessmentSectionController::class)->shallow();
            Route::apiResource('assessment-sections.questions', AssessmentQuestionController::class)->shallow();
            Route::apiResource('clients.assessment-codes', AssessmentAccessCodeController::class)->only(['index', 'store', 'destroy'])->shallow();
        });

        // M6 Penjadwalan
        Route::apiResource('schedules', ScheduleController::class)->middleware('module:weekly_calendar,active_clients,therapist_module');
        Route::apiResource('session-reports', SessionReportController::class)->except('destroy')->middleware('module:weekly_calendar,therapist_module');
        Route::apiResource('leaves', ClientLeaveController::class)->only(['index', 'store', 'show'])->middleware('module:finance');

        // M7 Finance & kredit
        Route::middleware('module:finance')->group(function () {
            Route::apiResource('invoices', InvoiceController::class);
            Route::apiResource('invoices.proofs', PaymentProofController::class)->only(['index', 'store'])->shallow();
            Route::apiResource('client-packages', ClientPackageController::class)->only(['index', 'show']);
            Route::get('credit-ledger', [CreditLedgerController::class, 'index']);
        });

        // M11 Dashboard
        Route::prefix('dashboards')->group(function () {
            Route::get('revenue', [DashboardController::class, 'revenue'])->middleware('module:revenue');
            Route::get('inquiry', [DashboardController::class, 'inquiry'])->middleware('module:inquiry_dashboard');
            Route::get('schedule', [DashboardController::class, 'schedule'])->middleware('module:schedule_dashboard');
            Route::get('branch-performance', [DashboardController::class, 'branchPerformance'])->middleware('module:revenue');
        });
    });
});
