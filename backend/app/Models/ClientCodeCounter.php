<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ClientCodeCounter extends Model
{
    protected $table = 'client_code_counters';

    protected $primaryKey = 'group_code';

    public $incrementing = false;

    protected $keyType = 'string';

    public $timestamps = false;

    /** @var list<string> */
    protected $fillable = [
        'group_code',
        'last_number',
    ];
}
