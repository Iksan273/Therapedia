# 14 — Runbook: Deploy Therapedia ke VPS (step by step)

Panduan praktis dari nol sampai aplikasi live di `https://therapedia.<domain>`. Cocok dipakai ulang untuk **akun klien**. Penjelasan arsitektur dan operasional lengkap ada di [13-docker-deploy.md](13-docker-deploy.md).

**Hasil akhir:** satu stack Docker di VPS (frontend + Laravel + MySQL), HTTPS lewat Cloudflare Tunnel, dan setiap `git push` ke `main` otomatis memperbarui server.

---

## Daftar isi

0. [Gambaran alur](#0-gambaran-alur)
1. [Persiapan akun](#1-persiapan-akun)
2. [Cloudflare: aktifkan domain](#2-cloudflare-aktifkan-domain)
3. [VPS: siapkan sekali](#3-vps-siapkan-sekali)
4. [GitHub: Secrets dan Environment](#4-github-secrets-dan-environment)
5. [Deploy pertama](#5-deploy-pertama)
6. [Domain + HTTPS (Cloudflare Tunnel)](#6-domain--https-cloudflare-tunnel)
7. [Pemakaian sehari-hari](#7-pemakaian-sehari-hari)
8. [Jebakan yang sudah pernah terjadi](#8-jebakan-yang-sudah-pernah-terjadi)
9. [Serah terima ke klien](#9-serah-terima-ke-klien)
10. [Status proyek saat ini](#10-status-proyek-saat-ini)

---

## 0. Gambaran alur

```
git push main
   │
GitHub Actions (server GitHub):
   1. test backend (MySQL) + lint/test frontend
   2. build image app (Laravel) + web (Nginx + frontend)
   3. push image ke GHCR
   4. SSH ke VPS
   │
VPS: tarik image → backup DB → ganti container → migrate → cek /up
```

Isi stack di VPS (3 container, +1 bila memakai Cloudflare Tunnel):

| Container | Fungsi |
|---|---|
| `web` | Nginx: `/` = frontend, `/api/*` dan `/up` = Laravel. Satu-satunya pintu masuk |
| `app` | Laravel (PHP-FPM) |
| `mysql` | Database (image resmi `mysql:8.0`, data di volume, tidak dibangun CI) |
| `cloudflared` | Tunnel ke Cloudflare (HTTPS, tanpa membuka port) |

> **Penting:** GitHub-lah yang masuk ke VPS lewat SSH (memakai sepasang kunci), bukan VPS yang login ke GitHub. VPS tidak perlu "tersambung" ke GitHub.

---

## 1. Persiapan akun

Semua milik **klien** bila deploy untuk klien.

| Item | Catatan |
|---|---|
| Akun **GitHub** pemilik repo | Pindah repo: Settings → Transfer ownership, atau buat repo baru lalu `git push` |
| **VPS** Ubuntu/Debian, minimal 2 vCPU / 4 GB | Kosong dan bisa login root |
| **Domain** + akun **Cloudflare** | Subdomain contoh: `therapedia.cosmiclabs.tech` |

Catat dua nilai ini, dipakai berulang:

- `GHCR_OWNER` = username atau organisasi GitHub, **huruf kecil** semua (contoh `iksan273`).
- `IP-VPS` = alamat IP publik VPS.

Aturan keamanan:

- **Jangan mengirim password root atau token lewat chat.** Klien membuat akun lalu mengundang kamu (kolaborator GitHub, member Cloudflare).
- Setelah serah terima, **buat ulang** kunci SSH, password database, dan token Tunnel (lihat [bagian 9](#9-serah-terima-ke-klien)).

---

## 2. Cloudflare: aktifkan domain

Dikerjakan **sekali per domain**.

1. Login Cloudflare → **Add a site**.
2. Isi **domain utama** saja (contoh `cosmiclabs.tech`, **bukan** `therapedia.cosmiclabs.tech`). Pilih paket **Free**.
3. Pada halaman cek DNS ("Records we found"), tidak perlu menambah record. Klik **Continue to activation**.
4. Cloudflare menampilkan **dua nameserver** (contoh `dom.ns.cloudflare.com`). Salin keduanya.
5. Di registrar (contoh Hostinger: hPanel → Domains → Manage → Nameservers → Change Nameservers), **hapus nameserver lama** dan isi dua dari Cloudflare. Matikan DNSSEC bila aktif. Simpan.
6. Kembali ke Cloudflare, klik **I updated my nameservers**.
7. Tunggu email dari Cloudflare: status **Active** (1–2 jam, maksimal 24 jam).

Lanjut ke bagian 3 sambil menunggu. Bagian 6 baru butuh status Active.

---

## 3. VPS: siapkan sekali

Skrip `docker/scripts/vps-setup.sh` memasang Docker, membuat user `deploy`, folder `/opt/therapedia`, firewall, kunci SSH untuk CI, berkas `.env` dan `.env.backend` (password acak), serta cron backup.

### Langkah

1. Login sebagai root:
   ```bash
   ssh root@IP-VPS
   ```
2. Pasang skrip di VPS. Repo **private** jadi tidak bisa di-`curl`. Salin manual:
   ```bash
   nano vps-setup.sh
   ```
   Di VS Code buka `docker/scripts/vps-setup.sh`, pilih semua (Ctrl+A), salin (Ctrl+C). Di jendela nano tempel (klik kanan atau Shift+Insert).
   Simpan: **Ctrl+O**, **Enter**, lalu **Ctrl+X**.
   Cek: `head -3 vps-setup.sh` harus menampilkan `#!/usr/bin/env bash`.
   Nama file memakai **tanda hubung** (`vps-setup.sh`), bukan titik.
3. Jalankan:
   ```bash
   GHCR_OWNER=<username-github-kecil> bash vps-setup.sh
   ```
4. Di akhir output ada kotak **"VPS siap"** berisi `VPS_HOST`, `VPS_USER`, `VPS_PATH`, dan **kunci private** SSH.
5. **Salin seluruh blok kunci private**, dari `-----BEGIN OPENSSH PRIVATE KEY-----` sampai `-----END OPENSSH PRIVATE KEY-----`. Kedua baris itu **ikut**. Kunci hanya tampil sekali.
6. Setelah kunci tertempel di GitHub (bagian 4), ketik `clear` di terminal.

Skrip aman diulang: `.env` dan `.env.backend` yang sudah ada **tidak ditimpa**. Yang berubah tiap kali hanyalah kunci SSH baru ditambahkan.

### Bila kunci hilang atau rusak

Buat kunci baru (sebagai root di VPS):
```bash
ssh-keygen -t ed25519 -N "" -C "therapedia-ci" -f /root/ci_key
cat /root/ci_key.pub >> /home/deploy/.ssh/authorized_keys
cat /root/ci_key                      # salin blok ini ke GitHub Secrets
shred -u /root/ci_key /root/ci_key.pub
```

---

## 4. GitHub: Secrets dan Environment

### Secrets

**Repo → Settings → Secrets and variables → Actions → tab Secrets → New repository secret.** Buat empat:

| Name | Value |
|---|---|
| `VPS_HOST` | IP VPS |
| `VPS_USER` | `deploy` (bukan `root`) |
| `VPS_PATH` | `/opt/therapedia` |
| `VPS_SSH_KEY` | blok kunci private, **BEGIN dan END ikut**, jangan diedit |

### Environment

**Settings → Environments → New environment**, nama persis **`uat`** (huruf kecil), lalu Configure environment. Pengaturan lain biarkan default.

### Variables (opsional)

Di tab **Variables**:

| Name | Default | Fungsi |
|---|---|---|
| `VITE_DATA_SOURCE` | `local` | `local` = data demo di browser, `api` = Laravel API (setelah integrasi) |
| `VITE_API_BASE_URL` | `/api/v1` | Biarkan, satu origin dengan API |
| `VITE_LANDING_URL` | kosong | URL landing page bila ada |

---

## 5. Deploy pertama

1. Pastikan semua file (termasuk `docker/`, `.github/workflows/deploy.yml`, `backend/`) sudah di-commit dan di-push ke `main`.
2. Buka tab **Actions → Deploy UAT → Run workflow** (pilih `main`).
3. Tunggu semua job hijau: `check`, `test-backend`, `test-frontend`, `build`, `deploy`. Pertama kali sekitar 5–10 menit.
4. Cek di browser (mode IP):

| Alamat | Harus muncul |
|---|---|
| `http://IP-VPS` | Frontend Therapedia (otomatis ke halaman login) |
| `http://IP-VPS/login` | Halaman login (tetap tampil saat refresh) |
| `http://IP-VPS/up` | Halaman hijau dari Laravel (200) |

5. Cek di VPS sebagai `deploy` (lihat catatan user `deploy` di [bagian 7](#7-pemakaian-sehari-hari)):
   ```bash
   cd /opt/therapedia
   export IMAGE_TAG=$(cat .deploy/current_tag)
   docker compose -f docker-compose.prod.yml ps        # app, mysql, web: healthy
   ```

### Bila job gagal

| Gejala | Penyebab | Solusi |
|---|---|---|
| `error in libcrypto`, `Permission denied (publickey)` | `VPS_SSH_KEY` terpotong atau salah format | Buat kunci baru dan tempel utuh dengan BEGIN/END |
| Job `deploy` tertahan | Environment `uat` belum dibuat | Buat environment bernama `uat` |
| `test-backend` atau `test-frontend` merah | Ada test gagal | Perbaiki kode; deploy otomatis berhenti, server tetap di versi lama |
| Halaman tidak terbuka | Port 80 diblokir firewall penyedia VPS | Buka port 80 di panel VPS |

---

## 6. Domain + HTTPS (Cloudflare Tunnel)

Syarat: domain berstatus **Active** di Cloudflare (bagian 2).

### 6.1 Di Cloudflare

1. Buka **Zero Trust** → **Networks → Tunnels → Create a tunnel**, pilih **Cloudflared**, nama `therapedia`.
2. Pada halaman instalasi pilih tab **Docker**. Salin **token saja** (teks panjang setelah `--token`). **Jangan jalankan** perintah yang ditampilkan.
3. Tab **Public Hostname**, isi:
   - Subdomain: `therapedia`
   - Domain: pilih domain kamu
   - Type: `HTTP`
   - URL: `web:80`
4. **Save**. Record DNS (CNAME) dibuat otomatis, tidak perlu menambah apa pun di DNS atau registrar.

### 6.2 Di VPS

Login root lalu pindah ke user `deploy` (user ini tidak punya password):
```bash
ssh root@IP-VPS
su - deploy
cd /opt/therapedia
```

Edit `.env`:
```bash
nano .env
```
```env
COMPOSE_PROFILES=cloudflare
CLOUDFLARE_TUNNEL_TOKEN=<tempel token>
WEB_BIND=127.0.0.1
WEB_PORT=8080
APP_DOMAIN=therapedia.<domain>
```

Edit `.env.backend`:
```bash
nano .env.backend
```
```env
APP_URL=https://therapedia.<domain>
```

Terapkan:
```bash
export IMAGE_TAG=$(cat .deploy/current_tag)
docker compose -f docker-compose.prod.yml up -d --force-recreate --no-build --pull never
docker compose -f docker-compose.prod.yml exec app php artisan optimize
docker compose -f docker-compose.prod.yml ps          # harus 4 container, termasuk cloudflared
docker compose -f docker-compose.prod.yml logs cloudflared --tail=15    # cari "Registered tunnel connection"
```

### 6.3 Cek

- `https://therapedia.<domain>` tampil dengan gembok HTTPS.
- `https://therapedia.<domain>/up` hijau (200).
- Setelah ini `http://IP-VPS` tidak lagi terbuka (port dikunci ke `127.0.0.1`). Memang disengaja.

| Tampilan | Penyebab | Solusi |
|---|---|---|
| `Error 1033` | Tunnel belum tersambung | Cek log `cloudflared`; token salah atau terpotong |
| `502 Bad Gateway` | URL service salah | Harus persis `web:80`, bertipe `HTTP` |
| Domain tidak ditemukan | DNS belum menyebar | Tunggu 1–2 menit; pastikan Public Hostname sudah disimpan |

Opsional: tutup port 80 di firewall (sebagai root): `ufw delete allow 80/tcp`.

---

## 7. Pemakaian sehari-hari

### Update kode

`git push` ke `main`. Otomatis: test → build → deploy (3–6 menit). Deploy hanya terpicu bila yang berubah ada di `backend/`, `frontend/`, `docker/`, atau `docker-compose.prod.yml`. Bila test gagal, deploy berhenti dan server tetap di versi lama.

### Tabel atau kolom baru

1. Buat migration **baru**: `docker compose exec app php artisan make:migration nama_migration`.
2. Coba di dev: `docker compose exec app php artisan migrate`.
3. `git push`. `migrate --force` jalan otomatis di server, dengan backup DB sebelumnya.

Aturan: **jangan mengubah migration yang sudah di-push** (buat migration baru), dan **jangan `migrate:fresh` di server**.

### Ubah env

| Yang diubah | Cara |
|---|---|
| `.env.backend` (env Laravel) | Edit di VPS, lalu jalankan perintah "Terapkan" di 6.2 (recreate + optimize). Env hanya terbaca saat container dibuat |
| `.env` (Compose, domain, Tunnel) | Edit di VPS, lalu jalankan perintah "Terapkan" di 6.2 |
| Variabel frontend `VITE_*` | Ubah di GitHub Variables, lalu **Run workflow** (ditanam saat build) |

### Seeder data awal

Sekali, setelah deploy pertama dan bila seeder sudah ada:
```bash
docker compose -f docker-compose.prod.yml exec app php artisan db:seed --force
```

### Akses MySQL di server

Port MySQL tertutup. Lewat terminal:
```bash
docker compose -f docker-compose.prod.yml exec mysql sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"'
```

### Akses MySQL dari laptop (DBeaver / MySQL Workbench)

Port MySQL di VPS hanya terbuka di `127.0.0.1:3307` (loopback), jadi dari laptop harus lewat **SSH tunnel**. Jangan membuka 3306 ke internet.

1. **Kunci SSH laptop** (sekali, PowerShell): `ssh-keygen -t ed25519 -f $HOME\.ssh	herapedia_vps`. Salin isi `therapedia_vps.pub`, lalu di VPS (root) tambahkan ke `/home/deploy/.ssh/authorized_keys` (satu baris, ditambah di baris baru).
2. **Kredensial database**: di VPS `grep -E '^MYSQL_(DATABASE|USER|PASSWORD)=' /opt/therapedia/.env`.
3. **DBeaver**: koneksi MySQL baru, tab Main: Host `127.0.0.1`, Port `3307`, Database/User/Password dari langkah 2. Tab **SSH**: centang *Use SSH Tunnel*, Host = IP VPS, Port 22, User `deploy`, Auth *Public Key*, pilih berkas `therapedia_vps` (private).
4. **MySQL Workbench**: *Connection Method* = *Standard TCP/IP over SSH*. SSH Hostname = `IP-VPS:22`, SSH Username = `deploy`, SSH Key File = `therapedia_vps`. MySQL Hostname `127.0.0.1`, Port `3307`, Username/Password dari langkah 2.

Hati-hati: ini koneksi ke database **server** dengan data nyata. Pakai untuk membaca atau memeriksa; jangan mengubah struktur tabel lewat GUI (struktur hanya lewat migration).

### Rollback

```bash
IMAGE_TAG=$(cat .deploy/previous_tag) ./docker/scripts/deploy.sh --no-migrate
```
Migrasi tidak dibatalkan otomatis; pulihkan data dari backup pre-deploy bila perlu (lihat 13-docker-deploy.md §6).

### Catatan user `deploy`

User `deploy` **tidak punya password** (login hanya lewat kunci). Untuk bekerja di VPS: login root lalu `su - deploy`.

---

## 8. Jebakan yang sudah pernah terjadi

| # | Jebakan | Pencegahan |
|---|---|---|
| 1 | Perintah `docker compose` manual gagal dengan `denied` atau `"/frontend": not found` | Selalu awali dengan `IMAGE_TAG=$(cat .deploy/current_tag)` (CI memakai tag SHA, bukan `uat`) |
| 2 | `error in libcrypto` di langkah SSH | Salin kunci private **utuh**, BEGIN dan END ikut |
| 3 | `bash: vps-setup.sh: No such file` | Nama file memakai tanda hubung; cek `ls` |
| 4 | Panel Docker Manager Hostinger: tombol **Kelola/Compose** atau banner **Deploy Traefik** | **Jangan dipakai**: menimpa konfigurasi dari CI atau berebut port 80 |
| 5 | `docker compose down -v` di server | **Jangan**: menghapus database dan bukti bayar |
| 6 | `DB_PORT=3307` di env Laravel (dev Docker) | Antar-container pakai `3306`; `3307` hanya untuk GUI di laptop |
| 7 | Mengubah `DB_PASSWORD` setelah volume MySQL terbentuk | Password hanya dipakai saat volume dibuat; tetap pakai yang lama |

---

## 9. Serah terima ke klien

Checklist bila infrastruktur dibangun dengan akunmu lalu diserahkan:

- [ ] Repo dipindah ke akun/organisasi GitHub klien; `GHCR_OWNER` diganti ke milik klien.
- [ ] **Buat ulang** kunci SSH CI (bagian 3 "Bila kunci hilang"), perbarui `VPS_SSH_KEY`, lalu hapus kunci lama dari `/home/deploy/.ssh/authorized_keys`.
- [ ] **Ganti password** database (`MYSQL_PASSWORD`, `MYSQL_ROOT_PASSWORD`, `DB_PASSWORD`) di VPS baru; atau jalankan `vps-setup.sh` di VPS klien (password acak otomatis).
- [ ] Buat Tunnel baru di akun Cloudflare klien; token lama dicabut.
- [ ] Hapus aksesmu: kolaborator GitHub, member Cloudflare, kunci SSH pribadi di VPS.
- [ ] Klien menerima: alamat aplikasi, akun master aplikasi, dan lokasi backup (`/opt/therapedia/backups`).

---

## 10. Status proyek saat ini

- Frontend masih **mode demo** (data di localStorage browser). Backend Laravel baru berisi tabel bawaan Laravel; endpoint API dan tabel domain (`schema.md`) belum dibuat.
- Langkah berikutnya: migration dari `schema.md` → endpoint API → set `VITE_DATA_SOURCE=api`.
- Tidak ada scheduler dan tidak ada queue worker. Bila nanti butuh tugas terjadwal, pakai cron VPS (`docker compose exec -T app php artisan ...`).
- Dependency `@emergentbase/visual-edits` (URL eksternal) berisiko menggagalkan build bila URL-nya mati; lihat `11-known-issues.md`.
