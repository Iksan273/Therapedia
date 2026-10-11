#!/usr/bin/env bash
# Deploy di VPS (UAT/produksi). Dipanggil otomatis oleh GitHub Actions lewat SSH, atau manual:
#   IMAGE_TAG=<sha-commit|uat> ./docker/scripts/deploy.sh [--no-migrate]
#
# Urutan: tarik image -> backup DB (pre-deploy) -> naikkan container -> migrate -> optimize -> cek /up.
# Rollback: jalankan lagi dengan tag lama, mis. IMAGE_TAG=$(cat .deploy/previous_tag) ./docker/scripts/deploy.sh --no-migrate
# (migrasi TIDAK dibatalkan otomatis; kembalikan data dari backup bila perlu: docker/scripts/restore.sh).
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../.."

COMPOSE=(docker compose -f docker-compose.prod.yml)
MIGRATE=1
[[ "${1:-}" == "--no-migrate" ]] && MIGRATE=0

[[ -f .env ]]         || { echo "ERROR: .env belum ada (salin dari .env.example)"; exit 1; }
[[ -f .env.backend ]] || { echo "ERROR: .env.backend belum ada (lihat docker/env/backend.prod.env.example)"; exit 1; }
export IMAGE_TAG="${IMAGE_TAG:-uat}"
WEB_PORT="$(grep -E '^WEB_PORT=' .env | tail -n1 | cut -d= -f2- || true)"; WEB_PORT="${WEB_PORT:-8080}"

mkdir -p .deploy
PREVIOUS="$(cat .deploy/current_tag 2>/dev/null || echo '-')"
echo "==> Deploy tag: $IMAGE_TAG (sebelumnya: $PREVIOUS)"

echo "==> Menarik image"
"${COMPOSE[@]}" pull app web

echo "==> Backup database sebelum deploy"
./docker/scripts/backup.sh pre-deploy

echo "==> Menaikkan container"
"${COMPOSE[@]}" up -d --remove-orphans --wait --wait-timeout 240

if [[ "$MIGRATE" == "1" ]]; then
  echo "==> Migrasi database"
  "${COMPOSE[@]}" exec -T app php artisan migrate --force
fi

echo "==> Optimasi cache Laravel"
"${COMPOSE[@]}" exec -T app php artisan optimize

echo "==> Cek kesehatan (/up)"
for i in $(seq 1 20); do
  if "${COMPOSE[@]}" exec -T web wget -qO- "http://127.0.0.1/up" >/dev/null 2>&1; then
    echo "OK: aplikasi sehat (http://127.0.0.1:${WEB_PORT}/up)"
    [[ "$PREVIOUS" != "$IMAGE_TAG" ]] && echo "$PREVIOUS" > .deploy/previous_tag
    echo "$IMAGE_TAG" > .deploy/current_tag
    docker image prune -f >/dev/null 2>&1 || true
    echo "==> Deploy selesai."
    exit 0
  fi
  sleep 3
done

echo "ERROR: /up tidak menjawab setelah deploy. Periksa:  ${COMPOSE[*]} logs --tail=100 app web"
echo "Rollback:  IMAGE_TAG=$PREVIOUS ./docker/scripts/deploy.sh --no-migrate"
exit 1
