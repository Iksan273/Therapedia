<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RolePermission extends Model
{
    protected $table = 'role_permissions';

    // PK komposit (role_id, module_code): Eloquent hanya mengenali satu kunci; akses lewat query builder / where dua kolom.
    protected $primaryKey = 'role_id';

    public $incrementing = false;

    /** @var list<string> */
    protected $fillable = [
        'role_id',
        'module_code',
        'allowed',
    ];

    protected function casts(): array
    {
        return [
            'allowed' => 'boolean',
        ];
    }

    public function role(): BelongsTo
    {
        return $this->belongsTo(Role::class, 'role_id');
    }

    public function module(): BelongsTo
    {
        return $this->belongsTo(AccessModule::class, 'module_code', 'code');
    }
}
