import React, { useMemo } from "react";
import { CalendarHeart, Sparkles, Wallet } from "lucide-react";
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
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Hi, {client.parentName.split(" ")[0]}!</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">
          Here's how {client.clientName}'s therapy journey is going.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {/* Credit card */}
        <Card className="rounded-xl border-[var(--color-border)] shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Wallet className="w-4 h-4 text-[var(--color-primary-dark)]" /> Remaining Credit
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {record ? (
              <>
                <p className="text-3xl font-semibold tabular-nums" data-testid="client-portal-remaining-credit">
                  {record.remainingCredit}
                  <span className="text-base font-normal text-[var(--color-text-muted)]"> / {record.totalCredit} sessions</span>
                </p>
                <CreditBar remaining={record.remainingCredit} total={record.totalCredit} compact />
                <LeaveInfo leaveUsed={record.leaveUsed} leaveQuota={record.leaveQuota} />
              </>
            ) : (
              <p className="text-sm text-[var(--color-text-muted)]">No active package yet — the clinic will set this up on admission.</p>
            )}
          </CardContent>
        </Card>

        {/* Next session */}
        <Card className="rounded-xl border-[var(--color-border)] shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarHeart className="w-4 h-4 text-[var(--color-primary-dark)]" /> Next Session
            </CardTitle>
          </CardHeader>
          <CardContent>
            {nextSession ? (
              <div className="space-y-1" data-testid="client-portal-next-session">
                <p className="text-lg font-semibold">{fmtDate(nextSession.date)}</p>
                <p className="text-sm text-[var(--color-text-muted)] tabular-nums">
                  {nextSession.startTime}–{nextSession.endTime} · {getTherapist(nextSession.therapistId) ? getTherapist(nextSession.therapistId).name : ""}
                </p>
                <StatusBadge status={nextSession.type} />
              </div>
            ) : (
              <p className="text-sm text-[var(--color-text-muted)]">No upcoming sessions scheduled. The clinic will be in touch.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* History */}
      <Card className="rounded-xl border-[var(--color-border)] shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Therapy History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {history.length === 0 ? (
            <EmptyState icon={CalendarHeart} title="No sessions yet" subtitle="Your therapy history will appear here after your first session." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-[var(--color-surface)]">
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Therapist</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody data-testid="client-portal-history-table">
                {history.map((s) => (
                  <TableRow key={s.id} className="hover:bg-[rgba(47,168,224,0.04)]">
                    <TableCell className="font-medium">{fmtDate(s.date)}</TableCell>
                    <TableCell className="tabular-nums text-[var(--color-text-muted)]">{s.startTime}–{s.endTime}</TableCell>
                    <TableCell className="text-[var(--color-text-muted)]">{getTherapist(s.therapistId) ? getTherapist(s.therapistId).name : "—"}</TableCell>
                    <TableCell><StatusBadge status={s.type} /></TableCell>
                    <TableCell className="text-right"><StatusBadge status={s.status} /></TableCell>
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
