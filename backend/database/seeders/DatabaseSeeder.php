<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

/**
 * Seeder WAJIB (aman dijalankan ulang, juga di server UAT/produksi): cabang, RBAC, master data, akun master.
 * Seeder demo (client/jadwal contoh) dipisah dan belum dibuat.
 */
class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            BranchSeeder::class,
            RbacSeeder::class,
            MasterDataSeeder::class,
            MasterUserSeeder::class,
        ]);
    }
}
