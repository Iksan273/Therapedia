<?php

namespace App\Actions\Client;

use App\Http\Resources\Client\ClientListResource;
use App\Models\Client;
use App\Models\User;
use App\Services\PermissionService;
use App\Support\BranchContext;
use App\Support\Paginate;
use App\Support\PrefixSearch;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

/**
 * Daftar client (pipeline, roster, picker jadwal, pencarian finance, tab Discontinued).
 * Filter: `branch_id`, `status[]`, `q` (prefix per kata: nama anak / nama ortu; prefix kode), `service_code`,
 * `credit_status` (healthy > 2 sesi, low 1-2, zero = Frozen), `birth_month` (1-12), `sort`. Paginasi offset (default 10, maks 50).
 * Terapis murni (hanya modul `therapist_module`): hanya client yang pernah dijadwalkan padanya.
 */
class ListClientsAction
{
    /** Modul selain portal terapis: bila user punya salah satu, daftar tidak dibatasi ke client terjadwalnya. */
    private const BROAD_MODULES = ['inquiry_pipeline', 'inquiry_dashboard', 'active_clients', 'weekly_calendar', 'finance'];

    private const SORTS = [
        'created_at' => ['created_at', 'asc'], '-created_at' => ['created_at', 'desc'],
        'child_name' => ['child_name', 'asc'], '-child_name' => ['child_name', 'desc'],
        'client_code' => ['client_code', 'asc'], '-client_code' => ['client_code', 'desc'],
        'credit_balance' => ['credit_balance', 'asc'], '-credit_balance' => ['credit_balance', 'desc'],
        'status_changed_at' => ['status_changed_at', 'asc'], '-status_changed_at' => ['status_changed_at', 'desc'],
    ];

    public function __construct(private readonly PermissionService $permissions) {}

    /** @return array{data: array<int, mixed>, meta: array<string, int>} */
    public function handle(Request $request): array
    {
        $query = $this->filtered($request);

        $statuses = array_values(array_filter((array) $request->query('status', []), fn ($s) => is_string($s) && $s !== ''));
        if ($statuses !== []) {
            $this->whereStatus($query, $statuses);
        }

        // Pembeda urutan (id) searah dengan kolom utama supaya indeks (kolom, id) bisa dipakai tanpa filesort
        [$column, $direction] = self::SORTS[(string) $request->query('sort')] ?? self::SORTS['-created_at'];
        $query->orderBy($column, $direction)->orderBy('id', $direction);

        return Paginate::offset($query, $request, ClientListResource::class);
    }

    /**
     * Filter status. Tiga status roster sekaligus (admitted + discharged + discontinued) dipetakan ke kolom turunan `is_roster`
     * (satu kondisi kesamaan yang bisa diindeks, urut nama langsung dari indeks); selain itu `status IN (...)`.
     *
     * @param  Builder<Client>  $query
     * @param  list<string>  $statuses
     */
    private function whereStatus(Builder $query, array $statuses): void
    {
        $sorted = array_unique($statuses);
        sort($sorted);

        if ($sorted === ['admitted', 'discharged', 'discontinued']) {
            $query->where('is_roster', true);

            return;
        }

        $query->whereIn('status', $statuses);
    }

    /**
     * Query dasar tanpa filter status / urutan / paginasi: cabang, pembatasan terapis, `q`, `service_code`, `credit_status`.
     * Dipakai juga oleh papan pipeline (`ListPipelineBoardAction`) agar filternya identik.
     *
     * @return Builder<Client>
     */
    public function filtered(Request $request): Builder
    {
        $query = Client::query()->with(['branch', 'clientServices']);
        BranchContext::apply($query, $request);

        $user = $request->user();
        if ($user instanceof User && ! $this->permissions->allowsAny($user, self::BROAD_MODULES)) {
            $query->whereHas('schedules', fn ($q) => $q->where('therapist_id', $user->id));
        }

        PrefixSearch::applyWords($query, $request->query('q'), ['child_name', 'parent_name'], ['client_code']);

        if (is_string($service = $request->query('service_code')) && $service !== '') {
            $query->whereHas('clientServices', fn ($q) => $q->where('service_code', $service));
        }

        // Radar ulang tahun (Active Clients): bulan lahir 1-12 (kolom `birth_month`, indeks `idx_clients_birthday`)
        $month = $request->query('birth_month');
        if (is_scalar($month) && ctype_digit((string) $month) && (int) $month >= 1 && (int) $month <= 12) {
            $query->where('birth_month', (int) $month);
        }

        match ($request->query('credit_status')) {
            'zero' => $query->where('credit_balance', '<=', 0),
            'low' => $query->whereBetween('credit_balance', [1, 2]),
            'healthy' => $query->where('credit_balance', '>', 2),
            default => null,
        };

        return $query;
    }
}
