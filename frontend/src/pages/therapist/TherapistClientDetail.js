import React, { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { format } from "date-fns";
import {
  ArrowLeft,
  Search,
  Eye,
  Printer,
  User,
  Clock,
  Phone,
  FileText,
  CalendarDays,
  ExternalLink,
  Calendar,
  Lock,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StatusBadge } from "@/components/common/StatusBadge";
import { CreditBar, LeaveInfo } from "@/components/common/CreditBar";
import { EmptyState } from "@/components/common/EmptyState";
import { SessionDetailModal } from "@/components/calendar/SessionDetailModal";
import { useClients } from "@/context/ClientsContext";
import { useSchedules } from "@/context/SchedulesContext";
import { useCredits } from "@/context/CreditsContext";
import { useTherapists } from "@/context/TherapistsContext";
import { calcAge, fmtDate, BRANCHES } from "@/lib/appUtils";

const DAY_NAME_ID = {
  Monday: "Senin",
  Tuesday: "Selasa",
  Wednesday: "Rabu",
  Thursday: "Kamis",
  Friday: "Jumat",
  Saturday: "Sabtu",
  Sunday: "Minggu",
};

export default function TherapistClientDetail() {
  const { id } = useParams();
  const { clients } = useClients();
  const { schedules } = useSchedules();
  const { getRecordForClient } = useCredits();
  const { getTherapist } = useTherapists();

  const [selectedSession, setSelectedSession] = useState(null);
  const [sessionOpen, setSessionOpen] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);

  const client = clients.find((c) => c.id === id);
  const record = client ? getRecordForClient(client.id) : null;

  const clientSchedules = useMemo(
    () =>
      schedules
        .filter((s) => s.clientId === id)
        .sort((a, b) => (b.date + b.startTime).localeCompare(a.date + a.startTime)),
    [schedules, id]
  );

  // Derive weekly recurring timetable pattern: "Jadwal setiap hari apa dan sama siapa therapist nya"
  const weeklyRoutines = useMemo(() => {
    if (!clientSchedules) return [];
    const routinesMap = {};

    clientSchedules.forEach((s) => {
      if (s.status !== "cancelled") {
        let dayNameEn = "";
        try {
          const d = new Date(s.date + "T00:00:00");
          dayNameEn = format(d, "EEEE");
        } catch (e) {
          dayNameEn = "Sesi Rutin";
        }
        const key = `${dayNameEn}_${s.startTime}_${s.therapistId}`;
        if (!routinesMap[key]) {
          const th = getTherapist(s.therapistId);
          routinesMap[key] = {
            day: DAY_NAME_ID[dayNameEn] || dayNameEn,
            time: `${s.startTime} – ${s.endTime}`,
            therapistName: th ? th.name : "Terapis",
            specialty: th ? th.specialty : "Clinical Practitioner",
            creditPackageId: s.creditPackageId,
          };
        }
      }
    });

    return Object.values(routinesMap);
  }, [clientSchedules, getTherapist]);

  // Pagination for session history
  const pageSize = 8;
  const totalHistoryPages = Math.ceil(clientSchedules.length / pageSize) || 1;
  const paginatedSchedules = useMemo(() => {
    const start = (historyPage - 1) * pageSize;
    return clientSchedules.slice(start, start + pageSize);
  }, [clientSchedules, historyPage, pageSize]);

  if (!client) {
    return (
      <EmptyState
        icon={Search}
        title="Client profile not found"
        subtitle="This client may have been removed or reset in demo state."
        action={
          <Link to="/therapist">
            <Button variant="outline" className="rounded-xl border-slate-200">
              <ArrowLeft className="w-4 h-4 mr-1.5" /> Kembali ke Jadwal Saya
            </Button>
          </Link>
        }
      />
    );
  }

  const br = BRANCHES.find((b) => b.id === client.branchId);

  return (
    <div className="max-w-5xl space-y-6 mx-auto" data-testid="therapist-client-detail-page">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link to="/therapist">
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl border-slate-200 text-slate-700 hover:bg-slate-100 h-10 px-3.5 font-bold text-xs shadow-2xs"
              data-testid="therapist-client-back-link"
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" /> Jadwal Saya
            </Button>
          </Link>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {client.clientName}
              </h1>
              <StatusBadge status={client.status} />
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 bg-slate-100 border border-slate-200 rounded-full px-2.5 py-0.5">
                <Eye className="w-3 h-3 text-slate-400" /> Tampilan Klinis Terapis
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Kode Akses: <strong className="font-mono text-slate-800">{client.clientAccessCode || "TDC-1009"}</strong> • Cabang: {br ? br.name : "Surabaya"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {client.gdriveClientLink && (
            <a
              href={client.gdriveClientLink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100 shadow-2xs transition-colors h-10"
              title="Buka Google Drive Client"
            >
              <ExternalLink className="w-3.5 h-3.5" /> GDrive Client
            </a>
          )}
          {(client.assessmentAnswers || []).length > 0 && (
            <Link
              to={`/therapist/parent-assessment/${client.id}`}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 shadow-2xs transition-colors h-10"
            >
              <ClipboardCheck className="w-3.5 h-3.5" /> Kuesioner Ortu
            </Link>
          )}
          <Link to={`/print/client/${id}`}>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 rounded-xl border-slate-200 font-semibold text-xs h-10 shadow-2xs"
              data-testid="therapist-print-report-button"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" /> Cetak Summary
            </Button>
          </Link>
        </div>
      </div>

      {/* Patient Profile & Demographics Card */}
      <Card className="rounded-2xl border border-slate-200/90 bg-white shadow-2xs overflow-hidden clinical-card">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-base shadow-2xs">
                {client.clientName.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="font-extrabold text-base text-slate-900">Informasi Demografis Pasien</p>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Usia {calcAge(client.dob) != null ? `${calcAge(client.dob)} Tahun` : "—"} · DOB {fmtDate(client.dob)}
                  {client.dateOfJoin ? ` · Bergabung ${fmtDate(client.dateOfJoin)}` : ""}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Orang Tua / Wali</span>
              <p className="font-bold text-slate-800 mt-0.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" /> {client.parentName}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Kontak WhatsApp</span>
              <p className="font-bold text-slate-800 mt-0.5 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" /> {client.parentContact || "—"}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Status Layanan</span>
              <p className="font-bold text-slate-800 mt-0.5">{client.serviceType || "Terapi Sensori / OT"}</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Sesi Terdaftar</span>
              <p className="font-bold text-slate-800 mt-0.5">{clientSchedules.length} Sesi Terjadwal</p>
            </div>
          </div>

          {client.parentComplaint && (
            <div className="rounded-xl bg-amber-50/70 border border-amber-200/80 p-3.5" data-testid="therapist-client-complaint">
              <p className="text-[10px] font-bold text-amber-800 uppercase tracking-wider mb-1">
                Keluhan Utama Orang Tua (Parent Chief Concern)
              </p>
              <p className="text-xs text-slate-700 leading-relaxed font-medium">{client.parentComplaint}</p>
            </div>
          )}

          {client.assessmentReportNote && (
            <div className="rounded-xl bg-sky-50/60 border border-sky-200/80 p-3.5 space-y-1">
              <p className="text-[10px] font-bold text-sky-800 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-sky-600" /> Ringkasan Asesmen Klinis
              </p>
              <p className="text-xs text-slate-700 leading-relaxed font-medium">{client.assessmentReportNote}</p>
            </div>
          )}

          {record && (
            <div className="rounded-xl border border-slate-200/90 p-4 space-y-3 bg-slate-50/50">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Saldo Kredit Paket Sesi</p>
              <CreditBar remaining={record.remainingCredit} total={record.totalCredit} compact />
              <LeaveInfo leaveUsed={record.leaveUsed} leaveQuota={record.leaveQuota} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* JADWAL RUTIN MINGGUAN CLIENT (SEPERTI VIEW PADA ADMIN SCHEDULE) */}
      <Card className="rounded-2xl border border-slate-200/90 bg-white shadow-2xs overflow-hidden clinical-card">
        <CardHeader className="p-5 sm:p-6 pb-4 border-b border-slate-100 bg-slate-50/50">
          <CardTitle className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-sky-600" />
            Jadwal Rutin Mingguan Client (Hari & Terapis Pendamping)
          </CardTitle>
          <CardDescription className="text-xs text-slate-500 mt-0.5">
            Rangkuman jadwal sesi rutin mingguan anak: hari apa saja, jam berapa, dan terapis pendamping
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5 sm:p-6">
          {weeklyRoutines.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400">
              Belum ada jadwal rutin mingguan aktif untuk client ini.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {weeklyRoutines.map((routine, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-2xl bg-sky-50/50 border border-sky-200/90 space-y-2 text-xs shadow-2xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-sm text-sky-900">{routine.day}</span>
                    <span className="font-mono text-xs text-sky-800 font-bold bg-white px-2.5 py-0.5 rounded-lg border border-sky-200 shadow-2xs">
                      {routine.time}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-sky-200/60 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-900">{routine.therapistName}</p>
                      <p className="text-[11px] text-slate-500 font-medium">{routine.specialty}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* SESSION HISTORY FEED - READ ONLY VIEW */}
      <Card className="rounded-2xl border border-slate-200/90 bg-white shadow-2xs overflow-hidden">
        <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-600" />
              Riwayat Sesi Terapi ({clientSchedules.length})
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 mt-0.5">
              Daftar rekam sesi klinis. Catatan laporan berstatus <strong>Read-Only</strong> (hanya dapat ditinjau).
            </CardDescription>
          </div>
          <span className="text-[11px] font-bold text-slate-500 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg flex items-center gap-1">
            <Lock className="w-3 h-3 text-slate-400" /> Mode Read-Only
          </span>
        </CardHeader>
        <CardContent className="p-4 space-y-2.5">
          {clientSchedules.length === 0 ? (
            <EmptyState icon={Calendar} title="Belum ada sesi" subtitle="Belum ada rekam sesi tercatat untuk client ini." />
          ) : (
            paginatedSchedules.map((s) => (
              <div
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-3.5 rounded-xl border border-slate-200/90 p-3.5 text-xs bg-white hover:bg-slate-50/70 transition-all cursor-pointer group"
                onClick={() => {
                  setSelectedSession(s);
                  setSessionOpen(true);
                }}
                data-testid={`therapist-session-row-${s.id}`}
              >
                <div className="flex flex-wrap items-center gap-3 min-w-0">
                  <div className="flex items-center gap-1.5 font-bold text-slate-900">
                    <Clock className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{fmtDate(s.date)}</span>
                  </div>
                  <span className="tabular-nums font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                    {s.startTime}–{s.endTime}
                  </span>
                  <span className="text-slate-600 font-medium">
                    Terapis: <strong className="text-slate-800">{getTherapist(s.therapistId)?.name || "—"}</strong>
                  </span>
                  <StatusBadge status={s.type} />
                  <StatusBadge status={s.status} />
                </div>

                <div className="flex items-center gap-2">
                  {s.activitySection || s.noteSection || s.progressNote || s.homeworkSection ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
                      <FileText className="w-3 h-3 text-emerald-600" /> Laporan Terisi
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-[10px] font-medium text-slate-500">
                      Belum Ada Laporan
                    </span>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-[11px] font-bold rounded-lg border-slate-200 group-hover:border-sky-300 group-hover:text-sky-800 flex items-center gap-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedSession(s);
                      setSessionOpen(true);
                    }}
                  >
                    <Eye className="w-3 h-3 text-sky-600" /> Lihat Laporan (Read-Only)
                  </Button>
                </div>

                {(s.noteSection || s.progressNote) && (
                  <span className="basis-full text-xs text-slate-600 bg-slate-50 rounded-lg p-2.5 border border-slate-100 italic leading-relaxed">
                    Note: {s.noteSection || s.progressNote}
                  </span>
                )}
              </div>
            ))
          )}

          {/* Pagination controls for session history */}
          {clientSchedules.length > pageSize && (
            <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
              <span className="font-medium">
                Menampilkan {(historyPage - 1) * pageSize + 1} –{" "}
                {Math.min(historyPage * pageSize, clientSchedules.length)} dari {clientSchedules.length} sesi
              </span>
              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 px-2.5 rounded-xl text-xs font-semibold border-slate-200 hover:bg-slate-100 cursor-pointer"
                  disabled={historyPage <= 1}
                  onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Prev
                </Button>
                <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 font-bold text-slate-800 text-xs shadow-2xs">
                  {historyPage} / {totalHistoryPages}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 px-2.5 rounded-xl text-xs font-semibold border-slate-200 hover:bg-slate-100 cursor-pointer"
                  disabled={historyPage >= totalHistoryPages}
                  onClick={() => setHistoryPage((p) => Math.min(totalHistoryPages, p + 1))}
                >
                  Next <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Session Detail Modal for clinical report review (STRICTLY READ-ONLY HERE) */}
      <SessionDetailModal
        schedule={selectedSession}
        open={sessionOpen}
        onOpenChange={setSessionOpen}
        readOnly={true}
      />
    </div>
  );
}
