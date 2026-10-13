<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AccessModule extends Model
{
    protected $table = 'access_modules';

    protected $primaryKey = 'code';

    public $incrementing = false;

    protected $keyType = 'string';

    public $timestamps = false;

    /** @var list<string> */
    protected $fillable = [
        'code',
        'label',
        'category',
        'description',
        'sort_order',
    ];

    public function rolePermissionsViaModuleCode(): HasMany
    {
        return $this->hasMany(RolePermission::class, 'module_code', 'code');
    }
}
