// Sinkronisasi data demo kredit.
// Seed demo (credits.seed.json) ditulis tangan dan tidak konsisten dengan jadwal (jumlah sesi completed, sisa paket, dan
// ledger saling berbeda; sesi terjadwal yang tanggalnya lewat otomatis dianggap completed saat dimuat). Fungsi ini
// MEMBANGUN ULANG paket + ledger tiap client dari jadwalnya sehingga: sisa paket = total - sesi yang memotong kredit,
// ledger = satu baris `used` per sesi completed (urut tanggal, FIFO antar paket), saldo rupiah = sisa x harga per sesi,
// dan `creditPackageId` tiap sesi menunjuk paket yang benar. Credit leave per paket (master `leaveQuota`) ikut dihitung: cancel
// yang "dipotong" memakai credit leave dulu (`cancel_leave`, kredit sesi utuh), habis baru `cancel_penalty`; sesi yang dibatalkan
// karena cuti Finance (`leaveId`) dicatat `off_excused`. Hanya dipakai saat memuat seed (bukan di alur aplikasi).

import { OTHER_REASON } from "./schedule";

const addDaysStr = (dateStr, n) => {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

const byDateTime = (a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`);

export function reconcileDemoCredits({ records, schedules, invoices = [], masterPackages = [], today, financeBy = "Finance", scheduleBy = "Admin Schedule" }) {
  const packageBySchedule = new Map();
  const unusedPaid = invoices.filter((i) => i.status === "paid" && (i.type || "package") === "package");

  const out = records.map((record) => {
    const mine = schedules.filter((s) => s.clientId === record.clientId && s.type === "therapy").sort(byDateTime);
    const origCancel = new Map((record.history || []).filter((h) => h.scheduleId && String(h.action).startsWith("cancel_")).map((h) => [h.scheduleId, h.action]));
    // Client yang di seed memang berkredit 0 (Frozen) tetap berkredit 0
    const frozenIntent = (record.packages || []).every((p) => !(p.remainingCredit > 0));

    // Harga & tautan invoice tiap paket: invoice lunas yang cocok (paket + jumlah sesi), selain itu harga master proporsional
    const pkgs = (record.packages || []).map((p) => {
      const idx = unusedPaid.findIndex((i) => i.clientId === record.clientId && i.packageId === p.packageId && i.credits === p.totalCredit);
      const inv = idx >= 0 ? unusedPaid.splice(idx, 1)[0] : null;
      const master = masterPackages.find((m) => m.id === p.packageId);
      const price = inv ? inv.amount : master ? Math.round((master.price * p.totalCredit) / master.credits) : p.price || null;
      return { ...p, price, leaveTotal: master?.leaveQuota != null ? master.leaveQuota : 3, ...(inv ? { invoiceId: inv.id } : {}), _used: 0, _cancels: 0, _leaveUsed: 0, _events: [] };
    });
    if (pkgs.length === 0) return record;

    const roomIdx = () => pkgs.findIndex((p) => p._used < p.totalCredit);
    const events = [];
    mine.forEach((s) => {
      const isLeaveCancel = s.status === "cancelled" && Boolean(s.leaveId); // dibatalkan karena cuti Finance
      const wantsCut = s.status === "cancelled" && !isLeaveCancel && origCancel.get(s.id) === "cancel_penalty";
      let cancelAction = s.status === "cancelled" ? (isLeaveCancel ? "off_excused" : wantsCut ? "cancel_penalty" : "cancel_excused") : null;
      if (s.status !== "completed" && !cancelAction) return;
      let i = roomIdx();
      if (i === -1 && s.status !== "completed" && !wantsCut) i = pkgs.length - 1;
      // Potong: credit leave paket dipakai lebih dulu (kredit sesi utuh), habis baru kredit sesi dipotong
      const useLeave = wantsCut && i !== -1 && pkgs[i]._leaveUsed < pkgs[i].leaveTotal;
      if (useLeave) cancelAction = "cancel_leave";
      const consumes = s.status === "completed" || (cancelAction === "cancel_penalty" && wantsCut);
      if (consumes && i === -1) return; // melebihi total kredit: tidak ada paket untuk dipotong
      if (i === -1) i = pkgs.length - 1;
      const p = pkgs[i];
      if (consumes) p._used += 1;
      if (cancelAction && !isLeaveCancel) p._cancels += 1;
      if (useLeave) p._leaveUsed += 1;
      const action = s.status === "completed" ? "used" : cancelAction;
      const ev = {
        id: `hist-${s.id}`,
        date: s.date,
        scheduleId: s.id,
        packageId: p.id,
        packageName: p.packageName,
        action,
        creditChange: consumes ? -1 : 0,
        ...(useLeave ? { leaveChange: -1 } : {}),
        cancelReason: cancelAction ? s.cancelReason || OTHER_REASON : undefined,
        cancelCountAfter: cancelAction && !isLeaveCancel ? p._cancels : undefined,
        note:
          action === "used"
            ? "Sesi terapi selesai"
            : action === "off_excused"
            ? "Sesi dibatalkan karena cuti (memotong jatah cuti); kredit sesi tidak dipotong"
            : action === "cancel_leave"
            ? `Cancel ke-${p._cancels} pada paket - memakai 1 credit leave; kredit sesi utuh`
            : action === "cancel_penalty"
            ? `Cancel ke-${p._cancels} pada paket - admin memilih potong 1 kredit`
            : `Cancel ke-${p._cancels} pada paket - admin memilih tidak potong kredit`,
        by: scheduleBy,
      };
      p._events.push(ev);
      events.push(ev);
      packageBySchedule.set(s.id, p.id);
    });

    // Paket yang masih longgar pada client berkredit 0 dipangkas sebesar yang terpakai; paket tanpa pemakaian dibuang
    let kept = pkgs;
    if (frozenIntent) {
      kept = pkgs
        .filter((p) => p._events.length > 0)
        .map((p) => {
          if (p._used >= p.totalCredit) return p;
          const total = Math.max(1, p._used);
          return {
            ...p,
            totalCredit: total,
            price: p.price ? Math.round((p.price * total) / p.totalCredit) : p.price,
            packageName: p.packageName.replace(/\(\d+x\)/, `(${total}x)`),
          };
        });
      if (kept.length === 0) return { ...record, packages: [], history: [] };
    }

    // Baris top up per paket, tepat sebelum pemakaian pertamanya
    const lastDate = events.length ? events[events.length - 1].date : addDaysStr(today, -7);
    const renewals = kept.map((p, i) => {
      const first = p._events[0]?.date;
      const date = first ? addDaysStr(first, -1) : i === 0 ? addDaysStr(lastDate, -7) : lastDate;
      return {
        id: `hist-top-${p.id}`,
        date,
        scheduleId: null,
        packageId: p.id,
        packageName: p.packageName,
        action: "renewed",
        creditChange: p.totalCredit,
        note: i === 0 ? "Aktivasi paket awal oleh Finance" : "Renewal kredit oleh Finance",
        by: financeBy,
        _order: first ? 0 : 2, // top up tanpa pemakaian diurutkan setelah sesi di tanggal yang sama
      };
    });

    const keptIds = new Set(kept.map((p) => p.id));
    const history = [...renewals, ...events.map((e) => ({ ...e, _order: 1 }))]
      .filter((h) => keptIds.has(h.packageId))
      .sort((a, b) => a.date.localeCompare(b.date) || a._order - b._order)
      .map(({ _order, ...h }) => h);

    const packages = kept.map(({ _used, _cancels, _leaveUsed, _events, ...p }) => {
      const remaining = Math.max(0, p.totalCredit - _used);
      return { ...p, remainingCredit: remaining, cancelCount: _cancels, leaveUsed: _leaveUsed, status: remaining > 0 ? "active" : "depleted" };
    });

    // Sesi lain (terjadwal / pindah / menggantung) menunjuk paket aktif tertua, atau paket terakhir bila semua habis
    const active = packages.find((p) => p.remainingCredit > 0) || packages[packages.length - 1];
    const validIds = new Set(packages.map((p) => p.id));
    mine.forEach((s) => {
      if (!validIds.has(packageBySchedule.get(s.id))) packageBySchedule.set(s.id, active.id);
    });

    return { ...record, packages, history };
  });

  return { records: out, packageBySchedule };
}
