#!/usr/bin/env bash
# Backup UAT/produksi: dump MySQL + arsip storage (bukti bayar privat). Dijalankan cron VPS tiap hari 03:30 WIB
# dan otomatis oleh deploy.sh sebelum migrasi (label "pre-deploy"). Murni skrip cron/shell, bukan job aplikasi.
#
# Pemakaian:  ./docker/scripts/backup.sh [label]
# Cron VPS:   CRON_TZ=Asia/Jakarta
#             30 3 * * * cd /opt/therapedia && ./docker/scripts/backup.sh daily >> backups/backup.log 2>&1
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../.."

LABEL="${1:-manual}"
COMPOSE=(docker compose -f docker-compose.prod.yml)

env_val() { grep -E "^$1=" .env 2>/dev/null | tail -n1 | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//'; }
BACKUP_DIR="$(env_val BACKUP_DIR)"; BACKUP_DIR="${BACKUP_DIR:-./backups}"
KEEP_DAYS="$(env_val BACKUP_KEEP_DAYS)"; KEEP_DAYS="${KEEP_DAYS:-14}"
RSYNC_TARGET="$(env_val BACKUP_RSYNC_TARGET)"

mkdir -p "$BACKUP_DIR"
STAMP="$(date +%Y%m%d-%H%M%S)"

if ! "${COMPOSE[@]}" ps --status running --services 2>/dev/null | grep -qx mysql; then
  echo "[backup] container mysql belum berjalan: backup dilewati (normal pada deploy pertama)."
  exit 0
fi

echo "[backup] dump database -> $BACKUP_DIR/db-$STAMP-$LABEL.sql.gz"
"${COMPOSE[@]}" exec -T mysql sh -c \
  'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysqldump --single-transaction --routines --triggers --events --set-gtid-purged=OFF -uroot "$MYSQL_DATABASE"' \
  | gzip > "$BACKUP_DIR/db-$STAMP-$LABEL.sql.gz"

echo "[backup] arsip storage (bukti bayar, log) -> $BACKUP_DIR/storage-$STAMP-$LABEL.tar.gz"
docker run --rm -v therapedia_app_storage:/data:ro -v "$(cd "$BACKUP_DIR" && pwd):/backup" alpine \
  tar czf "/backup/storage-$STAMP-$LABEL.tar.gz" -C /data . 2>/dev/null || echo "[backup] PERINGATAN: arsip storage gagal / volume belum ada."

# Hapus backup lebih tua dari KEEP_DAYS (backup pre-deploy ikut dibersihkan)
find "$BACKUP_DIR" -maxdepth 1 -type f \( -name 'db-*.sql.gz' -o -name 'storage-*.tar.gz' \) -mtime +"$KEEP_DAYS" -delete

if [[ -n "$RSYNC_TARGET" ]]; then
  echo "[backup] salin off-server -> $RSYNC_TARGET"
  rsync -az --delete-after "$BACKUP_DIR"/ "$RSYNC_TARGET"/ || echo "[backup] PERINGATAN: rsync off-server gagal."
fi

echo "[backup] selesai."
