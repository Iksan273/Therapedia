<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Cabang awal (sumber: frontend/src/data/branches.seed.json). Idempotent: kunci = `code`.
 */
class BranchSeeder extends Seeder
{
    public function run(): void
    {
        $now = now();

        $rows = collect([
            ['code' => 'EAST', 'name' => 'East', 'address' => 'Jl. Kertajaya Indah Timur No. 42, East Center, Surabaya', 'phone' => '+62 31 5928811'],
            ['code' => 'CTL', 'name' => 'Citraland', 'address' => 'Ruko North Junction Blok RB-12, Citraland, Surabaya', 'phone' => '+62 31 7401122'],
            ['code' => 'WEST', 'name' => 'West', 'address' => 'Jl. Mayjen Sungkono No. 88, West Center, Surabaya', 'phone' => '+62 31 5683344'],
        ])->map(fn (array $b) => $b + [
            'city' => 'Surabaya',
            'is_active' => true,
            'created_at' => $now,
            'updated_at' => $now,
        ])->all();

        DB::table('branches')->upsert($rows, ['code'], ['name', 'city', 'address', 'phone', 'updated_at']);
    }
}
