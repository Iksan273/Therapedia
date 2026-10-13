<?php

namespace Database\Seeders;

use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * Akun Master (role `master`, tanpa cabang = semua cabang).
 * Email dan password dapat diubah lewat .env (SEED_MASTER_EMAIL / SEED_MASTER_PASSWORD).
 *
 * PENTING: password bawaan "123" hanya untuk development/UAT awal. Ganti sebelum go-live
 * (set SEED_MASTER_PASSWORD di server, atau ubah lewat reset password Master).
 * Menjalankan ulang seeder TIDAK menimpa password akun yang sudah ada.
 */
class MasterUserSeeder extends Seeder
{
    public function run(): void
    {
        $roleId = Role::where('code', 'master')->value('id');

        User::firstOrCreate(
            ['email' => env('SEED_MASTER_EMAIL', 'iksan8991@gmail.com')],
            [
                'role_id' => $roleId,
                'branch_id' => null,
                'name' => 'Master Director',
                'password' => env('SEED_MASTER_PASSWORD', '123'), // di-hash oleh cast 'hashed' pada model User
                'must_change_password' => false,
                'is_active' => true,
            ]
        );
    }
}
