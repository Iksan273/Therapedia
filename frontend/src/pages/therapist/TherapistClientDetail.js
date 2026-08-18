import React, { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Search, Eye, Printer } from "lucide-react";
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
        title="Client not found"
        subtitle="This client may have been removed after a demo reset."
        action={
          <Link to="/therapist">
            <Button variant="outline">Back to my schedule</Button>
          </Link>
        }
      />
    );
  }

  return (
    <div className="max-w-3xl space-y-6" data-testid="therapist-client-detail-page">
      <div className="flex items-center justify-between">
        <Link to="/therapist" className="inline-flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]" data-testid="therapist-client-back-link">
          <ArrowLeft className="w-4 h-4" /> Back to my schedule
        </Link>
        <Link to={`/print/client/${id}`}>
          <Button variant="outline" size="sm" className="gap-1.5" data-testid="therapist-print-report-button">
            <Printer className="w-3.5 h-3.5" /> Print Report
          </Button>
        </Link>
      </div>

      <Card className="rounded-xl border-[var(--color-border)] shadow-sm">
        <CardContent className="p-5 sm:p-6">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-xl font-semibold">{client.clientName}</h1>
            <StatusBadge status={client.status} />
            <span className="inline-flex items-center gap-1 text-[11px] text-[var(--color-text-muted)] bg-[var(--color-surface)] border border-[var(--color-border)] rounded-full px-2 py-0.5">
              <Eye className="w-3 h-3" /> Read-only
            </span>
          </div>
          <p className="text-sm text-[var(--color-text-muted)]">
            Age {calcAge(client.dob) != null ? calcAge(client.dob) : "—"} · DOB {fmtDate(client.dob)}
            {client.dateOfJoin ? ` · Joined ${fmtDate(client.dateOfJoin)}` : ""}
          </p>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            Parent: {client.parentName} · {client.parentContact}
          </p>
          {client.parentComplaint && (
            <div className="mt-3 rounded-lg bg-amber-50 border border-amber-100 px-3 py-2" data-testid="therapist-client-complaint">
              <p className="text-[11px] font-semibold text-amber-600 uppercase tracking-wide mb-0.5">Parent's Concern</p>
              <p className="text-sm leading-snug">{client.parentComplaint}</p>
            </div>
          )}
          {client.assessmentReportNote && (
            <div className="mt-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] px-4 py-3">
              <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-1">Assessment Report</p>
              <p className="text-sm">{client.assessmentReportNote}</p>
            </div>
          )}
          {record && (
            <div className="mt-4 space-y-2">
              <CreditBar remaining={record.remainingCredit} total={record.totalCredit} compact />
              <LeaveInfo leaveUsed={record.leaveUsed} leaveQuota={record.leaveQuota} />
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-xl border-[var(--color-border)] shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Session History ({clientSchedules.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {clientSchedules.length === 0 ? (
            <EmptyState icon={Search} title="No sessions" subtitle="No sessions on record for this client." />
          ) : (
            clientSchedules.map((s) => (
              <div key={s.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-[var(--color-border)] px-3 py-2.5 text-sm" data-testid={`therapist-session-row-${s.id}`}>
                <span className="font-medium">{fmtDate(s.date)}</span>
                <span className="tabular-nums text-[var(--color-text-muted)]">{s.startTime}–{s.endTime}</span>
                <span className="text-[var(--color-text-muted)]">{getTherapist(s.therapistId) ? getTherapist(s.therapistId).name : "—"}</span>
                <StatusBadge status={s.type} />
                <span className="ml-auto">
                  <StatusBadge status={s.status} />
                </span>
                {s.progressNote && (
                  <span className="basis-full text-xs text-[var(--color-text-muted)] italic leading-snug">
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
