<?php

namespace App\Http\Requests\Master;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/** Tambah (POST) / ubah (PUT, PATCH) master paket. Kode invoice unik dan tidak boleh `ASM` (dipakai invoice asesmen). */
class MasterPackageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // akses modul `finance` dijaga middleware rute
    }

    protected function prepareForValidation(): void
    {
        $this->merge(array_filter([
            'name' => $this->has('name') ? trim((string) $this->input('name')) : null,
            'invoice_code' => $this->has('invoice_code') ? mb_strtoupper(trim((string) $this->input('invoice_code'))) : null,
        ], fn ($v) => $v !== null));
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        $required = $this->isMethod('POST') ? 'required' : 'sometimes';

        return [
            'name' => [$required, 'string', 'max:150'],
            'invoice_code' => [$required, 'string', 'regex:/^[A-Z0-9]{2,10}$/', Rule::notIn(['ASM']), Rule::unique('master_packages', 'invoice_code')->ignore($this->route('package'))],
            'credits' => [$required, 'integer', 'between:0,65535'],
            'price' => [$required, 'integer', 'min:0'],
            'leave_quota' => ['sometimes', 'integer', 'between:0,65535'],
            'is_satuan' => ['sometimes', 'boolean'],
            'is_assessment' => ['sometimes', 'boolean'],
            'description' => ['nullable', 'string', 'max:2000'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'name.required' => 'Nama paket wajib diisi.',
            'invoice_code.required' => 'Kode invoice wajib diisi.',
            'invoice_code.regex' => 'Kode invoice 2-10 karakter, hanya huruf dan angka.',
            'invoice_code.not_in' => 'Kode ASM dipakai invoice asesmen, pilih kode lain.',
            'invoice_code.unique' => 'Kode invoice ini sudah dipakai paket lain.',
            'credits.required' => 'Jumlah kredit wajib diisi.',
            'price.required' => 'Harga wajib diisi.',
        ];
    }
}
