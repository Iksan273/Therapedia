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
use App\Http\Controllers\Api\Organization\TherapistController;
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
    // `password.changed`: staf berpassword sementara hanya boleh memanggil auth/* (change-password, me, logout).
    Route::middleware(['auth:sanctum', 'ability:staff', 'password.changed'])->group(function () {
        Route::post('auth/change-password', [AuthController::class, 'changePassword']);

        // Helper: baca = login staf; tulis = akses modul.
        $masterResource = function (string $uri, string $controller, string $modules, array $writeOnly = ['store', 'update', 'destroy']) {
            Route::apiResource($uri, $controller)->only(['index', 'show']);
            Route::apiResource($uri, $controller)->only($writeOnly)->middleware("module:$modules");
        };

        // M2 Organisasi & akses
        // Akun staf: tidak ada DELETE (berhenti = nonaktif).
        Route::middleware('module:user_management')->group(function () {
            Route::get('users', [UserController::class, 'index']);
            Route::post('users', [UserController::class, 'store']);
            Route::get('users/{user}', [UserController::class, 'show']);
            Route::patch('users/{user}', [UserController::class, 'update']);
            Route::patch('users/{user}/active', [UserController::class, 'setActive']);
            Route::post('users/{user}/reset-password', [UserController::class, 'resetPassword']);
        });

        // Terapis: daftar ringan dibaca semua staf (dropdown); kapasitas diatur modul utilisasi/user_management.
        Route::get('therapists', [TherapistController::class, 'index']);
        Route::patch('therapists/{user}/capacity', [TherapistController::class, 'updateCapacity'])->middleware('module:therapist_utilization,user_management');

        // Role & matriks izin: BACA boleh modul rbac atau user_management (pengelola akun butuh daftar role untuk memilih
        // role akun); TULIS (buat/ubah/hapus role, simpan matriks) hanya modul rbac.
        Route::middleware('module:rbac,user_management')->group(function () {
            Route::get('roles', [RoleController::class, 'index']);
            Route::get('roles/{role}', [RoleController::class, 'show']);
            Route::get('access-modules', [RoleController::class, 'modules']);
        });
        Route::middleware('module:rbac')->group(function () {
            Route::post('roles', [RoleController::class, 'store']);
            Route::patch('roles/{role}', [RoleController::class, 'update']);
            Route::delete('roles/{role}', [RoleController::class, 'destroy']);
            Route::put('roles/{role}/permissions', [RoleController::class, 'syncPermissions']);
        });

        // Master Cabang: baca = semua staf login (filter cabang); tulis = modul branch_master;
        // pratinjau dampak hapus & hapus cabang = modul branch_master + hanya master (dicek di BranchService).
        Route::get('branches', [BranchController::class, 'index']);
        Route::get('branches/{branch}', [BranchController::class, 'show']);
        Route::middleware('module:branch_master')->group(function () {
            Route::post('branches', [BranchController::class, 'store']);
            Route::put('branches/{branch}', [BranchController::class, 'update']);
            Route::patch('branches/{branch}', [BranchController::class, 'update']);
            Route::patch('branches/{branch}/active', [BranchController::class, 'setActive']);
            Route::get('branches/{branch}/delete-impact', [BranchController::class, 'deleteImpact']);
            Route::delete('branches/{branch}', [BranchController::class, 'destroy']);
        });

        // M3 Master data
        // Tulis lewat modul `inquiry_master_data` (halaman Master Layanan & Kuadran: layanan, kuadran, alasan Cancel / Off
        // termasuk Therapist Off, alasan Discharge). Baca: semua staf login (dropdown).
        $masterResource('master/services', ServiceController::class, 'inquiry_master_data');
        $masterResource('master/quadrants', SensoryQuadrantController::class, 'inquiry_master_data');
        $masterResource('master/cancel-reasons', CancelReasonController::class, 'inquiry_master_data');
        $masterResource('master/discharge-reasons', DischargeReasonController::class, 'inquiry_master_data');
        $masterResource('master/packages', MasterPackageController::class, 'finance');
        $masterResource('holidays', HolidayController::class, 'holidays');

        // M4 Inquiry & client
        Route::middleware('module:inquiry_pipeline,active_clients,weekly_calendar,finance')->group(function () {
            Route::apiResource('clients', ClientController::class);
            Route::apiResource('clients.documents', ClientDocumentController::class)->shallow();
        });

        // M5 Asesmen. Mesin kuesioner (kategori/section/soal): BACA oleh `assessment_master` atau `inquiry_pipeline` (admin
        // inquiry memilih kategori saat menerbitkan kode); TULIS hanya `assessment_master`. Kode kuesioner: `inquiry_pipeline`.
        Route::middleware('module:assessment_master,inquiry_pipeline')->group(function () {
            Route::apiResource('assessment-categories', AssessmentCategoryController::class)->only(['index', 'show']);
        });
        Route::middleware('module:assessment_master')->group(function () {
            Route::apiResource('assessment-categories', AssessmentCategoryController::class)->only(['store', 'update', 'destroy']);
            Route::apiResource('assessment-categories.sections', AssessmentSectionController::class)->shallow();
            Route::apiResource('assessment-sections.questions', AssessmentQuestionController::class)->shallow();
        });
        Route::middleware('module:inquiry_pipeline')->group(function () {
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
            Route::get('branch-performance', [DashboardController::class, 'branchPerformance'])->middleware('module:branch_performance');
        });
    });
});
