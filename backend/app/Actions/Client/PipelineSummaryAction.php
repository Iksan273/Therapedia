<?php

namespace App\Actions\Client;

use App\Models\Client;
use App\Services\ClientStatusService;
use App\Support\BranchContext;
use Illuminate\Http\Request;

/** Jumlah client per status (kolom kanban) untuk cabang efektif request; status tanpa client = 0. */
class PipelineSummaryAction
{
    /** @return array<string, int> */
    public function handle(Request $request): array
    {
        $counts = BranchContext::apply(Client::query(), $request)
            ->selectRaw('status, COUNT(*) AS total')
            ->groupBy('status')
            ->pluck('total', 'status');

        $summary = [];
        foreach (ClientStatusService::STATUSES as $status) {
            $summary[$status] = (int) ($counts[$status] ?? 0);
        }

        return $summary;
    }
}
