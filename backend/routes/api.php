<?php

use App\Http\Controllers\Api\Assessment\AssessmentAccessCodeController;
use App\Http\Controllers\Api\Assessment\AssessmentCategoryController;
use App\Http\Controllers\Api\Assessment\AssessmentQuestionController;
use App\Http\Controllers\Api\Assessment\AssessmentSectionController;
use App\Http\Controllers\Api\Assessment\PublicAssessmentController;
use App\Http\Controllers\Api\Auth\AuthController;
use App\Http\Controllers\Api\Client\ClientController;
use App\Http\Controllers\Api\Client\ClientGdriveLinkController;
use App\Http\Controllers\Api\Dashboard\DashboardController;
use App\Http\Controllers\Api\Finance\ClientPackageController;
use App\Http\Controllers\Api\Finance\CreditLedgerController;
use App\Http\Controllers\Api\Finance\InvoiceController;
use App\Http\Controllers\Api\Master\CancelReasonController;
use App\Http\Controllers\Api\Master\DischargeReasonController;
use App\Http\Controllers\Api\Master\HolidayController;
use App\Http\Controllers\Api\Master\MasterPackageController;
use App\Http\Controllers\Api\Master\ServiceController;
use App\Http\Controllers\Api\Organization\BranchBankAccountController;
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

    // Batas per IP, dipisah per jenis rute (prefix = ember hitung terpisah; tanpa prefix semua `throttle:N,M` berbagi satu hitungan).
    // Buka kuesioner paling ketat (satu-satunya jalan menebak kode); simpan/kirim longgar karena wifi klinik dipakai bersama banyak ortu.
    Route::prefix('public/assessments/{code}')->group(function () {
        Route::get('/', [PublicAssessmentController::class, 'show'])->middleware('throttle:30,1,assess-open');
        Route::put('draft', [PublicAssessmentController::class, 'saveDraft'])->middleware('throttle:180,1,assess-write');
        Route::post('responses', [PublicAssessmentController::class, 'submit'])->middleware('throttle:180,1,assess-write');
        Route::get('sections/{section}/document', [PublicAssessmentController::class, 'document'])->middleware('throttle:90,1,assess-doc');
        Route::post('proof', [PublicAssessmentController::class, 'uploadProof'])->middleware('throttle:12,1,assess-proof');
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
        // Akun staf: berhenti = nonaktif; DELETE hanya Master dan hanya akun tanpa jadwal/laporan (dicek DeleteUserAction).
        Route::middleware('module:user_management')->group(function () {
            Route::get('users', [UserController::class, 'index']);
            Route::post('users', [UserController::class, 'store']);
            Route::get('users/{user}', [UserController::class, 'show']);
            Route::patch('users/{user}', [UserController::class, 'update']);
            Route::patch('users/{user}/active', [UserController::class, 'setActive']);
            Route::delete('users/{user}', [UserController::class, 'destroy']);
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
            // Rekening bank pembayaran cabang (daftar dibaca lewat GET branches)
            Route::post('branches/{branch}/bank-accounts', [BranchBankAccountController::class, 'store']);
            Route::put('branches/{branch}/bank-accounts/{account}', [BranchBankAccountController::class, 'update']);
            Route::patch('branches/{branch}/bank-accounts/{account}', [BranchBankAccountController::class, 'update']);
            Route::patch('branches/{branch}/bank-accounts/{account}/active', [BranchBankAccountController::class, 'setActive']);
            Route::delete('branches/{branch}/bank-accounts/{account}', [BranchBankAccountController::class, 'destroy']);
            Route::get('branches/{branch}/delete-impact', [BranchController::class, 'deleteImpact']);
            Route::delete('branches/{branch}', [BranchController::class, 'destroy']);
        });

        // M3 Master data
        // Tulis lewat modul `inquiry_master_data` (halaman Master Layanan: layanan, alasan Cancel / Off
        // termasuk Therapist Off, alasan Discharge). Baca: semua staf login (dropdown).
        $masterResource('master/services', ServiceController::class, 'inquiry_master_data');
        $masterResource('master/cancel-reasons', CancelReasonController::class, 'inquiry_master_data');
        $masterResource('master/discharge-reasons', DischargeReasonController::class, 'inquiry_master_data');
        $masterResource('master/packages', MasterPackageController::class, 'finance');
        Route::patch('master/packages/{package}/active', [MasterPackageController::class, 'setActive'])->middleware('module:finance');
        $masterResource('holidays', HolidayController::class, 'holidays');

        // M4 Inquiry & client
        // Baca: modul inquiry/roster/kalender/finance/terapis (terapis murni hanya melihat client terjadwalnya, di ListClientsAction).
        Route::middleware('module:inquiry_pipeline,inquiry_dashboard,active_clients,weekly_calendar,finance,therapist_module')->group(function () {
            Route::get('clients', [ClientController::class, 'index']);
        });
        // Rute statis harus sebelum `clients/{client}`.
        Route::middleware('module:inquiry_pipeline')->group(function () {
            Route::get('clients/board', [ClientController::class, 'board']);
            Route::get('clients/pipeline-summary', [ClientController::class, 'pipelineSummary']);
            Route::get('clients/check-duplicate', [ClientController::class, 'checkDuplicate']);
            Route::post('clients', [ClientController::class, 'store']);
        });
        Route::middleware('module:inquiry_pipeline,inquiry_dashboard,active_clients,weekly_calendar,finance,therapist_module')->group(function () {
            Route::get('clients/{client}', [ClientController::class, 'show']);
        });
        Route::middleware('module:inquiry_pipeline')->group(function () {
            Route::patch('clients/{client}', [ClientController::class, 'update']);
            Route::put('clients/{client}/services', [ClientController::class, 'syncServices']);
            Route::post('clients/{client}/gdrive-links', [ClientGdriveLinkController::class, 'store']);
            Route::delete('clients/{client}/gdrive-links/{document}', [ClientGdriveLinkController::class, 'destroy']);
        });
        Route::post('clients/{client}/transition', [ClientController::class, 'transition'])->middleware('module:inquiry_pipeline,active_clients');
        // Hapus client PERMANEN: hanya master (dicek di DeleteClientAction; modul hanya pintu masuk)
        Route::delete('clients/{client}', [ClientController::class, 'destroy'])->middleware('module:inquiry_pipeline,active_clients');

        // M5 Asesmen. Mesin kuesioner (kategori/section/soal): BACA oleh `assessment_master` atau `inquiry_pipeline` (admin
        // inquiry memilih kategori saat menerbitkan kode); TULIS hanya `assessment_master`. Kode kuesioner: `inquiry_pipeline`.
        Route::middleware('module:assessment_master,inquiry_pipeline')->group(function () {
            Route::apiResource('assessment-categories', AssessmentCategoryController::class)->only(['index', 'show']);
        });
        Route::get('assessment-sections/{section}/document', [AssessmentSectionController::class, 'document'])->middleware('module:assessment_master,inquiry_pipeline');
        Route::middleware('module:assessment_master')->group(function () {
            Route::post('assessment-sections/{section}/document', [AssessmentSectionController::class, 'uploadDocument']);
            Route::delete('assessment-sections/{section}/document', [AssessmentSectionController::class, 'deleteDocument']);
            Route::apiResource('assessment-categories', AssessmentCategoryController::class)->only(['store', 'update', 'destroy']);
            Route::post('assessment-categories/{category}/duplicate', [AssessmentCategoryController::class, 'duplicate']);
            Route::get('assessment-categories/{category}/sections', [AssessmentSectionController::class, 'index']);
            Route::post('assessment-categories/{category}/sections', [AssessmentSectionController::class, 'store']);
            Route::put('assessment-categories/{category}/sections/order', [AssessmentSectionController::class, 'reorder']);
            Route::get('assessment-sections/{section}', [AssessmentSectionController::class, 'show']);
            Route::match(['put', 'patch'], 'assessment-sections/{section}', [AssessmentSectionController::class, 'update']);
            Route::delete('assessment-sections/{section}', [AssessmentSectionController::class, 'destroy']);
            Route::get('assessment-sections/{section}/questions', [AssessmentQuestionController::class, 'index']);
            Route::post('assessment-sections/{section}/questions', [AssessmentQuestionController::class, 'store']);
            Route::put('assessment-sections/{section}/questions/order', [AssessmentQuestionController::class, 'reorder']);
            Route::get('assessment-questions/{question}', [AssessmentQuestionController::class, 'show']);
            Route::match(['put', 'patch'], 'assessment-questions/{question}', [AssessmentQuestionController::class, 'update']);
            Route::delete('assessment-questions/{question}', [AssessmentQuestionController::class, 'destroy']);
        });
        Route::middleware('module:inquiry_pipeline')->group(function () {
            Route::get('assessment-codes', [AssessmentAccessCodeController::class, 'index']); // antrean menunggu diisi (4.15)
            Route::get('clients/{client}/assessment-responses', [AssessmentAccessCodeController::class, 'results']);
            Route::apiResource('clients.assessment-codes', AssessmentAccessCodeController::class)->only(['index', 'store', 'destroy'])->shallow();
        });

        // M6 Penjadwalan
        Route::apiResource('schedules', ScheduleController::class)->middleware('module:weekly_calendar,active_clients,therapist_module');
        Route::apiResource('session-reports', SessionReportController::class)->except('destroy')->middleware('module:weekly_calendar,therapist_module');
        Route::apiResource('leaves', ClientLeaveController::class)->only(['index', 'store', 'show'])->middleware('module:finance');

        // M7 Finance & kredit
        Route::middleware('module:finance')->group(function () {
            Route::apiResource('invoices', InvoiceController::class);
            Route::post('invoices/{invoice}/proof', [InvoiceController::class, 'uploadProof']);
            Route::get('invoices/{invoice}/proofs/{proof}/file', [InvoiceController::class, 'proofFile']);
            Route::post('invoices/{invoice}/verify', [InvoiceController::class, 'verify']);
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
