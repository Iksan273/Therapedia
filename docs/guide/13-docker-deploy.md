# 13 — Docker & Deploy Otomatis ke VPS

Setup Docker untuk backend **Laravel 11 + MySQL 8** (tanpa Redis, tanpa queue worker; lihat `schema.md` §10–§11) dan alur **push → test → build → deploy otomatis** ke VPS. Satu-satunya lingkungan server adalah **UAT di VPS** (dipakai developer, tester, dan klien; lihat `TIMELINE_DEV.md` §5); frontend tetap di Vercel.

> Status: konfigurasi sudah ditulis dan divalidasi sintaksnya (`docker compose config`, `bash -n`). **Build image dan deploy ke VPS belum pernah dijalankan** (Laravel belum dibuat dan Docker Desktop belum aktif saat penulisan). Jalankan checklist §8 saat pertama kali.

## 1. Isi repo

```
backend/                 Laravel 11 (kosong sampai `make laravel-new`)
docker/
  php/Dockerfile         target: dev | prod | web  (PHP 8.3-FPM Alpine + Nginx)
  php/conf/              php.ini, opcache dev/prod, pool PHP-FPM
  php/entrypoint.sh      siapkan storage, jalankan fpm / artisan sebagai user `app`
  nginx/default.conf     Nginx → php-fpm (healthcheck /up, timeout 300 dtk, IP klien asli)
  mysql/my.cnf           utf8mb4, UTC, buffer pool, binlog 14 hari, slow query log
  proxy/Caddyfile        HTTPS otomatis (Let's Encrypt)
  env/                   contoh env Laravel: backend.dev.env.example, backend.prod.env.example
  scripts/               laravel-new.sh, deploy.sh, backup.sh, restore.sh
docker-compose.yml       DEV lokal (kode di-mount dari host)
docker-compose.prod.yml  UAT/produksi di VPS (image dari GHCR)
.env.example             variabel compose (salin ke .env)
Makefile                 pintasan dev
.github/workflows/deploy.yml   CI/CD
```

Prinsip: **tidak ada queue/job async**. Satu-satunya proses di luar request adalah container `scheduler` (`php artisan schedule:work`) untuk `credits:reconcile`, housekeeping, dan `db:analyze` (schema.md §11); backup dijalankan cron VPS.

## 2. Mulai (dev lokal)

Butuh Docker Desktop (Windows/Mac) atau Docker Engine + Compose v2 (Linux).

```bash
cp .env.example .env                 # isi password DB
make laravel-new                     # buat Laravel 11 di backend/ (sekali; tanpa make: ./docker/scripts/laravel-new.sh)
cp docker/env/backend.dev.env.example backend/.env    # samakan DB_PASSWORD dengan .env root
docker compose up -d --build
docker compose exec app php artisan key:generate
docker compose exec app composer require laravel/sanctum   # lalu: php artisan install:api
curl http://localhost:8080/up        # 200 = hidup
```

Tambahan: `docker compose --profile tools up -d` (Mailpit untuk email OTP di http://localhost:8025, Adminer di http://localhost:8081), `docker compose --profile scheduler up -d` (scheduler).
Perintah harian: `make artisan c="migrate"`, `make composer c="require x/y"`, `make test`, `make sh`, `make logs`.

Wajib di `backend/bootstrap/app.php` (Laravel ada di belakang proxy): `->withMiddleware(fn ($m) => $m->trustProxies(at: '*'))`. Test backend harus jalan di **MySQL** (schema memakai generated column, CHECK, view): jangan biarkan `phpunit.xml` memaksa SQLite.

## 3. Menyiapkan VPS (sekali)

1. **Server**: Ubuntu LTS, ≥ 2 vCPU / 4 GB. Pasang Docker Engine + Compose v2. Buat user deploy non-root (`adduser deploy && usermod -aG docker deploy`). Firewall (`ufw`): buka 22; buka 80/443 **hanya** bila memakai Caddy tanpa Tunnel (lihat §9). MySQL **tidak** dipublikasikan.
2. **DNS & HTTPS**: dengan Cloudflare ikuti **§9** (Tunnel, tanpa port terbuka). Tanpa Cloudflare: A record `api-uat.<domain-anda>` → IP VPS dan `COMPOSE_PROFILES=tls` (Caddy + Let's Encrypt).
3. **Folder deploy** (mis. `/opt/therapedia`) sebagai user `deploy`:
   ```bash
   mkdir -p /opt/therapedia && cd /opt/therapedia
   ```
   Buat dua berkas (tidak masuk git; CI mengirim `docker-compose.prod.yml` dan `docker/` sendiri):
   - `.env` ← isi dari `.env.example` (password DB kuat, `GHCR_OWNER`, `COMPOSE_PROFILES=cloudflare` + `CLOUDFLARE_TUNNEL_TOKEN`, atau `tls` + `APP_DOMAIN`)
   - `.env.backend` ← dari `docker/env/backend.prod.env.example` (`APP_URL`, `DB_*` sama dengan `.env`, SMTP, `FRONTEND_URL`). `APP_KEY` diisi setelah deploy pertama (§4 langkah 4).
4. **Cron backup** (`crontab -e` sebagai `deploy`):
   ```
   CRON_TZ=Asia/Jakarta
   30 3 * * * cd /opt/therapedia && ./docker/scripts/backup.sh daily >> backups/backup.log 2>&1
   ```
   Opsional salinan off-server: isi `BACKUP_RSYNC_TARGET` di `.env`. Backup arsip 6 bulan/1 tahun: salin berkas `backups/` terpilih ke penyimpanan terpisah dan **uji pulih** (§6).
5. **Kunci SSH CI**: buat key khusus (`ssh-keygen -t ed25519 -f deploy_key -N ""`), tambahkan `deploy_key.pub` ke `~deploy/.ssh/authorized_keys`, simpan isi `deploy_key` sebagai secret GitHub.

## 4. Auto push → server

Alur `.github/workflows/deploy.yml` (push ke `main` yang menyentuh `backend/`, `docker/`, `docker-compose.prod.yml`):

1. **check**: lewati semua langkah bila `backend/artisan` / `composer.lock` belum ada.
2. **test**: MySQL 8 service + `php artisan test`.
3. **build**: bangun image `therapedia-app` (PHP-FPM + kode + vendor) dan `therapedia-web` (Nginx + `public/`), push ke GHCR dengan tag SHA 12 karakter dan `uat`.
4. **deploy** (Environment `uat`): rsync `docker/` + `docker-compose.prod.yml` ke VPS → login GHCR → `deploy.sh`: tarik image → **backup DB (pre-deploy)** → `up -d --wait` → `php artisan migrate --force` → `php artisan optimize` → cek `/up`.

**Secrets** (Settings → Secrets and variables → Actions): `VPS_HOST` (**IP VPS atau hostname DNS-only**, bukan hostname API yang diproksi Cloudflare: SSH tidak lewat proxy), `VPS_USER`, `VPS_SSH_KEY`, `VPS_PATH` (mis. `/opt/therapedia`); opsional `VPS_PORT` (default 22) dan `VPS_KNOWN_HOSTS` (hasil `ssh-keyscan`; bila kosong CI memakai `ssh-keyscan` otomatis, kurang aman). Buat Environment **`uat`** (opsional: Required reviewers untuk persetujuan manual).

**Deploy pertama** (setelah Laravel ada & dipush): jalankan workflow (otomatis atau "Run workflow"). Lalu di VPS:
```bash
docker compose -f docker-compose.prod.yml run --rm app php artisan key:generate --show   # tempel ke APP_KEY di .env.backend
IMAGE_TAG=uat ./docker/scripts/deploy.sh                                                  # ulangi supaya env baru terbaca
docker compose -f docker-compose.prod.yml exec app php artisan db:seed --force            # seeder wajib (cabang, role, master, akun master) — sekali
```
Seeder **tidak** dijalankan otomatis setiap deploy.

**Aturan satu lingkungan** (tester + klien memakai server yang sama): deploy hanya Senin–Kamis; **freeze Jumat 14.00 sampai UAT Sabtu selesai** (nonaktifkan workflow atau minta reviewer menolak). Migration yang mengubah struktur jangan dijalankan Jumat/Sabtu.

## 5. Operasional

```bash
cd /opt/therapedia; DC="docker compose -f docker-compose.prod.yml"
$DC ps                                  # status
$DC logs -f --tail=100 app web          # log aplikasi (LOG_CHANNEL=stderr) + Nginx
$DC logs -f scheduler                   # log scheduler
$DC exec app php artisan tinker         # konsol
$DC exec app php artisan credits:reconcile   # rekonsiliasi manual (bila command sudah dibuat)
$DC exec mysql sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"'
```
Data persisten ada di volume Docker: `therapedia_mysql_data` (DB), `therapedia_app_storage` (**bukti bayar privat**, log), `therapedia_caddy_data` (sertifikat). Jangan jalankan `docker compose down -v` di server: itu menghapus semuanya.

**Rollback**: `IMAGE_TAG=$(cat .deploy/previous_tag) ./docker/scripts/deploy.sh --no-migrate`. Migrasi tidak dibatalkan otomatis; bila perlu pulihkan data dari backup pre-deploy (§6).

**Reverse proxy sendiri** (VPS sudah punya Nginx/Traefik): kosongkan `COMPOSE_PROFILES` di `.env`, lalu arahkan proxy itu ke `127.0.0.1:${WEB_PORT}` dengan header `X-Forwarded-For` / `X-Forwarded-Proto` dan `proxy_read_timeout 300s`.

## 6. Backup & uji pulih

- `backup.sh [label]`: dump MySQL (`--single-transaction`) + arsip volume storage, simpan `BACKUP_KEEP_DAYS` hari (14), opsional rsync off-server. Otomatis berlabel `pre-deploy` sebelum tiap deploy.
- `restore.sh <file.sql.gz>`: **default memulihkan ke database uji** `<db>_restore_test` (aman untuk uji restore berkala; checklist go-live `schema.md` §12 butir 18). Memulihkan ke database asli butuh `--production` dan mengetik `YA`, dan membuat backup `pre-restore` lebih dulu.
- Binary log MySQL aktif 14 hari (point-in-time recovery manual).

## 7. Keamanan (ringkas)

`.env`, `.env.backend`, `backups/`, `.deploy/` ada di `.gitignore`. MySQL hanya di jaringan Docker. Nginx hanya di `127.0.0.1` (publik lewat Cloudflare Tunnel atau Caddy). Token `GITHUB_TOKEN` untuk login GHCR berlaku selama job. Gunakan password acak panjang untuk MySQL; ganti `ganti-...` di semua contoh. Bila repo/package privat, VPS menarik image dengan token yang sama saat deploy.

## 8. Checklist pertama kali (belum pernah dijalankan)

- [ ] `docker compose config` dev lolos; `make laravel-new`; `docker compose up -d --build` membangun target `dev` tanpa error
- [ ] `curl localhost:8080/up` → 200; `php artisan migrate` berhasil di MySQL kontainer
- [ ] `docker build -f docker/php/Dockerfile --target prod .` dan `--target web .` berhasil setelah `composer.lock` ada
- [ ] Workflow: job test hijau di MySQL (cek `phpunit.xml`), image muncul di GHCR
- [ ] Deploy pertama ke VPS: HTTPS valid, `/up` 200, scheduler berjalan (`logs scheduler`), file bukti tetap ada setelah deploy kedua
- [ ] `backup.sh` + `restore.sh` (ke database uji) sukses sekali

## 9. Cloudflare (gratis): SSL, proteksi, dan CDN

Cloudflare membantu **SSL**, **menyembunyikan IP VPS**, dan **proteksi dasar** (DDoS, WAF terkelola, bot). Soal **CDN**: API ini JSON dinamis dan terautentikasi, jadi **tidak ada yang perlu di-cache** (Cloudflare memang tidak meng-cache JSON secara bawaan). Manfaat CDN untuk aplikasi ini ada di frontend, dan frontend sudah di CDN Vercel.

### 9.1 Pilihan A (disarankan): Cloudflare Tunnel
Container `cloudflared` membuat koneksi keluar ke Cloudflare; **tidak ada port 80/443 yang dibuka** dan IP VPS tidak terlihat. SSL diurus Cloudflare, jadi Caddy tidak dipakai.

1. Domain sudah memakai nameserver Cloudflare (Add a site → paket Free).
2. Zero Trust → **Networks → Tunnels → Create a tunnel** (Cloudflared) → salin **token**.
3. Tab **Public Hostname**: `api-uat.<domain>` → Service **HTTP** `web:80` (nama service Docker `web`).
4. Di VPS, `.env`: `COMPOSE_PROFILES=cloudflare` dan `CLOUDFLARE_TUNNEL_TOKEN=<token>`; jalankan deploy. DNS record dibuat Cloudflare otomatis (CNAME ke tunnel, proxied).
5. `ufw`: cukup port 22 (80/443 tidak perlu dibuka).

### 9.2 Pilihan B: Caddy di belakang proxy Cloudflare
Bila tidak memakai Tunnel: A record `api-uat` → IP VPS dengan awan **oranye (Proxied)**. Di Cloudflare SSL/TLS atur **Full (strict)** (jangan *Flexible*: trafik Cloudflare→VPS jadi tidak terenkripsi). Sertifikat origin: Caddy + Let's Encrypt biasanya jalan lewat proxy, atau pakai **Cloudflare Origin CA** (gratis, 15 tahun) yang dipasang di Caddy dengan `tls /certs/origin.pem /certs/origin.key`. Batasi port 80/443 di `ufw` hanya ke [rentang IP Cloudflare](https://www.cloudflare.com/ips/) supaya origin tidak bisa diakses langsung (alasannya di §9.3).

### 9.3 Yang SUDAH disesuaikan di konfigurasi ini
- **IP asli pengunjung**: Nginx membaca `CF-Connecting-IP` (hanya dari jaringan Docker privat). Tanpa ini Laravel melihat IP Cloudflare untuk semua orang, sehingga **throttle/lockout login ortu, login staf, dan kuesioner publik berbagi satu "ember"** dan bisa mengunci semua pengguna sekaligus. Karena header ini bisa dipalsukan bila origin diakses langsung, origin harus hanya terjangkau lewat Cloudflare (Tunnel, atau firewall IP Cloudflare).
- **HTTPS ke Laravel**: `X-Forwarded-Proto` diteruskan ke PHP; di `bootstrap/app.php` tetap pakai `trustProxies(at: '*')`.
- **Request yang diputus Cloudflare**: paket gratis memutus request > **100 detik** (error **524**). Nginx diset `fastcgi_ignore_client_abort on` agar proses tetap selesai/rollback utuh walau koneksi diputus. Yang berisiko hanya aksi sinkron yang lama (**hapus cabang/client besar**, schema.md §6.7): frontend sebaiknya memperlakukan 524/timeout pada aksi itu sebagai "mungkin masih berjalan, muat ulang dan cek". Untuk data klinik ini (ribuan baris) biasanya selesai dalam hitungan detik. Ukuran upload maksimum Cloudflare gratis 100 MB (bukti bayar 5 MB aman).

### 9.4 Pengaturan di dashboard Cloudflare
| Menu | Setelan |
|---|---|
| SSL/TLS → Overview | **Full (strict)** (Pilihan B). Tunnel tidak terpengaruh |
| SSL/TLS → Edge Certificates | *Always Use HTTPS* ON, *Minimum TLS* 1.2, *HSTS* boleh diaktifkan setelah HTTPS stabil |
| Caching → Cache Rules | Rule: hostname `api-uat.<domain>` → **Bypass cache** (jaring pengaman; bukti bayar/data klinik tidak boleh ter-cache) |
| Security → WAF / Rate limiting | Aktifkan *Managed rules* yang tersedia; paket gratis menyediakan sedikit custom rule/rate limit: pasang batas untuk `/api/*login*` dan `/public/assessments/*` |
| Speed → Optimization | Matikan *Rocket Loader* dan *Auto Minify* untuk hostname API (tidak berguna untuk JSON) |
| DNS | Record **frontend** (Vercel) biarkan **DNS only** (awan abu-abu) sesuai saran Vercel; record **SSH/host deploy** (jika memakai hostname) juga **DNS only** |

### 9.5 Env Laravel & CORS
`APP_URL=https://api-uat.<domain>`, `FRONTEND_URL=https://<domain frontend>`. Token Sanctum dikirim lewat header `Authorization` (bukan cookie), jadi cukup atur CORS ke `FRONTEND_URL`. Respons API sebaiknya tetap `Cache-Control: no-store/private` (bawaan Laravel `no-cache, private`).
