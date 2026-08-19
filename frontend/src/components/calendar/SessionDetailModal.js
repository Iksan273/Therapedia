import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { AlertTriangle, CalendarClock, CheckCircle2, User, XCircle, FileText, ArrowRight } from "lucide-react";
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
  const [completeNote, setCompleteNote] = useState("");
  const [editingNote, setEditingNote] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");

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
      setCompleteNote("");
      setEditingNote(false);
      setNoteDraft(schedule.progressNote || "");
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
    updateSchedule(schedule.id, { status: "completed", progressNote: completeNote.trim() || schedule.progressNote || null });
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
      <SheetContent className="w-full sm:max-w-md overflow-y-auto p-6" data-testid="session-detail-modal">
        <SheetHeader>
          <div className="flex items-center justify-between gap-2">
            <SheetTitle className="text-xl font-bold text-slate-900 flex items-center gap-2.5">
              Session Detail
            </SheetTitle>
            <StatusBadge status={schedule.status} data-testid="session-status-badge" />
          </div>
          <SheetDescription className="text-xs text-slate-500">
            {fmtDate(schedule.date)} · <span className="font-semibold text-slate-700 tabular-nums">{schedule.startTime}–{schedule.endTime}</span>
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          <div className="rounded-2xl border border-slate-200/90 p-4 space-y-3.5 bg-slate-50/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-800 flex items-center justify-center font-bold text-sm">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900" data-testid="session-client-name">{client ? client.clientName : "Unknown"}</p>
                  <p className="text-xs text-slate-500">Parent: {client ? client.parentName : "—"}</p>
                </div>
              </div>
              <StatusBadge status={schedule.type} />
            </div>
            <Separator className="bg-slate-200" />
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <p className="text-slate-400 font-medium text-[11px] uppercase tracking-wider">Therapist</p>
                <p className="font-bold text-slate-800 mt-0.5">{therapist ? therapist.name : "—"}</p>
              </div>
              <div>
                <p className="text-slate-400 font-medium text-[11px] uppercase tracking-wider">Schedule Type</p>
                <p className="font-bold text-slate-800 mt-0.5">{schedule.isRecurring ? "Weekly Recurring" : "One-off Session"}</p>
              </div>
            </div>
            {schedule.notes && (
              <p className="text-xs text-slate-600 bg-white rounded-xl border border-slate-200/80 p-2.5 leading-relaxed">{schedule.notes}</p>
            )}
            {clientLinkBase && client && (
              <Link
                to={`${clientLinkBase}/${client.id}`}
                className="inline-flex items-center gap-1 text-xs font-bold text-sky-700 hover:text-sky-800 hover:underline pt-1"
                data-testid="session-view-client-link"
              >
                View Full Client Profile <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>

          {record && (
            <div className="rounded-2xl border border-slate-200/90 p-4 space-y-3 bg-white shadow-2xs">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Package & Attendance Snapshot</p>
              <CreditBar remaining={record.remainingCredit} total={record.totalCredit} compact />
              <LeaveInfo leaveUsed={record.leaveUsed} leaveQuota={record.leaveQuota} />
            </div>
          )}

          {actionable && mode === "view" && (
            <div className="space-y-2.5 pt-2">
              <Button
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl gap-2 h-10 shadow-sm shadow-emerald-600/20"
                onClick={() => setMode("complete")}
                data-testid="session-complete-button"
              >
                <CheckCircle2 className="w-4 h-4" /> Mark Completed & Spend Credit
              </Button>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" className="gap-2 rounded-xl border-slate-200 text-slate-700 font-semibold h-9.5 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200" onClick={() => setMode("cancel")} data-testid="session-cancel-button">
                  <XCircle className="w-4 h-4 text-rose-500" /> Cancel
                </Button>
                <Button variant="outline" className="gap-2 rounded-xl border-slate-200 text-slate-700 font-semibold h-9.5 hover:bg-amber-50 hover:text-amber-800 hover:border-amber-200" onClick={() => setMode("reschedule")} data-testid="session-reschedule-button">
                  <CalendarClock className="w-4 h-4 text-amber-500" /> Reschedule
                </Button>
              </div>
            </div>
          )}

          {!actionable && schedule.status !== "completed" && (
            <p className="text-xs text-slate-500 font-medium text-center bg-slate-100 rounded-xl py-3 border border-slate-200">
              This session is status <span className="font-bold text-slate-800">{schedule.status}</span>. No further direct action required.
            </p>
          )}

          {/* Progress note for completed sessions */}
          {schedule.status === "completed" && (
            <div className="rounded-2xl border border-slate-200/90 p-4 space-y-3 bg-white shadow-2xs" data-testid="session-progress-note-section">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-sky-600" /> Clinical Progress Note
                </p>
                {!editingNote && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs font-bold text-sky-700 hover:bg-sky-50 rounded-lg"
                    onClick={() => {
                      setNoteDraft(schedule.progressNote || "");
                      setEditingNote(true);
                    }}
                    data-testid="session-edit-note-button"
                  >
                    {schedule.progressNote ? "Edit Note" : "+ Add Note"}
                  </Button>
                )}
              </div>
              {editingNote ? (
                <div className="space-y-2.5">
                  <Textarea
                    rows={3}
                    className="rounded-xl border-slate-200 text-xs bg-slate-50 focus:bg-white"
                    value={noteDraft}
                    onChange={(e) => setNoteDraft(e.target.value)}
                    placeholder="Document clinical observations, milestones reached, homework assignments..."
                    data-testid="session-note-edit-input"
                  />
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1 rounded-xl border-slate-200 text-xs" onClick={() => setEditingNote(false)}>
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl text-xs"
                      onClick={() => {
                        updateSchedule(schedule.id, { progressNote: noteDraft.trim() || null });
                        setEditingNote(false);
                        toast.success("Progress note saved.");
                      }}
                      data-testid="session-note-save-button"
                    >
                      Save Note
                    </Button>
                  </div>
                </div>
              ) : schedule.progressNote ? (
                <p className="text-xs text-slate-700 bg-slate-50 rounded-xl p-3 border border-slate-200/80 leading-relaxed" data-testid="session-progress-note-text">
                  {schedule.progressNote}
                </p>
              ) : (
                <p className="text-xs text-slate-400 italic">No progress note recorded yet — add observations for parent updates and reports.</p>
              )}
            </div>
          )}

          {mode === "complete" && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 space-y-3.5" data-testid="session-complete-form">
              <p className="text-sm font-bold text-emerald-950">Confirm Session Completion</p>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Clinical Progress Note (Optional)</Label>
                <Textarea
                  rows={3}
                  className="rounded-xl border-slate-200 bg-white text-xs"
                  value={completeNote}
                  onChange={(e) => setCompleteNote(e.target.value)}
                  placeholder="How did the session go? Observations, sensory responses, next steps..."
                  data-testid="session-complete-note-input"
                />
                <p className="text-[10px] text-slate-500">Will be stored in client attendance history and printable reports.</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 rounded-xl border-slate-200" onClick={() => setMode("view")}>
                  Back
                </Button>
                <Button
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl"
                  onClick={handleComplete}
                  data-testid="session-complete-confirm-button"
                >
                  Confirm Done
                </Button>
              </div>
            </div>
          )}

          {mode === "cancel" && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50/40 p-4 space-y-3.5" data-testid="session-cancel-form">
              <p className="text-sm font-bold text-rose-950">Cancel Session</p>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Cancellation Reason</Label>
                <Select value={cancelReason} onValueChange={setCancelReason}>
                  <SelectTrigger className="rounded-xl border-slate-200 bg-white text-xs" data-testid="session-cancel-reason-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200">
                    <SelectItem value="leave">Leave — Uses leave quota, credit preserved</SelectItem>
                    <SelectItem value="other">Other Reason — No credit or quota impact</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {cancelReason === "leave" && record && record.leaveUsed >= record.leaveQuota && (
                <p className="flex items-start gap-1.5 text-xs text-sky-800 bg-sky-100 rounded-xl p-2.5 font-medium" data-testid="leave-over-quota-warning">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-sky-600 mt-0.5" />
                  Leave quota exceeded ({record.leaveUsed}/{record.leaveQuota}). Allowed per clinic policy for record keeping.
                </p>
              )}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Cancellation Note (Optional)</Label>
                <Textarea rows={2} className="rounded-xl border-slate-200 bg-white text-xs" value={cancelNote} onChange={(e) => setCancelNote(e.target.value)} data-testid="session-cancel-note-input" />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 rounded-xl border-slate-200" onClick={() => setMode("view")}>
                  Back
                </Button>
                <Button
                  className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl"
                  onClick={handleCancelConfirm}
                  data-testid="session-cancel-confirm-button"
                >
                  Confirm Cancel
                </Button>
              </div>
            </div>
          )}

          {mode === "reschedule" && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4 space-y-3.5" data-testid="session-reschedule-form">
              <p className="text-sm font-bold text-amber-950">Reschedule Session</p>
              <div className="grid grid-cols-3 gap-2.5">
                <div className="space-y-1.5 col-span-3">
                  <Label className="text-xs font-bold text-slate-700">New Session Date</Label>
                  <Input type="date" className="rounded-xl border-slate-200 bg-white text-xs" value={newDate} onChange={(e) => setNewDate(e.target.value)} data-testid="session-reschedule-date-input" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Start Time</Label>
                  <Select value={newStart} onValueChange={setNewStart}>
                    <SelectTrigger className="rounded-xl border-slate-200 bg-white text-xs" data-testid="session-reschedule-start-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-slate-200">
                      {TIME_OPTIONS.slice(0, -1).map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">End Time</Label>
                  <Select value={newEnd} onValueChange={setNewEnd}>
                    <SelectTrigger className="rounded-xl border-slate-200 bg-white text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-slate-200">
                      {TIME_OPTIONS.filter((t) => timeToMin(t) > timeToMin(newStart)).map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Therapist</Label>
                  <Select value={newTherapist} onValueChange={setNewTherapist}>
                    <SelectTrigger className="rounded-xl border-slate-200 bg-white text-xs" data-testid="session-reschedule-therapist-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-slate-200">
                      {therapists.map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {record && (
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer pt-1">
                  <Checkbox checked={countAsLeave} onCheckedChange={(v) => setCountAsLeave(Boolean(v))} data-testid="session-reschedule-leave-checkbox" />
                  Count as leave (Preserves session credit, counts +1 leave)
                </label>
              )}
              {rescheduleConflicts.length > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-100/70 p-2.5 text-xs text-amber-900 space-y-1" data-testid="reschedule-conflict-warning">
                  {rescheduleConflicts.map((c, i) => (
                    <p key={i}>• {c}</p>
                  ))}
                  <p className="italic text-[11px]">Conflict warning only — saving will override.</p>
                </div>
              )}
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 rounded-xl border-slate-200" onClick={() => setMode("view")}>
                  Back
                </Button>
                <Button
                  className="flex-1 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl"
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

