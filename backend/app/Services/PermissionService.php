<?php

namespace App\Services;

use App\Models\AccessModule;
use App\Models\RolePermission;
use App\Models\User;

/**
 * Hak akses berbasis modul (schema.md §04-A, implementation_detail §1.1). Dimemo per request: satu query per role.
 * `master` selalu boleh. Hapus client / cabang (data penting) hanya `master`; hapus operasional cukup akses modul.
 */
class PermissionService
{
    public const MASTER_ROLE = 'master';

    /** @var array<int, array<string, bool>> */
    private array $memo = [];

    public function isMaster(User $user): bool
    {
        return $user->role?->code === self::MASTER_ROLE;
    }

    public function allows(User $user, string $module): bool
    {
        return $this->isMaster($user) || ($this->modules($user)[$module] ?? false);
    }

    /** @param  array<int, string>  $modules */
    public function allowsAny(User $user, array $modules): bool
    {
        foreach ($modules as $module) {
            if ($this->allows($user, $module)) {
                return true;
            }
        }

        return false;
    }

    public function allowsDelete(User $user, string $module, bool $masterOnly = false): bool
    {
        if ($this->isMaster($user)) {
            return true;
        }

        return ! $masterOnly && $this->allows($user, $module);
    }

    /** @var list<string>|null */
    private ?array $moduleOrder = null;

    /** Buang memo izin sebuah role (dipanggil saat matriks diubah, agar perubahan langsung berlaku di proses yang sama). */
    public function forgetRole(int $roleId): void
    {
        unset($this->memo[$roleId]);
    }

    /** Semua kode modul, urut `access_modules.sort_order` (dimemo per request). @return list<string> */
    public function moduleCodes(): array
    {
        return $this->moduleOrder ??= AccessModule::query()->orderBy('sort_order')->pluck('code')->all();
    }

    /**
     * Urutkan sebagian kode modul mengikuti `sort_order`, membuang kode yang tidak dikenal.
     *
     * @param  iterable<string>  $codes
     * @return list<string>
     */
    public function sortModuleCodes(iterable $codes): array
    {
        $wanted = array_flip(is_array($codes) ? $codes : iterator_to_array($codes, false));

        return array_values(array_filter($this->moduleCodes(), fn (string $code) => isset($wanted[$code])));
    }

    /**
     * Kode modul yang diizinkan, urut `access_modules.sort_order`. Dipakai respons login/me.
     * Berbentuk DAFTAR (bukan kamus): kode modul adalah data, tidak boleh jadi key objek JSON (konvensi key,
     * implementation_detail.md §1.1). Master selalu penuh, termasuk modul baru.
     *
     * @return list<string>
     */
    public function allowedModuleCodes(User $user): array
    {
        $codes = AccessModule::query()->orderBy('sort_order')->pluck('code');

        if ($this->isMaster($user)) {
            return $codes->values()->all();
        }

        $allowed = $this->modules($user);

        return $codes->filter(fn (string $code) => $allowed[$code] ?? false)->values()->all();
    }

    /** @return array<string, bool> kode modul => diizinkan */
    public function modules(User $user): array
    {
        return $this->memo[$user->role_id] ??= RolePermission::query()
            ->where('role_id', $user->role_id)
            ->pluck('allowed', 'module_code')
            ->map(fn ($allowed) => (bool) $allowed)
            ->all();
    }
}
