import React, { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft,
  BadgeCheck,
  Ban,
  Check,
  Copy,
  FileText,
  KeyRound,
  Phone,
  Mail,
  Receipt,
  Repeat,
  Search,
  UserCheck,
  Printer,
  Calendar,
  CalendarPlus,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { EmptyState } from "@/components/common/EmptyState";
import { AddScheduleModal } from "@/components/calendar/AddScheduleModal";
import { useClients } from "@/context/ClientsContext";
import { useSchedules } from "@/context/SchedulesContext";
import { useCredits } from "@/context/CreditsContext";
import { useAssessments } from "@/context/AssessmentsContext";
import { useTherapists } from "@/context/TherapistsContext";
import {
  DISCHARGE_REASONS,
  PACKAGE_OPTIONS,
  CONCERN_TAGS,
  SESSION_TYPES,
  calcAge,
  fmtDate,
  genCode,
  todayStr,
  uid,
} from "@/lib/appUtils";
import { cn } from "@/lib/utils";

const Step = ({ index, title, done, muted, isLast = false, children }) => (
  <div className={cn("flex gap-4 sm:gap-5", muted && "opacity-60")}>
    <div className="flex flex-col items-center">
      <div
        className={cn(
          "w-9 h-9 rounded-2xl flex items-center justify-center text-xs font-bold shrink-0 transition-all duration-200 shadow-xs",
          done
            ? "bg-emerald-600 text-white shadow-emerald-600/20"
            : muted
            ? "bg-slate-100 text-slate-400 border border-slate-200"
            : "bg-sky-50 text-sky-700 border-2 border-sky-400/80 shadow-sky-600/10"
        )}
      >
        {done ? <Check className="w-4 h-4 stroke-[3]" /> : index}
      </div>
      {!isLast && <div className="w-0.5 flex-1 bg-slate-200 my-1.5" />}
    </div>
    <div className="pb-8 flex-1 min-w-0">
      <p className="text-sm font-bold text-slate-900 mb-2.5 mt-1">{title}</p>
      {children}
    </div>
  </div>
);

export default function ClientDetailInquiry() {
  const { id } = useParams();
  const { clients, updateClient } = useClients();
  const { schedules, updateSchedule } = useSchedules();
  const { addRecord } = useCredits();
  const { categories, getCategory } = useAssessments();
  const { getTherapist } = useTherapists();

  const client = clients.find((c) => c.id === id);

  const [selCategory, setSelCategory] = useState("");
  const [reportText, setReportText] = useState(null);
  const [invoiceAmount, setInvoiceAmount] = useState("");
  const [proofText, setProofText] = useState("");
  const [paidDialogOpen, setPaidDialogOpen] = useState(false);
  const [scheduleModal, setScheduleModal] = useState({ open: false, defaults: {} });
  const [admitOpen, setAdmitOpen] = useState(false);
  const [packageKey, setPackageKey] = useState("10");
  const [customCredits, setCustomCredits] = useState("");
  const [discOpen, setDiscOpen] = useState(false);
  const [discReason, setDiscReason] = useState("");
  const [discNote, setDiscNote] = useState("");

  const assessmentSchedules = useMemo(
    () => schedules.filter((s) => s.clientId === id && s.type === "assessment"),
    [schedules, id]
  );
  const therapySchedules = useMemo(
    () => schedules.filter((s) => s.clientId === id && s.type === "therapy"),
    [schedules, id]
  );

  if (!client) {
    return (
      <EmptyState
        icon={Search}
        title="Client not found"
        subtitle="This client may have been removed after a demo reset."
        action={
          <Link to="/admin-inquiry/pipeline">
            <Button variant="outline">Back to pipeline</Button>
          </Link>
        }
      />
    );
  }

  const category = getCategory(client.assessmentCategoryId);
  const isConsultation = client.serviceType === "consultation";
  const assessmentCompleted = assessmentSchedules.some((s) => s.status === "completed");
  const isTerminal = ["admitted", "discontinued", "discharged"].includes(client.status);
  const answersFilled = client.assessmentAnswers && client.assessmentAnswers.length > 0;

  const handleServiceType = (value) => {
    updateClient(id, {
      serviceType: value,
      status: client.status === "inquiry" ? "pending" : client.status,
    });
    toast.success(`Service type set to ${value}.`);
  };

  const handleGenerateCode = () => {
    const catId = selCategory || client.assessmentCategoryId;
    if (!catId) {
      toast.error("Choose an assessment category first.");
      return;
    }
    const code = genCode("ASM");
    updateClient(id, { assessmentCategoryId: catId, assessmentAccessCode: code });
    toast.success(`Assessment code ${code} generated — simulated as sent to ${client.parentName}.`);
  };

  const copyCode = (text) => {
    navigator.clipboard.writeText(text).then(
      () => toast.success("Copied to clipboard."),
      () => toast.error("Copy failed — note it manually.")
    );
  };

  const handleMarkAssessmentCompleted = (sched) => {
    updateSchedule(sched.id, { status: "completed" });
    if (["pending", "assessment_scheduled", "inquiry"].includes(client.status)) {
      updateClient(id, { status: "assessment_done" });
    }
    toast.success("Assessment session marked completed.");
  };

  const handleSaveReport = () => {
    const text = reportText != null ? reportText : client.assessmentReportNote || "";
    if (!text.trim()) {
      toast.error("Write the report note first.");
      return;
    }
    updateClient(id, {
      assessmentReportNote: text.trim(),
      status: ["pending", "assessment_scheduled", "assessment_done"].includes(client.status)
        ? "report_ready"
        : client.status,
    });
    toast.success("Assessment report saved.");
  };

  const handleCreateInvoice = () => {
    const amount = Number(invoiceAmount);
    if (!amount || amount <= 0) {
      toast.error("Enter a valid invoice amount.");
      return;
    }
    updateClient(id, { invoice: { id: uid(), amount, status: "unpaid", proofOfPaymentUrl: null } });
    toast.success(`Invoice of $${amount} created (unpaid).`);
  };

  const handleMarkPaid = () => {
    updateClient(id, {
      invoice: { ...client.invoice, status: "paid", proofOfPaymentUrl: proofText.trim() || "proof-of-payment.txt" },
    });
    setPaidDialogOpen(false);
    toast.success("Invoice marked as paid.");
  };

  const handleAdmit = () => {
    let creditsAmount;
    let packageName;
    if (packageKey === "custom") {
      creditsAmount = Number(customCredits);
      packageName = `Custom (${creditsAmount} sessions)`;
      if (!creditsAmount || creditsAmount <= 0) {
        toast.error("Enter a valid custom package size.");
        return;
      }
    } else {
      const opt = PACKAGE_OPTIONS.find((p) => p.key === packageKey);
      creditsAmount = opt.credits;
      packageName = opt.label.split(" (")[0];
    }
    addRecord({
      id: uid(),
      clientId: id,
      packageName,
      totalCredit: creditsAmount,
      remainingCredit: creditsAmount,
      leaveQuota: 3,
      leaveUsed: 0,
      purchaseDate: todayStr(),
      isRenewal: false,
      invoiceId: client.invoice ? client.invoice.id : null,
      history: [],
    });
    updateClient(id, { status: "admitted", dateOfJoin: todayStr(), isWaitingList: false });
    setAdmitOpen(false);
    toast.success(`${client.clientName} admitted with ${creditsAmount} credits!`);
  };

  const handleDiscontinue = () => {
    if (!discReason) {
      toast.error("Select a reason to discontinue.");
      return;
    }
    updateClient(id, {
      status: "discontinued",
      dischargeReason: discReason,
      dischargeNote: discNote.trim() || null,
      dateOfDischarge: todayStr(),
    });
    setDiscOpen(false);
    toast.success("Client marked as discontinued.");
  };

  return (
    <div className="max-w-4xl space-y-6" data-testid="client-detail-inquiry-page">
      <Link
        to="/admin-inquiry/pipeline"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-sky-700 transition-colors group"
        data-testid="client-detail-back-link"
      >
        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
        Back to Intake Pipeline
      </Link>

      {/* Patient Profile Card */}
      <Card className="clinical-card rounded-2xl border-slate-200/90 overflow-hidden">
        <div className="h-2 w-full bg-gradient-to-r from-sky-500 via-teal-500 to-indigo-500" />
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-5">
            <div className="flex items-start gap-4">
              <div className="w-13 h-13 rounded-2xl bg-sky-100 text-sky-800 font-bold text-xl flex items-center justify-center shrink-0 border border-sky-200/80 shadow-xs">
                {client.clientName[0]}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900" data-testid="client-detail-name">
                    {client.clientName}
                  </h1>
                  <StatusBadge status={client.status} data-testid="client-detail-status-badge" />
                </div>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Age {calcAge(client.dob) != null ? calcAge(client.dob) : "—"} · DOB {fmtDate(client.dob)} · Intake {fmtDate(client.createdAt)}
                </p>
                <div className="flex flex-wrap items-center gap-4 mt-3 text-xs sm:text-sm text-slate-600">
                  <span className="flex items-center gap-1.5 font-medium">
                    <UserCheck className="w-4 h-4 text-sky-600" /> {client.parentName}
                  </span>
                  <span className="flex items-center gap-1.5 font-medium">
                    <Phone className="w-4 h-4 text-sky-600" /> {client.parentContact}
                  </span>
                  <span className="flex items-center gap-1.5 font-medium">
                    <Mail className="w-4 h-4 text-sky-600" /> {client.parentEmail}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:items-end gap-2 shrink-0">
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 text-center sm:text-right">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Access Code</p>
                <button
                  type="button"
                  onClick={() => copyCode(client.clientAccessCode)}
                  className="font-mono text-sm font-bold text-sky-700 hover:text-sky-800 flex items-center gap-1.5 mt-0.5 justify-center sm:justify-end"
                  data-testid="client-detail-access-code"
                >
                  {client.clientAccessCode}
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                </button>
              </div>
              <Link to={`/print/client/${id}`} className="w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-1.5 rounded-xl border-slate-200 text-xs font-semibold text-slate-700 hover:bg-sky-50 hover:text-sky-800"
                  data-testid="inquiry-print-report-button"
                >
                  <Printer className="w-3.5 h-3.5" /> Print Summary Report
                </Button>
              </Link>
            </div>
          </div>

          {client.parentComplaint && (
            <div className="mt-4 rounded-xl bg-amber-50/70 border border-amber-200/80 p-3.5" data-testid="client-detail-complaint">
              <p className="text-[11px] font-bold uppercase tracking-wider text-amber-800 mb-1">
                Parent Concerns & Intake Notes:
              </p>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed italic">
                “{client.parentComplaint}”
              </p>
            </div>
          )}

          <div className="mt-4 pt-3 border-t border-slate-100">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              Concern Tags <span className="normal-case font-normal">(Click to toggle tags)</span>
            </p>
            <div className="flex flex-wrap gap-1.5" data-testid="concern-tags-editor">
              {CONCERN_TAGS.map((t) => {
                const active = (client.concernTags || []).includes(t.value);
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => {
                      const cur = client.concernTags || [];
                      updateClient(id, {
                        concernTags: active ? cur.filter((v) => v !== t.value) : [...cur, t.value],
                      });
                    }}
                    className={cn(
                      "rounded-full px-3 py-1 text-xs font-semibold border transition-all cursor-pointer",
                      active
                        ? `${t.cls} ring-1 ring-inset shadow-xs`
                        : "bg-white border-slate-200 text-slate-400 opacity-60 hover:opacity-100 hover:border-slate-300"
                    )}
                    data-testid={`concern-tag-toggle-${t.value}`}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          {client.status === "admitted" && (
            <div className="mt-4 rounded-xl bg-emerald-50 border border-emerald-200 p-3.5 text-sm text-emerald-800 flex items-center gap-2.5 font-medium" data-testid="client-admitted-banner">
              <BadgeCheck className="w-5 h-5 text-emerald-600 shrink-0" />
              Admitted on {fmtDate(client.dateOfJoin)}. Sessions and credits are actively managed from Admin Schedule.
            </div>
          )}
          {client.status === "discontinued" && (
            <div className="mt-4 rounded-xl bg-rose-50 border border-rose-200 p-3.5 text-sm text-rose-800 flex items-center gap-2.5 font-medium" data-testid="client-discontinued-banner">
              <Ban className="w-5 h-5 text-rose-600 shrink-0" />
              Discontinued on {fmtDate(client.dateOfDischarge)}{client.dischargeNote ? ` — ${client.dischargeNote}` : ""}.
            </div>
          )}
        </CardContent>
      </Card>

      {/* 8-Step Admission Timeline Checklist */}
      <Card className="clinical-card rounded-2xl border-slate-200/90">
        <CardHeader className="border-b border-slate-100 pb-4">
          <CardTitle className="text-base font-bold text-slate-900">Clinical Intake & Admission Timeline</CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Step-by-step intake progression from service classification to final clinic admission.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          {/* Step 1: Multi-Service Discipline Selection */}
          <Step
            index={1}
            title="1. Clinical Services & Disciplines"
            done={Boolean((client.serviceTypes && client.serviceTypes.length > 0) || client.serviceType)}
          >
            <div className="space-y-2">
              <p className="text-xs text-slate-500 font-medium">
                Select one or more active therapy disciplines and clinical programs for this client:
              </p>
              <div className="flex flex-wrap gap-1.5" data-testid="service-type-multi-select">
                {SESSION_TYPES.map((srv) => {
                  const currentServices = client.serviceTypes || (client.serviceType ? [client.serviceType] : []);
                  const active = currentServices.includes(srv.value);

                  return (
                    <button
                      key={srv.value}
                      type="button"
                      disabled={isTerminal}
                      onClick={() => {
                        let updated;
                        if (active) {
                          if (currentServices.length === 1) return; // Keep at least one
                          updated = currentServices.filter((v) => v !== srv.value);
                        } else {
                          updated = [...currentServices, srv.value];
                        }
                        updateClient(id, {
                          serviceTypes: updated,
                          serviceType: updated[0] || "assessment",
                          status: client.status === "inquiry" ? "pending" : client.status,
                        });
                        toast.success(`Updated clinical services for ${client.clientName}.`);
                      }}
                      className={cn(
                        "px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer",
                        active
                          ? "bg-sky-600 border-sky-600 text-white shadow-2xs"
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      )}
                    >
                      {srv.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </Step>

          {/* Step 2: Assessment Category & Access Code */}
          <Step
            index={2}
            title="2. Assessment Category & Parent Access Code"
            done={Boolean(client.assessmentAccessCode)}
            muted={isConsultation}
          >
            {isConsultation ? (
              <p className="text-xs text-slate-400 italic">Not applicable for direct consultation services.</p>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2.5">
                  <Select
                    value={selCategory || client.assessmentCategoryId || ""}
                    onValueChange={setSelCategory}
                    disabled={isTerminal}
                  >
                    <SelectTrigger className="w-64 bg-white border-slate-200 rounded-xl" data-testid="assessment-category-select">
                      <SelectValue placeholder="Choose assessment category..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-slate-200">
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.categoryName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    onClick={handleGenerateCode}
                    disabled={isTerminal}
                    className="gap-2 rounded-xl border-slate-200 font-semibold text-slate-700 hover:bg-sky-50 hover:text-sky-800"
                    data-testid="generate-assessment-code-button"
                  >
                    <KeyRound className="w-4 h-4 text-sky-600" />
                    {client.assessmentAccessCode ? "Regenerate Code" : "Generate Code"}
                  </Button>
                </div>
                {client.assessmentAccessCode && (
                  <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-sky-50/80 border border-sky-200 flex-wrap">
                    <span className="font-mono text-sm font-black bg-white text-sky-900 border border-sky-300 rounded-lg px-3 py-1.5 shadow-2xs" data-testid="assessment-access-code-chip">
                      {client.assessmentAccessCode}
                    </span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 rounded-lg hover:bg-sky-100"
                      onClick={() => copyCode(client.assessmentAccessCode)}
                      aria-label="Copy assessment code"
                      data-testid="copy-assessment-code-button"
                    >
                      <Copy className="w-4 h-4 text-sky-700" />
                    </Button>
                    <span className="text-xs text-sky-800 font-medium">
                      Code ready for parent to complete assessment questionnaire before appointment.
                    </span>
                  </div>
                )}
              </div>
            )}
          </Step>

          {/* Step 3: Fast-Track Unified Assessment Scheduling */}
          <Step
            index={3}
            title="3. Schedule Assessment Session & Parent Confirmation"
            done={assessmentSchedules.length > 0}
            muted={isConsultation}
          >
            {isConsultation ? (
              <p className="text-xs text-slate-400 italic">Not applicable for consultation services.</p>
            ) : (
              <div className="space-y-3">
                {assessmentSchedules.map((s) => {
                  const t = getTherapist(s.therapistId);
                  const cleanPhone = client.parentContact ? client.parentContact.replace(/[^0-9]/g, "") : "";
                  const waMsg = encodeURIComponent(
                    `Hello ${client.parentName},\n\nThe clinical assessment appointment for ${client.clientName} has been confirmed at Therapedia:\n📅 Date: ${fmtDate(s.date)}\n⏰ Time: ${s.startTime} - ${s.endTime}\n👨‍⚕️ Therapist: ${t ? t.name : "Clinical Specialist"}\n🔑 Questionnaire Access Code: *${client.assessmentAccessCode || client.clientAccessCode}*\n\nPlease complete the intake questionnaire on the portal before your session. Thank you!`
                  );
                  return (
                    <div
                      key={s.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-sky-200/90 bg-sky-50/40 p-4 text-sm shadow-2xs"
                      data-testid={`assessment-schedule-row-${s.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-800 flex items-center justify-center font-bold">
                          <Calendar className="w-4 h-4 text-sky-600" />
                        </div>
                        <div>
                          <p className="font-extrabold text-slate-900 text-xs sm:text-sm">{fmtDate(s.date)} · <span className="tabular-nums font-semibold text-slate-600">{s.startTime}–{s.endTime}</span></p>
                          <p className="text-xs text-slate-500 font-medium mt-0.5">Therapist: <strong className="text-slate-800">{t ? t.name : "Assigned Practitioner"}</strong></p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge status={s.status} />
                        {cleanPhone && (
                          <a
                            href={`https://wa.me/${cleanPhone}?text=${waMsg}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-2xs transition-colors"
                            title="Send WhatsApp Confirmation with Appointment & Assessment Code"
                          >
                            <Send className="w-3.5 h-3.5" /> Send WA Invite
                          </a>
                        )}
                        {s.status === "scheduled" && !isTerminal && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs font-semibold rounded-xl border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                            onClick={() => handleMarkAssessmentCompleted(s)}
                            data-testid={`mark-assessment-completed-${s.id}`}
                          >
                            <Check className="w-3.5 h-3.5 mr-1" /> Mark Done
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {!isTerminal && (
                  <div className="flex flex-wrap items-center gap-2.5">
                    <Button
                      className="gap-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl text-xs h-10 shadow-xs"
                      onClick={() => {
                        // Auto generate code if not yet generated
                        if (!client.assessmentAccessCode) {
                          const catId = selCategory || client.assessmentCategoryId || (categories[0] ? categories[0].id : null);
                          const code = genCode("ASM");
                          updateClient(id, { assessmentCategoryId: catId, assessmentAccessCode: code });
                        }
                        setScheduleModal({
                          open: true,
                          defaults: { clientId: id, lockClient: true, type: "assessment", lockType: true },
                          onCreated: () => updateClient(id, { status: "assessment_scheduled" }),
                        });
                      }}
                      data-testid="offer-schedule-button"
                    >
                      <CalendarPlus className="w-4 h-4" /> Book Assessment Slot Now
                    </Button>
                    <span className="text-xs text-slate-400 font-medium">
                      Locks therapist timetable slot & marks pipeline as Assessment Scheduled.
                    </span>
                  </div>
                )}
              </div>
            )}
          </Step>

          {/* Step 4: Parent Assessment Answers */}
          <Step index={4} title="4. Parent Assessment Answers" done={answersFilled} muted={isConsultation}>
            {isConsultation ? (
              <p className="text-xs text-slate-400 italic">Not applicable for consultation services.</p>
            ) : answersFilled && category ? (
              <div className="space-y-2" data-testid="assessment-answers-list">
                {client.assessmentAnswers.map((a) => {
                  const q = category.questions.find((qq) => qq.id === a.questionId);
                  return (
                    <div key={a.questionId} className="rounded-xl bg-slate-50 border border-slate-200/80 p-3">
                      <p className="text-xs font-bold text-slate-600">{q ? q.question : a.questionId}</p>
                      <p className="text-sm font-semibold text-slate-900 mt-1">{a.answer}</p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500">
                Awaiting parent submission with access code{" "}
                <span className="font-mono font-bold text-sky-700">{client.assessmentAccessCode || "..."}</span>.
              </div>
            )}
          </Step>

          {/* Step 5: Clinical Assessment Report */}
          <Step
            index={5}
            title="5. Clinical Findings & Assessment Report"
            done={Boolean(client.assessmentReportNote)}
            muted={isConsultation}
          >
            {isConsultation ? (
              <p className="text-xs text-slate-400 italic">Not applicable for consultation services.</p>
            ) : !assessmentCompleted && !client.assessmentReportNote ? (
              <p className="text-xs text-slate-400 italic">
                Report editor becomes available once the assessment session is completed.
              </p>
            ) : (
              <div className="space-y-2.5">
                <Textarea
                  rows={3}
                  className="bg-white border-slate-200 rounded-xl"
                  value={reportText != null ? reportText : client.assessmentReportNote || ""}
                  onChange={(e) => setReportText(e.target.value)}
                  placeholder="Summarize assessment findings, sensory/motor goals, and recommended weekly therapy frequency..."
                  disabled={isTerminal && !client.assessmentReportNote}
                  data-testid="assessment-report-textarea"
                />
                {!isTerminal && (
                  <Button
                    variant="outline"
                    className="gap-2 rounded-xl border-slate-200 font-semibold text-xs"
                    onClick={handleSaveReport}
                    data-testid="save-report-button"
                  >
                    <FileText className="w-4 h-4 text-sky-600" /> Save Report Note
                  </Button>
                )}
              </div>
            )}
          </Step>

          {/* Step 6: Invoice & Payment */}
          <Step index={6} title="6. Invoice & Payment Settlement" done={Boolean(client.invoice && client.invoice.status === "paid")}>
            {!client.invoice ? (
              <div className="flex flex-wrap gap-2.5 items-center">
                <Input
                  type="number"
                  min="1"
                  className="w-36 bg-white border-slate-200 rounded-xl"
                  placeholder="Amount ($)"
                  value={invoiceAmount}
                  onChange={(e) => setInvoiceAmount(e.target.value)}
                  disabled={isTerminal}
                  data-testid="invoice-amount-input"
                />
                <Button
                  variant="outline"
                  className="gap-2 rounded-xl border-slate-200 font-semibold text-xs text-slate-700 hover:bg-sky-50"
                  onClick={handleCreateInvoice}
                  disabled={isTerminal}
                  data-testid="create-invoice-button"
                >
                  <Receipt className="w-4 h-4 text-sky-600" /> Issue Invoice
                </Button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-3">
                  <span className="text-base font-bold text-slate-900 tabular-nums">${client.invoice.amount}</span>
                  <StatusBadge status={client.invoice.status} data-testid="invoice-status-badge" />
                  {client.invoice.proofOfPaymentUrl && (
                    <span className="text-xs text-slate-500 font-medium">Receipt: {client.invoice.proofOfPaymentUrl}</span>
                  )}
                </div>
                {client.invoice.status === "unpaid" && !isTerminal && (
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs"
                    onClick={() => setPaidDialogOpen(true)}
                    data-testid="mark-paid-button"
                  >
                    Mark as Paid
                  </Button>
                )}
              </div>
            )}
          </Step>

          {/* Step 7: Schedule Therapy Sessions */}
          <Step index={7} title="7. Schedule Therapy Sessions" done={therapySchedules.length > 0}>
            <div className="space-y-2.5">
              {therapySchedules.length > 0 && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  {therapySchedules.length} therapy session slot(s) placed on timetable.
                </div>
              )}
              {!isTerminal && (
                <Button
                  variant="outline"
                  className="gap-2 rounded-xl border-slate-200 font-semibold text-xs text-slate-700 hover:bg-sky-50"
                  onClick={() =>
                    setScheduleModal({
                      open: true,
                      defaults: { clientId: id, lockClient: true, type: "therapy", lockType: true, defaultRecurring: true },
                      onCreated: () => updateClient(id, { status: "scheduling" }),
                    })
                  }
                  data-testid="set-recurring-schedule-button"
                >
                  <Repeat className="w-4 h-4 text-sky-600" /> Schedule Therapy Sessions
                </Button>
              )}
            </div>
          </Step>

          {/* Step 8: Final Decision (Admit / Discontinue) */}
          <Step index={8} title="8. Final Admission Decision" isLast={true} done={isTerminal}>
            {isTerminal ? (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-xs font-bold text-slate-600">Decision Outcome:</span>
                <StatusBadge status={client.status} />
              </div>
            ) : (
              <div className="flex flex-wrap gap-3">
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl gap-2 shadow-sm shadow-emerald-600/20"
                  onClick={() => setAdmitOpen(true)}
                  data-testid="admit-client-button"
                >
                  <UserCheck className="w-4 h-4" /> Admit to Clinic Care
                </Button>
                <Button
                  variant="outline"
                  className="gap-2 rounded-xl text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700 font-semibold"
                  onClick={() => setDiscOpen(true)}
                  data-testid="discontinue-client-button"
                >
                  <Ban className="w-4 h-4" /> Discontinue Inquiry
                </Button>
              </div>
            )}
          </Step>
        </CardContent>
      </Card>

      {/* Offer / Recurring schedule modal */}
      <AddScheduleModal
        open={scheduleModal.open}
        onOpenChange={(open) => setScheduleModal((m) => ({ ...m, open }))}
        defaults={scheduleModal.defaults}
        onCreated={scheduleModal.onCreated}
      />

      {/* Mark paid dialog */}
      <Dialog open={paidDialogOpen} onOpenChange={setPaidDialogOpen}>
        <DialogContent className="max-w-sm rounded-2xl p-6 border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">Mark Invoice as Paid</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Attach proof of payment or reference number for billing compliance.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <Input
              className="rounded-xl border-slate-200 bg-slate-50 focus:bg-white"
              placeholder="e.g. transfer-receipt-4921.pdf"
              value={proofText}
              onChange={(e) => setProofText(e.target.value)}
              data-testid="proof-of-payment-input"
            />
          </div>
          <DialogFooter className="mt-4 gap-2">
            <Button variant="outline" className="rounded-xl border-slate-200" onClick={() => setPaidDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl"
              onClick={handleMarkPaid}
              data-testid="confirm-mark-paid-button"
            >
              Confirm Settlement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Admit dialog */}
      <Dialog open={admitOpen} onOpenChange={setAdmitOpen}>
        <DialogContent className="max-w-md rounded-2xl p-6 border-slate-200" data-testid="admit-dialog">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">Admit {client.clientName}</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Select the initial therapy package. Session credits will be initialized into the active roster.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3.5 pt-2">
            <Label className="text-xs font-bold text-slate-700">Initial Therapy Package</Label>
            <Select value={packageKey} onValueChange={setPackageKey}>
              <SelectTrigger className="rounded-xl border-slate-200 bg-slate-50 focus:bg-white" data-testid="admit-package-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-200">
                {PACKAGE_OPTIONS.map((p) => (
                  <SelectItem key={p.key} value={p.key}>
                    {p.label}
                  </SelectItem>
                ))}
                <SelectItem value="custom">Custom Package Size...</SelectItem>
              </SelectContent>
            </Select>
            {packageKey === "custom" && (
              <Input
                type="number"
                min="1"
                placeholder="Number of sessions"
                className="rounded-xl border-slate-200 bg-white"
                value={customCredits}
                onChange={(e) => setCustomCredits(e.target.value)}
                data-testid="admit-custom-credits-input"
              />
            )}
          </div>
          <DialogFooter className="mt-5 gap-2">
            <Button variant="outline" className="rounded-xl border-slate-200" onClick={() => setAdmitOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl"
              onClick={handleAdmit}
              data-testid="confirm-admit-button"
            >
              Admit & Initialize Credits
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Discontinue dialog */}
      <Dialog open={discOpen} onOpenChange={setDiscOpen}>
        <DialogContent className="max-w-md rounded-2xl p-6 border-slate-200" data-testid="discontinue-dialog">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">Discontinue {client.clientName}</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Provide the discontinuation reason and any exit context for clinical records.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div>
              <Label className="text-xs font-bold text-slate-700">Reason for Dropout / Discontinuation</Label>
              <Select value={discReason} onValueChange={setDiscReason}>
                <SelectTrigger className="rounded-xl border-slate-200 bg-slate-50 focus:bg-white mt-1" data-testid="discontinue-reason-select">
                  <SelectValue placeholder="Select primary reason..." />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200">
                  {DISCHARGE_REASONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-bold text-slate-700">Clinical Exit Note</Label>
              <Textarea
                rows={3}
                placeholder="Summary notes on discontinuation context..."
                className="rounded-xl border-slate-200 bg-white mt-1"
                value={discNote}
                onChange={(e) => setDiscNote(e.target.value)}
                data-testid="discontinue-note-input"
              />
            </div>
          </div>
          <DialogFooter className="mt-5 gap-2">
            <Button variant="outline" className="rounded-xl border-slate-200" onClick={() => setDiscOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl"
              onClick={handleDiscontinue}
              data-testid="confirm-discontinue-button"
            >
              Confirm Discontinuation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

