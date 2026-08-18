import React, { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, CalendarPlus, LogOut, Printer, RefreshCw, Search, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StatusBadge, ConcernTag } from "@/components/common/StatusBadge";
import { CreditBar, LeaveInfo } from "@/components/common/CreditBar";
import { EmptyState } from "@/components/common/EmptyState";
import { AddScheduleModal } from "@/components/calendar/AddScheduleModal";
import { SessionDetailModal } from "@/components/calendar/SessionDetailModal";
import { useClients } from "@/context/ClientsContext";
import { useSchedules } from "@/context/SchedulesContext";
import { useCredits } from "@/context/CreditsContext";
import { useTherapists } from "@/context/TherapistsContext";
import { DISCHARGE_REASONS, PACKAGE_OPTIONS, calcAge, fmtDate, todayStr, uid } from "@/lib/appUtils";

export default function ActiveClientDetail() {
  const { id } = useParams();
  const { clients, updateClient } = useClients();
  const { schedules } = useSchedules();
  const { getRecordForClient, getRenewalsForClient, addRenewal, markRenewalPaid } = useCredits();
  const { getTherapist } = useTherapists();

  const [addOpen, setAddOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [sessionOpen, setSessionOpen] = useState(false);
  const [dischargeOpen, setDischargeOpen] = useState(false);
  const [dischargeReason, setDischargeReason] = useState("");
  const [dischargeNote, setDischargeNote] = useState("");
  const [renewOpen, setRenewOpen] = useState(false);
  const [renewKey, setRenewKey] = useState("10");
  const [renewCustom, setRenewCustom] = useState("");

  const client = clients.find((c) => c.id === id);
  const record = client ? getRecordForClient(client.id) : null;
  const renewals = client ? getRenewalsForClient(client.id) : [];

  const clientSchedules = useMemo(
    () =>
      schedules
        .filter((s) => s.clientId === id)
        .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime)),
    [schedules, id]
  );

  const upcoming = useMemo(
    () => clientSchedules.filter((s) => s.date >= todayStr()),
    [clientSchedules]
  );
  const past = useMemo(
    () => clientSchedules.filter((s) => s.date < todayStr()).reverse(),
    [clientSchedules]
  );

  if (!client) {
    return (
      <EmptyState
        icon={Search}
        title="Client not found"
        subtitle="This client may have been removed after a demo reset."
        action={
          <Link to="/admin-schedule/clients">
            <Button variant="outline">Back to active clients</Button>
          </Link>
        }
      />
    );
  }

  const isDischarged = client.status === "discharged";

  const handleDischarge = () => {
    if (!dischargeReason) {
      toast.error("Select a discharge reason.");
      return;
    }
    updateClient(id, {
      status: "discharged",
      dischargeReason,
      dischargeNote: dischargeNote.trim() || null,
      dateOfDischarge: todayStr(),
    });
    setDischargeOpen(false);
    toast.success(`${client.clientName} discharged.`);
  };

  const handleCreateRenewal = () => {
    let creditsAmount;
    let packageName;
    if (renewKey === "custom") {
      creditsAmount = Number(renewCustom);
      packageName = `Custom (${creditsAmount} sessions)`;
      if (!creditsAmount || creditsAmount <= 0) {
        toast.error("Enter a valid package size.");
        return;
      }
    } else {
      const opt = PACKAGE_OPTIONS.find((p) => p.key === renewKey);
      creditsAmount = opt.credits;
      packageName = opt.label.split(" (")[0];
    }
    addRenewal({
      id: uid(),
      clientId: id,
      packageName,
      credits: creditsAmount,
      isRenewal: true,
      invoiceId: uid(),
      status: "unpaid",
      createdAt: todayStr(),
    });
    setRenewOpen(false);
    toast.success(`Renewal invoice created (${creditsAmount} sessions, unpaid). Mark it paid to apply credits.`);
  };

  const handleMarkRenewalPaid = (renewal) => {
    markRenewalPaid(renewal.id);
    toast.success(`Renewal paid — +${renewal.credits} credits added for ${client.clientName}.`);
  };

  const SessionRow = ({ s }) => (
    <button
      type="button"
      onClick={() => {
        setSelectedSession(s);
        setSessionOpen(true);
      }}
      className="w-full flex flex-wrap items-center gap-3 rounded-lg border border-[var(--color-border)] px-3 py-2.5 text-sm text-left hover:bg-[rgba(47,168,224,0.04)] transition-colors"
      data-testid={`client-session-row-${s.id}`}
    >
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
    </button>
  );

  return (
    <div className="max-w-4xl space-y-6" data-testid="active-client-detail-page">
      <Link
        to="/admin-schedule/clients"
        className="inline-flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
        data-testid="active-client-back-link"
      >
        <ArrowLeft className="w-4 h-4" /> Back to active clients
      </Link>

      {/* Header */}
      <Card className="rounded-xl border-[var(--color-border)] shadow-sm">
        <CardContent className="p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-semibold" data-testid="active-client-name">{client.clientName}</h1>
                <StatusBadge status={client.status} />
              </div>
              <p className="text-sm text-[var(--color-text-muted)] mt-1">
                Age {calcAge(client.dob) != null ? calcAge(client.dob) : "—"} · DOB {fmtDate(client.dob)} · Joined {fmtDate(client.dateOfJoin)}
              </p>
              <p className="text-sm text-[var(--color-text-muted)] mt-1">
                {client.parentName} · {client.parentContact} · {client.parentEmail}
              </p>
              <p className="text-xs text-[var(--color-text-muted)] mt-2">
                Portal access code: <span className="font-mono font-semibold text-[var(--color-primary-dark)]">{client.clientAccessCode}</span>
              </p>
              {client.parentComplaint && (
                <div className="mt-3 rounded-lg bg-amber-50 border border-amber-100 px-3 py-2 max-w-xl" data-testid="active-client-complaint">
                  <p className="text-[11px] font-semibold text-amber-600 uppercase tracking-wide mb-0.5">Parent's Concern</p>
                  <p className="text-sm leading-snug">{client.parentComplaint}</p>
                </div>
              )}
              {(client.concernTags || []).length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {(client.concernTags || []).map((t) => (
                    <ConcernTag key={t} tag={t} />
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Link to={`/print/client/${id}`}>
                <Button variant="outline" className="gap-2" data-testid="print-report-link-button">
                  <Printer className="w-4 h-4" /> Print Report
                </Button>
              </Link>
              {!isDischarged && (
                <>
                  <Button variant="outline" className="gap-2" onClick={() => setAddOpen(true)} data-testid="client-add-schedule-button">
                    <CalendarPlus className="w-4 h-4" /> Add Schedule
                  </Button>
                  <Button
                    variant="outline"
                    className="gap-2 text-[var(--color-danger)] border-red-200 hover:bg-red-50"
                    onClick={() => setDischargeOpen(true)}
                    data-testid="discharge-client-button"
                  >
                    <LogOut className="w-4 h-4" /> Discharge
                  </Button>
                </>
              )}
            </div>
          </div>
          {isDischarged && (
            <div className="mt-4 rounded-xl bg-gray-50 border border-[var(--color-border)] px-4 py-3 text-sm text-[var(--color-text-muted)]" data-testid="discharged-banner">
              Discharged on {fmtDate(client.dateOfDischarge)} · Reason: {DISCHARGE_REASONS.find((r) => r.value === client.dischargeReason)?.label || client.dischargeReason}
              {client.dischargeNote ? ` — ${client.dischargeNote}` : ""}
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="schedule">
        <TabsList>
          <TabsTrigger value="schedule" data-testid="client-tab-schedule">Schedule</TabsTrigger>
          <TabsTrigger value="credit" data-testid="client-tab-credit">Credit</TabsTrigger>
        </TabsList>

        {/* Schedule tab */}
        <TabsContent value="schedule" className="space-y-4">
          <Card className="rounded-xl border-[var(--color-border)] shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Upcoming Sessions ({upcoming.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {upcoming.length === 0 ? (
                <EmptyState icon={CalendarPlus} title="No upcoming sessions" subtitle="Use Add Schedule to book therapy sessions." />
              ) : (
                upcoming.map((s) => <SessionRow key={s.id} s={s} />)
              )}
            </CardContent>
          </Card>
          <Card className="rounded-xl border-[var(--color-border)] shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Past Sessions ({past.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {past.length === 0 ? (
                <EmptyState icon={CalendarPlus} title="No past sessions" subtitle="Session history will appear here." />
              ) : (
                past.map((s) => <SessionRow key={s.id} s={s} />)
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Credit tab */}
        <TabsContent value="credit" className="space-y-4">
          {!record ? (
            <Card className="rounded-xl border-[var(--color-border)] shadow-sm">
              <CardContent>
                <EmptyState icon={Wallet} title="No credit package" subtitle="This client has no credit record yet." />
              </CardContent>
            </Card>
          ) : (
            <>
              <Card className="rounded-xl border-[var(--color-border)] shadow-sm">
                <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-base">Credit — {record.packageName}</CardTitle>
                  {!isDischarged && (
                    <Button
                      className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] gap-2 h-9"
                      onClick={() => setRenewOpen(true)}
                      data-testid="renew-package-button"
                    >
                      <RefreshCw className="w-4 h-4" /> Renew Package
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="space-y-3">
                  <CreditBar remaining={record.remainingCredit} total={record.totalCredit} />
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    <LeaveInfo leaveUsed={record.leaveUsed} leaveQuota={record.leaveQuota} />
                    <span className="text-xs text-[var(--color-text-muted)]">Package purchased {fmtDate(record.purchaseDate)}</span>
                  </div>
                </CardContent>
              </Card>

              {renewals.length > 0 && (
                <Card className="rounded-xl border-[var(--color-border)] shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Renewal Invoices</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {renewals.map((r) => (
                      <div key={r.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-[var(--color-border)] px-3 py-2.5 text-sm" data-testid={`renewal-row-${r.id}`}>
                        <span className="font-medium">{r.packageName}</span>
                        <span className="text-[var(--color-text-muted)] tabular-nums">+{r.credits} credits</span>
                        <span className="text-xs text-[var(--color-text-muted)]">created {fmtDate(r.createdAt)}</span>
                        <StatusBadge status={r.status} />
                        {r.status === "unpaid" && !isDischarged && (
                          <Button
                            size="sm"
                            className="ml-auto h-8 bg-[var(--color-success)] hover:bg-green-600"
                            onClick={() => handleMarkRenewalPaid(r)}
                            data-testid={`mark-renewal-paid-${r.id}`}
                          >
                            Mark as Paid
                          </Button>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              <Card className="rounded-xl border-[var(--color-border)] shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Credit History</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {record.history.length === 0 ? (
                    <EmptyState icon={Wallet} title="No credit activity yet" subtitle="Completed sessions, leaves and renewals appear here." />
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-[var(--color-surface)]">
                          <TableHead>Date</TableHead>
                          <TableHead>Action</TableHead>
                          <TableHead className="text-right">Credit Change</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {[...record.history].reverse().map((h, idx) => (
                          <TableRow key={idx}>
                            <TableCell>{fmtDate(h.date)}</TableCell>
                            <TableCell>
                              <StatusBadge status={h.action === "used" ? "completed" : h.action === "leave" ? "rescheduled" : "paid"} className="capitalize" />
                              <span className="ml-2 text-xs text-[var(--color-text-muted)] capitalize">{h.action}</span>
                            </TableCell>
                            <TableCell className="text-right tabular-nums font-medium">
                              {h.creditChange > 0 ? `+${h.creditChange}` : h.creditChange}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <AddScheduleModal
        open={addOpen}
        onOpenChange={setAddOpen}
        defaults={{ clientId: id, lockClient: true, type: "therapy" }}
      />
      <SessionDetailModal schedule={selectedSession} open={sessionOpen} onOpenChange={setSessionOpen} />

      {/* Discharge dialog */}
      <Dialog open={dischargeOpen} onOpenChange={setDischargeOpen}>
        <DialogContent className="max-w-sm" data-testid="discharge-dialog">
          <DialogHeader>
            <DialogTitle>Discharge {client.clientName}</DialogTitle>
            <DialogDescription>Select a reason and add an optional note. This removes the client from the active list.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Select value={dischargeReason} onValueChange={setDischargeReason}>
              <SelectTrigger data-testid="discharge-reason-select">
                <SelectValue placeholder="Select reason..." />
              </SelectTrigger>
              <SelectContent>
                {DISCHARGE_REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Textarea
              rows={2}
              placeholder="Optional note..."
              value={dischargeNote}
              onChange={(e) => setDischargeNote(e.target.value)}
              data-testid="discharge-note-input"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDischargeOpen(false)}>Cancel</Button>
            <Button className="bg-[var(--color-danger)] hover:bg-red-600" onClick={handleDischarge} data-testid="confirm-discharge-button">
              Discharge Client
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Renew dialog */}
      <Dialog open={renewOpen} onOpenChange={setRenewOpen}>
        <DialogContent className="max-w-sm" data-testid="renew-dialog">
          <DialogHeader>
            <DialogTitle>Renew Package</DialogTitle>
            <DialogDescription>
              Creates a renewal invoice. Credits are added once the invoice is marked paid. Existing schedules are untouched.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Select value={renewKey} onValueChange={setRenewKey}>
              <SelectTrigger data-testid="renew-package-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PACKAGE_OPTIONS.map((p) => (
                  <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>
                ))}
                <SelectItem value="custom">Custom...</SelectItem>
              </SelectContent>
            </Select>
            {renewKey === "custom" && (
              <Input
                type="number"
                min="1"
                placeholder="Number of sessions"
                value={renewCustom}
                onChange={(e) => setRenewCustom(e.target.value)}
                data-testid="renew-custom-credits-input"
              />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenewOpen(false)}>Cancel</Button>
            <Button className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)]" onClick={handleCreateRenewal} data-testid="confirm-renew-button">
              Create Renewal Invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
