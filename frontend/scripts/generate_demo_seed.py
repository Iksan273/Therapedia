#!/usr/bin/env python3
"""Generator data demo Therapedia (deterministik).

Menulis ulang:
  - src/data/clients.seed.json    (klien inti c-009..c-032 dipertahankan, ditambah klien baru)
  - src/data/schedules.seed.json  (jadwal 9 minggu ke belakang s/d 2 minggu ke depan)
  - src/data/credits.seed.json    (paket, riwayat kredit, invoice yang konsisten dengan jadwal)

Semua tanggal bersifat RELATIF terhadap hari ini (diselesaikan oleh src/data/seedLoader.js):
  jadwal   -> _weekOffset + _dayOfWeek
  klien    -> _createdDaysAgo / _joinMonthsAgo / _dischargeMonthsAgo
  invoice  -> _issuedDaysAgo / _paidDaysAgo / _seq
  riwayat  -> scheduleId (tanggal ikut jadwal) atau _daysAgo

Jalankan ulang kapan saja (idempoten):  python frontend/scripts/generate_demo_seed.py
"""
import copy
import json
import os
import random

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.normpath(os.path.join(HERE, "..", "src", "data"))
R = random.Random(20261001)

BR = {"timur": "branch-sby-timur", "citraland": "branch-citraland", "barat": "branch-sby-barat"}
THERAPISTS = {
    "branch-sby-timur": ["t-001", "t-003", "t-007"],
    "branch-citraland": ["t-002", "t-006", "t-008"],
    "branch-sby-barat": ["t-004", "t-005"],
}
PKG = {
    "reguler": {"packageId": "pkg-reguler", "name": "Regular Therapist (10x)", "invoiceName": "Regular Therapist (10 Sesi)", "credits": 10, "price": 2500000},
    "intensif": {"packageId": "pkg-sensory-intensive", "name": "Paket Sensori Intensif (15x)", "invoiceName": "Paket Sensori Intensif (15 Sesi)", "credits": 15, "price": 4200000},
    "vip": {"packageId": "pkg-vip", "name": "Senior Therapist (10x)", "invoiceName": "Senior Therapist (10 Sesi)", "credits": 10, "price": 3500000},
    "vip5": {"packageId": "pkg-vip", "name": "Senior Therapist (5x)", "invoiceName": "Senior Therapist (5 Sesi)", "credits": 5, "price": 1800000},
    "konsul": {"packageId": "pkg-consult", "name": "Paket Konsultasi", "invoiceName": "Paket Konsultasi", "credits": 1, "price": 500000},
}
PROOF = "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&q=80&w=400"

CANCEL_REASONS = (["sakit"] * 40 + ["izin_keluarga"] * 25 + ["bentrok_sekolah"] * 15 + ["tanpa_kabar"] * 12 + ["lainnya"] * 8)
DROPPED = "reschedule_dibatalkan"  # dibatalkan dari reschedule menggantung (tanpa potong kredit)
CANCEL_LABEL = {"sakit": "Sakit", "izin_keluarga": "Izin Keluarga", "bentrok_sekolah": "Bentrok Sekolah", "tanpa_kabar": "Tanpa Kabar", "lainnya": "Lainnya"}

ACTIVITY = [
    "Latihan integrasi sensori dengan tactile bin (beras warna dan sensory sand). Anak mulai mentoleransi tekstur basah selama 10-15 menit.",
    "Sirkuit gross motor: balance beam, jumping pad, dan crawling tunnel. Koordinasi bilateral meningkat dibanding sesi sebelumnya.",
    "Aktivitas fine motor: meronce manik besar dan menggunting garis lurus. Genggaman pensil masih perlu penguatan.",
    "Terapi vestibular dengan ayunan terapeutik (linear swing) dilanjutkan deep pressure untuk regulasi emosi.",
    "Latihan motor planning melalui obstacle course 5 stasiun. Anak mampu mengingat urutan 4 dari 5 langkah.",
    "Permainan turn-taking dan joint attention memakai balok susun. Kontak mata spontan meningkat saat bermain.",
    "Oral motor play: meniup gelembung, sedotan, dan makanan bertekstur. Penolakan terhadap tekstur crunchy berkurang.",
    "Latihan visual motor: menyalin pola garis dan bentuk geometri sederhana di papan magnet.",
    "Aktivitas proprioseptif: wall push-up, carrying beban ringan, dan animal walk sebelum sesi meja.",
    "Latihan self-care: melepas dan memakai jaket dengan kancing besar secara mandiri dengan bantuan verbal minimal.",
]
NOTES = [
    "Anak kooperatif dan antusias. Durasi atensi meningkat menjadi sekitar 8 menit per aktivitas.",
    "Sempat menolak transisi antar aktivitas, membaik setelah diberi visual schedule.",
    "Regulasi emosi lebih stabil. Tidak terjadi tantrum selama sesi.",
    "Terlihat lelah di awal sesi, performa membaik setelah aktivitas proprioseptif.",
    "Respons terhadap instruksi dua langkah konsisten. Perlu penguatan untuk instruksi tiga langkah.",
    "Menunjukkan inisiatif memilih aktivitas sendiri dan meminta bantuan dengan kata.",
    "Sensitif terhadap suara keras dari ruangan sebelah, ditangani dengan jeda dan headphone peredam.",
    "Kemajuan jelas pada koordinasi mata-tangan. Target pekan depan: menaikkan kompleksitas pola.",
]
HOMEWORK = [
    "Bermain playdough 10 menit setiap sore sebelum mandi.",
    "Latihan meniup gelembung dan sedotan 5 menit sebelum makan.",
    "Ajak anak membantu pekerjaan rumah ringan (membawa piring plastik, menyapu) 10 menit per hari.",
    "Latihan menggunting kertas bergaris 5 menit, 3 kali sepekan.",
    "Bermain lompat dua kaki di area aman 10 menit setiap pagi.",
    "Baca buku bergambar bersama sambil meminta anak menunjuk gambar yang disebut.",
    "Terapkan jadwal visual sederhana untuk rutinitas pagi dan malam.",
]

NEW_CLIENTS = {
    "timur": [
        ("Nathaniel Aditya", "Budi Aditya"), ("Queenara Zivanna", "Rina Zivanna"), ("Orlando Pramono", "Hadi Pramono"),
        ("Salsabila Nur", "Dewi Nur"), ("Tristan Mahendra", "Agus Mahendra"), ("Vanessa Laurent", "Mira Laurent"),
        ("Zidane Alfarizi", "Faisal Alfarizi"), ("Ghea Anindya", "Sari Anindya"), ("Hanif Ramadhan", "Yusuf Ramadhan"),
    ],
    "citraland": [
        ("Bryan Setiawan", "Hendri Setiawan"), ("Chika Amelia", "Lina Amelia"), ("Dewangga Putra", "Rudi Putra"),
        ("Evelyn Tanoto", "Susan Tanoto"), ("Farrel Hakim", "Rizal Hakim"), ("Gladys Maharani", "Tuti Maharani"),
        ("Harvey Wijaya", "Johan Wijaya"), ("Isabella Sutanto", "Meiliana Sutanto"), ("Joshua Kurniawan", "Andi Kurniawan"),
    ],
    "barat": [
        ("Kayla Safira", "Dian Safira"), ("Louis Hartono", "Eko Hartono"), ("Maheswari Ayu", "Wulan Ayu"),
        ("Nicholas Gunadi", "Steven Gunadi"), ("Olivia Prasetyo", "Retno Prasetyo"), ("Pandu Wibowo", "Slamet Wibowo"),
        ("Qiana Rahmawati", "Siti Rahmawati"), ("Rafael Susanto", "Dedi Susanto"), ("Samuel Tjahjadi", "Alex Tjahjadi"),
    ],
}
# 8 pertama tiap cabang: urutan status; yang ke-9 = discharged
STATUS_SEQ = ["admitted", "admitted", "admitted", "admitted", "inquiry", "service_selected", "assessment_scheduled"]
EXTRA_STATUS = {"timur": "assessment_done", "citraland": "done_consult", "barat": "discontinued"}
CODE_BASE = {"timur": 1010, "citraland": 2010, "barat": 3010}


def load(name):
    with open(os.path.join(DATA, name), encoding="utf-8") as f:
        return json.load(f)


def save(name, data):
    with open(os.path.join(DATA, name), "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")


def branch_short(bid):
    return {"branch-sby-timur": "timur", "branch-citraland": "citraland", "branch-sby-barat": "barat"}[bid]


# ---------------------------------------------------------------- klien
clients_all = load("clients.seed.json")
core = [c for c in clients_all if int(c["id"].split("-")[1]) <= 32]
for c in core:
    for k in ("_createdDaysAgo", "_joinMonthsAgo", "_dischargeMonthsAgo", "_birthdayThisMonth", "dateOfDischarge", "dateOfJoin"):
        c.pop(k, None)

answer_template = None
for c in core:
    if c["id"] == "c-010":
        answer_template = copy.deepcopy(c.get("assessmentAnswers", []))


def make_new_client(idx, branch_key, child, parent, status):
    bid = BR[branch_key]
    cid = f"c-{33 + idx:03d}"
    code_no = CODE_BASE[branch_key]
    CODE_BASE[branch_key] += 1
    first = child.split()[0].lower()
    last = parent.split()[-1].lower()
    year = R.choice([2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023])
    c = {
        "id": cid,
        "clientName": child,
        "dob": f"{year}-{R.randint(1, 12):02d}-{R.randint(1, 28):02d}",
        "parentName": parent,
        "parentContact": "08" + "".join(str(R.randint(0, 9)) for _ in range(10)),
        "parentEmail": f"{parent.split()[0].lower()}.{last}@gmail.com",
        "clientCode": f"CODE-{code_no}",   # diganti kode grup di akhir skrip
        "branchId": bid,
        "status": status,
        "serviceType": "f_ota",
        "includesSchoolCompanion": False,
        "gdriveClientLink": f"https://drive.google.com/drive/folders/1{child.replace(' ', '')}Therapedia" if status not in ("inquiry",) else "",
        "assessmentCodes": [],
        "assessmentAnswers": [],
        "invoiceStatus": "unpaid",
        "serviceTypes": ["f_ota"],
    }
    roll = R.random()
    if roll < 0.2:
        c["serviceType"], c["serviceTypes"] = "b_ota", ["b_ota"]
    elif roll < 0.45:
        c["serviceTypes"] = ["f_ota", "school_companion"]
        c["includesSchoolCompanion"] = True
    if status == "done_consult":
        c["serviceType"], c["serviceTypes"] = "consult_w_report", ["consult_w_report"]
    if status in ("service_selected", "assessment_scheduled"):
        cat = R.choice([("cat-001", "Child Sensory Profile 2 (Winnie Dunn, PhD, OTR, FAOTA)"), ("cat-002", "School Companion Profile (School / Classroom Function)")])
        c["assessmentCodes"] = [{"categoryId": cat[0], "categoryName": cat[1], "code": f"ASM-{4000 + idx}", "status": "ready"}]
        c["assessmentCategoryId"], c["assessmentAccessCode"] = cat[0], f"ASM-{4000 + idx}"
    if status in ("assessment_done", "done_consult", "done_assessment") and answer_template:
        c["assessmentCodes"] = [{"categoryId": "cat-001", "categoryName": "Child Sensory Profile 2 (Winnie Dunn, PhD, OTR, FAOTA)", "code": f"ASM-{4000 + idx}", "status": "completed"}]
        c["assessmentAnswers"] = copy.deepcopy(answer_template)
        c["assessmentCategoryId"], c["assessmentAccessCode"] = "cat-001", f"ASM-{4000 + idx}"
    if status == "discontinued":
        c["notes"] = R.choice([
            "Keluarga pindah domisili ke luar kota sebelum sesi pertama.",
            "Orang tua memilih menunda asesmen karena jadwal bentrok dengan sekolah.",
            "Biaya paket dinilai belum sesuai anggaran keluarga saat ini.",
        ])
    if status == "discharged":
        c["dischargeReason"] = R.choice(["graduate", "moving", "financial"])
    return c


new_clients = []
idx = 0
for bk in ("timur", "citraland", "barat"):
    seq = STATUS_SEQ + [EXTRA_STATUS[bk]]
    people = NEW_CLIENTS[bk]
    for i, status in enumerate(seq):
        new_clients.append(make_new_client(idx, bk, people[i][0], people[i][1], status))
        idx += 1
    new_clients.append(make_new_client(idx, bk, people[8][0], people[8][1], "discharged"))
    idx += 1

clients = core + new_clients
by_id = {c["id"]: c for c in clients}

# umur akun / tanggal bergabung (hari ke belakang)
JOIN_DAYS = {}  # hanya klien aktif
CREATED = {}
admitted_ids = [c["id"] for c in clients if c["status"] == "admitted"]
spread = [14, 25, 38, 52, 66, 80, 95, 110, 128, 146, 165, 185]
R.shuffle(spread)
for n, cid in enumerate(admitted_ids):
    join = spread[n] if n < len(spread) else R.randint(20, 190)
    JOIN_DAYS[cid] = join
    CREATED[cid] = join + R.randint(5, 12)

for c in clients:
    cid, st = c["id"], c["status"]
    if cid in CREATED:
        continue
    rng = {
        "inquiry": (1, 9), "service_selected": (3, 14), "assessment_scheduled": (5, 20),
        "assessment_done": (12, 40), "done_consult": (25, 70), "done_assessment": (25, 70),
        "discontinued": (20, 120), "discharged": (200, 290),
    }[st]
    CREATED[cid] = R.randint(*rng)

for c in clients:
    c["_createdDaysAgo"] = CREATED[c["id"]]
    if c["status"] == "admitted":
        c["_joinMonthsAgo"] = max(0, round(JOIN_DAYS[c["id"]] / 30))
    if c["status"] == "discharged":
        c["_joinMonthsAgo"] = 8
        c["_dischargeMonthsAgo"] = R.randint(1, 3)

# ulang tahun bulan ini untuk beberapa klien aktif (Birthday Hub / Radar)
for cid in R.sample(admitted_ids, 4):
    by_id[cid]["_birthdayThisMonth"] = True

# ---------------------------------------------------------------- jadwal
schedules = []
sch_seq = 0
booked = set()  # (therapist, offset, day, hour)
slot_owner = set()  # (therapist, day, hour) agar slot mingguan tidak bentrok
LOAD = {}


def next_sch_id():
    global sch_seq
    sch_seq += 1
    return f"sch-g{sch_seq:04d}"


def pick_slot(bid, taken_days):
    for _ in range(200):
        # pilih terapis dengan beban slot terendah di cabang (dengan sedikit variasi acak)
        ranked = sorted(THERAPISTS[bid], key=lambda x: (LOAD.get(x, 0), R.random()))
        t = ranked[0] if R.random() < 0.8 else ranked[-1]
        day = R.choice([d for d in (1, 2, 3, 4, 5, 6) if d not in taken_days])
        hour = R.choice([8, 9, 10, 11, 13, 14, 15, 16])
        if (t, day, hour) not in slot_owner:
            slot_owner.add((t, day, hour))
            LOAD[t] = LOAD.get(t, 0) + 1
            return t, day, hour
    raise RuntimeError("tidak ada slot kosong")


def report(status):
    if status != "completed":
        return {}
    roll = R.random()
    if roll < 0.70:
        return {"activitySection": R.choice(ACTIVITY), "noteSection": R.choice(NOTES), "homeworkSection": R.choice(HOMEWORK)}
    if roll < 0.88:
        return {"activitySection": R.choice(ACTIVITY), "homeworkSection": R.choice(HOMEWORK)}
    return {}


TODAY_WD = 4  # patokan: hari ini Kamis. Sesi minggu ini sebelum hari ini dianggap selesai.

CLIENT_SESSIONS = {}  # cid -> list sesi terapi (urut waktu)
HEAVY_CANCEL = set(R.sample(admitted_ids, 3))  # klien dengan banyak pembatalan (lewat kuota)

for cid in admitted_ids:
    c = by_id[cid]
    bid = c["branchId"]
    join_weeks = JOIN_DAYS[cid] // 7
    start_off = -min(9, join_weeks)
    n_slots = 1 if R.random() < 0.65 else 2
    taken = set()
    slots = []
    for _ in range(n_slots):
        t, d, h = pick_slot(bid, taken)
        taken.add(d)
        slots.append((t, d, h))
    sess = []
    for off in range(start_off, 3):
        for (t, d, h) in slots:
            if off == start_off and join_weeks < 9 and off < 0 and d < 2 and R.random() < 0.3:
                continue
            p_cancel = 0.5 if cid in HEAVY_CANCEL else 0.10
            if off < 0 or (off == 0 and d < TODAY_WD):
                roll = R.random()
                if roll < p_cancel:
                    status, reason = "cancelled", R.choice(CANCEL_REASONS)
                elif off < 0 and cid not in HEAVY_CANCEL and roll > 0.985:
                    status, reason = "cancelled", DROPPED
                else:
                    status, reason = "completed", None
            else:
                roll = R.random()
                if roll < 0.04:
                    status, reason = "cancelled", R.choice(CANCEL_REASONS)
                elif roll < 0.10:
                    status, reason = "reschedule_pending", None
                elif roll < 0.18:
                    status, reason = "rescheduled", None
                else:
                    status, reason = "scheduled", None
            s = {
                "id": next_sch_id(), "branchId": bid, "clientId": cid, "creditPackageId": None, "type": "therapy",
                "therapistId": t, "_weekOffset": off, "_dayOfWeek": d, "startTime": f"{h:02d}:00", "endTime": f"{h + 1:02d}:00",
                "status": status, "isRecurring": True, "recurrenceRule": "weekly", "cancelReason": reason,
            }
            s.update(report(status))
            if status == "reschedule_pending":
                s["pendingReason"] = R.choice(CANCEL_REASONS)
                s["pendingNote"] = R.choice([None, None, "Ortu minta jadwal pekan depan, menunggu konfirmasi hari.", "Menunggu kabar dari orang tua soal hari pengganti.", "Anak sedang kurang sehat, jadwal pengganti disepakati menyusul."])
                s["_markedDaysAgo"] = R.randint(0, 4)
            elif status == "rescheduled":
                s["_needsMove"] = True
                s["_markedDaysAgo"] = R.randint(0, 4)
            sess.append(s)
    sess.sort(key=lambda s: (s["_weekOffset"], s["_dayOfWeek"], s["startTime"]))
    CLIENT_SESSIONS[cid] = sess

# pastikan minggu ini punya contoh sesi yang sudah dipindah (supaya penanda & jejak jadwal asal terlihat di kalender)
_moved_now = sum(1 for lst in CLIENT_SESSIONS.values() for s in lst if s["status"] == "rescheduled" and s["_weekOffset"] == 0)
if _moved_now < 2:
    cands = [s for lst in CLIENT_SESSIONS.values() for s in lst if s["status"] == "scheduled" and s["_weekOffset"] == 0 and s["_dayOfWeek"] >= TODAY_WD]
    for s in cands[: 2 - _moved_now]:
        s["status"] = "rescheduled"
        s["_needsMove"] = True
        s["_markedDaysAgo"] = R.randint(0, 3)

# pindahkan sesi "rescheduled" ke slot baru pada minggu yang sama; simpan jejak jadwal asal
occupied = set()
for lst in CLIENT_SESSIONS.values():
    for s in lst:
        if s["status"] not in ("cancelled", "reschedule_pending"):
            occupied.add((s["therapistId"], s["_weekOffset"], s["_dayOfWeek"], s["startTime"]))
for lst in CLIENT_SESSIONS.values():
    for s in lst:
        if not s.pop("_needsMove", False):
            continue
        origin = {"_weekOffset": s["_weekOffset"], "_dayOfWeek": s["_dayOfWeek"], "startTime": s["startTime"], "endTime": s["endTime"], "therapistId": s["therapistId"]}
        occupied.discard((s["therapistId"], s["_weekOffset"], s["_dayOfWeek"], s["startTime"]))
        for _ in range(60):
            d2 = R.choice([d for d in (1, 2, 3, 4, 5, 6) if d != origin["_dayOfWeek"]])
            if s["_weekOffset"] == 0 and d2 < TODAY_WD:
                continue
            h2 = R.choice([8, 9, 10, 11, 13, 14, 15, 16])
            t2 = s["therapistId"]
            if (t2, s["_weekOffset"], d2, f"{h2:02d}:00") not in occupied:
                s["_dayOfWeek"], s["startTime"], s["endTime"] = d2, f"{h2:02d}:00", f"{h2 + 1:02d}:00"
                occupied.add((t2, s["_weekOffset"], d2, s["startTime"]))
                break
        s["_movedFrom"] = origin

# asesmen: terjadwal (minggu ini/depan) & selesai (1-2 minggu lalu)
assess = []
for c in clients:
    bid = c["branchId"]
    if c["status"] == "assessment_scheduled":
        t = R.choice(THERAPISTS[bid])
        for _ in range(50):
            day, hour, off = R.choice([4, 5, 6]), R.choice([9, 10, 11, 13, 14]), R.choice([0, 1])
            if (t, off, day, hour) not in booked and (t, day, hour) not in slot_owner:
                booked.add((t, off, day, hour))
                break
        assess.append({"id": next_sch_id(), "branchId": bid, "clientId": c["id"], "creditPackageId": None, "type": "assessment", "therapistId": t,
                       "_weekOffset": off, "_dayOfWeek": day, "startTime": f"{hour:02d}:00", "endTime": f"{hour + 1:02d}:00", "status": "scheduled",
                       "isRecurring": False, "recurrenceRule": None, "cancelReason": None})
    elif c["status"] in ("assessment_done", "done_assessment"):
        t = R.choice(THERAPISTS[bid])
        day, hour, off = R.choice([1, 2, 3]), R.choice([9, 10, 11, 13]), R.choice([-1, -2])
        s = {"id": next_sch_id(), "branchId": bid, "clientId": c["id"], "creditPackageId": None, "type": "assessment", "therapistId": t,
             "_weekOffset": off, "_dayOfWeek": day, "startTime": f"{hour:02d}:00", "endTime": f"{hour + 1:02d}:00", "status": "completed",
             "isRecurring": False, "recurrenceRule": None, "cancelReason": None}
        s.update({"activitySection": "Asesmen klinis menyeluruh dan observasi bermain terstruktur. Skor sensori dan atensi terpetakan pada dokumen asesmen.",
                  "noteSection": "Anak kooperatif selama asesmen. Rekomendasi program terapi disampaikan kepada orang tua.",
                  "homeworkSection": "Observasi respons anak terhadap suara dan tekstur di rumah, catat dalam jurnal sederhana."})
        assess.append(s)

# ---------------------------------------------------------------- kredit
records = []
invoices = []
inv_seq = 0
hist_seq = 0


def new_inv_id():
    global inv_seq
    inv_seq += 1
    return inv_seq


FROZEN_TARGET = set(R.sample(admitted_ids, 4))
LOW_TARGET = set(R.sample([x for x in admitted_ids if x not in FROZEN_TARGET], 5))
VIP_CLIENTS = set(R.sample(admitted_ids, 7))

for cid in admitted_ids:
    c = by_id[cid]
    sess = CLIENT_SESSIONS[cid]
    join = JOIN_DAYS[cid]
    # urutan konsumsi kredit dalam jendela
    cancels_prior = R.randint(0, 2) if join > 70 else 0
    cancel_no = cancels_prior
    events = []  # (sesi, aksi, kredit_terpakai)
    for s in sess:
        if s["status"] == "completed":
            events.append((s, "used", 1))
        elif s["status"] == "cancelled" and s["cancelReason"] != DROPPED:
            cancel_no += 1
            events.append((s, "cancel_penalty" if cancel_no > 3 else "cancel_excused", 1 if cancel_no > 3 else 0))
    used_window = sum(e[2] for e in events)

    T = 0 if cid in FROZEN_TARGET else (R.choice([1, 2]) if cid in LOW_TARGET else R.randint(3, 9))
    is_vip = cid in VIP_CLIENTS
    sizes_keys = []
    total = 0
    while total < used_window + T or not sizes_keys:
        remaining_need = used_window + T - total
        last = False
        if is_vip and remaining_need <= 10 and T <= 5 and remaining_need > 0:
            key = "vip5" if remaining_need <= 5 else "vip"
            last = True
        elif remaining_need >= 12 and R.random() < 0.18:
            key = "intensif"
        else:
            key = "reguler"
        sizes_keys.append(key)
        total += PKG[key]["credits"]
        if last:
            break
    # jika paket terakhir vip lebih kecil dari T, tambah reguler
    while total < used_window + T:
        sizes_keys.append("reguler")
        total += PKG["reguler"]["credits"]
    prior_used = total - used_window - T
    consumed_total = prior_used + used_window

    # alokasi konsumsi ke paket
    packages = []
    cum = 0
    for i, key in enumerate(sizes_keys):
        size = PKG[key]["credits"]
        consumed = max(0, min(size, consumed_total - cum))
        packages.append({
            "id": f"cp-{cid[2:]}-{i + 1}", "packageId": PKG[key]["packageId"], "packageName": PKG[key]["name"],
            "totalCredit": size, "remainingCredit": size - consumed, "cancelCount": 0,
            "status": "active" if size - consumed > 0 else "completed", "_key": key, "_start": cum,
        })
        cum += size

    def pkg_index_for_position(pos):
        acc = 0
        for i, p in enumerate(packages):
            acc += p["totalCredit"]
            if pos < acc:
                return i
        return len(packages) - 1

    # riwayat
    history = []
    pos = prior_used  # posisi konsumsi berikutnya
    # paket terakhir aktif untuk sesi mendatang
    active_pkg = next((p for p in reversed(packages) if p["remainingCredit"] > 0), None)
    for s, action, credit in events:
        pi = pkg_index_for_position(pos if credit else max(0, pos - 1)) if credit else pkg_index_for_position(max(0, pos))
        pk = packages[min(pi, len(packages) - 1)]
        s["creditPackageId"] = pk["id"]
        hist_seq += 1
        entry = {"id": f"hist-g{hist_seq:04d}", "scheduleId": s["id"], "packageId": pk["id"], "packageName": pk["packageName"], "action": action,
                 "creditChange": -credit}
        if action == "used":
            entry["note"] = "Sesi terapi selesai"
        else:
            entry["cancelReason"] = s["cancelReason"]
            if action == "cancel_excused":
                pk["cancelCount"] += 1
                entry["note"] = f"Cancel ke-{cancels_prior + sum(1 for h in history if h['action'].startswith('cancel')) + 1} ({CANCEL_LABEL[s['cancelReason']]})"
            else:
                pk["cancelCount"] += 1
                entry["note"] = f"Cancel ke-{cancels_prior + sum(1 for h in history if h['action'].startswith('cancel')) + 1} (>3x) - Penalti memotong 1 kredit"
        history.append(entry)
        pos += credit
    # sesi mendatang -> paket aktif (atau kosong bila Frozen)
    for s in sess:
        if s["status"] in ("scheduled", "rescheduled", "reschedule_pending"):
            s["creditPackageId"] = active_pkg["id"] if active_pkg else None

    # invoice + riwayat pembelian tiap paket
    window_start_days = 7 * (-min(9, join // 7)) * -1  # hari ke belakang saat awal jendela jadwal
    for i, p in enumerate(packages):
        if i == 0:
            days = join
        elif p["_start"] < prior_used:
            frac = p["_start"] / max(1, prior_used)
            days = max(8, round(join - frac * max(0, join - window_start_days)))
        else:
            ev_i = p["_start"] - prior_used
            consuming = [e for e in events if e[2]]
            if ev_i < len(consuming):
                sch = consuming[ev_i][0]
                days = max(2, 7 * (-sch["_weekOffset"]) + (TODAY_WD - sch["_dayOfWeek"]) + 3)
            else:
                days = 3
        p["_days"] = days
        iid = new_inv_id()
        key = p["_key"]
        invoices.append({
            "id": f"inv-g{iid:03d}", "_seq": iid, "clientId": cid, "clientName": c["clientName"], "branchId": c["branchId"],
            "packageId": PKG[key]["packageId"], "packageName": PKG[key]["invoiceName"], "credits": p["totalCredit"], "amount": PKG[key]["price"],
            "status": "paid", "proofUrl": PROOF, "_issuedDaysAgo": days, "_paidDaysAgo": max(0, days - 1),
        })
        hist_seq += 1
        history.append({"id": f"hist-g{hist_seq:04d}", "scheduleId": None, "packageId": p["id"], "packageName": p["packageName"], "action": "renewed",
                        "creditChange": p["totalCredit"], "note": f"Pembayaran INV diverifikasi Finance (+{p['totalCredit']} kredit)", "_daysAgo": max(0, days - 1)})

    cancel_total = cancels_prior + sum(1 for e in events if e[1].startswith("cancel"))
    records.append({"id": f"cr-g{cid[2:]}", "clientId": cid, "branchId": c["branchId"], "packages": [{k: v for k, v in p.items() if not k.startswith("_")} for p in packages],
                    "history": history})

# invoice menunggu verifikasi / belum dibayar (antrean Finance)
needs_renewal = [cid for cid in admitted_ids if cid in FROZEN_TARGET or cid in LOW_TARGET]
R.shuffle(needs_renewal)
pending_with_proof = needs_renewal[:5]
pending_no_proof = needs_renewal[5:8]
for cid in pending_with_proof + pending_no_proof:
    c = by_id[cid]
    key = "reguler"
    iid = new_inv_id()
    has_proof = cid in pending_with_proof
    invoices.append({
        "id": f"inv-g{iid:03d}", "_seq": iid, "clientId": cid, "clientName": c["clientName"], "branchId": c["branchId"],
        "packageId": PKG[key]["packageId"], "packageName": PKG[key]["invoiceName"], "credits": 10, "amount": PKG[key]["price"],
        "status": "unpaid", "proofUrl": PROOF if has_proof else None, "_issuedDaysAgo": R.randint(1, 5) if has_proof else R.randint(3, 14), "_paidDaysAgo": None,
    })
    c["invoiceStatus"] = "unpaid"

# invoice konsultasi/asesmen untuk klien non-aktif
for c in clients:
    if c["status"] in ("done_consult",):
        iid = new_inv_id()
        invoices.append({"id": f"inv-g{iid:03d}", "_seq": iid, "clientId": c["id"], "clientName": c["clientName"], "branchId": c["branchId"],
                         "packageId": "pkg-consult", "packageName": "Paket Konsultasi", "credits": 1, "amount": 500000, "status": "paid",
                         "proofUrl": PROOF, "_issuedDaysAgo": max(2, CREATED[c["id"]] - 5), "_paidDaysAgo": max(1, CREATED[c["id"]] - 6)})
        c["invoiceStatus"] = "paid"
    elif c["status"] == "assessment_scheduled":
        iid = new_inv_id()
        invoices.append({"id": f"inv-g{iid:03d}", "_seq": iid, "clientId": c["id"], "clientName": c["clientName"], "branchId": c["branchId"],
                         "packageId": "pkg-consult", "packageName": "Paket Konsultasi", "credits": 1, "amount": 500000, "status": "unpaid",
                         "proofUrl": None, "_issuedDaysAgo": R.randint(1, 6), "_paidDaysAgo": None})

for c in clients:
    if c["status"] == "admitted":
        unpaid = any(i["clientId"] == c["id"] and i["status"] != "paid" for i in invoices)
        c["invoiceStatus"] = "unpaid" if unpaid else "paid"

# susun jadwal akhir
for cid in admitted_ids:
    schedules.extend(CLIENT_SESSIONS[cid])
schedules.extend(assess)
schedules.sort(key=lambda s: (s["_weekOffset"], s["_dayOfWeek"], s["startTime"]))

# ---------------------------------------------------------------- simpan
credits = load("credits.seed.json")
credits["records"] = records
credits["invoices"] = sorted(invoices, key=lambda i: -i["_issuedDaysAgo"])
# Kode client: grup 2 huruf dari huruf pertama nama (A-E=AE, F-J=FJ, K-O=KO, P-T=PT, U-Z=UZ) + counter 5 digit per grup,
# urut sesuai urutan klien (sama dengan domain/client.js `nextClientCode`).
import unicodedata

_GROUPS = ["AE", "FJ", "KO", "PT", "UZ"]
_counter = {g: 0 for g in _GROUPS}
for c in clients:
    letters = [ch for ch in unicodedata.normalize("NFD", c["clientName"]).upper() if "A" <= ch <= "Z"]
    g = _GROUPS[min((ord(letters[0] if letters else "A") - 65) // 5, 4)]
    _counter[g] += 1
    c["clientCode"] = f"{g}-{_counter[g]:05d}"
save("clients.seed.json", clients)
save("schedules.seed.json", schedules)
save("credits.seed.json", credits)

# ringkasan
from collections import Counter

print("klien      :", len(clients), dict(Counter(c["status"] for c in clients)))
print("jadwal     :", len(schedules), dict(Counter(s["status"] for s in schedules)))
print("invoice    :", len(invoices), dict(Counter(i["status"] for i in invoices)), "dengan bukti belum lunas:", sum(1 for i in invoices if i["status"] != "paid" and i["proofUrl"]))
rem = [r for r in records]
print("kredit     : frozen", sum(1 for r in rem if sum(p["remainingCredit"] for p in r["packages"]) == 0),
      "| menipis", sum(1 for r in rem if 0 < sum(p["remainingCredit"] for p in r["packages"]) <= 2),
      "| lewat kuota cancel", sum(1 for r in rem if max((p["cancelCount"] for p in r["packages"]), default=0) > 3))
print("terapis    :", dict(Counter(s["therapistId"] for s in schedules)))
