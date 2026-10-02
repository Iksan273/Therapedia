import { format, subDays } from "date-fns";
import { buildAuditEntry } from "@/domain/audit";
import { cancelReasonLabel } from "@/domain/schedule";
import { dischargeReasonLabel } from "@/domain/client";

// Generator audit log demo. Diturunkan dari seed lain (client, sesi, invoice, staf) supaya
// nama & angka konsisten dengan halaman lain. Semua waktu relatif terhadap `now`.
// Pure: input data seed yang sudah dimuat, output array entri (terbaru dulu).

const WINDOW_DAYS = 45;
const LOGIN_DAYS = 7;
const MASTER = { type: "user", id: "usr-master", name: "Master Administrator", role: "master" };
const AGENTS = ["Chrome 129 / Windows 11", "Chrome 129 / macOS", "Safari 18 / iPadOS", "Edge 129 / Windows 10"];

const BRANCH_NET = { "branch-sby-timur": 11, "branch-citraland": 12, "branch-sby-barat": 13 };

export function buildAuditSeed({ clients, schedules, credits, therapists, staff, now = new Date() }) {
  const cutoff = subDays(now, WINDOW_DAYS);
  const inWindow = (d) => d && !Number.isNaN(d.getTime()) && d >= cutoff && d <= now;
  const clientMap = new Map(clients.map((c) => [c.id, c]));
  const therapistName = (id) => therapists.find((t) => t.id === id)?.name || id;

  // Pelaku per cabang: role yang diminta, fallback manager cabang itu
  const actorFor = (branchId, roles) => {
    const u =
      staff.find((s) => s.branchId === branchId && roles.includes(s.role)) ||
      staff.find((s) => s.branchId === branchId && s.role === "manager");
    return u ? { type: "user", id: u.id, name: u.name, role: u.role } : MASTER;
  };
  const therapistActor = (therapistId) => {
    const u = staff.find((s) => s.therapistId === therapistId);
    return u ? { type: "user", id: u.id, name: u.name, role: "therapist" } : null;
  };

  const at = (date, time = "09:00", plusMin = 0) => {
    const d = new Date(`${date}T${time}:00`);
    d.setMinutes(d.getMinutes() + plusMin);
    return d;
  };

  const entries = [];
  let seq = 0;
  const push = ({ occurredAt, branchId, ...fields }) => {
    seq += 1;
    const net = BRANCH_NET[branchId] || 10;
    const entry = buildAuditEntry({
      ...fields,
      branchId,
      id: `aud-s${String(seq).padStart(5, "0")}`,
      occurredAt: occurredAt.toISOString(),
      ipAddress: fields.actor?.type === "user" ? `10.20.${net}.${(seq % 200) + 20}` : `114.79.${net}.${(seq % 200) + 10}`,
      userAgent: AGENTS[seq % AGENTS.length],
    });
    entries.push(entry);
    return entry;
  };
  let batchSeq = 0;
  const batch = () => `bat-s${String(++batchSeq).padStart(4, "0")}`;

  const sessionLabel = (s, client) => `Sesi ${client.clientName} • ${format(new Date(`${s.date}T00:00:00`), "dd/MM")} ${s.startTime}`;
  const sessionBase = (s, client, actor) => ({
    actor,
    branchId: s.branchId,
    entityType: "schedule",
    entityId: s.id,
    entityLabel: sessionLabel(s, client),
    subjectType: "client",
    subjectId: client.id,
    subjectLabel: client.clientName,
  });

  // --- Sesi: completed, cancelled, rescheduled, pending, laporan
  schedules.forEach((s, idx) => {
    const client = clientMap.get(s.clientId);
    if (!client) return;
    const admin = actorFor(s.branchId, ["admin_schedule"]);

    if (s.status === "completed") {
      const t = at(s.date, s.endTime, 12);
      if (!inWindow(t)) return;
      const therapist = therapistActor(s.therapistId);
      if (therapist && s.activitySection && idx % 2 === 0) {
        push({
          ...sessionBase(s, client, therapist),
          occurredAt: at(s.date, s.endTime, 4),
          action: "schedule.report_saved",
          newValues: { activitySection: "terisi", noteSection: s.noteSection ? "terisi" : "kosong", homeworkSection: s.homeworkSection ? "terisi" : "kosong" },
        });
      }
      const b = batch();
      push({
        ...sessionBase(s, client, admin),
        occurredAt: t,
        batchId: b,
        action: "schedule.completed",
        oldValues: { status: "scheduled" },
        newValues: { status: "completed" },
        meta: { therapist: therapistName(s.therapistId), type: s.type, ...(s.type === "therapy" ? { creditChange: -1 } : {}) },
      });
      if (s.type === "therapy") {
        push({
          ...sessionBase(s, client, admin),
          occurredAt: t,
          batchId: b,
          action: "credit.used",
          entityType: "credit_ledger",
          entityId: `led-${s.id}`,
          entityLabel: `Kredit ${client.clientName}`,
          meta: { creditChange: -1, scheduleId: s.id },
        });
      }
      return;
    }

    if (s.status === "cancelled") {
      const t = at(s.date, s.startTime, -95);
      if (!inWindow(t)) return;
      const neutral = s.cancelReason === "reschedule_dibatalkan";
      const b = batch();
      push({
        ...sessionBase(s, client, admin),
        occurredAt: t,
        batchId: b,
        action: neutral ? "schedule.pending_dropped" : "schedule.cancelled",
        oldValues: { status: neutral ? "reschedule_pending" : "scheduled" },
        newValues: { status: "cancelled", cancelReason: s.cancelReason || "lainnya" },
        reason: cancelReasonLabel(s.cancelReason),
      });
      if (!neutral) {
        push({
          ...sessionBase(s, client, admin),
          occurredAt: t,
          batchId: b,
          action: "credit.cancel_excused",
          entityType: "credit_ledger",
          entityId: `led-c-${s.id}`,
          entityLabel: `Kredit ${client.clientName}`,
          meta: { creditChange: 0, cancelReason: s.cancelReason || "lainnya" },
        });
      }
      return;
    }

    if (s.status === "rescheduled" && s.rescheduledFrom) {
      const t = new Date(s.rescheduledAt);
      if (!inWindow(t)) return;
      const from = s.rescheduledFrom;
      push({
        ...sessionBase(s, client, admin),
        occurredAt: t,
        action: "schedule.rescheduled",
        oldValues: { date: from.date, startTime: from.startTime, therapist: therapistName(from.therapistId) },
        newValues: { date: s.date, startTime: s.startTime, therapist: therapistName(s.therapistId) },
      });
      return;
    }

    if (s.status === "reschedule_pending") {
      const t = new Date(s.pendingAt);
      if (!inWindow(t)) return;
      push({
        ...sessionBase(s, client, admin),
        occurredAt: t,
        action: "schedule.marked_pending",
        oldValues: { status: "scheduled" },
        newValues: { status: "reschedule_pending" },
        reason: [cancelReasonLabel(s.pendingReason), s.pendingNote].filter(Boolean).join(" — ") || null,
      });
    }
  });

  // --- Contoh pembatalan aksi (revert) per cabang: completed salah klik & cancel yang ditarik kembali
  const branches = [...new Set(schedules.map((s) => s.branchId))];
  branches.forEach((branchId, bIdx) => {
    const candidates = schedules.filter((s) => s.branchId === branchId && s.status === "scheduled" && s.type === "therapy" && clientMap.has(s.clientId));
    const admin = actorFor(branchId, ["admin_schedule"]);
    const manager = actorFor(branchId, ["manager"]);

    const s1 = candidates[0];
    if (s1) {
      const client = clientMap.get(s1.clientId);
      const t = subDays(now, 2 + bIdx);
      t.setHours(10, 14 + bIdx, 0, 0);
      const b1 = batch();
      const done = push({
        ...sessionBase(s1, client, admin),
        occurredAt: t,
        batchId: b1,
        action: "schedule.completed",
        oldValues: { status: "scheduled" },
        newValues: { status: "completed" },
        meta: { therapist: therapistName(s1.therapistId), type: "therapy", creditChange: -1 },
      });
      const used = push({
        ...sessionBase(s1, client, admin),
        occurredAt: t,
        batchId: b1,
        action: "credit.used",
        entityType: "credit_ledger",
        entityId: `led-r-${s1.id}`,
        entityLabel: `Kredit ${client.clientName}`,
        meta: { creditChange: -1, scheduleId: s1.id },
      });
      const tr = new Date(t.getTime() + 7 * 60000);
      const b2 = batch();
      push({
        ...sessionBase(s1, client, admin),
        occurredAt: tr,
        batchId: b2,
        action: "schedule.completion_reverted",
        oldValues: { status: "completed" },
        newValues: { status: "scheduled" },
        reason: "Salah klik — sesi belum berlangsung, completed dibatalkan",
        revertsAuditId: done.id,
        meta: { creditChange: 1 },
      });
      push({
        ...sessionBase(s1, client, admin),
        occurredAt: tr,
        batchId: b2,
        action: "credit.reversed",
        entityType: "credit_ledger",
        entityId: `led-rv-${s1.id}`,
        entityLabel: `Kredit ${client.clientName}`,
        reason: "Pembalikan kredit karena completed dibatalkan",
        revertsAuditId: used.id,
        meta: { creditChange: 1, reversesLedgerId: `led-r-${s1.id}` },
      });
    }

    const s2 = candidates[1];
    if (s2) {
      const client = clientMap.get(s2.clientId);
      const t = subDays(now, 5 + bIdx);
      t.setHours(8, 40 + bIdx, 0, 0);
      const c = push({
        ...sessionBase(s2, client, admin),
        occurredAt: t,
        batchId: batch(),
        action: "schedule.cancelled",
        oldValues: { status: "scheduled" },
        newValues: { status: "cancelled", cancelReason: "sakit" },
        reason: cancelReasonLabel("sakit"),
      });
      push({
        ...sessionBase(s2, client, manager),
        occurredAt: new Date(t.getTime() + 52 * 60000),
        batchId: batch(),
        action: "schedule.cancellation_reverted",
        oldValues: { status: "cancelled" },
        newValues: { status: "scheduled" },
        reason: "Orang tua konfirmasi anak sudah sehat dan tetap hadir",
        revertsAuditId: c.id,
      });
    }
  });

  // --- Invoice & pembayaran
  (credits.invoices || []).forEach((inv) => {
    const client = clientMap.get(inv.clientId);
    if (!client) return;
    const finance = actorFor(inv.branchId, ["finance"]);
    const base = {
      branchId: inv.branchId,
      entityType: "invoice",
      entityId: inv.id,
      entityLabel: `${inv.invoiceNumber} • ${client.clientName}`,
      subjectType: "client",
      subjectId: client.id,
      subjectLabel: client.clientName,
    };
    const issued = inv.issuedAt ? new Date(inv.issuedAt) : null;
    if (inWindow(issued)) {
      push({ ...base, actor: finance, occurredAt: issued, action: "invoice.issued", newValues: { status: "unpaid", amount: inv.amount, packageName: inv.packageName } });
    }
    const paid = inv.paidAt ? new Date(inv.paidAt) : null;
    if (inv.status === "paid" && inWindow(paid)) {
      const parent = { type: "client", id: client.id, name: `${client.parentName} (ortu)`, role: "client" };
      push({ ...base, actor: parent, occurredAt: new Date(paid.getTime() - 75 * 60000), action: "invoice.proof_uploaded", source: "web", newValues: { proof: "bukti-transfer.jpg" } });
      const b = batch();
      push({ ...base, actor: finance, occurredAt: paid, batchId: b, action: "invoice.verified", oldValues: { status: "unpaid" }, newValues: { status: "paid" }, meta: { amount: inv.amount } });
      push({
        ...base,
        actor: finance,
        occurredAt: paid,
        batchId: b,
        action: "credit.package_activated",
        entityType: "client_package",
        entityId: `pkg-${inv.id}`,
        entityLabel: `${inv.packageName} • ${client.clientName}`,
        meta: { creditChange: inv.credits || 10 },
      });
    }
  });

  // --- Client: intake, admit, discharge, kuesioner
  clients.forEach((c) => {
    const inquiryAdmin = actorFor(c.branchId, ["admin_inquiry"]);
    const base = { branchId: c.branchId, entityType: "client", entityId: c.id, entityLabel: c.clientName, subjectType: "client", subjectId: c.id, subjectLabel: c.clientName };
    const created = c.createdAt ? new Date(c.createdAt) : null;
    if (inWindow(created)) {
      push({ ...base, actor: inquiryAdmin, occurredAt: created, action: "client.created", newValues: { status: "inquiry", parentName: c.parentName } });
    }
    if (c.status === "admitted" && c.dateOfJoin) {
      const t = at(c.dateOfJoin, "10:30");
      if (inWindow(t)) push({ ...base, actor: inquiryAdmin, occurredAt: t, action: "client.admitted", oldValues: { status: "assessment_done" }, newValues: { status: "admitted" } });
    }
    if (c.status === "discharged" && c.dateOfDischarge) {
      const t = at(c.dateOfDischarge, "15:10");
      if (inWindow(t)) {
        push({
          ...base,
          actor: actorFor(c.branchId, ["admin_schedule"]),
          occurredAt: t,
          action: "client.discharged",
          oldValues: { status: "admitted" },
          newValues: { status: "discharged" },
          reason: dischargeReasonLabel(c.dischargeReason),
        });
      }
    }
    (c.assessmentAnswers || []).forEach((a) => {
      const t = a.submittedAt ? new Date(a.submittedAt) : null;
      if (!inWindow(t)) return;
      push({
        ...base,
        actor: { type: "public", id: null, name: `${c.parentName} (ortu)`, role: "public" },
        occurredAt: t,
        source: "public_form",
        action: "assessment_response.submitted",
        entityType: "assessment_response",
        entityId: `${c.id}-${a.categoryId}`,
        entityLabel: a.categoryName,
        meta: { answered: (a.answers || []).length },
      });
    });
  });

  // --- Login staf (7 hari terakhir, hari kerja)
  staff.forEach((u, i) => {
    for (let d = 0; d < LOGIN_DAYS; d += 1) {
      const day = subDays(now, d);
      if (day.getDay() === 0) continue;
      day.setHours(7, 30 + ((i * 7 + d * 3) % 25), 0, 0);
      if (day > now) continue;
      push({
        actor: { type: "user", id: u.id, name: u.name, role: u.role },
        branchId: u.branchId,
        occurredAt: day,
        action: "auth.login",
        entityType: "user",
        entityId: u.id,
        entityLabel: u.email,
      });
    }
  });
  // Satu percobaan login gagal per cabang
  branches.forEach((branchId, bIdx) => {
    const u = staff.find((s) => s.branchId === branchId && s.role !== "manager") || staff.find((s) => s.branchId === branchId);
    if (!u) return;
    const t = subDays(now, 1 + bIdx);
    t.setHours(22, 5 + bIdx, 0, 0);
    push({
      actor: { type: "public", id: null, name: u.email, role: null },
      branchId,
      occurredAt: t,
      action: "auth.login_failed",
      entityType: "user",
      entityId: u.id,
      entityLabel: u.email,
      reason: "Password salah (3x)",
    });
  });

  // --- Aksi global Master (tanpa cabang)
  const t1 = subDays(now, 21);
  t1.setHours(16, 20, 0, 0);
  push({
    actor: MASTER,
    branchId: null,
    occurredAt: t1,
    action: "role.permission_changed",
    entityType: "role",
    entityId: "manager",
    entityLabel: "Branch Manager",
    oldValues: { finance: true },
    newValues: { finance: false },
    reason: "Verifikasi pembayaran dipusatkan ke tim Finance",
  });
  const t2 = subDays(now, 33);
  t2.setHours(11, 0, 0, 0);
  push({
    actor: MASTER,
    branchId: null,
    occurredAt: t2,
    action: "package.created",
    entityType: "master_package",
    entityId: "pkg-sensory-intensive",
    entityLabel: "Paket Sensori Intensif",
    newValues: { credits: 15, price: 4200000 },
  });

  return entries
    .filter((e) => new Date(e.occurredAt) <= now)
    .sort((a, b) => (b.occurredAt === a.occurredAt ? b.id.localeCompare(a.id) : b.occurredAt.localeCompare(a.occurredAt)));
}
