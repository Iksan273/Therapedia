<?php

namespace App\Actions\Organization;

use App\Models\Role;
use App\Models\RolePermission;
use App\Services\PermissionService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Buat role kustom (`is_system = 0`). Aturan:
 * - `code` dari request, atau dibuat dari nama (slug huruf kecil + garis bawah) dan dijamin unik (akhiran _2, _3, ...).
 * - Matriks izin lengkap dibuat sekaligus: SEMUA modul punya baris, `allowed` = true hanya untuk kode di `permissions`.
 *   Baris lengkap menjaga tampilan matriks dan modul baru tidak "hilang" dari role.
 */
class CreateRoleAction
{
    public function __construct(private readonly PermissionService $permissions) {}

    public function __invoke(array $data): Role
    {
        return DB::transaction(function () use ($data): Role {
            $role = Role::query()->create([
                'code' => $data['code'] ?? $this->uniqueCode((string) $data['name']),
                'name' => trim($data['name']),
                'badge' => $data['badge'] ?? null,
                'description' => $data['description'] ?? null,
                'is_system' => false,
            ]);

            $allowed = array_flip($data['permissions'] ?? []);

            foreach ($this->permissions->moduleCodes() as $moduleCode) {
                // Tabel ber-PK komposit: tulis lewat query builder, bukan Eloquent create.
                RolePermission::query()->insert([
                    'role_id' => $role->id,
                    'module_code' => $moduleCode,
                    'allowed' => isset($allowed[$moduleCode]),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            return $role->load('rolePermissions');
        });
    }

    private function uniqueCode(string $name): string
    {
        $base = Str::of($name)->lower()->ascii()->replaceMatches('/[^a-z0-9]+/', '_')->trim('_')->limit(40, '')->toString();
        $base = preg_match('/^[a-z]/', $base) ? $base : 'role_'.$base;
        $base = strlen($base) >= 2 ? $base : 'role';

        $code = $base;
        for ($i = 2; Role::query()->where('code', $code)->exists(); $i++) {
            $code = $base.'_'.$i;
        }

        return $code;
    }
}
