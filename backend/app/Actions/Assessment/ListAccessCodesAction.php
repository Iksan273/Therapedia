<?php

namespace App\Actions\Assessment;

use App\Models\AssessmentAccessCode;
use App\Models\AssessmentQuestion;
use App\Models\Client;
use App\Services\AssessmentSnapshotService;
use App\Support\BranchContext;
use App\Support\Paginate;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

/**
 * Daftar kode kuesioner: per client (`GET clients/{id}/assessment-codes`) dan antrean "menunggu diisi"
 * (`GET assessment-codes?awaiting=1`, tab Awaiting Questionnaire). Setiap baris memuat progres draft siap pakai.
 */
class ListAccessCodesAction
{
    public function forClient(int $clientId): array
    {
        $client = Client::query()->findOrFail($clientId); // BranchScope: cabang lain -> 404
        $codes = AssessmentAccessCode::query()->where('client_id', $client->id)
            ->with(['category:id,name,type_code', 'assessmentDraftsViaAccessCode', 'invoices'])->orderByDesc('issued_at')->orderByDesc('id')->get();

        return $this->present($codes);
    }

    /** @return array{data: array<int, array<string, mixed>>, meta: array<string, int>} */
    public function awaiting(Request $request): array
    {
        $query = AssessmentAccessCode::query()->where('status', 'issued')
            ->whereHas('client', function (Builder $q) use ($request): void {
                BranchContext::apply($q, $request, 'branch_id');
                if (($term = trim((string) $request->query('q', ''))) !== '') {
                    $q->where(fn (Builder $w) => $w->where('child_name', 'like', $term.'%')->orWhere('child_name', 'like', '% '.$term.'%'));
                }
            })
            ->with(['category:id,name,type_code', 'assessmentDraftsViaAccessCode', 'invoices', 'client:id,client_code,child_name,branch_id'])
            ->orderByDesc('issued_at')->orderByDesc('id');

        return Paginate::offset($query, $request, fn (Collection $items) => $this->present($items));
    }

    /** @return array<int, array<string, mixed>> */
    private function present(Collection $codes): array
    {
        $liveCounts = AssessmentQuestion::query()->selectRaw('category_id, count(*) as c')->groupBy('category_id')->pluck('c', 'category_id');
        $snapshots = new AssessmentSnapshotService;

        return $codes->map(function (AssessmentAccessCode $code) use ($liveCounts, $snapshots): array {
            $draft = $code->assessmentDraftsViaAccessCode->first();
            $total = $code->structure_snapshot !== null ? $snapshots->questionCount($code->structure_snapshot) : (int) ($liveCounts[$code->category_id] ?? 0);

            return [
                'id' => $code->id,
                'code' => $code->code,
                'client_id' => $code->client_id,
                'client' => $code->relationLoaded('client') ? ['id' => $code->client->id, 'client_code' => $code->client->client_code, 'child_name' => $code->client->child_name] : null,
                'category_id' => $code->category_id,
                'category' => $code->category ? ['id' => $code->category->id, 'name' => $code->category->name, 'type_code' => $code->category->type_code] : null,
                'status' => $code->status,
                'issued_at' => $code->issued_at?->toIso8601String(),
                'expires_at' => $code->expires_at?->toIso8601String(),
                'submitted_at' => $code->submitted_at?->toIso8601String(),
                'invoice_required' => $code->invoice_required,
                'has_draft' => $draft !== null,
                'answered_count' => (int) ($draft?->answered_count ?? 0),
                'question_count' => $total,
                'draft_started_at' => $draft?->started_at?->toIso8601String(),
                'invoice' => ($inv = $code->invoices->first()) ? ['id' => $inv->id, 'invoice_number' => $inv->invoice_number, 'status' => $inv->status, 'amount' => (int) $inv->amount, 'package_name' => $inv->package_name, 'proof_upload_count' => (int) $inv->proof_upload_count] : null,
            ];
        })->values()->all();
    }
}
