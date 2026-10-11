#!/bin/sh
# Entrypoint image PHP: siapkan folder tulis lalu jalankan perintah.
# - php-fpm berjalan sebagai root (master) dan menurunkan worker ke user `app` (lihat zzz-fpm-pool.conf)
# - perintah lain (artisan, schedule:work, composer) dijalankan sebagai user `app`
set -e
cd /var/www/html

if [ ! -f artisan ]; then
  echo "[entrypoint] Laravel belum ada di /var/www/html (folder backend/)."
  echo "[entrypoint] Buat dulu dengan:  make laravel-new   (atau ./docker/scripts/laravel-new.sh)"
fi

# Volume baru dimiliki root: pastikan folder tulis Laravel ada dan milik `app`
mkdir -p storage/framework/cache storage/framework/sessions storage/framework/views storage/logs storage/app/private bootstrap/cache 2>/dev/null || true
chown -R app:app storage bootstrap/cache 2>/dev/null || true

if [ "$1" = "php-fpm" ]; then
  exec "$@"
fi
exec su-exec app "$@"
