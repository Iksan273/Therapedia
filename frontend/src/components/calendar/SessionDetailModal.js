import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { AlertTriangle, CalendarClock, CheckCircle2, User, XCircle } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/common/StatusBadge";
import { CreditBar, LeaveInfo } from "@/components/common/CreditBar";
import { useClients } from "@/context/ClientsContext";
import { useTherapists } from "@/context/TherapistsContext";
import { useSchedules } from "@/context/SchedulesContext";
import { useCredits } from "@/context/CreditsContext";
import { TIME_OPTIONS, checkConflicts, fmtDate, timeToMin } from "@/lib/appUtils";

// Session detail sheet: complete / cancel / reschedule with credit + leave rules.
// - Completed therapy session -> deduct 1 credit (idempotent per session).
// - Cancelled/Rescheduled with reason "leave" -> no credit change, leaveUsed +1 (never blocks, only warns).
export const SessionDetailModal = ({ schedule, open, onOpenChange, clientLinkBase }) => {
  const { clients, updateClient } = useClients();
  const { therapists, getTherapist } = useTherapists();
  const { schedules, updateSchedule } = useSchedules();
  const { spendCredit, recordLeave, getRecordForClient } = useCredits();

  const [mode, setMode] = useState("view");
  const [cancelReason, setCancelReason] = useState("leave");
  const [cancelNote, setCancelNote] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newStart, setNewStart] = useState("09:00");
  const [newEnd, setNewEnd] = useState("10:00");
  const [newTherapist, setNewTherapist] = useState("");
  const [countAsLeave, setCountAsLeave] = useState(true);

  useEffect(() => {
    if (open && schedule) {
      setMode("view");
      setCancelReason("leave");
      setCancelNote("");
      setNewDate(schedule.date);
      setNewStart(schedule.startTime);
      setNewEnd(schedule.endTime);
      setNewTherapist(schedule.therapistId);
      setCountAsLeave(true);
    }
  }, [open, schedule]);

  const rescheduleConflicts = useMemo(() => {
    if (!schedule || mode !== "reschedule") return [];
    return checkConflicts({
      therapistId: newTherapist,
      date: newDate,
      startTime: newStart,
      endTime: newEnd,
      schedules,
      therapists,
      excludeId: schedule.id,
    });
  }, [schedule, mode, newTherapist, newDate, newStart, newEnd, schedules, therapists]);

  if (!schedule) return null;

  const client = clients.find((c) => c.id === schedule.clientId);
  const therapist = getTherapist(schedule.therapistId);
  const record = client ? getRecordForClient(client.id) : null;
  const actionable = schedule.status === "scheduled" || schedule.status === "rescheduled";

  const handleComplete = () => {
    updateSchedule(schedule.id, { status: "completed" });
    if (schedule.type === "therapy" && record) {
      spendCredit({ clientId: client.id, scheduleId: schedule.id, date: schedule.date });
      const after = Math.max(0, record.remainingCredit - 1);
      toast.success(`Session completed — 1 credit deducted (${after} remaining).`);
      if (after === 0) toast.warning(`${client.clientName} is now out of credit. Consider a renewal.`);
    } else {
      toast.success("Session marked as completed.");
    }
    if (schedule.type === "assessment" && client && ["pending", "assessment_scheduled", "inquiry"].includes(client.status)) {
      updateClient(client.id, { status: "assessment_done" });
      toast.info(`${client.clientName} moved to "Assessment Done" in the pipeline.`);
    }
    onOpenChange(false);
  };

  const handleCancelConfirm = () => {
    const noteSuffix = cancelNote ? ` | Cancelled: ${cancelNote}` : " | Cancelled";
    updateSchedule(schedule.id, { status: "cancelled", notes: `${schedule.notes || ""}${noteSuffix}`.trim() });
    if (cancelReason === "leave" && record) {
      recordLeave({ clientId: client.id, scheduleId: schedule.id, date: schedule.date });
      const newLeave = record.leaveUsed + 1;
      if (newLeave > record.leaveQuota) {
        toast.warning(`Leave recorded — now ${newLeave}/${record.leaveQuota} (over quota, allowed).`);
      } else {
        toast.success(`Session cancelled as leave (${newLeave}/${record.leaveQuota}). Credit preserved.`);
      }
    } else {
      toast.success("Session cancelled.");
    }
    onOpenChange(false);
  };

  const handleRescheduleConfirm = () => {
    if (!newDate || timeToMin(newEnd) <= timeToMin(newStart)) {
      toast.error("Choose a valid date and time range.");
      return;
    }
    updateSchedule(schedule.id, {
      date: newDate,
      startTime: newStart,
      endTime: newEnd,
      therapistId: newTherapist,
      status: "rescheduled",
    });
    if (countAsLeave && record) {
      recordLeave({ clientId: client.id, scheduleId: schedule.id, date: schedule.date });
      toast.success("Session rescheduled — counted as leave, credit preserved.");
    } else {
      toast.success("Session rescheduled.");
    }
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto" data-testid="session-detail-modal">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            Session Detail <StatusBadge status={schedule.status} data-testid="session-status-badge" />
          </SheetTitle>
          <SheetDescription>
            {fmtDate(schedule.date)} · {schedule.startTime}–{schedule.endTime}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-5 space-y-4">
          <div className="rounded-xl border border-[var(--color-border)] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-[var(--color-primary-light)] flex items-center justify-center">
                  <User className="w-4 h-4 text-[var(--color-primary-dark)]" />
                </div>
                <div>
                  <p className="text-sm font-semibold" data-testid="session-client-name">{client ? client.clientName : "Unknown"}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">{client ? client.parentName : ""}</p>
                </div>
              </div>
              <StatusBadge status={schedule.type} />
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <p className="text-[var(--color-text-muted)]">Therapist</p>
                <p className="font-medium">{therapist ? therapist.name : "—"}</p>
              </div>
              <div>
                <p className="text-[var(--color-text-muted)]">Recurring</p>
                <p className="font-medium">{schedule.isRecurring ? "Weekly" : "One-off"}</p>
              </div>
            </div>
            {schedule.notes && (
              <p className="text-xs text-[var(--color-text-muted)] bg-[var(--color-surface)] rounded-lg p-2">{schedule.notes}</p>
            )}
            {clientLinkBase && client && (
              <Link
                to={`${clientLinkBase}/${client.id}`}
                className="inline-block text-xs font-medium text-[var(--color-primary-dark)] hover:underline"
                data-testid="session-view-client-link"
              >
                View client profile →
              </Link>
            )}
          </div>

          {record && (
            <div className="rounded-xl border border-[var(--color-border)] p-4 space-y-2.5">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Credit Snapshot</p>
              <CreditBar remaining={record.remainingCredit} total={record.totalCredit} compact />
              <LeaveInfo leaveUsed={record.leaveUsed} leaveQuota={record.leaveQuota} />
            </div>
          )}

          {actionable && mode === "view" && (
            <div className="space-y-2">
              <Button
                className="w-full bg-[var(--color-success)] hover:bg-green-600 gap-2"
                onClick={handleComplete}
                data-testid="session-complete-button"
              >
                <CheckCircle2 className="w-4 h-4" /> Mark Completed
              </Button>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" className="gap-2" onClick={() => setMode("cancel")} data-testid="session-cancel-button">
                  <XCircle className="w-4 h-4 text-[var(--color-danger)]" /> Cancel
                </Button>
                <Button variant="outline" className="gap-2" onClick={() => setMode("reschedule")} data-testid="session-reschedule-button">
                  <CalendarClock className="w-4 h-4 text-[var(--color-warning)]" /> Reschedule
                </Button>
              </div>
            </div>
          )}

          {!actionable && (
            <p className="text-xs text-[var(--color-text-muted)] text-center bg-[var(--color-surface)] rounded-lg py-2.5">
              This session is {schedule.status}. No further actions available.
            </p>
          )}

          {mode === "cancel" && (
            <div className="rounded-xl border border-[var(--color-border)] p-4 space-y-3" data-testid="session-cancel-form">
              <p className="text-sm font-semibold">Cancel Session</p>
              <div className="space-y-1.5">
                <Label>Reason</Label>
                <Select value={cancelReason} onValueChange={setCancelReason}>
                  <SelectTrigger data-testid="session-cancel-reason-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="leave">Leave — uses leave quota, credit preserved</SelectItem>
                    <SelectItem value="other">Other — no credit / leave impact</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {cancelReason === "leave" && record && record.leaveUsed >= record.leaveQuota && (
                <p className="flex items-start gap-1.5 text-xs text-[var(--color-info)] bg-blue-50 rounded-lg p-2" data-testid="leave-over-quota-warning">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  This exceeds the leave quota ({record.leaveUsed}/{record.leaveQuota}). It is allowed — shown for awareness only.
                </p>
              )}
              <div className="space-y-1.5">
                <Label>Note (optional)</Label>
                <Textarea rows={2} value={cancelNote} onChange={(e) => setCancelNote(e.target.value)} data-testid="session-cancel-note-input" />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setMode("view")}>
                  Back
                </Button>
                <Button
                  className="flex-1 bg-[var(--color-danger)] hover:bg-red-600"
                  onClick={handleCancelConfirm}
                  data-testid="session-cancel-confirm-button"
                >
                  Confirm Cancel
                </Button>
              </div>
            </div>
          )}

          {mode === "reschedule" && (
            <div className="rounded-xl border border-[var(--color-border)] p-4 space-y-3" data-testid="session-reschedule-form">
              <p className="text-sm font-semibold">Reschedule Session</p>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1.5 col-span-3">
                  <Label>New Date</Label>
                  <Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} data-testid="session-reschedule-date-input" />
                </div>
                <div className="space-y-1.5">
                  <Label>Start</Label>
                  <Select value={newStart} onValueChange={setNewStart}>
                    <SelectTrigger data-testid="session-reschedule-start-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_OPTIONS.slice(0, -1).map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>End</Label>
                  <Select value={newEnd} onValueChange={setNewEnd}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_OPTIONS.filter((t) => timeToMin(t) > timeToMin(newStart)).map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Therapist</Label>
                  <Select value={newTherapist} onValueChange={setNewTherapist}>
                    <SelectTrigger data-testid="session-reschedule-therapist-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {therapists.map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {record && (
                <label className="flex items-center gap-2 text-xs text-[var(--color-text)]">
                  <Checkbox checked={countAsLeave} onCheckedChange={(v) => setCountAsLeave(Boolean(v))} data-testid="session-reschedule-leave-checkbox" />
                  Count as leave (credit preserved, leave +1)
                </label>
              )}
              {rescheduleConflicts.length > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 space-y-1" data-testid="reschedule-conflict-warning">
                  {rescheduleConflicts.map((c, i) => (
                    <p key={i}>• {c}</p>
                  ))}
                  <p className="italic">Warning only — you can still save.</p>
                </div>
              )}
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setMode("view")}>
                  Back
                </Button>
                <Button
                  className="flex-1 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)]"
                  onClick={handleRescheduleConfirm}
                  data-testid="session-reschedule-confirm-button"
                >
                  {rescheduleConflicts.length > 0 ? "Save Anyway" : "Save Reschedule"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
