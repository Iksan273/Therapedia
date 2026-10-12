# syntax=docker/dockerfile:1.7
# Image PHP untuk Laravel 11 (PHP-FPM, Alpine). Build context = root repo (lihat .dockerignore).
#
# Target:
#   dev   : kode di-mount dari host (docker-compose.yml), opcache cek timestamp
#   prod  : kode + vendor di dalam image (docker-compose.prod.yml / CI), opcache tanpa cek timestamp
#   web   : Nginx berisi hasil build frontend (SPA) + proxy ke PHP-FPM (pasangan target prod)
ARG PHP_VERSION=8.3

# ---------------------------------------------------------------- base
FROM php:${PHP_VERSION}-fpm-alpine AS base

ARG APP_UID=1000
ARG APP_GID=1000

# Ekstensi yang dibutuhkan Laravel 11 + MySQL 8. (mbstring, tokenizer, xml, dll sudah bawaan image resmi.)
# Tambah ekstensi lain (mis. gd untuk gambar) di sini bila nanti dibutuhkan.
RUN apk add --no-cache icu-libs libzip su-exec tzdata fcgi \
 && apk add --no-cache --virtual .build-deps $PHPIZE_DEPS icu-dev libzip-dev \
 && docker-php-ext-install -j"$(nproc)" pdo_mysql bcmath intl zip opcache pcntl \
 && apk del .build-deps

# User non-root yang menjalankan worker PHP-FPM, artisan, dan scheduler
RUN addgroup -g "${APP_GID}" app && adduser -D -u "${APP_UID}" -G app app

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer
COPY docker/php/conf/app.ini            /usr/local/etc/php/conf.d/90-app.ini
COPY docker/php/conf/zzz-fpm-pool.conf  /usr/local/etc/php-fpm.d/zzz-app.conf
COPY docker/php/entrypoint.sh           /usr/local/bin/app-entrypoint
RUN chmod +x /usr/local/bin/app-entrypoint

WORKDIR /var/www/html
ENTRYPOINT ["app-entrypoint"]
CMD ["php-fpm"]

# FPM sehat bila /ping menjawab "pong"
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
  CMD SCRIPT_NAME=/ping SCRIPT_FILENAME=/ping REQUEST_METHOD=GET cgi-fcgi -bind -connect 127.0.0.1:9000 | grep -q pong || exit 1

# ---------------------------------------------------------------- dev
FROM base AS dev
COPY docker/php/conf/opcache.dev.ini /usr/local/etc/php/conf.d/91-opcache.ini
# Kode di-mount dari host (./backend:/var/www/html), tidak disalin ke image.

# ---------------------------------------------------------------- vendor (dependency produksi)
FROM composer:2 AS vendor
WORKDIR /app
COPY backend/composer.json backend/composer.lock ./
RUN composer install --no-dev --no-scripts --no-autoloader --prefer-dist --no-interaction --ignore-platform-reqs

# ---------------------------------------------------------------- prod
FROM base AS prod
COPY docker/php/conf/opcache.prod.ini /usr/local/etc/php/conf.d/91-opcache.ini
COPY --from=vendor /app/vendor ./vendor
COPY --chown=app:app backend/ ./
RUN composer dump-autoload --optimize --classmap-authoritative --no-dev --no-scripts \
 && mkdir -p storage/framework/cache storage/framework/sessions storage/framework/views storage/logs storage/app/private bootstrap/cache \
 && chown -R app:app storage bootstrap/cache

# ---------------------------------------------------------------- frontend (build SPA React/Vite)
FROM node:22-alpine AS frontend
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json frontend/.npmrc ./
RUN npm ci --no-audit --no-fund
COPY frontend/ ./
# Variabel VITE_* ditanam ke bundle saat build (bukan saat container jalan). Satu origin dengan API -> path relatif.
ARG VITE_DATA_SOURCE=local
ARG VITE_API_BASE_URL=/api/v1
ARG VITE_API_TIMEOUT_MS=15000
ARG VITE_LANDING_URL=
RUN npm run build

# ---------------------------------------------------------------- web (Nginx: SPA frontend + proxy ke PHP-FPM)
# Satu pintu masuk: `/` = frontend (dist), `/api/*` dan `/up` = Laravel (container app). Lihat docker/nginx/prod.conf.
FROM nginx:1.27-alpine AS web
COPY docker/nginx/prod.conf /etc/nginx/conf.d/default.conf
COPY --from=frontend /app/dist /var/www/frontend
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
  CMD wget -qO- http://127.0.0.1/nginx-health >/dev/null 2>&1 || exit 1
