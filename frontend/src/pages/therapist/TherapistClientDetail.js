import React, { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Search, Eye, Printer, User, Clock, Phone, Sparkles, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/common/StatusBadge";
import { CreditBar, LeaveInfo } from "@/components/common/CreditBar";
import { EmptyState } from "@/components/common/EmptyState";
import { useClients } from "@/context/ClientsContext";
import { useSchedules } from "@/context/SchedulesContext";
import { useCredits } from "@/context/CreditsContext";
import { useTherapists } from "@/context/TherapistsContext";
import { calcAge, fmtDate } from "@/lib/appUtils";

export default function TherapistClientDetail() {
  const { id } = useParams();
  const { clients } = useClients();
  const { schedules } = useSchedules();
  const { getRecordForClient } = useCredits();
  const { getTherapist } = useTherapists();

  const client = clients.find((c) => c.id === id);
  const record = client ? getRecordForClient(client.id) : null;

  const clientSchedules = useMemo(
    () =>
      schedules
        .filter((s) => s.clientId === id)
        .sort((a, b) => (b.date + b.startTime).localeCompare(a.date + a.startTime)),
    [schedules, id]
  );

  if (!client) {
    return (
      <EmptyState
        icon={Search}
        title="Client profile not found"
        subtitle="This client may have been removed or reset in demo state."
        action={
          <Link to="/therapist">
            <Button variant="outline" className="rounded-xl border-slate-200">Back to my schedule</Button>
          </Link>
        }
      />
    );
  }

  return (
    <div className="max-w-3xl space-y-6" data-testid="therapist-client-detail-page">
      <div className="flex items-center justify-between">
        <Link to="/therapist" className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-emerald-700 transition-colors" data-testid="therapist-client-back-link">
          <ArrowLeft className="w-4 h-4" /> Back to my clinical schedule
        </Link>
        <Link to={`/print/client/${id}`}>
          <Button variant="outline" size="sm" className="gap-2 rounded-xl border-slate-200 font-semibold text-xs h-9" data-testid="therapist-print-report-button">
            <Printer className="w-3.5 h-3.5 text-slate-600" /> Print Summary Report
          </Button>
        </Link>
      </div>

      {/* Patient Profile Card */}
      <Card className="rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden clinical-card">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-base shadow-2xs">
                {client.clientName.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="text-xl font-extrabold text-slate-900">{client.clientName}</h1>
                  <StatusBadge status={client.status} />
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 bg-slate-100 border border-slate-200 rounded-full px-2.5 py-0.5">
                    <Eye className="w-3 h-3 text-slate-400" /> Clinical View
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Age {calcAge(client.dob) != null ? `${calcAge(client.dob)} Years` : "—"} · DOB {fmtDate(client.dob)}
                  {client.dateOfJoin ? ` · Enrolled ${fmtDate(client.dateOfJoin)}` : ""}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 font-medium">
              <User className="w-3.5 h-3.5 text-slate-400" />
              Parent: {client.parentName}
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 font-medium">
              <Phone className="w-3.5 h-3.5 text-slate-400" />
              {client.parentContact || "—"}
            </div>
          </div>

          {client.parentComplaint && (
            <div className="rounded-xl bg-amber-50/70 border border-amber-200/80 p-3.5" data-testid="therapist-client-complaint">
              <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider mb-1">Parent Chief Concern</p>
              <p className="text-xs text-slate-700 leading-relaxed font-medium">{client.parentComplaint}</p>
            </div>
          )}

          {client.assessmentReportNote && (
            <div className="rounded-xl bg-sky-50/60 border border-sky-200/80 p-4 space-y-1">
              <p className="text-[10px] font-bold text-sky-800 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-sky-600" /> Clinical Assessment Summary
              </p>
              <p className="text-xs text-slate-700 leading-relaxed font-medium">{client.assessmentReportNote}</p>
            </div>
          )}

          {record && (
            <div className="rounded-xl border border-slate-200/90 p-4 space-y-3 bg-slate-50/50">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Package Credit & Attendance</p>
              <CreditBar remaining={record.remainingCredit} total={record.totalCredit} compact />
              <LeaveInfo leaveUsed={record.leaveUsed} leaveQuota={record.leaveQuota} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Session History Feed */}
      <Card className="rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
        <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
          <CardTitle className="text-sm font-bold text-slate-900">Session History ({clientSchedules.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-2.5">
          {clientSchedules.length === 0 ? (
            <EmptyState icon={Search} title="No sessions on record" subtitle="No clinical sessions found for this client." />
          ) : (
            clientSchedules.map((s) => (
              <div key={s.id} className="flex flex-wrap items-center gap-3.5 rounded-xl border border-slate-200/90 p-3.5 text-xs bg-white hover:bg-slate-50/50 transition-colors" data-testid={`therapist-session-row-${s.id}`}>
                <div className="flex items-center gap-1.5 font-bold text-slate-900">
                  <Clock className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{fmtDate(s.date)}</span>
                </div>
                <span className="tabular-nums font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">{s.startTime}–{s.endTime}</span>
                <span className="text-slate-600 font-medium">Therapist: <strong className="text-slate-800">{getTherapist(s.therapistId) ? getTherapist(s.therapistId).name : "—"}</strong></span>
                <StatusBadge status={s.type} />
                <span className="ml-auto">
                  <StatusBadge status={s.status} />
                </span>
                {s.progressNote && (
                  <span className="basis-full text-xs text-slate-600 bg-slate-50 rounded-lg p-2.5 border border-slate-100 italic leading-relaxed">
                    Note: {s.progressNote}
                  </span>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

