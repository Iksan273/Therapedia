<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * Error domain/HTTP dengan bentuk seragam yang cocok dengan `ApiError` frontend (implementation_detail.md §1.2):
 * `{ message, code?, errors?, ...extra }`. Dilempar dari Action/Service; dirender di bootstrap/app.php.
 *
 * Kode domain (§17.3): version_conflict, schedule_conflict, holiday, already_reverted, already_submitted, expired,
 * proof_required, incomplete, draft_exists, invoice_not_deletable, void_credit_used, in_use, proof_limit_reached,
 * replacement_invalid, convert_not_allowed, confirm_code_mismatch, client_on_leave, leave_*, must_change_password.
 */
class ApiException extends RuntimeException
{
    /**
     * @param  array<string, list<string>>  $errors  galat per field (422) → `fieldErrors` di frontend
     * @param  array<string, mixed>  $extra  data tambahan ikut respons (mis. daftar sesi bentrok)
     */
    public function __construct(
        string $message,
        public readonly int $status = 400,
        public readonly ?string $errorCode = null,
        public readonly array $errors = [],
        public readonly array $extra = [],
    ) {
        parent::__construct($message);
    }

    /** @return array<string, mixed> */
    public function toArray(): array
    {
        return array_filter([
            'message' => $this->getMessage(),
            'code' => $this->errorCode,
            'errors' => $this->errors ?: null,
        ], fn ($v) => $v !== null) + $this->extra;
    }

    public static function forbidden(string $message = 'Anda tidak punya akses untuk aksi ini.', string $code = 'forbidden'): self
    {
        return new self($message, 403, $code);
    }

    /** 404 juga dipakai untuk data cabang lain (tidak membocorkan keberadaan). */
    public static function notFound(string $message = 'Data tidak ditemukan.'): self
    {
        return new self($message, 404);
    }

    /** @param  array<string, mixed>  $extra */
    public static function conflict(string $code, string $message, array $extra = []): self
    {
        return new self($message, 409, $code, [], $extra);
    }

    public static function versionConflict(): self
    {
        return self::conflict('version_conflict', 'Data sudah diubah oleh pengguna lain. Muat ulang lalu coba lagi.');
    }

    /** Master/entity masih dipakai data lain (hapus ditolak, sarankan nonaktifkan). */
    public static function inUse(string $message): self
    {
        return self::conflict('in_use', $message);
    }

    /**
     * @param  array<string, list<string>>  $errors
     * @param  array<string, mixed>  $extra
     */
    public static function unprocessable(string $code, string $message, array $errors = [], array $extra = []): self
    {
        return new self($message, 422, $code, $errors, $extra);
    }

    /** Validasi field tanpa kode domain (sama bentuknya dengan ValidationException Laravel). */
    public static function validation(array $errors, string $message = 'Data yang dikirim tidak valid.'): self
    {
        return new self($message, 422, null, $errors);
    }

    public static function gone(string $code, string $message): self
    {
        return new self($message, 410, $code);
    }

    /** 429 dari limiter bisnis (lockout login). `retry_after` = detik sampai boleh mencoba lagi. */
    public static function tooManyRequests(string $message, int $retryAfter): self
    {
        return new self($message, 429, 'too_many_attempts', [], ['retry_after' => $retryAfter]);
    }

    public static function unavailable(string $message): self
    {
        return new self($message, 503);
    }
}
