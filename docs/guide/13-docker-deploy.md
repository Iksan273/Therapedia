# 13 — Docker & Deploy Otomatis ke VPS

Setup Docker untuk backend **Laravel 12 + MySQL 8** (tanpa Redis, tanpa queue worker; lihat `schema.md` §10–§11) dan alur **push → test → build → deploy otomatis** ke VPS. Satu-satunya lingkungan server adalah **UAT di VPS** (dipakai developer, tester, dan klien; lihat `TIMELINE_DEV.md` §5). **Frontend dan backend satu stack**: image `web` (Nginx) melayani SPA di `/` dan meneruskan `/api/*` + `/up` ke Laravel, jadi satu origin (tanpa CORS) dan satu hostname. Landing page (`landing/`) tetap project terpisah (Vercel). Keputusan: ADR 0006.

> Status: build image `app` dan `web` (termasuk build frontend), menaikkan stack prod di lokal (`up --wait` exit 0), migrate, serta routing `/`, `/up`, `/api/*` **sudah diuji di lokal**. Workflow CI/CD dan `vps-setup.sh` sudah ditulis (sintaks divalidasi) tetapi **belum pernah berjalan di GitHub/VPS**. Jalankan checklist §8 saat pertama kali.

## 0. Gambaran alur

```
git push main -> GitHub Actions: test backend + lint/test frontend -> build image app & web -> push GHCR
              -> SSH ke VPS: tarik image -> backup DB -> up -d -> migrate -> optimize -> cek /up
```
MySQL memakai image resmi `mysql:8.0` (tidak dibangun CI) dengan data di volume, jadi tidak tersentuh saat deploy. Frontend ikut terbawa di image `web`; perubahan `frontend/` saja sudah memicu deploy.

| Yang diubah | Cara |
|---|---|
| Kode backend / frontend | `git push` ke `main` (otomatis) |
| Env backend (`.env.backend`) | Hanya di VPS (rahasia, tidak di git): `nano .env.backend`, lalu `docker compose -f docker-compose.prod.yml up -d --force-recreate app` dan `... exec app php artisan optimize` (env hanya dibaca saat container dibuat; config ter-cache) |
| Variabel frontend `VITE_*` | GitHub Variables (ditanam saat build), lalu jalankan ulang workflow |
| Domain / Tunnel | `.env` di VPS (`COMPOSE_PROFILES`, `CLOUDFLARE_TUNNEL_TOKEN`), lalu `./docker/scripts/deploy.sh` |

## 1. Isi repo

```
backend/                 Laravel 12 (sudah dibuat; kerangka migration/model/controller ada, lihat implementation_detail §1.3)
docker/
  php/Dockerfile         target: dev | prod | web  (PHP 8.3-FPM Alpine; web = Nginx + build frontend dari stage node)
  php/conf/              php.ini, opcache dev/prod, pool PHP-FPM
  php/entrypoint.sh      siapkan storage, jalankan fpm / artisan sebagai user `app`
  nginx/default.conf     DEV: Nginx → php-fpm saja (healthcheck /up, timeout 300 dtk, IP klien asli)
  nginx/prod.conf        UAT/prod: `/` = SPA, `/api/*` + `/up` = php-fpm (bagian real_ip/fastcgi harus sama dengan default.conf)
  mysql/my.cnf           utf8mb4, UTC, buffer pool, binlog 14 hari, slow query log
  proxy/Caddyfile        HTTPS otomatis (Let's Encrypt)
  env/                   contoh env Laravel: backend.dev.env.example, backend.prod.env.example
  scripts/               laravel-new.sh, vps-setup.sh (persiapan VPS sekali), deploy.sh, backup.sh, restore.sh
docker-compose.yml       DEV lokal (kode di-mount dari host)
docker-compose.prod.yml  UAT/produksi di VPS (image dari GHCR)
.env.example             variabel compose (salin ke .env)
Makefile                 pintasan dev
.github/workflows/deploy.yml   CI/CD
```

Prinsip: **tidak ada queue/job async dan tidak ada scheduler**. Tidak ada proses di luar request; backup dijalankan cron VPS. Bila nanti `credits:reconcile`, housekeeping, atau `db:analyze` (schema.md §11) perlu dijadwalkan, pakai cron VPS (`docker compose exec -T app php artisan ...`).

## 2. Mulai (dev lokal)

Butuh Docker Desktop (Windows/Mac) atau Docker Engine + Compose v2 (Linux).

```bash
cp .env.example .env                 # isi password DB
make laravel-new                     # buat Laravel di backend/ (sekali, sudah dilakukan; tanpa make: ./docker/scripts/laravel-new.sh)
cp docker/env/backend.dev.env.example backend/.env    # samakan DB_PASSWORD dengan .env root
docker compose up -d --build
docker compose exec app php artisan key:generate
docker compose exec app composer require laravel/sanctum   # lalu: php artisan install:api
curl http://localhost:8080/up        # 200 = hidup
```

Tambahan: `docker compose --profile tools up -d` (Mailpit untuk email OTP di http://localhost:8025, Adminer di http://localhost:8081).
Perintah harian: `make artisan c="migrate"`, `make composer c="require x/y"`, `make test`, `make sh`, `make logs`.

Wajib di `backend/bootstrap/app.php` (Laravel ada di belakang proxy): `->withMiddleware(fn ($m) => $m->trustProxies(at: '*'))`. Test backend harus jalan di **MySQL** (schema memakai generated column, CHECK, view): jangan biarkan `phpunit.xml` memaksa SQLite.

## 3. Menyiapkan VPS (sekali)

**Cara cepat (disarankan): `docker/scripts/vps-setup.sh`.** Server Ubuntu/Debian ≥ 2 vCPU / 4 GB. Login sebagai root (jangan membagikan password root ke siapa pun; kunci SSH lebih aman), salin skrip ke VPS, lalu:
```bash
GHCR_OWNER=<username-github-huruf-kecil> bash vps-setup.sh                      # mode IP: http://IP-VPS (uji, belum terenkripsi)
GHCR_OWNER=<...> DOMAIN=therapedia.cosmiclabs.tech CLOUDFLARE_TUNNEL_TOKEN=<token> bash vps-setup.sh   # mode domain + Cloudflare Tunnel
```
Skrip memasang Docker, membuat user `deploy` + `/opt/therapedia`, kunci SSH CI (kunci private ditampilkan sekali untuk GitHub Secrets), `ufw`, `.env` + `.env.backend` (password DB acak + `APP_KEY`, tidak menimpa yang sudah ada), dan cron backup. Ia mencetak daftar Secrets yang harus diisi. Langkah manual di bawah hanya rujukan bila tidak memakai skrip.

1. **Server**: Ubuntu LTS, ≥ 2 vCPU / 4 GB. Pasang Docker Engine + Compose v2. Buat user deploy non-root (`adduser deploy && usermod -aG docker deploy`). Firewall (`ufw`): buka 22; buka 80/443 **hanya** bila memakai Caddy tanpa Tunnel (lihat §9). MySQL **tidak** dipublikasikan.
2. **DNS & HTTPS**: dengan Cloudflare ikuti **§9** (Tunnel, tanpa port terbuka). Tanpa Cloudflare: A record `<subdomain>.<domain-anda>` → IP VPS dan `COMPOSE_PROFILES=tls` (Caddy + Let's Encrypt). Tanpa domain sama sekali: `WEB_BIND=0.0.0.0` + `WEB_PORT=80` di `.env`, akses `http://IP-VPS` (hanya uji).
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

Alur `.github/workflows/deploy.yml` (push ke `main` yang menyentuh `backend/`, `frontend/`, `docker/`, `docker-compose.prod.yml`):

1. **check**: lewati semua langkah bila `backend/artisan` / `composer.lock` belum ada.
2. **test-backend**: MySQL 8 service + `php artisan test`. **test-frontend**: `npm ci`, `npm run lint`, `npm test`.
3. **build**: bangun image `therapedia-app` (PHP-FPM + kode + vendor) dan `therapedia-web` (Nginx + hasil build frontend), push ke GHCR dengan tag SHA 12 karakter dan `uat`. `VITE_*` diambil dari GitHub **Variables** (`VITE_DATA_SOURCE` default `local`, `VITE_API_BASE_URL` default `/api/v1`, `VITE_LANDING_URL`).
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

## 8. Checklist pertama kali

- [ ] `docker compose config` dev lolos; `make laravel-new`; `docker compose up -d --build` membangun target `dev` tanpa error
- [ ] `curl localhost:8080/up` → 200; `php artisan migrate` berhasil di MySQL kontainer
- [x] `docker build -f docker/php/Dockerfile --target prod .` dan `--target web .` berhasil (diuji lokal 12 Okt 2026), stack prod naik, `up --wait` exit 0, `/`, `/up`, `/api/*` benar
- [ ] Workflow: job test-backend (MySQL) + test-frontend hijau, image `therapedia-app` dan `therapedia-web` muncul di GHCR
- [ ] `vps-setup.sh` dijalankan di VPS, GitHub Secrets + Environment `uat` terisi
- [ ] Deploy pertama ke VPS: akses via IP atau HTTPS (domain), `/up` 200, file bukti tetap ada setelah deploy kedua
- [ ] `backup.sh` + `restore.sh` (ke database uji) sukses sekali

## 9. Cloudflare (gratis): SSL, proteksi, dan CDN

Cloudflare membantu **SSL**, **menyembunyikan IP VPS**, dan **proteksi dasar** (DDoS, WAF terkelola, bot). Soal **CDN**: API ini JSON dinamis dan terautentikasi, jadi **tidak ada yang perlu di-cache** (Cloudflare memang tidak meng-cache JSON secara bawaan). Frontend (aset statis ber-hash) disajikan Nginx satu origin dengan API, jadi ikut dilindungi Cloudflare; aset `/assets/*` boleh di-cache (immutable), API tidak.

### 9.1 Pilihan A (disarankan): Cloudflare Tunnel
Container `cloudflared` membuat koneksi keluar ke Cloudflare; **tidak ada port 80/443 yang dibuka** dan IP VPS tidak terlihat. SSL diurus Cloudflare, jadi Caddy tidak dipakai.

1. Domain sudah memakai nameserver Cloudflare (Add a site → paket Free).
2. Zero Trust → **Networks → Tunnels → Create a tunnel** (Cloudflared) → salin **token**.
3. Tab **Public Hostname**: `therapedia.cosmiclabs.tech` (atau `<subdomain>.<domain>`) → Service **HTTP** `web:80` (nama service Docker `web`).
4. Di VPS, `.env`: `COMPOSE_PROFILES=cloudflare` dan `CLOUDFLARE_TUNNEL_TOKEN=<token>`; jalankan deploy. DNS record dibuat Cloudflare otomatis (CNAME ke tunnel, proxied).
5. `ufw`: cukup port 22 (80/443 tidak perlu dibuka).

### 9.2 Pilihan B: Caddy di belakang proxy Cloudflare
Bila tidak memakai Tunnel: A record `therapedia` → IP VPS dengan awan **oranye (Proxied)**. Di Cloudflare SSL/TLS atur **Full (strict)** (jangan *Flexible*: trafik Cloudflare→VPS jadi tidak terenkripsi). Sertifikat origin: Caddy + Let's Encrypt biasanya jalan lewat proxy, atau pakai **Cloudflare Origin CA** (gratis, 15 tahun) yang dipasang di Caddy dengan `tls /certs/origin.pem /certs/origin.key`. Batasi port 80/443 di `ufw` hanya ke [rentang IP Cloudflare](https://www.cloudflare.com/ips/) supaya origin tidak bisa diakses langsung (alasannya di §9.3).

> Hostname proyek ini: **`therapedia.cosmiclabs.tech`** (satu hostname untuk frontend dan API; Public Hostname → `HTTP` `web:80`). Domain utama `cosmiclabs.tech` dimasukkan ke Cloudflare (Add a site) dan nameserver registrar diganti; subdomain dibuat di Tunnel. Di mode ini `APP_URL=https://therapedia.cosmiclabs.tech`, `WEB_BIND=127.0.0.1`.

### 9.3 Yang SUDAH disesuaikan di konfigurasi ini
- **IP asli pengunjung**: Nginx membaca `CF-Connecting-IP` (hanya dari jaringan Docker privat). Tanpa ini Laravel melihat IP Cloudflare untuk semua orang, sehingga **throttle/lockout login ortu, login staf, dan kuesioner publik berbagi satu "ember"** dan bisa mengunci semua pengguna sekaligus. Karena header ini bisa dipalsukan bila origin diakses langsung, origin harus hanya terjangkau lewat Cloudflare (Tunnel, atau firewall IP Cloudflare).
- **HTTPS ke Laravel**: `X-Forwarded-Proto` diteruskan ke PHP; di `bootstrap/app.php` tetap pakai `trustProxies(at: '*')`.
- **Request yang diputus Cloudflare**: paket gratis memutus request > **100 detik** (error **524**). Nginx diset `fastcgi_ignore_client_abort on` agar proses tetap selesai/rollback utuh walau koneksi diputus. Yang berisiko hanya aksi sinkron yang lama (**hapus cabang/client besar**, schema.md §6.7): frontend sebaiknya memperlakukan 524/timeout pada aksi itu sebagai "mungkin masih berjalan, muat ulang dan cek". Untuk data klinik ini (ribuan baris) biasanya selesai dalam hitungan detik. Ukuran upload maksimum Cloudflare gratis 100 MB (bukti bayar 5 MB aman).

### 9.4 Pengaturan di dashboard Cloudflare
| Menu | Setelan |
|---|---|
| SSL/TLS → Overview | **Full (strict)** (Pilihan B). Tunnel tidak terpengaruh |
| SSL/TLS → Edge Certificates | *Always Use HTTPS* ON, *Minimum TLS* 1.2, *HSTS* boleh diaktifkan setelah HTTPS stabil |
| Caching → Cache Rules | Rule: path `/api/*` → **Bypass cache** (jaring pengaman; bukti bayar/data klinik tidak boleh ter-cache; `/assets/*` boleh di-cache) |
| Security → WAF / Rate limiting | Aktifkan *Managed rules* yang tersedia; paket gratis menyediakan sedikit custom rule/rate limit: pasang batas untuk `/api/*login*` dan `/public/assessments/*` |
| Speed → Optimization | Matikan *Rocket Loader* dan *Auto Minify* untuk hostname API (tidak berguna untuk JSON) |
| DNS | Record **SSH/host deploy** (jika memakai hostname, bukan IP) harus **DNS only** (awan abu-abu): SSH tidak lewat proxy Cloudflare. Record landing di Vercel (bila ada) biarkan **DNS only** sesuai saran Vercel |

### 9.5 Env Laravel & CORS
`APP_URL=https://therapedia.cosmiclabs.tech`. Frontend satu origin dengan API, jadi **tidak butuh CORS** (`FRONTEND_URL` hanya perlu bila frontend dipasang di origin lain, mis. Vercel). Token Sanctum dikirim lewat header `Authorization` (bukan cookie). Respons API sebaiknya tetap `Cache-Control: no-store/private` (bawaan Laravel `no-cache, private`).
