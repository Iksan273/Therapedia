<?php

namespace App\Actions\Client;

use App\Models\Client;
use Illuminate\Support\Collection;

/**
 * Peringatan duplikat saat intake (BUKAN blokir): nama anak persis (tanpa beda huruf besar/kecil dan spasi ganda)
 * DAN tanggal lahir sama. Lintas cabang yang boleh dilihat staf (BranchScope tetap berlaku).
 */
class CheckDuplicateClientAction
{
    /** @return Collection<int, Client> */
    public function handle(string $childName, string $dateOfBirth): Collection
    {
        $name = $this->normalize($childName);

        return Client::query()
            ->with('branch')
            ->whereDate('date_of_birth', $dateOfBirth)
            ->where('child_name', 'like', mb_substr($name, 0, 1).'%') // pra-saring pakai indeks nama
            ->get()
            ->filter(fn (Client $c) => $this->normalize($c->child_name) === $name)
            ->values();
    }

    private function normalize(string $name): string
    {
        return mb_strtolower(trim((string) preg_replace('/\s+/u', ' ', $name)));
    }
}
