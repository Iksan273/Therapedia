<?php

namespace App\Models;

use App\Models\Concerns\TracksActors;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, TracksActors;

    protected $table = 'users';

    /** @var list<string> kolom pelaku yang diisi otomatis oleh TracksActors */
    protected array $actorColumns = ['created_by', 'updated_by'];

    /** @var list<string> */
    protected $fillable = [
        'role_id',
        'branch_id',
        'name',
        'email',
        'password',
        'must_change_password',
        'password_changed_at',
        'phone',
        'title',
        'specialty',
        'max_sessions_per_month',
        'is_active',
        'last_login_at',
    ];

    protected $hidden = ['password', 'remember_token'];

    protected function casts(): array
    {
        return [
            'must_change_password' => 'boolean',
            'password_changed_at' => 'datetime',
            'is_active' => 'boolean',
            'last_login_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    public function role(): BelongsTo
    {
        return $this->belongsTo(Role::class, 'role_id');
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class, 'branch_id');
    }

    public function passwordResetOtps(): HasMany
    {
        return $this->hasMany(PasswordResetOtp::class, 'user_id');
    }

    public function schedulesViaTherapist(): HasMany
    {
        return $this->hasMany(Schedule::class, 'therapist_id');
    }

    public function schedulesViaOriginTherapist(): HasMany
    {
        return $this->hasMany(Schedule::class, 'origin_therapist_id');
    }

    public function schedulesViaPrevTherapist(): HasMany
    {
        return $this->hasMany(Schedule::class, 'prev_therapist_id');
    }

    public function sessionReportsViaTherapist(): HasMany
    {
        return $this->hasMany(SessionReport::class, 'therapist_id');
    }
}
