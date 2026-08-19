import React, { useMemo } from "react";
import { CalendarHeart, Sparkles, Wallet, Clock, User, HeartHandshake, ShieldCheck, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/common/StatusBadge";
import { CreditBar, LeaveInfo } from "@/components/common/CreditBar";
import { EmptyState } from "@/components/common/EmptyState";
import { useAuth } from "@/context/AuthContext";
import { useClients } from "@/context/ClientsContext";
import { useSchedules } from "@/context/SchedulesContext";
import { useCredits } from "@/context/CreditsContext";
import { useTherapists } from "@/context/TherapistsContext";
import { fmtDate, todayStr } from "@/lib/appUtils";

export default function ClientDashboard() {
  const { auth } = useAuth();
  const { getClient } = useClients();
  const { schedules } = useSchedules();
  const { getRecordForClient } = useCredits();
  const { getTherapist } = useTherapists();

  const client = getClient(auth.clientId);
  const record = client ? getRecordForClient(client.id) : null;

  const history = useMemo(
    () =>
      schedules
        .filter((s) => s.clientId === auth.clientId)
        .sort((a, b) => (b.date + b.startTime).localeCompare(a.date + a.startTime)),
    [schedules, auth.clientId]
  );

  const nextSession = useMemo(
    () =>
      schedules
        .filter((s) => s.clientId === auth.clientId && s.date >= todayStr() && (s.status === "scheduled" || s.status === "rescheduled"))
        .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime))[0],
    [schedules, auth.clientId]
  );

  if (!client) {
    return <EmptyState icon={Sparkles} title="Session expired" subtitle="Please log in again with your access code." />;
  }

  return (
    <div className="max-w-3xl space-y-6" data-testid="client-dashboard-page">
      {/* Welcome Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-sky-600 to-sky-700 text-white p-6 sm:p-7 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-sky-100 text-xs font-semibold backdrop-blur-xs">
              <HeartHandshake className="w-3.5 h-3.5" />
              Parent & Family Portal
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Hello, {client.parentName.split(" ")[0]}!
            </h1>
            <p className="text-xs sm:text-sm text-sky-100/90 font-medium">
              Tracking <span className="font-bold text-white underline decoration-sky-300">{client.clientName}'s</span> growth and developmental milestones with Therapedia.
            </p>
          </div>
          <div className="shrink-0 bg-white/10 backdrop-blur-xs px-4 py-2.5 rounded-xl border border-white/20 text-right">
            <p className="text-[10px] uppercase font-bold tracking-wider text-sky-200">Patient ID</p>
            <p className="font-mono text-sm font-bold text-white">#{client.clientAccessCode}</p>
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {/* Credit card */}
        <Card className="rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden clinical-card">
          <CardHeader className="pb-2 border-b border-slate-100 bg-slate-50/50">
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-sky-100 text-sky-800 flex items-center justify-center font-bold">
                <Wallet className="w-4 h-4" />
              </div>
              Package & Credit Balance
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-3.5">
            {record ? (
              <>
                <p className="text-3xl font-extrabold text-slate-900 tabular-nums" data-testid="client-portal-remaining-credit">
                  {record.remainingCredit}
                  <span className="text-sm font-semibold text-slate-400"> / {record.totalCredit} sessions left</span>
                </p>
                <CreditBar remaining={record.remainingCredit} total={record.totalCredit} compact />
                <LeaveInfo leaveUsed={record.leaveUsed} leaveQuota={record.leaveQuota} />
              </>
            ) : (
              <p className="text-xs text-slate-400 italic">No active package assigned yet — clinic team will activate upon enrollment.</p>
            )}
          </CardContent>
        </Card>

        {/* Next session */}
        <Card className="rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden clinical-card">
          <CardHeader className="pb-2 border-b border-slate-100 bg-slate-50/50">
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                <CalendarHeart className="w-4 h-4" />
              </div>
              Upcoming Session
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            {nextSession ? (
              <div className="space-y-2" data-testid="client-portal-next-session">
                <p className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  {fmtDate(nextSession.date)}
                </p>
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 tabular-nums">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>{nextSession.startTime}–{nextSession.endTime}</span>
                  <span>·</span>
                  <span className="text-slate-800 font-bold">{getTherapist(nextSession.therapistId) ? getTherapist(nextSession.therapistId).name : "Practitioner"}</span>
                </div>
                <div className="pt-1">
                  <StatusBadge status={nextSession.type} />
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">No upcoming session slots booked. The clinic coordinator will contact you.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Therapy History */}
      <Card className="rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
        <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
          <CardTitle className="text-sm font-bold text-slate-900">Therapy & Progress History ({history.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {history.length === 0 ? (
            <EmptyState icon={CalendarHeart} title="No therapy sessions logged yet" subtitle="Your child's attendance and therapist notes will appear here." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/70 hover:bg-slate-50/70 border-b border-slate-200">
                  <TableHead className="font-bold text-slate-700 text-xs py-3 pl-6">Session Date</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs">Time</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs">Therapist</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs">Type</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs">Clinical Observation</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs text-right pr-6">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody data-testid="client-portal-history-table">
                {history.map((s) => (
                  <TableRow key={s.id} className="hover:bg-sky-50/30 transition-colors border-b border-slate-100">
                    <TableCell className="font-bold text-xs text-slate-900 pl-6">{fmtDate(s.date)}</TableCell>
                    <TableCell className="tabular-nums font-semibold text-xs text-slate-500">{s.startTime}–{s.endTime}</TableCell>
                    <TableCell className="text-xs font-semibold text-slate-700">{getTherapist(s.therapistId) ? getTherapist(s.therapistId).name : "—"}</TableCell>
                    <TableCell><StatusBadge status={s.type} /></TableCell>
                    <TableCell className="max-w-[220px]">
                      {s.progressNote ? (
                        <span className="text-xs text-slate-700 bg-slate-50 border border-slate-100 rounded-lg p-1.5 block line-clamp-2 leading-snug" title={s.progressNote}>
                          {s.progressNote}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400 italic">No notes</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right pr-6"><StatusBadge status={s.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

