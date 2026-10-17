<?php

namespace App\Actions\Assessment;

use App\Exceptions\ApiException;
use App\Http\Resources\Organization\BranchBankAccountResource;
use App\Models\AssessmentAccessCode;
use App\Models\AssessmentAnswer;
use App\Models\AssessmentDraft;
use App\Models\AssessmentResponse;
use App\Models\AssessmentSection;
use App\Models\Branch;
use App\Models\Client;
use App\Models\Invoice;
use App\Services\AssessmentDocumentFiles;
use App\Services\AssessmentSnapshotService;
use App\Support\AssessmentRespondent;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

/**
 * Kuesioner publik tanpa login (kode = kunci): buka, simpan draft (merge patch), submit sekali.
 *
 * Struktur soal: kode yang BELUM diisi memakai master terbaru; sejak draft pertama / submit struktur dibekukan
 * (`structure_snapshot`) sehingga edit master tidak mengubah draft maupun hasil. Validasi id soal, soal wajib, dan
 * tipe jawaban selalu terhadap struktur yang berlaku untuk kode itu.
 *
 * Bentuk jawaban: `{ "<question_id>": { "t": "teks", "v": ["opsi", ...] } }` (`v` hanya untuk checkbox_multi).
 */
class PublicAssessmentActions
{
    public const MAX_DRAFT_BYTES = 262144; // 256 KB

    private const SCORED_TYPES = ['scale_0_5', 'range', 'multiple_choice', 'dropdown'];

    public function __construct(private readonly AssessmentSnapshotService $snapshots, private readonly AssessmentDocumentFiles $files) {}

    /** @return array<string, mixed> */
    public function open(string $codeValue): array
    {
        $code = $this->findCode($codeValue);
        $draft = $code->assessmentDraftsViaAccessCode()->first();
        $this->assertOpen($code, $draft);

        return [
            'code' => $code->code,
            'status' => $code->status,
            'expires_at' => $code->expires_at?->toIso8601String(),
            'invoice_required' => $code->invoice_required,
            'frozen' => $code->structure_snapshot !== null,
            'client' => $this->clientSummary($code),
            'bank_accounts' => $this->bankAccounts($this->branchIdOf($code)),
            'structure' => $this->snapshots->publicStructure($this->snapshots->structureFor($code)),
            'draft' => $draft ? $this->presentDraft($draft) : null,
        ];
    }

    /**
     * @param  array<string, mixed>  $data  answers (patch; null = hapus jawaban), last_section_id, consent, version
     * @return array<string, mixed>
     */
    public function saveDraft(string $codeValue, array $data, ?string $ip): array
    {
        return DB::transaction(function () use ($codeValue, $data, $ip): array {
            $code = $this->lockCode($codeValue);
            $draft = AssessmentDraft::query()->lockForUpdate()->find($code->id);
            $this->assertOpen($code, $draft);

            $structure = $this->snapshots->freeze($code);
            $index = $this->snapshots->questionIndex($structure);

            if ($draft !== null) {
                $draft->assertVersion($data['version'] ?? null);
            } else {
                $draft = new AssessmentDraft(['access_code_id' => $code->id, 'started_at' => now(), 'answers' => []]);
            }

            $answers = $this->mergeAnswers($draft->answers ?? [], $data['answers'] ?? [], $index);
            $this->assertSize($answers);
            $respondent = AssessmentRespondent::merge(AssessmentRespondent::profileOf($structure), $draft->respondent ?? [], $data['respondent'] ?? []);

            $lastSection = $data['last_section_id'] ?? null;
            $sectionIds = collect($structure['sections'])->pluck('id')->map(fn ($id) => (int) $id)->all();

            $draft->fill([
                'answers' => $answers,
                'respondent' => $respondent,
                'answered_count' => $this->countFilled($answers),
                'last_section_id' => $lastSection !== null && in_array((int) $lastSection, $sectionIds, true) ? (int) $lastSection : $draft->last_section_id,
                'consent_at' => $draft->consent_at ?? (! empty($data['consent']) ? now() : null),
                'ip_address' => $ip,
            ])->save();

            return $this->presentDraft($draft->refresh());
        });
    }

    /**
     * @param  array<string, mixed>  $data  answers (patch opsional), consent
     * @return array<string, mixed>
     */
    public function submit(string $codeValue, array $data, ?string $ip): array
    {
        $frozen = null;

        $result = DB::transaction(function () use ($codeValue, $data, $ip, &$frozen): array {
            $code = $this->lockCode($codeValue);
            $draft = AssessmentDraft::query()->lockForUpdate()->find($code->id);
            $this->assertOpen($code, $draft);

            $structure = $this->snapshots->freeze($code);
            $frozen = $structure;
            $index = $this->snapshots->questionIndex($structure);

            $answers = $this->mergeAnswers($draft?->answers ?? [], $data['answers'] ?? [], $index);
            $this->assertSize($answers);

            $profile = AssessmentRespondent::profileOf($structure);
            $respondent = AssessmentRespondent::merge($profile, $draft?->respondent ?? [], $data['respondent'] ?? []);
            $missingRespondent = AssessmentRespondent::missing($profile, $respondent);
            if ($missingRespondent !== []) {
                throw ApiException::unprocessable('incomplete', 'Data pengisi belum lengkap.', [], ['missing_respondent_fields' => $missingRespondent]);
            }

            $consentAt = $draft?->consent_at ?? (! empty($data['consent']) ? now() : null);
            if ($consentAt === null) {
                throw ApiException::validation(['consent' => ['Persetujuan wajib dicentang sebelum mengirim.']]);
            }

            $missing = collect($index)->filter(fn (array $q) => $q['is_required'] && ! $this->isFilled($answers[(string) $q['id']] ?? null))->keys()->values()->all();
            if ($missing !== []) {
                throw ApiException::unprocessable('incomplete', 'Masih ada '.count($missing).' soal wajib yang belum dijawab.', [], ['missing_question_ids' => $missing]);
            }

            $response = AssessmentResponse::create(AssessmentRespondent::toColumns($respondent) + [
                'access_code_id' => $code->id,
                'client_id' => $code->client_id,
                'category_id' => $code->category_id,
                'answered_count' => $this->countFilled($answers),
                'consent_at' => $consentAt,
                'submitted_at' => now(),
                'ip_address' => $ip,
            ]);

            $rows = [];
            foreach ($index as $questionId => $question) {
                $answer = $answers[(string) $questionId] ?? null;
                if (! $this->isFilled($answer)) {
                    continue; // soal opsional yang dikosongkan tidak disimpan
                }
                $values = $answer['v'] ?? null;
                $rows[] = [
                    'response_id' => $response->id,
                    'question_id' => $questionId,
                    'item_no' => $question['item_no'],
                    'answer_text' => $answer['t'] !== '' ? $answer['t'] : implode(', ', $values ?? []),
                    'answer_values' => $values ? json_encode(array_values($values)) : null,
                    'score' => $this->score($question['question_type'], $answer['t']),
                ];
            }
            AssessmentAnswer::insert($rows);

            $draft?->delete();
            $code->forceFill(['status' => 'submitted', 'submitted_at' => now()])->save();

            return ['code' => $code->code, 'status' => 'submitted', 'response_id' => $response->id, 'submitted_at' => $response->submitted_at->toIso8601String(), 'answered_count' => $response->answered_count];
        });

        // Kuesioner terkirim tidak butuh PDF beku lagi: file yang sudah bukan file section saat ini dilepas (bila tak dipakai kode lain)
        $sectionIds = array_map(fn ($s) => (int) $s['id'], $frozen['sections'] ?? []);
        $current = AssessmentSection::query()->whereIn('id', $sectionIds)->pluck('document_path', 'id')->all();
        $this->files->releaseAfterSubmit($frozen ?? [], $current);

        return $result;
    }

    /** Unduh PDF section untuk ortu: hanya section yang ada di struktur kuesioner ini dan hanya selama kuesioner terbuka. */
    public function document(string $codeValue, int $sectionId): BinaryFileResponse
    {
        $code = $this->findCode($codeValue);
        $this->assertOpen($code, $code->assessmentDraftsViaAccessCode()->first());

        // File mengikuti struktur yang berlaku untuk kode ini: kuesioner yang sudah dibekukan tetap melihat PDF yang dibekukan
        // (walau di master sudah diganti/dihapus); snapshot lama tanpa path memakai file section saat ini.
        $entry = collect($this->snapshots->structureFor($code)['sections'])->first(fn (array $s) => (int) $s['id'] === $sectionId);
        $path = $entry['document_path'] ?? (($entry !== null && ($entry['has_document_file'] ?? false)) ? AssessmentSection::query()->whereKey($sectionId)->value('document_path') : null);

        if ($path === null || ! Storage::exists($path)) {
            throw ApiException::notFound('Dokumen tidak ditemukan.');
        }

        return $this->pdfResponse($path);
    }

    /**
     * PDF untuk penampil pdf.js di halaman (bukan unduhan). TANPA header Content-Disposition: Chrome menganggap respons ber-
     * `Content-Disposition` + filename sebagai UNDUHAN dan memblokir fetch pdf.js (muncul dialog download, dokumen tidak tampil).
     */
    private function pdfResponse(string $path): BinaryFileResponse
    {
        return response()->file(Storage::path($path), ['Content-Type' => 'application/pdf', 'Cache-Control' => 'private, max-age=300']);
    }

    private function findCode(string $value): AssessmentAccessCode
    {
        return AssessmentAccessCode::query()->where('code', strtoupper(trim($value)))->first()
            ?? throw ApiException::notFound('Kode kuesioner tidak ditemukan.');
    }

    private function lockCode(string $value): AssessmentAccessCode
    {
        return AssessmentAccessCode::query()->where('code', strtoupper(trim($value)))->lockForUpdate()->first()
            ?? throw ApiException::notFound('Kode kuesioner tidak ditemukan.');
    }

    /** Sudah diisi (409), kedaluwarsa (410; tetap boleh diselesaikan bila draft dimulai sebelum kedaluwarsa), atau butuh bukti bayar (403). */
    private function assertOpen(AssessmentAccessCode $code, ?AssessmentDraft $draft): void
    {
        if ($code->status === 'submitted') {
            throw ApiException::conflict('already_submitted', 'Kuesioner ini sudah dikirim dan tidak dapat diisi lagi.');
        }

        if ($code->expires_at !== null && $code->expires_at->isPast() && ($draft === null || $draft->started_at === null || $draft->started_at->gt($code->expires_at))) {
            throw ApiException::gone('expired', 'Kode kuesioner sudah kedaluwarsa. Hubungi admin klinik untuk kode baru.');
        }

        if ($code->invoice_required && ($invoice = $this->invoiceNeedingProof($code)) !== null) {
            throw new ApiException(
                'Unggah bukti pembayaran invoice asesmen terlebih dahulu untuk membuka kuesioner.',
                403,
                'proof_required',
                [],
                ['invoice' => [
                    'id' => $invoice->id,
                    'invoice_number' => $invoice->invoice_number,
                    'amount' => (int) $invoice->amount,
                    'package_name' => $invoice->package_name,
                ], 'bank_accounts' => $this->bankAccounts((int) $invoice->branch_id)],
            );
        }
    }

    /** Invoice asesmen (milik kode ini atau invoice manual Finance untuk client) yang belum lunas/void dan belum ada bukti. */
    private function invoiceNeedingProof(AssessmentAccessCode $code): ?Invoice
    {
        return Invoice::withoutGlobalScopes()
            ->where('client_id', $code->client_id)
            ->where('invoice_type', 'assessment')
            ->whereNotIn('status', ['paid', 'void'])
            ->where(fn ($q) => $q->where('assessment_access_code_id', $code->id)->orWhereNull('assessment_access_code_id'))
            ->where('proof_upload_count', 0)
            ->whereDoesntHave('paymentProofs')
            ->orderBy('id')
            ->first();
    }

    private function branchIdOf(AssessmentAccessCode $code): int
    {
        return (int) Client::withoutGlobalScopes()->whereKey($code->client_id)->value('branch_id');
    }

    /**
     * Rekening aktif cabang client: tujuan transfer yang ditampilkan ke ortu.
     *
     * @return array<int, mixed>
     */
    private function bankAccounts(int $branchId): array
    {
        $branch = Branch::query()->with(['bankAccounts' => fn ($q) => $q->where('is_active', true)->orderBy('sort_order')])->find($branchId);

        return $branch ? BranchBankAccountResource::collection($branch->bankAccounts)->resolve() : [];
    }

    /** @return array{id: int, child_name: string}|null */
    private function clientSummary(AssessmentAccessCode $code): ?array
    {
        $client = Client::withoutGlobalScopes()->select('id', 'child_name')->find($code->client_id);

        return $client ? ['id' => $client->id, 'child_name' => $client->child_name] : null;
    }

    /**
     * Terapkan patch jawaban ke jawaban yang ada: id di luar struktur dibuang, `null` menghapus jawaban.
     *
     * @param  array<string, mixed>  $current
     * @param  array<string|int, mixed>  $patch
     * @param  array<int, array<string, mixed>>  $index
     * @return array<string, array{t: string, v?: list<string>}>
     */
    private function mergeAnswers(array $current, array $patch, array $index): array
    {
        $answers = array_intersect_key($current, array_flip(array_map('strval', array_keys($index))));

        foreach ($patch as $questionId => $value) {
            $key = (string) $questionId;
            if (! isset($index[(int) $key])) {
                continue;
            }
            if ($value === null) {
                unset($answers[$key]);

                continue;
            }
            $answers[$key] = $this->normalizeAnswer($index[(int) $key], (array) $value);
        }

        return $answers;
    }

    /**
     * @param  array<string, mixed>  $question
     * @param  array<string, mixed>  $value
     * @return array{t: string, v?: list<string>}
     */
    private function normalizeAnswer(array $question, array $value): array
    {
        $type = $question['question_type'];
        $text = trim((string) ($value['t'] ?? ''));
        $values = isset($value['v']) ? array_values(array_filter(array_map(fn ($v) => trim((string) $v), (array) $value['v']), fn ($v) => $v !== '')) : [];

        if ($text !== '') {
            $valid = match ($type) {
                'number' => is_numeric($text),
                'range' => is_numeric($text),
                'date', 'birth_date' => (bool) preg_match('/^\d{4}-\d{2}-\d{2}$/', $text) && strtotime($text) !== false,
                'time' => (bool) preg_match('/^\d{2}:\d{2}$/', $text),
                default => true,
            };
            if (! $valid) {
                throw ApiException::validation(["answers.{$question['id']}" => ["Jawaban soal no. {$question['item_no']} tidak sesuai format."]]);
            }
        }

        $text = mb_substr($text, 0, 5000);

        return $type === 'checkbox_multi' ? ['t' => $text, 'v' => array_slice($values, 0, 50)] : ['t' => $text];
    }

    /** @param  array{t?: string, v?: list<string>}|null  $answer */
    private function isFilled(?array $answer): bool
    {
        return $answer !== null && (($answer['t'] ?? '') !== '' || ! empty($answer['v']));
    }

    private function countFilled(array $answers): int
    {
        return count(array_filter($answers, fn ($a) => $this->isFilled($a)));
    }

    private function assertSize(array $answers): void
    {
        if (strlen((string) json_encode($answers)) > self::MAX_DRAFT_BYTES) {
            throw ApiException::validation(['answers' => ['Jawaban terlalu besar (maksimal 256 KB).']]);
        }
    }

    private function score(string $type, string $text): ?int
    {
        if (! in_array($type, self::SCORED_TYPES, true)) {
            return null;
        }

        return preg_match('/^\s*(\d+)/', $text, $m) ? (int) $m[1] : null;
    }

    /** @return array<string, mixed> */
    private function presentDraft(AssessmentDraft $draft): array
    {
        return [
            'answers' => (object) ($draft->answers ?? []),
            'respondent' => (object) ($draft->respondent ?? []),
            'answered_count' => (int) $draft->answered_count,
            'last_section_id' => $draft->last_section_id,
            'consent_at' => $draft->consent_at?->toIso8601String(),
            'version' => (int) $draft->version,
            'started_at' => $draft->started_at?->toIso8601String(),
        ];
    }
}
