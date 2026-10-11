#!/usr/bin/env bash
# Membuat project Laravel 11 baru di backend/ (hanya bila belum ada). Memakai image `composer`, jadi PHP tidak perlu di host.
# Pemakaian: ./docker/scripts/laravel-new.sh   (atau: make laravel-new)
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../.."

# Git Bash (Windows) mengubah path "/tmp" menjadi path Windows: matikan agar path di dalam container tetap benar
export MSYS_NO_PATHCONV=1

if [[ -f backend/artisan ]]; then
  echo "backend/ sudah berisi Laravel (artisan ada). Dibatalkan."
  exit 1
fi

echo "==> Membuat Laravel 11 di backend/ ..."
docker run --rm \
  -u "$(id -u):$(id -g)" \
  -e COMPOSER_HOME=/tmp/composer \
  -v "$PWD/backend:/app" \
  -w /tmp \
  composer:2 sh -c '
    composer create-project laravel/laravel:^11.0 /tmp/laravel --prefer-dist --no-interaction &&
    rm -f /app/.gitkeep &&
    cp -a /tmp/laravel/. /app/
  '

cat <<'EOF'

Laravel 11 siap di backend/. Langkah berikutnya:

  1) cp .env.example .env                                            # variabel compose (isi password DB)
  2) cp docker/env/backend.dev.env.example backend/.env             # env Laravel untuk dev (samakan DB_PASSWORD)
  3) docker compose up -d --build                                    # app + web + mysql
  4) docker compose exec app php artisan key:generate
  5) docker compose exec app composer require laravel/sanctum        # lalu: php artisan install:api
  6) Buka http://localhost:8080/up  (harus 200)

Catatan proyek (CLAUDE.md): tanpa Redis dan tanpa queue worker (QUEUE_CONNECTION=sync, CACHE_STORE/SESSION_DRIVER=database).
Di bootstrap/app.php percayai proxy agar IP klien & HTTPS terbaca:  ->withMiddleware(fn ($m) => $m->trustProxies(at: '*'))
EOF
