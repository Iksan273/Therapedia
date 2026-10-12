#!/usr/bin/env bash
# Persiapan VPS (Ubuntu/Debian), dijalankan SEKALI sebagai root. Aman diulang: berkas .env yang sudah ada tidak ditimpa.
#
# Yang dikerjakan: pasang Docker, buat user `deploy`, folder deploy, kunci SSH untuk CI, firewall, berkas .env +
# .env.backend (password acak + APP_KEY), dan cron backup harian.
#
# Pemakaian (di VPS, sebagai root):
#   GHCR_OWNER=<username-github-huruf-kecil> bash vps-setup.sh
#
# Variabel opsional:
#   DEPLOY_PUBKEY=<isi kunci publik>        kunci SSH CI buatanmu sendiri (bila kosong, kunci dibuat di server dan
#                                           kunci PRIVATE-nya ditampilkan SEKALI di akhir untuk ditempel ke GitHub Secrets)
#   DOMAIN=therapedia.cosmiclabs.tech       memakai domain; wajib bersama CLOUDFLARE_TUNNEL_TOKEN
#   CLOUDFLARE_TUNNEL_TOKEN=<token>         mode Cloudflare Tunnel (tanpa port terbuka)
#   Tanpa DOMAIN: mode IP, aplikasi di http://IP-VPS (HTTP, belum terenkripsi: hanya untuk uji).
#   DEPLOY_USER (default deploy), APP_DIR (default /opt/therapedia)
set -euo pipefail

[[ $EUID -eq 0 ]] || { echo "ERROR: jalankan sebagai root (sudo -i)."; exit 1; }
GHCR_OWNER="${GHCR_OWNER:-}"
[[ -n "$GHCR_OWNER" ]] || { echo "ERROR: isi GHCR_OWNER (username GitHub, huruf kecil). Contoh: GHCR_OWNER=iksan273 bash vps-setup.sh"; exit 1; }
GHCR_OWNER="${GHCR_OWNER,,}"
DEPLOY_USER="${DEPLOY_USER:-deploy}"
APP_DIR="${APP_DIR:-/opt/therapedia}"
DOMAIN="${DOMAIN:-}"
TUNNEL_TOKEN="${CLOUDFLARE_TUNNEL_TOKEN:-}"
if [[ -n "$DOMAIN" && -z "$TUNNEL_TOKEN" ]]; then
  echo "ERROR: DOMAIN diisi tetapi CLOUDFLARE_TUNNEL_TOKEN kosong. Kosongkan DOMAIN untuk mode IP, atau isi token."; exit 1
fi

echo "==> Paket dasar"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq curl ca-certificates rsync ufw openssl cron >/dev/null

echo "==> Docker"
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
fi
systemctl enable --now docker >/dev/null 2>&1 || true
docker compose version >/dev/null 2>&1 || { echo "ERROR: Docker Compose v2 tidak ada."; exit 1; }

echo "==> User $DEPLOY_USER dan folder $APP_DIR"
id "$DEPLOY_USER" >/dev/null 2>&1 || adduser --disabled-password --gecos "" "$DEPLOY_USER"
usermod -aG docker "$DEPLOY_USER"
mkdir -p "$APP_DIR" "$APP_DIR/backups"
chown -R "$DEPLOY_USER:$DEPLOY_USER" "$APP_DIR"

echo "==> Kunci SSH untuk CI"
SSH_DIR="/home/$DEPLOY_USER/.ssh"
install -d -m 700 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "$SSH_DIR"
touch "$SSH_DIR/authorized_keys"
GENERATED_KEY=""
if [[ -n "${DEPLOY_PUBKEY:-}" ]]; then
  grep -qxF "$DEPLOY_PUBKEY" "$SSH_DIR/authorized_keys" || echo "$DEPLOY_PUBKEY" >> "$SSH_DIR/authorized_keys"
else
  TMPKEY="$(mktemp -u)"
  ssh-keygen -t ed25519 -N "" -C "therapedia-ci" -f "$TMPKEY" >/dev/null
  cat "$TMPKEY.pub" >> "$SSH_DIR/authorized_keys"
  GENERATED_KEY="$(cat "$TMPKEY")"
  shred -u "$TMPKEY" "$TMPKEY.pub" 2>/dev/null || rm -f "$TMPKEY" "$TMPKEY.pub"
fi
chown "$DEPLOY_USER:$DEPLOY_USER" "$SSH_DIR/authorized_keys"
chmod 600 "$SSH_DIR/authorized_keys"

echo "==> Firewall (ufw)"
# Catatan: port yang dipublikasikan Docker melewati aturan ufw. Mode Tunnel aman karena Nginx hanya di 127.0.0.1.
ufw allow OpenSSH >/dev/null
if [[ -z "$TUNNEL_TOKEN" ]]; then ufw allow 80/tcp >/dev/null; fi
ufw --force enable >/dev/null

echo "==> Berkas konfigurasi"
if [[ -n "$TUNNEL_TOKEN" ]]; then
  APP_URL="https://$DOMAIN"; PROFILES="cloudflare"; WEB_BIND="127.0.0.1"; WEB_PORT="8080"
else
  PUBLIC_IP="$(curl -fsS --max-time 5 https://api.ipify.org 2>/dev/null || hostname -I | awk '{print $1}')"
  APP_URL="http://$PUBLIC_IP"; PROFILES=""; WEB_BIND="0.0.0.0"; WEB_PORT="80"
fi

ENV_FILE="$APP_DIR/.env"; ENV_BACKEND="$APP_DIR/.env.backend"
if [[ -f "$ENV_FILE" || -f "$ENV_BACKEND" ]]; then
  echo "   .env / .env.backend sudah ada: TIDAK ditimpa (hapus manual bila ingin dibuat ulang)."
else
  DB_PASS="$(openssl rand -hex 24)"; DB_ROOT_PASS="$(openssl rand -hex 24)"
  APP_KEY="base64:$(openssl rand -base64 32)"
  cat > "$ENV_FILE" <<EOF
# Dibuat oleh vps-setup.sh. Variabel Docker Compose (docker-compose.prod.yml).
GHCR_OWNER=$GHCR_OWNER
IMAGE_TAG=uat
WEB_BIND=$WEB_BIND
WEB_PORT=$WEB_PORT
MYSQL_DATABASE=therapedia
MYSQL_USER=therapedia
MYSQL_PASSWORD=$DB_PASS
MYSQL_ROOT_PASSWORD=$DB_ROOT_PASS
COMPOSE_PROFILES=$PROFILES
CLOUDFLARE_TUNNEL_TOKEN=$TUNNEL_TOKEN
APP_DOMAIN=${DOMAIN:-localhost}
BACKUP_DIR=./backups
BACKUP_KEEP_DAYS=14
BACKUP_RSYNC_TARGET=
EOF
  cat > "$ENV_BACKEND" <<EOF
# Dibuat oleh vps-setup.sh. Env Laravel (dibaca container app lewat env_file).
APP_NAME=Therapedia
APP_ENV=production
APP_KEY=$APP_KEY
APP_DEBUG=false
APP_URL=$APP_URL
APP_TIMEZONE=UTC
APP_LOCALE=id
APP_FALLBACK_LOCALE=id

LOG_CHANNEL=stderr
LOG_LEVEL=info

DB_CONNECTION=mysql
DB_HOST=mysql
DB_PORT=3306
DB_DATABASE=therapedia
DB_USERNAME=therapedia
DB_PASSWORD=$DB_PASS

CACHE_STORE=database
SESSION_DRIVER=database
QUEUE_CONNECTION=sync
BROADCAST_CONNECTION=log
FILESYSTEM_DISK=local

# Email dinonaktifkan dulu (ditulis ke log). Isi SMTP saat fitur OTP lupa password dipakai.
MAIL_MAILER=log
MAIL_FROM_ADDRESS="no-reply@cosmiclabs.tech"
MAIL_FROM_NAME="Therapedia"
EOF
  chown "$DEPLOY_USER:$DEPLOY_USER" "$ENV_FILE" "$ENV_BACKEND"
  chmod 600 "$ENV_FILE" "$ENV_BACKEND"
  echo "   .env dan .env.backend dibuat (password database acak)."
fi

echo "==> Cron backup harian 03:30 WIB"
CRON_LINE="30 3 * * * cd $APP_DIR && ./docker/scripts/backup.sh daily >> backups/backup.log 2>&1"
( crontab -u "$DEPLOY_USER" -l 2>/dev/null | grep -v 'backup.sh daily' || true
  echo "CRON_TZ=Asia/Jakarta"
  echo "$CRON_LINE" ) | awk '!seen[$0]++' | crontab -u "$DEPLOY_USER" -

echo
echo "=================================================================="
echo " VPS siap. Isi GitHub Secrets (Settings > Secrets and variables > Actions):"
echo "   VPS_HOST     = $(curl -fsS --max-time 5 https://api.ipify.org 2>/dev/null || hostname -I | awk '{print $1}')"
echo "   VPS_USER     = $DEPLOY_USER"
echo "   VPS_PATH     = $APP_DIR"
echo "   VPS_SSH_KEY  = (kunci private)"
if [[ -n "$GENERATED_KEY" ]]; then
  echo
  echo " Kunci private di bawah ini hanya ditampilkan SEKALI. Salin SELURUH blok (termasuk baris BEGIN/END):"
  echo
  echo "$GENERATED_KEY"
  echo
  echo " Setelah ditempel ke GitHub, hapus dari riwayat terminal (clear)."
else
  echo "   (kunci private = pasangan dari DEPLOY_PUBKEY yang kamu berikan)"
fi
echo
echo " Lalu buat Environment 'uat' di GitHub dan jalankan workflow (git push atau Run workflow)."
echo " Setelah deploy pertama:  cd $APP_DIR && docker compose -f docker-compose.prod.yml exec app php artisan db:seed --force  (bila seeder sudah ada)"
echo " Alamat aplikasi: $APP_URL"
echo "=================================================================="
