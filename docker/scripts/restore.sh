#!/usr/bin/env bash
# Pulihkan dump MySQL. DEFAULT-nya ke database UJI (<db>_restore_test) supaya aman untuk "uji pulih" berkala
# (schema.md §11/§12: uji restore tiap arsip dan sebelum go-live). Memulihkan ke database ASLI butuh flag --production
# dan mengetik YA; semua data saat ini akan DITIMPA.
#
# Pemakaian:
#   ./docker/scripts/restore.sh backups/db-20261107-033000-daily.sql.gz                # ke database uji
#   ./docker/scripts/restore.sh backups/db-....sql.gz --production                    # ke database asli (hati-hati)
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../.."

FILE="${1:-}"
MODE="${2:-}"
[[ -n "$FILE" && -f "$FILE" ]] || { echo "Pemakaian: $0 <file.sql.gz> [--production]"; exit 1; }

COMPOSE=(docker compose -f docker-compose.prod.yml)
DB="$(grep -E '^MYSQL_DATABASE=' .env | tail -n1 | cut -d= -f2-)"
TARGET="${DB}_restore_test"

if [[ "$MODE" == "--production" ]]; then
  TARGET="$DB"
  echo "PERINGATAN: database '$TARGET' akan DITIMPA dengan isi $FILE."
  read -r -p "Ketik YA untuk melanjutkan: " ANSWER
  [[ "$ANSWER" == "YA" ]] || { echo "Dibatalkan."; exit 1; }
  echo "==> Membuat backup 'pre-restore' dulu ..."
  ./docker/scripts/backup.sh pre-restore
else
  echo "==> Memulihkan ke database uji '$TARGET' (database asli tidak disentuh)"
  "${COMPOSE[@]}" exec -T mysql sh -c "MYSQL_PWD=\"\$MYSQL_ROOT_PASSWORD\" mysql -uroot -e 'DROP DATABASE IF EXISTS \`$TARGET\`; CREATE DATABASE \`$TARGET\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;'"
fi

gunzip -c "$FILE" | "${COMPOSE[@]}" exec -T mysql sh -c "MYSQL_PWD=\"\$MYSQL_ROOT_PASSWORD\" mysql -uroot \"$TARGET\""

echo "==> Selesai. Jumlah tabel di '$TARGET':"
"${COMPOSE[@]}" exec -T mysql sh -c "MYSQL_PWD=\"\$MYSQL_ROOT_PASSWORD\" mysql -uroot -N -e \"SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$TARGET'\""
[[ "$MODE" == "--production" ]] || echo "Hapus database uji bila sudah selesai:  docker compose -f docker-compose.prod.yml exec mysql mysql -uroot -p -e 'DROP DATABASE \`$TARGET\`'"
