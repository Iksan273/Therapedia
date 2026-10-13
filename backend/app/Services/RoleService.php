<?php

namespace App\Services;

use App\Actions\Organization\CreateRoleAction;
use App\Actions\Organization\DeleteRoleAction;
use App\Actions\Organization\SyncRolePermissionsAction;
use App\Models\AccessModule;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;

/**
 * Role & matriks akses modul (M2, modul rbac). Role sistem tidak dihapus; role master terkunci penuh.
 * Controller → service → Action.
 */
class RoleService
{
    public function __construct(
        private readonly CreateRoleAction $createRole,
        private readonly DeleteRoleAction $deleteRole,
        private readonly SyncRolePermissionsAction $syncPermissions,
    ) {}

    /** Semua role + jumlah akun + izinnya (tanpa pagination: jumlahnya puluhan). @return Collection<int, Role> */
    public function all(): Collection
    {
        return Role::query()->with('rolePermissions')->withCount('users')->orderBy('id')->get();
    }

    public function find(int $id): Role
    {
        return Role::query()->with('rolePermissions')->withCount('users')->findOrFail($id);
    }

    public function create(array $data): Role
    {
        return ($this->createRole)($data);
    }

    /** Ganti nama/badge/deskripsi. Kode role tidak dapat diubah; role sistem pun boleh diganti labelnya. */
    public function update(int $id, array $data): Role
    {
        $role = Role::query()->findOrFail($id);

        foreach (['name', 'badge', 'description'] as $field) {
            if (array_key_exists($field, $data)) {
                $role->{$field} = is_string($data[$field]) ? trim($data[$field]) : $data[$field];
            }
        }
        $role->save();

        return $this->find($id);
    }

    public function delete(int $id): void
    {
        ($this->deleteRole)($id);
    }

    /** @param  list<array{module_code: string, allowed: bool}>  $items */
    public function syncPermissions(User $actor, int $roleId, array $items): Role
    {
        ($this->syncPermissions)($actor, $roleId, $items);

        return $this->find($roleId);
    }

    /** Daftar modul akses (seed) untuk kolom matriks. @return array<int, array<string, mixed>> */
    public function modules(): array
    {
        return AccessModule::query()->orderBy('sort_order')->get(['code', 'label', 'category', 'description'])->toArray();
    }
}
