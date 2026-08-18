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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/common/StatusBadge";
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
  calcAge,
  fmtDate,
  genCode,
  todayStr,
  uid,
} from "@/lib/appUtils";
import { cn } from "@/lib/utils";

const Step = ({ index, title, done, muted, children }) => (
  <div className={cn("flex gap-4", muted && "opacity-50")}>
    <div className="flex flex-col items-center">
      <div
        className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold shrink-0",
          done
            ? "bg-[var(--color-success)] text-white"
            : "bg-[var(--color-primary-light)] text-[var(--color-primary-dark)]"
        )}
      >
        {done ? <Check className="w-4 h-4" /> : index}
      </div>
      <div className="w-px flex-1 bg-[var(--color-border)] mt-1" />
    </div>
    <div className="pb-7 flex-1 min-w-0">
      <p className="text-sm font-semibold mb-2 mt-1.5">{title}</p>
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
    updateClient(id, { status: "admitted", dateOfJoin: todayStr() });
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
        className="inline-flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
        data-testid="client-detail-back-link"
      >
        <ArrowLeft className="w-4 h-4" /> Back to pipeline
      </Link>

      {/* Header */}
      <Card className="rounded-xl border-[var(--color-border)] shadow-sm">
        <CardContent className="p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-semibold" data-testid="client-detail-name">{client.clientName}</h1>
                <StatusBadge status={client.status} data-testid="client-detail-status-badge" />
              </div>
              <p className="text-sm text-[var(--color-text-muted)] mt-1">
                Age {calcAge(client.dob) != null ? calcAge(client.dob) : "—"} · DOB {fmtDate(client.dob)} · Inquiry received {fmtDate(client.createdAt)}
              </p>
              <div className="flex flex-wrap gap-4 mt-3 text-sm">
                <span className="flex items-center gap-1.5 text-[var(--color-text-muted)]">
                  <UserCheck className="w-4 h-4" /> {client.parentName}
                </span>
                <span className="flex items-center gap-1.5 text-[var(--color-text-muted)]">
                  <Phone className="w-4 h-4" /> {client.parentContact}
                </span>
                <span className="flex items-center gap-1.5 text-[var(--color-text-muted)]">
                  <Mail className="w-4 h-4" /> {client.parentEmail}
                </span>
              </div>
              {client.parentComplaint && (
                <div className="mt-3 rounded-lg bg-amber-50 border border-amber-100 px-3 py-2 max-w-xl" data-testid="client-detail-complaint">
                  <p className="text-[11px] font-semibold text-amber-600 uppercase tracking-wide mb-0.5">Parent's Concern</p>
                  <p className="text-sm leading-snug">{client.parentComplaint}</p>
                </div>
              )}
            </div>
            <div className="text-right space-y-2">
              <div>
                <p className="text-[11px] text-[var(--color-text-muted)] mb-1">Client access code</p>
                <button
                  type="button"
                  onClick={() => copyCode(client.clientAccessCode)}
                  className="font-mono text-sm font-semibold bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-1.5 hover:bg-[var(--color-primary-light)] transition-colors"
                  data-testid="client-detail-access-code"
                >
                  {client.clientAccessCode}
                </button>
              </div>
              <Link to={`/print/client/${id}`} className="inline-block">
                <Button variant="outline" size="sm" className="gap-1.5" data-testid="inquiry-print-report-button">
                  <Printer className="w-3.5 h-3.5" /> Print Report
                </Button>
              </Link>
            </div>
          </div>
          {client.status === "admitted" && (
            <div className="mt-4 rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700 flex items-center gap-2" data-testid="client-admitted-banner">
              <BadgeCheck className="w-4 h-4" /> Admitted on {fmtDate(client.dateOfJoin)}. Manage sessions and credits from the Admin Schedule role.
            </div>
          )}
          {client.status === "discontinued" && (
            <div className="mt-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600 flex items-center gap-2" data-testid="client-discontinued-banner">
              <Ban className="w-4 h-4" /> Discontinued on {fmtDate(client.dateOfDischarge)}{client.dischargeNote ? ` — ${client.dischargeNote}` : ""}.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Checklist */}
      <Card className="rounded-xl border-[var(--color-border)] shadow-sm">
        <CardContent className="p-5 sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-5">Onboarding Checklist</p>

          {/* Step 1: service type */}
          <Step index={1} title="Choose Service Type" done={Boolean(client.serviceType)}>
            <Select value={client.serviceType || ""} onValueChange={handleServiceType} disabled={isTerminal}>
              <SelectTrigger className="w-56" data-testid="service-type-select">
                <SelectValue placeholder="Select service..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="assessment">Assessment</SelectItem>
                <SelectItem value="consultation">Consultation</SelectItem>
              </SelectContent>
            </Select>
          </Step>

          {/* Step 2: category + code */}
          <Step
            index={2}
            title="Assessment Category & Access Code"
            done={Boolean(client.assessmentAccessCode)}
            muted={isConsultation}
          >
            {isConsultation ? (
              <p className="text-xs text-[var(--color-text-muted)] italic">Not required for consultations.</p>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Select
                    value={selCategory || client.assessmentCategoryId || ""}
                    onValueChange={setSelCategory}
                    disabled={isTerminal}
                  >
                    <SelectTrigger className="w-64" data-testid="assessment-category-select">
                      <SelectValue placeholder="Choose category..." />
                    </SelectTrigger>
                    <SelectContent>
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
                    className="gap-2"
                    data-testid="generate-assessment-code-button"
                  >
                    <KeyRound className="w-4 h-4" /> {client.assessmentAccessCode ? "Regenerate Code" : "Generate & Send Code"}
                  </Button>
                </div>
                {client.assessmentAccessCode && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-sm font-semibold bg-[var(--color-primary-light)] text-[var(--color-primary-dark)] rounded-lg px-3 py-1.5" data-testid="assessment-access-code-chip">
                      {client.assessmentAccessCode}
                    </span>
                    <Button size="icon" variant="ghost" onClick={() => copyCode(client.assessmentAccessCode)} aria-label="Copy assessment code" data-testid="copy-assessment-code-button">
                      <Copy className="w-4 h-4" />
                    </Button>
                    <span className="text-xs text-[var(--color-text-muted)]">
                      Simulated as sent to parent — they fill it at the “Assessment Fill Page” with this code.
                    </span>
                  </div>
                )}
              </div>
            )}
          </Step>

          {/* Step 3: offer assessment schedule */}
          <Step
            index={3}
            title="Offer Assessment Schedule"
            done={assessmentSchedules.length > 0}
            muted={isConsultation}
          >
            {isConsultation ? (
              <p className="text-xs text-[var(--color-text-muted)] italic">Not required for consultations.</p>
            ) : (
              <div className="space-y-2">
                {assessmentSchedules.map((s) => (
                  <div key={s.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm" data-testid={`assessment-schedule-row-${s.id}`}>
                    <span className="font-medium">{fmtDate(s.date)}</span>
                    <span className="tabular-nums text-[var(--color-text-muted)]">{s.startTime}–{s.endTime}</span>
                    <span className="text-[var(--color-text-muted)]">{getTherapist(s.therapistId) ? getTherapist(s.therapistId).name : "—"}</span>
                    <StatusBadge status={s.status} />
                    {s.status === "scheduled" && !isTerminal && (
                      <Button size="sm" variant="outline" className="ml-auto h-7 text-xs" onClick={() => handleMarkAssessmentCompleted(s)} data-testid={`mark-assessment-completed-${s.id}`}>
                        Mark Completed
                      </Button>
                    )}
                  </div>
                ))}
                {!isTerminal && (
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={() =>
                      setScheduleModal({
                        open: true,
                        defaults: { clientId: id, lockClient: true, type: "assessment", lockType: true },
                        onCreated: () => updateClient(id, { status: "assessment_scheduled" }),
                      })
                    }
                    data-testid="offer-schedule-button"
                  >
                    <Repeat className="w-4 h-4" /> Offer Schedule
                  </Button>
                )}
              </div>
            )}
          </Step>

          {/* Step 4: parent answers */}
          <Step index={4} title="Parent Assessment Answers" done={answersFilled} muted={isConsultation}>
            {isConsultation ? (
              <p className="text-xs text-[var(--color-text-muted)] italic">Not required for consultations.</p>
            ) : answersFilled && category ? (
              <div className="space-y-2" data-testid="assessment-answers-list">
                {client.assessmentAnswers.map((a) => {
                  const q = category.questions.find((qq) => qq.id === a.questionId);
                  return (
                    <div key={a.questionId} className="rounded-lg bg-[var(--color-surface)] px-3 py-2">
                      <p className="text-xs text-[var(--color-text-muted)]">{q ? q.question : a.questionId}</p>
                      <p className="text-sm font-medium mt-0.5">{a.answer}</p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-[var(--color-text-muted)]">
                Waiting for the parent to fill the assessment{client.assessmentAccessCode ? ` with code ${client.assessmentAccessCode}` : ""}.
              </p>
            )}
          </Step>

          {/* Step 5: report */}
          <Step
            index={5}
            title="Assessment Report"
            done={Boolean(client.assessmentReportNote)}
            muted={isConsultation}
          >
            {isConsultation ? (
              <p className="text-xs text-[var(--color-text-muted)] italic">Not required for consultations.</p>
            ) : !assessmentCompleted && !client.assessmentReportNote ? (
              <p className="text-xs text-[var(--color-text-muted)]">
                Available after the assessment session is marked completed.
              </p>
            ) : (
              <div className="space-y-2">
                <Textarea
                  rows={3}
                  value={reportText != null ? reportText : client.assessmentReportNote || ""}
                  onChange={(e) => setReportText(e.target.value)}
                  placeholder="Summary of findings, recommendations, therapy frequency..."
                  disabled={isTerminal && !client.assessmentReportNote}
                  data-testid="assessment-report-textarea"
                />
                {!isTerminal && (
                  <Button variant="outline" className="gap-2" onClick={handleSaveReport} data-testid="save-report-button">
                    <FileText className="w-4 h-4" /> Save Report
                  </Button>
                )}
              </div>
            )}
          </Step>

          {/* Step 6: invoice */}
          <Step index={6} title="Invoice & Payment" done={Boolean(client.invoice && client.invoice.status === "paid")}>
            {!client.invoice ? (
              <div className="flex flex-wrap gap-2 items-center">
                <Input
                  type="number"
                  min="1"
                  className="w-36"
                  placeholder="Amount ($)"
                  value={invoiceAmount}
                  onChange={(e) => setInvoiceAmount(e.target.value)}
                  disabled={isTerminal}
                  data-testid="invoice-amount-input"
                />
                <Button variant="outline" className="gap-2" onClick={handleCreateInvoice} disabled={isTerminal} data-testid="create-invoice-button">
                  <Receipt className="w-4 h-4" /> Create Invoice
                </Button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm font-semibold tabular-nums">${client.invoice.amount}</span>
                <StatusBadge status={client.invoice.status} data-testid="invoice-status-badge" />
                {client.invoice.status === "unpaid" && !isTerminal && (
                  <Button size="sm" className="bg-[var(--color-success)] hover:bg-green-600 h-8" onClick={() => setPaidDialogOpen(true)} data-testid="mark-paid-button">
                    Mark as Paid
                  </Button>
                )}
                {client.invoice.proofOfPaymentUrl && (
                  <span className="text-xs text-[var(--color-text-muted)]">Proof: {client.invoice.proofOfPaymentUrl}</span>
                )}
              </div>
            )}
          </Step>

          {/* Step 7: recurring therapy */}
          <Step index={7} title="Set Recurring Therapy Schedule" done={therapySchedules.length > 0}>
            <div className="space-y-2">
              {therapySchedules.length > 0 && (
                <p className="text-xs text-[var(--color-text-muted)]">
                  {therapySchedules.length} therapy session(s) on the calendar
                  {therapySchedules.some((s) => s.isRecurring) ? " (weekly recurring)" : ""}.
                </p>
              )}
              {!isTerminal && (
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() =>
                    setScheduleModal({
                      open: true,
                      defaults: { clientId: id, lockClient: true, type: "therapy", lockType: true, defaultRecurring: true },
                      onCreated: () => updateClient(id, { status: "scheduling" }),
                    })
                  }
                  data-testid="set-recurring-schedule-button"
                >
                  <Repeat className="w-4 h-4" /> Set Recurring Therapy Schedule
                </Button>
              )}
            </div>
          </Step>

          {/* Step 8: admit / discontinue */}
          <div className="flex gap-4">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold shrink-0",
                  isTerminal
                    ? client.status === "admitted"
                      ? "bg-[var(--color-success)] text-white"
                      : "bg-[var(--color-danger)] text-white"
                    : "bg-[var(--color-primary-light)] text-[var(--color-primary-dark)]"
                )}
              >
                {isTerminal ? <Check className="w-4 h-4" /> : 8}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold mb-2 mt-1.5">Final Decision</p>
              {isTerminal ? (
                <p className="text-xs text-[var(--color-text-muted)]">
                  Decision recorded: <StatusBadge status={client.status} />
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <Button className="bg-[var(--color-success)] hover:bg-green-600 gap-2" onClick={() => setAdmitOpen(true)} data-testid="admit-client-button">
                    <UserCheck className="w-4 h-4" /> Admit Client
                  </Button>
                  <Button variant="outline" className="gap-2 text-[var(--color-danger)] border-red-200 hover:bg-red-50" onClick={() => setDiscOpen(true)} data-testid="discontinue-client-button">
                    <Ban className="w-4 h-4" /> Discontinue
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Offer / recurring schedule modal */}
      <AddScheduleModal
        open={scheduleModal.open}
        onOpenChange={(open) => setScheduleModal((m) => ({ ...m, open }))}
        defaults={scheduleModal.defaults}
        onCreated={scheduleModal.onCreated}
      />

      {/* Mark paid dialog */}
      <Dialog open={paidDialogOpen} onOpenChange={setPaidDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Mark Invoice as Paid</DialogTitle>
            <DialogDescription>Attach a simulated proof of payment (any text — e.g. a receipt filename).</DialogDescription>
          </DialogHeader>
          <Input
            placeholder="e.g. bank-transfer-receipt.pdf"
            value={proofText}
            onChange={(e) => setProofText(e.target.value)}
            data-testid="proof-of-payment-input"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaidDialogOpen(false)}>Cancel</Button>
            <Button className="bg-[var(--color-success)] hover:bg-green-600" onClick={handleMarkPaid} data-testid="confirm-mark-paid-button">
              Confirm Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Admit dialog */}
      <Dialog open={admitOpen} onOpenChange={setAdmitOpen}>
        <DialogContent className="max-w-sm" data-testid="admit-dialog">
          <DialogHeader>
            <DialogTitle>Admit {client.clientName}</DialogTitle>
            <DialogDescription>Choose the initial therapy package. Credits are created automatically.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Select value={packageKey} onValueChange={setPackageKey}>
              <SelectTrigger data-testid="admit-package-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PACKAGE_OPTIONS.map((p) => (
                  <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>
                ))}
                <SelectItem value="custom">Custom...</SelectItem>
              </SelectContent>
            </Select>
            {packageKey === "custom" && (
              <Input
                type="number"
                min="1"
                placeholder="Number of sessions"
                value={customCredits}
                onChange={(e) => setCustomCredits(e.target.value)}
                data-testid="admit-custom-credits-input"
              />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdmitOpen(false)}>Cancel</Button>
            <Button className="bg-[var(--color-success)] hover:bg-green-600" onClick={handleAdmit} data-testid="confirm-admit-button">
              Admit & Create Credits
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Discontinue dialog */}
      <Dialog open={discOpen} onOpenChange={setDiscOpen}>
        <DialogContent className="max-w-sm" data-testid="discontinue-dialog">
          <DialogHeader>
            <DialogTitle>Discontinue {client.clientName}</DialogTitle>
            <DialogDescription>A short reason is required for reporting.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Select value={discReason} onValueChange={setDiscReason}>
              <SelectTrigger data-testid="discontinue-reason-select">
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
              value={discNote}
              onChange={(e) => setDiscNote(e.target.value)}
              data-testid="discontinue-note-input"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDiscOpen(false)}>Cancel</Button>
            <Button className="bg-[var(--color-danger)] hover:bg-red-600" onClick={handleDiscontinue} data-testid="confirm-discontinue-button">
              Discontinue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
