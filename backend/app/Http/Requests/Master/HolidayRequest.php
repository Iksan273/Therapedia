<?php

namespace App\Http\Requests\Master;

use Carbon\CarbonImmutable;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Tambah hari libur (POST): satu tanggal `holiday_date` ATAU rentang `start_date`..`end_date` (maks 366 hari).
 * Ubah (PUT, PATCH): satu baris (`holiday_date`, `name`, `branch_id`).
 */
class HolidayRequest extends FormRequest
{
    private const MAX_RANGE_DAYS = 366;

    public function authorize(): bool
    {
        return true; // akses modul `holidays` dijaga middleware rute
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('name')) {
            $this->merge(['name' => trim((string) $this->input('name'))]);
        }
        if ($this->input('branch_id') === '' || $this->input('branch_id') === 'all') {
            $this->merge(['branch_id' => null]);
        }
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        $create = $this->isMethod('POST');

        return [
            'name' => [$create ? 'required' : 'sometimes', 'string', 'max:150'],
            'branch_id' => ['nullable', 'integer', 'exists:branches,id'],
            'holiday_date' => $create ? ['required_without:start_date', 'prohibits:start_date', 'date_format:Y-m-d'] : ['sometimes', 'date_format:Y-m-d'],
            'start_date' => $create ? ['required_without:holiday_date', 'date_format:Y-m-d'] : ['prohibited'],
            'end_date' => $create
                ? ['required_with:start_date', 'date_format:Y-m-d', 'after_or_equal:start_date', $this->rangeLimit(...)]
                : ['prohibited'],
        ];
    }

    private function rangeLimit(string $attribute, mixed $value, \Closure $fail): void
    {
        $start = $this->input('start_date');
        if (! $start || ! $value) {
            return;
        }

        if (CarbonImmutable::parse($start)->diffInDays(CarbonImmutable::parse($value)) + 1 > self::MAX_RANGE_DAYS) {
            $fail('Rentang hari libur maksimal '.self::MAX_RANGE_DAYS.' hari.');
        }
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'name.required' => 'Nama hari libur wajib diisi.',
            'branch_id.exists' => 'Cabang tidak ditemukan.',
            'holiday_date.required_without' => 'Tanggal hari libur wajib diisi.',
            'holiday_date.prohibits' => 'Kirim satu tanggal ATAU rentang, jangan keduanya.',
            'holiday_date.date_format' => 'Tanggal harus berformat yyyy-MM-dd.',
            'start_date.required_without' => 'Tanggal mulai wajib diisi.',
            'end_date.required_with' => 'Tanggal selesai wajib diisi untuk rentang.',
            'end_date.after_or_equal' => 'Tanggal selesai tidak boleh sebelum tanggal mulai.',
        ];
    }
}
