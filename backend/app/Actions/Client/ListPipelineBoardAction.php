<?php

namespace App\Actions\Client;

use App\Http\Resources\Client\ClientListResource;
use App\Models\Client;
use App\Services\ClientStatusService;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Papan pipeline dalam SATU request (`GET /clients/board`): untuk tiap tahap, `total` client yang cocok filter dan
 * `items` terbaru (`per_stage`, default 10, maks 50). Filter sama dengan daftar client (`cabang`, `q`, `service_code`).
 * Menggantikan 9 request terpisah per tahap: bootstrap PHP per request jauh lebih mahal daripada query-nya.
 *
 * Dua jalur query (hasil sama), dipilih agar tetap cepat di ratusan ribu client:
 *  - Tanpa pencarian teks (`q`): satu query hitung per status + satu query LIMIT per tahap yang berisi. Memakai indeks
 *    `idx_clients_pipeline` (dengan cabang) atau `idx_clients_status_created` (semua cabang), jadi tiap query hanya membaca beberapa baris.
 *  - Dengan pencarian teks (LIKE '%…%' tidak bisa memakai indeks): SATU pemindaian dengan fungsi window
 *    (`ROW_NUMBER()` dan `COUNT()` per tahap) menghasilkan total + 10 teratas semua tahap sekaligus, bukan 9 pemindaian.
 *
 * Respons memakai ARRAY `stages: [{ status, total, items }]` (bukan kamus berkunci status), sesuai konvensi key JSON.
 */
class ListPipelineBoardAction
{
    public const DEFAULT_PER_STAGE = 10; // sama dengan per_page bawaan semua daftar

    public const MAX_PER_STAGE = 50;

    public function __construct(private readonly ListClientsAction $list) {}

    /** @return list<array{status: string, total: int, items: array<int, mixed>}> */
    public function handle(Request $request): array
    {
        $perStage = min(max((int) $request->query('per_stage', self::DEFAULT_PER_STAGE), 1), self::MAX_PER_STAGE);

        [$totals, $itemsByStatus] = $this->hasResidualFilter($request)
            ? $this->scanWithWindow($request, $perStage)
            : $this->useIndexes($request, $perStage);

        $stages = [];
        foreach (ClientStatusService::STATUSES as $status) {
            $stages[] = [
                'status' => $status,
                'total' => (int) ($totals[$status] ?? 0),
                'items' => ClientListResource::collection($itemsByStatus[$status] ?? [])->resolve(),
            ];
        }

        return $stages;
    }

    /**
     * Pencarian teks (`q`): LIKE '%…%' tidak bisa memakai indeks, jadi tiap query per tahap akan memindai tabel sendiri-sendiri.
     * Filter layanan / kredit tetap di jalur indeks (urutan indeks + berhenti setelah 10 cocok; hasil pengukuran 110 ribu client:
     * ±170 ms lewat jalur indeks vs ±650 ms lewat window).
     */
    private function hasResidualFilter(Request $request): bool
    {
        return trim((string) $request->query('q')) !== '';
    }

    /** @return array{0: array<string, int>, 1: array<string, Collection<int, Client>>} */
    private function useIndexes(Request $request, int $perStage): array
    {
        $totals = $this->list->filtered($request)->without(['branch', 'clientServices'])
            ->reorder()->selectRaw('status, COUNT(*) AS total')->groupBy('status')->pluck('total', 'status')->all();

        $items = [];
        foreach ($totals as $status => $total) {
            if ((int) $total > 0) {
                $items[$status] = $this->list->filtered($request)->where('status', $status)->orderByDesc('created_at')->orderByDesc('id')->limit($perStage)->get();
            }
        }

        return [$totals, $items];
    }

    /** @return array{0: array<string, int>, 1: array<string, Collection<int, Client>>} */
    private function scanWithWindow(Request $request, int $perStage): array
    {
        $ranked = $this->list->filtered($request)->without(['branch', 'clientServices'])->reorder()
            ->select('clients.id', 'clients.status')
            ->selectRaw('ROW_NUMBER() OVER (PARTITION BY clients.status ORDER BY clients.created_at DESC, clients.id DESC) AS rn')
            ->selectRaw('COUNT(*) OVER (PARTITION BY clients.status) AS stage_total');

        $rows = DB::query()->fromSub($ranked, 'ranked')->where('rn', '<=', $perStage)->get();

        $totals = $rows->groupBy('status')->map(fn ($group) => (int) $group->first()->stage_total)->all();

        // Ambil baris lengkap + relasi untuk id terpilih, urutan per tahap mengikuti peringkat
        $rank = $rows->pluck('rn', 'id');
        $clients = Client::query()->with(['branch', 'clientServices'])->whereIn('id', $rows->pluck('id'))->get()
            ->sortBy(fn (Client $c) => (int) $rank[$c->id]);

        return [$totals, $clients->groupBy('status')->all()];
    }
}
