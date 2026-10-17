<?php

namespace App\Support;

use App\Exceptions\ApiException;

/**
 * Langkah bawaan "Data Pengisi" kuesioner. Profil per kategori (`assessment_categories.respondent_profile`):
 * - none    : tanpa langkah (kategori yang sudah punya section pengisi sendiri, mis. KON/TDL)
 * - parent  : diisi orang tua (nama*, hubungan*, HP, email)
 * - teacher : diisi guru / pendamping School Companion (nama*, peran*, sekolah*, kelas*, HP, email)
 * Nama dan tanggal lahir anak TIDAK ditanya ulang (sudah ada dari kode client). Padanan FE: `domain/assessment.js`.
 */
final class AssessmentRespondent
{
    public const PROFILES = ['none', 'parent', 'teacher'];

    private const LENGTHS = ['name' => 150, 'relation' => 50, 'school' => 150, 'class' => 50, 'phone' => 30, 'email' => 150];

    /**
     * Definisi field profil: key => label, wajib, panjang maks, saran pilihan (boleh diketik bebas).
     *
     * @return array<string, array{key: string, label: string, required: bool, max: int, options?: list<string>}>
     */
    public static function fields(string $profile): array
    {
        $field = fn (string $key, string $label, bool $required, array $options = []) => [
            'key' => $key, 'label' => $label, 'required' => $required, 'max' => self::LENGTHS[$key],
        ] + ($options ? ['options' => $options] : []);

        return match ($profile) {
            'parent' => [
                'name' => $field('name', 'Nama yang mengisi', true),
                'relation' => $field('relation', 'Hubungan dengan anak', true, ['Ayah', 'Ibu', 'Wali', 'Lainnya']),
                'phone' => $field('phone', 'Nomor HP', false),
                'email' => $field('email', 'Email', false),
            ],
            'teacher' => [
                'name' => $field('name', 'Nama guru / pendamping', true),
                'relation' => $field('relation', 'Peran', true, ['Guru kelas', 'Guru pendamping', 'Lainnya']),
                'school' => $field('school', 'Nama sekolah', true),
                'class' => $field('class', 'Kelas', true),
                'phone' => $field('phone', 'Nomor HP', false),
                'email' => $field('email', 'Email', false),
            ],
            default => [],
        };
    }

    /** Profil dari struktur snapshot; snapshot lama tanpa kunci = `none`. */
    public static function profileOf(array $structure): string
    {
        $profile = $structure['category']['respondent_profile'] ?? 'none';

        return in_array($profile, self::PROFILES, true) ? $profile : 'none';
    }

    /**
     * Terapkan patch ke nilai yang ada: hanya key milik profil, trim, `null`/kosong menghapus. Format email/HP diperiksa.
     *
     * @param  array<string, string>  $current
     * @param  array<string, mixed>  $patch
     * @return array<string, string>
     */
    public static function merge(string $profile, array $current, array $patch): array
    {
        $fields = self::fields($profile);
        $values = array_intersect_key($current, $fields);
        $errors = [];

        foreach ($patch as $key => $raw) {
            if (! isset($fields[$key])) {
                continue;
            }
            $value = $raw === null ? '' : trim((string) $raw);
            if ($value === '') {
                unset($values[$key]);

                continue;
            }
            if (mb_strlen($value) > $fields[$key]['max']) {
                $errors["respondent.{$key}"] = ["{$fields[$key]['label']} terlalu panjang (maksimal {$fields[$key]['max']} karakter)."];

                continue;
            }
            if ($key === 'email' && ! filter_var($value, FILTER_VALIDATE_EMAIL)) {
                $errors['respondent.email'] = ['Format email tidak valid.'];

                continue;
            }
            if ($key === 'phone' && ! preg_match('/^[0-9+\-\s()]{6,30}$/', $value)) {
                $errors['respondent.phone'] = ['Format nomor HP tidak valid.'];

                continue;
            }
            $values[$key] = $value;
        }

        if ($errors !== []) {
            throw ApiException::validation($errors);
        }

        return $values;
    }

    /** @return list<string> key wajib yang belum terisi */
    public static function missing(string $profile, array $values): array
    {
        return array_values(array_keys(array_filter(self::fields($profile), fn ($f) => $f['required'] && trim((string) ($values[$f['key']] ?? '')) === '')));
    }

    /**
     * Nilai → kolom `assessment_responses.respondent_*`.
     *
     * @param  array<string, string>  $values
     * @return array<string, string|null>
     */
    public static function toColumns(array $values): array
    {
        $columns = [];
        foreach (array_keys(self::LENGTHS) as $key) {
            $columns["respondent_{$key}"] = $values[$key] ?? null;
        }

        return $columns;
    }

    /**
     * Kolom response → peta nilai (null bila semua kosong, mis. hasil lama / profil none).
     *
     * @return array<string, string>|null
     */
    public static function fromModel(object $response): ?array
    {
        $values = [];
        foreach (array_keys(self::LENGTHS) as $key) {
            $value = $response->{"respondent_{$key}"} ?? null;
            if ($value !== null && $value !== '') {
                $values[$key] = $value;
            }
        }

        return $values ?: null;
    }
}
