<?php

namespace App\Services;

use App\Exceptions\ApiException;
use App\Exceptions\NotImplementedException;
use App\Models\Branch;
use App\Models\Client;
use App\Models\Holiday;
use App\Models\Invoice;
use App\Models\Schedule;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\Request;

/**
 * Master Cabang (M2, modul branch_master). Cabang nonaktif tidak muncul di pilihan baru, riwayat tetap.
 * Hapus cabang (permanen, cascade) hanya master dan dikerjakan di Sprint 4 (DeleteBranchAction).
 */
class BranchService
{
    public function __construct(private readonly PermissionService $permissions) {}

    /** Semua cabang (aktif + nonaktif), dibaca semua staf untuk filter cabang. `?active=1` hanya yang aktif. @return Collection<int, Branch> */
    public function all(Request $request): Collection
    {
        $query = Branch::query()->orderBy('name');

        if (filter_var($request->query('active'), FILTER_VALIDATE_BOOLEAN)) {
            $query->where('is_active', true);
        }

        return $query->get();
    }

    public function find(int $id): Branch
    {
        return Branch::query()->findOrFail($id);
    }

    public function create(array $data): Branch
    {
        return Branch::query()->create([
            'code' => $data['code'],
            'name' => $data['name'],
            'city' => $this->nullIfBlank($data['city'] ?? null) ?? 'Surabaya',
            'address' => $this->nullIfBlank($data['address'] ?? null),
            'phone' => $this->nullIfBlank($data['phone'] ?? null),
            'is_active' => $data['is_active'] ?? true,
        ]);
    }

    public function update(int $id, array $data): Branch
    {
        $branch = Branch::query()->findOrFail($id);

        foreach (['code', 'name', 'city', 'address', 'phone'] as $field) {
            if (array_key_exists($field, $data)) {
                $branch->{$field} = $field === 'city'
                    ? ($this->nullIfBlank($data[$field]) ?? 'Surabaya')
                    : (in_array($field, ['address', 'phone'], true) ? $this->nullIfBlank($data[$field]) : $data[$field]);
            }
        }
        $branch->save();

        return $branch;
    }

    public function setActive(int $id, bool $active): Branch
    {
        $branch = Branch::query()->findOrFail($id);
        $branch->is_active = $active;
        $branch->save();

        return $branch;
    }

    /**
     * Pratinjau dampak hapus cabang untuk dialog konfirmasi (hanya master): jumlah data yang akan ikut terhapus.
     *
     * @return array{branch: Branch, impact: array<string, int>}
     */
    public function deleteImpact(User $actor, int $id): array
    {
        $this->assertMaster($actor);
        $branch = Branch::query()->findOrFail($id);

        return [
            'branch' => $branch,
            'impact' => [
                'clients' => Client::withoutGlobalScopes()->where('branch_id', $id)->count(),
                'schedules' => Schedule::withoutGlobalScopes()->where('branch_id', $id)->count(),
                'invoices' => Invoice::withoutGlobalScopes()->where('branch_id', $id)->count(),
                'staff' => User::query()->where('branch_id', $id)->count(),
                'holidays' => Holiday::withoutGlobalScopes()->where('branch_id', $id)->count(),
            ],
        ];
    }

    /** Hapus permanen + cascade (DeleteBranchAction, Sprint 4). Master saja; konfirmasi ketik kode cabang. */
    public function delete(User $actor, int $id): void
    {
        $this->assertMaster($actor);

        throw new NotImplementedException('BranchService::delete (Sprint 4: DeleteBranchAction)');
    }

    private function assertMaster(User $actor): void
    {
        if (! $this->permissions->isMaster($actor)) {
            throw ApiException::forbidden('Hanya Master yang boleh menghapus cabang.');
        }
    }

    private function nullIfBlank(mixed $value): ?string
    {
        $value = is_string($value) ? trim($value) : $value;

        return $value === '' || $value === null ? null : (string) $value;
    }
}
