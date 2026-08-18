import React, { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Printer, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/common/StatusBadge";
import { EmptyState } from "@/components/common/EmptyState";
import { useClients } from "@/context/ClientsContext";
import { useSchedules } from "@/context/SchedulesContext";
import { useCredits } from "@/context/CreditsContext";
import { useAssessments } from "@/context/AssessmentsContext";
import { useTherapists } from "@/context/TherapistsContext";
import { calcAge, dischargeReasonLabel, fmtDate } from "@/lib/appUtils";
import { format } from "date-fns";

const Section = ({ title, children }) => (
  <section className="space-y-2">
    <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] border-b border-[var(--color-border)] pb-1.5">
      {title}
    </h2>
    {children}
  </section>
);

const InfoItem = ({ label, value }) => (
  <div>
    <p className="text-[11px] text-[var(--color-text-muted)]">{label}</p>
    <p className="text-sm font-medium">{value || "\u2014"}</p>
  </div>
);

export default function PrintClientReport() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { clients } = useClients();
  const { schedules } = useSchedules();
  const { getRecordForClient } = useCredits();
  const { getCategory } = useAssessments();
  const { getTherapist } = useTherapists();

  const client = clients.find((c) => c.id === id);
  const record = client ? getRecordForClient(client.id) : null;
  const category = client ? getCategory(client.assessmentCategoryId) : null;

  const history = useMemo(
    () =>
      schedules
        .filter((s) => s.clientId === id)
        .sort((a, b) => (b.date + b.startTime).localeCompare(a.date + a.startTime)),
    [schedules, id]
  );

  if (!client) {
    return (
      <div className="min-h-screen bg-[var(--color-surface)] flex items-center justify-center">
        <EmptyState
          icon={Search}
          title="Client not found"
          subtitle="This client may have been removed after a demo reset."
          action={<Button variant="outline" onClick={() => navigate(-1)}>Go back</Button>}
        />
      </div>
    );
  }

  const completed = history.filter((s) => s.status === "completed").length;
  const cancelled = history.filter((s) => s.status === "cancelled").length;
  const rescheduled = history.filter((s) => s.status === "rescheduled").length;

  return (
    <div className="min-h-screen bg-[var(--color-surface)] print:bg-white py-8 print:py-0 px-4 print:px-0" data-testid="print-client-report-page">
      <div className="max-w-3xl mx-auto">
        {/* Action bar — hidden when printing */}
        <div className="flex items-center justify-between mb-5 print:hidden">
          <Button variant="outline" className="gap-2" onClick={() => navigate(-1)} data-testid="print-report-back-button">
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
          <Button
            className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] gap-2"
            onClick={() => window.print()}
            data-testid="print-report-print-button"
          >
            <Printer className="w-4 h-4" /> Print / Save as PDF
          </Button>
        </div>

        {/* Printable document */}
        <div className="bg-white rounded-xl print:rounded-none border border-[var(--color-border)] print:border-0 shadow-sm print:shadow-none p-8 print:p-2 space-y-7">
          {/* Letterhead */}
          <div className="flex items-start justify-between border-b-2 border-[var(--color-primary)] pb-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-[var(--color-primary)] flex items-center justify-center text-white font-semibold text-xl">
                T
              </div>
              <div>
                <p className="font-semibold text-lg leading-tight">Therapedia Developmental Center</p>
                <p className="text-xs text-[var(--color-text-muted)]">Pediatric Occupational Therapy Clinic</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold">Client Summary Report</p>
              <p className="text-xs text-[var(--color-text-muted)]">Generated {format(new Date(), "MMM d, yyyy \u00b7 HH:mm")}</p>
            </div>
          </div>

          {/* Client information */}
          <Section title="Client Information">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3">
              <InfoItem label="Client Name" value={client.clientName} />
              <InfoItem label="Date of Birth" value={`${fmtDate(client.dob)} (age ${calcAge(client.dob) != null ? calcAge(client.dob) : "\u2014"})`} />
              <InfoItem label="Status" value={<StatusBadge status={client.status} />} />
              <InfoItem label="Parent / Guardian" value={client.parentName} />
              <InfoItem label="Contact" value={client.parentContact} />
              <InfoItem label="Email" value={client.parentEmail} />
              <InfoItem label="Date of Join" value={client.dateOfJoin ? fmtDate(client.dateOfJoin) : "\u2014"} />
              <InfoItem label="Service Type" value={client.serviceType ? <StatusBadge status={client.serviceType} /> : "\u2014"} />
              <InfoItem label="Access Code" value={<span className="font-mono">{client.clientAccessCode}</span>} />
            </div>
            {client.parentComplaint && (
              <div className="rounded-lg print:rounded-none bg-amber-50 print:bg-white print:border print:border-[var(--color-border)] border border-amber-100 px-4 py-3 mt-1">
                <p className="text-[11px] text-amber-600 print:text-[var(--color-text-muted)] font-semibold uppercase tracking-wide mb-1">Parent's Concern at Inquiry</p>
                <p className="text-sm leading-relaxed" data-testid="print-report-complaint">{client.parentComplaint}</p>
              </div>
            )}
            {client.dateOfDischarge && (
              <p className="text-xs text-[var(--color-text-muted)] mt-2">
                {client.status === "discharged" ? "Discharged" : "Discontinued"} on {fmtDate(client.dateOfDischarge)} · Reason: {dischargeReasonLabel(client.dischargeReason)}
                {client.dischargeNote ? ` \u2014 ${client.dischargeNote}` : ""}
              </p>
            )}
          </Section>

          {/* Assessment */}
          <Section title="Assessment">
            {!category && !client.assessmentReportNote ? (
              <p className="text-sm text-[var(--color-text-muted)] italic">No assessment on record.</p>
            ) : (
              <div className="space-y-3">
                {category && (
                  <InfoItem label="Assessment Category" value={category.categoryName} />
                )}
                {client.assessmentReportNote && (
                  <div className="rounded-lg print:rounded-none bg-[var(--color-surface)] print:bg-white print:border print:border-[var(--color-border)] px-4 py-3">
                    <p className="text-[11px] text-[var(--color-text-muted)] mb-1">Therapist Report</p>
                    <p className="text-sm leading-relaxed" data-testid="print-report-note">{client.assessmentReportNote}</p>
                  </div>
                )}
                {client.assessmentAnswers && client.assessmentAnswers.length > 0 && category && (
                  <div className="space-y-1.5">
                    <p className="text-[11px] text-[var(--color-text-muted)]">Parent Questionnaire Answers</p>
                    <table className="w-full text-sm border border-[var(--color-border)]">
                      <tbody>
                        {client.assessmentAnswers.map((a, i) => {
                          const q = category.questions.find((qq) => qq.id === a.questionId);
                          return (
                            <tr key={a.questionId} className={i % 2 === 0 ? "bg-[var(--color-surface)] print:bg-white" : ""}>
                              <td className="px-3 py-2 border-b border-[var(--color-border)] text-[var(--color-text-muted)] w-3/5 align-top text-xs">
                                {q ? q.question : a.questionId}
                              </td>
                              <td className="px-3 py-2 border-b border-[var(--color-border)] font-medium align-top text-xs">{a.answer}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </Section>

          {/* Credit summary */}
          <Section title="Credit & Package">
            {!record ? (
              <p className="text-sm text-[var(--color-text-muted)] italic">No credit package on record.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3">
                <InfoItem label="Package" value={record.packageName} />
                <InfoItem label="Remaining Credit" value={`${record.remainingCredit} / ${record.totalCredit}`} />
                <InfoItem label="Leave Used" value={`${record.leaveUsed} / ${record.leaveQuota}${record.leaveUsed > record.leaveQuota ? " (over quota)" : ""}`} />
                <InfoItem label="Purchased" value={fmtDate(record.purchaseDate)} />
              </div>
            )}
          </Section>

          {/* Session history */}
          <Section title={`Session History (${history.length} total \u00b7 ${completed} completed \u00b7 ${cancelled} cancelled \u00b7 ${rescheduled} rescheduled)`}>
            {history.length === 0 ? (
              <p className="text-sm text-[var(--color-text-muted)] italic">No sessions on record.</p>
            ) : (
              <table className="w-full text-xs border border-[var(--color-border)]" data-testid="print-report-history-table">
                <thead>
                  <tr className="bg-[var(--color-surface)] print:bg-white text-left text-[var(--color-text-muted)]">
                    <th className="px-3 py-2 border-b border-[var(--color-border)] font-medium">Date</th>
                    <th className="px-3 py-2 border-b border-[var(--color-border)] font-medium">Time</th>
                    <th className="px-3 py-2 border-b border-[var(--color-border)] font-medium">Therapist</th>
                    <th className="px-3 py-2 border-b border-[var(--color-border)] font-medium">Type</th>
                    <th className="px-3 py-2 border-b border-[var(--color-border)] font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((s) => {
                    const t = getTherapist(s.therapistId);
                    return (
                      <tr key={s.id} className="align-top">
                        <td className="px-3 py-1.5 border-b border-[var(--color-border)] font-medium whitespace-nowrap">{fmtDate(s.date)}</td>
                        <td className="px-3 py-1.5 border-b border-[var(--color-border)] tabular-nums whitespace-nowrap">{s.startTime}–{s.endTime}</td>
                        <td className="px-3 py-1.5 border-b border-[var(--color-border)]">{t ? t.name : "\u2014"}</td>
                        <td className="px-3 py-1.5 border-b border-[var(--color-border)] capitalize">{s.type}</td>
                        <td className="px-3 py-1.5 border-b border-[var(--color-border)] capitalize">{s.status}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </Section>

          {/* Footer */}
          <div className="pt-4 border-t border-[var(--color-border)] flex items-center justify-between text-[10px] text-[var(--color-text-muted)]">
            <span>Therapedia Developmental Center — Confidential client record</span>
            <span>Demo prototype · data simulated in browser</span>
          </div>
        </div>
      </div>
    </div>
  );
}
