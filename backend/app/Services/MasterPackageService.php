<?php

namespace App\Services;

use App\Models\MasterPackage;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/**
 * Master paket (M3, modul finance). Harga/kredit yang berubah tidak memengaruhi invoice dan paket lama
 * (keduanya menyimpan snapshot). Hapus: DeleteMasterPackageAction.
 */
class MasterPackageService
{
    /** `?active=1` hanya paket yang dijual. @return Collection<int, MasterPackage> */
    public function all(Request $request): Collection
    {
        $query = MasterPackage::query()->orderBy('id');

        if (filter_var($request->query('active'), FILTER_VALIDATE_BOOLEAN)) {
            $query->where('is_active', true);
        }

        return $query->get();
    }

    public function find(int $id): MasterPackage
    {
        return MasterPackage::query()->findOrFail($id);
    }

    public function create(array $data): MasterPackage
    {
        $data['code'] = $this->uniqueCode($data['name']);
        $data['description'] = $this->nullIfBlank($data['description'] ?? null);

        return MasterPackage::query()->create($data)->refresh(); // lengkapi nilai bawaan database (`is_active`, `leave_quota`, ...)
    }

    public function update(int $id, array $data): MasterPackage
    {
        $package = MasterPackage::query()->findOrFail($id);

        if (array_key_exists('description', $data)) {
            $data['description'] = $this->nullIfBlank($data['description']);
        }

        $package->fill($data)->save();

        return $package;
    }

    public function setActive(int $id, bool $active): MasterPackage
    {
        $package = MasterPackage::query()->findOrFail($id);
        $package->is_active = $active;
        $package->save();

        return $package;
    }

    /** Kode internal `pkg-<slug nama>` (unik, tidak berubah walau nama diedit). */
    private function uniqueCode(string $name): string
    {
        $base = 'pkg-'.(Str::slug($name) ?: 'paket');
        $code = $base;

        for ($i = 2; MasterPackage::query()->where('code', $code)->exists(); $i++) {
            $code = "{$base}-{$i}";
        }

        return mb_substr($code, 0, 50);
    }

    private function nullIfBlank(mixed $value): ?string
    {
        $value = is_string($value) ? trim($value) : $value;

        return $value === '' || $value === null ? null : (string) $value;
    }
}
