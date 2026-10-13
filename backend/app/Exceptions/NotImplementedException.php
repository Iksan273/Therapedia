<?php

namespace App\Exceptions;

use RuntimeException;

/** Dilempar service/action kerangka yang use-case-nya belum ditulis; dirender 501 `not_implemented` (bootstrap/app.php). */
class NotImplementedException extends RuntimeException
{
    public function __construct(string $what = 'use-case')
    {
        parent::__construct("Belum diimplementasi: {$what}");
    }
}
