<?php

namespace App\Services;

use App\Actions\Organization\CreateUserAction;
use App\Actions\Organization\ResetUserPasswordAction;
use App\Actions\Organization\SetUserActiveAction;
use App\Actions\Organization\UpdateUserAction;
use App\Actions\Organization\UserGuard;
use App\Exceptions\ApiException;
use App\Http\Resources\Organization\TherapistResource;
use App\Http\Resources\Organization\UserResource;
use App\Models\User;
use App\Support\BranchContext;
use App\Support\Paginate;
use App\Support\PrefixSearch;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

/**
 * Akun staf & terapis (M2, modul user_management). `branch_id` NULL = semua cabang. Staf tidak dihapus lewat UI
 * (dinonaktifkan). Controller → service → Action; aturan keamanan ada di UserGuard.
 */
class UserService
{
    public function __construct(
        private readonly CreateUserAction $createUser,
        private readonly UpdateUserAction $updateUser,
        private readonly SetUserActiveAction $setUserActive,
        private readonly ResetUserPasswordAction $resetUserPassword,
    ) {}

    /**
     * Daftar akun ber-pagination (default 10). Filter: `branch_id` (akun semua cabang ikut tampil), `role` (kode),
     * `is_active`, `q` (prefix nama/email). Pengatur terikat 1 cabang hanya melihat akun cabangnya.
     *
     * @return array{data: array<int, mixed>, meta: array<string, int>}
     */
    public function paginate(Request $request, User $actor): array
    {
        $query = User::query()->with(['role', 'branch'])->orderBy('users.name')->orderBy('users.id');

        if ($actor->branch_id !== null) {
            $query->where('users.branch_id', $actor->branch_id);
        } elseif (($branchId = BranchContext::resolve($request)) !== null) {
            $query->where(fn (Builder $q) => $q->where('users.branch_id', $branchId)->orWhereNull('users.branch_id'));
        }

        if (($role = $request->query('role')) !== null && $role !== '') {
            $query->whereHas('role', fn (Builder $q) => $q->where('code', (string) $role));
        }

        if (($active = $request->query('is_active')) !== null && $active !== '') {
            $query->where('users.is_active', filter_var($active, FILTER_VALIDATE_BOOLEAN));
        }

        PrefixSearch::apply($query, $request->query('q'), ['users.name', 'users.email']);

        return Paginate::offset($query, $request, UserResource::class);
    }

    public function find(User $actor, int $id): User
    {
        $user = User::query()->with(['role', 'branch'])->findOrFail($id);

        if ($actor->branch_id !== null && (int) $user->branch_id !== (int) $actor->branch_id) {
            throw ApiException::notFound(); // akun cabang lain tidak dibocorkan
        }

        return $user;
    }

    /** @return array{user: User, temporary_password: ?string} */
    public function create(User $actor, array $data): array
    {
        return ($this->createUser)($actor, $data);
    }

    public function update(User $actor, int $id, array $data): User
    {
        return ($this->updateUser)($actor, $id, $data);
    }

    public function setActive(User $actor, int $id, bool $active): User
    {
        return ($this->setUserActive)($actor, $id, $active);
    }

    /** @return array{user: User, temporary_password: ?string} */
    public function resetPassword(User $actor, int $id, ?string $password): array
    {
        return ($this->resetUserPassword)($actor, $id, $password);
    }

    /**
     * Daftar ringan terapis aktif untuk dropdown (tanpa pagination, jumlahnya puluhan). Terapis semua cabang
     * (`branch_id` NULL) ikut tampil di tiap cabang.
     *
     * @return array<int, mixed>
     */
    public function therapists(Request $request): array
    {
        $query = User::query()
            ->where('users.is_active', true)
            ->whereHas('role', fn (Builder $q) => $q->where('code', 'therapist'))
            ->orderBy('users.name');

        if (($branchId = BranchContext::resolve($request)) !== null) {
            $query->where(fn (Builder $q) => $q->where('users.branch_id', $branchId)->orWhereNull('users.branch_id'));
        }

        return TherapistResource::collection($query->get())->resolve($request);
    }

    /** Maks sesi per bulan terapis (penyebut utilisasi, Q25). NULL = bawaan 100. Tidak memblokir penjadwalan. */
    public function updateCapacity(User $actor, int $id, ?int $max): User
    {
        $therapist = User::query()->whereHas('role', fn (Builder $q) => $q->where('code', 'therapist'))->findOrFail($id);

        if ($actor->branch_id !== null && (int) $therapist->branch_id !== (int) $actor->branch_id) {
            throw ApiException::notFound();
        }

        $therapist->max_sessions_per_month = $max;
        $therapist->save();

        return $therapist;
    }

    /** Untuk Action lain yang perlu tahu apakah pengatur adalah master. */
    public static function isMaster(User $user): bool
    {
        return UserGuard::isMasterUser($user);
    }
}
