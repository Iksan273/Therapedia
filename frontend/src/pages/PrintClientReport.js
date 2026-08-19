import React, { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Printer, Search, Activity, HeartHandshake, ShieldCheck } from "lucide-react";
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
  <section className="space-y-2.5">
    <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-1.5 flex items-center gap-2">
      <span className="w-1.5 h-1.5 rounded-full bg-sky-600"></span>
      {title}
    </h2>
    {children}
  </section>
);

const InfoItem = ({ label, value }) => (
  <div>
    <p className="text-[11px] text-slate-400 font-medium">{label}</p>
    <div className="text-xs sm:text-sm font-bold text-slate-800 mt-0.5">{value || "\u2014"}</div>
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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <EmptyState
          icon={Search}
          title="Client report not found"
          subtitle="This client may have been removed or reset in demo state."
          action={<Button variant="outline" className="rounded-xl border-slate-200" onClick={() => navigate(-1)}>Go back</Button>}
        />
      </div>
    );
  }

  const completed = history.filter((s) => s.status === "completed").length;
  const cancelled = history.filter((s) => s.status === "cancelled").length;
  const rescheduled = history.filter((s) => s.status === "rescheduled").length;

  return (
    <div className="min-h-screen bg-slate-100/70 print:bg-white py-8 print:py-0 px-4 print:px-0" data-testid="print-client-report-page">
      <div className="max-w-3xl mx-auto">
        {/* Action bar — hidden when printing */}
        <div className="flex items-center justify-between mb-5 print:hidden">
          <Button variant="outline" className="gap-2 rounded-xl border-slate-200 text-xs font-semibold" onClick={() => navigate(-1)} data-testid="print-report-back-button">
            <ArrowLeft className="w-4 h-4" /> Back to profile
          </Button>
          <Button
            className="bg-sky-600 hover:bg-sky-700 text-white gap-2 font-bold rounded-xl text-xs h-10 shadow-xs"
            onClick={() => window.print()}
            data-testid="print-report-print-button"
          >
            <Printer className="w-4 h-4" /> Print / Save as Clinical PDF
          </Button>
        </div>

        {/* Printable medical document */}
        <div className="bg-white rounded-2xl print:rounded-none border border-slate-200/90 print:border-0 shadow-sm print:shadow-none p-8 print:p-2 space-y-6">
          {/* Letterhead */}
          <div className="flex items-start justify-between border-b-2 border-sky-600 pb-5">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-sky-600 flex items-center justify-center text-white font-black text-xl shadow-xs">
                <Activity className="w-6 h-6" />
              </div>
              <div>
                <p className="font-extrabold text-lg text-slate-900 leading-tight">Therapedia Developmental Center</p>
                <p className="text-xs text-slate-500 font-medium">Pediatric Occupational & Developmental Therapy</p>
              </div>
            </div>
            <div className="text-right space-y-0.5">
              <p className="text-xs font-extrabold text-sky-900 uppercase tracking-wider">Clinical Summary Report</p>
              <p className="text-[11px] text-slate-400 font-mono">Generated {format(new Date(), "MMM d, yyyy · HH:mm")}</p>
            </div>
          </div>

          {/* Client information */}
          <Section title="Client & Caregiver Demographics">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3.5 bg-slate-50/70 p-4 rounded-xl border border-slate-200/70">
              <InfoItem label="Client Full Name" value={client.clientName} />
              <InfoItem label="Date of Birth" value={`${fmtDate(client.dob)} (${calcAge(client.dob) != null ? `${calcAge(client.dob)} yrs` : "\u2014"})`} />
              <InfoItem label="Enrollment Status" value={<StatusBadge status={client.status} />} />
              <InfoItem label="Parent / Guardian" value={client.parentName} />
              <InfoItem label="Contact Phone" value={client.parentContact} />
              <InfoItem label="Email" value={client.parentEmail} />
              <InfoItem label="Date of Enrollment" value={client.dateOfJoin ? fmtDate(client.dateOfJoin) : "\u2014"} />
              <InfoItem label="Clinical Service Type" value={client.serviceType ? <StatusBadge status={client.serviceType} /> : "\u2014"} />
              <InfoItem label="Portal Access Code" value={<span className="font-mono font-bold text-sky-800">#{client.clientAccessCode}</span>} />
            </div>
            {client.parentComplaint && (
              <div className="rounded-xl print:rounded-none bg-amber-50/70 print:bg-white print:border print:border-slate-200 border border-amber-200/80 p-3.5 mt-2">
                <p className="text-[10px] text-amber-800 print:text-slate-500 font-bold uppercase tracking-wider mb-1">Parent Chief Concern at Intake</p>
                <p className="text-xs text-slate-700 leading-relaxed font-medium" data-testid="print-report-complaint">{client.parentComplaint}</p>
              </div>
            )}
            {client.dateOfDischarge && (
              <p className="text-xs text-slate-500 bg-slate-100 p-3 rounded-xl border border-slate-200 mt-2 font-medium">
                <strong>{client.status === "discharged" ? "Discharged" : "Discontinued"}</strong> on {fmtDate(client.dateOfDischarge)} · Reason: {dischargeReasonLabel(client.dischargeReason)}
                {client.dischargeNote ? ` \u2014 Note: ${client.dischargeNote}` : ""}
              </p>
            )}
          </Section>

          {/* Assessment */}
          <Section title="Developmental Assessment">
            {!category && !client.assessmentReportNote ? (
              <p className="text-xs text-slate-400 italic">No formal developmental assessment on record.</p>
            ) : (
              <div className="space-y-3">
                {category && (
                  <InfoItem label="Assessment Tool / Category" value={category.categoryName} />
                )}
                {client.assessmentReportNote && (
                  <div className="rounded-xl print:rounded-none bg-sky-50/60 print:bg-white print:border print:border-slate-200 border border-sky-200/80 p-3.5">
                    <p className="text-[10px] font-bold text-sky-900 uppercase tracking-wider mb-1">Therapist Clinical Summary</p>
                    <p className="text-xs text-slate-700 leading-relaxed font-medium" data-testid="print-report-note">{client.assessmentReportNote}</p>
                  </div>
                )}
                {client.assessmentAnswers && client.assessmentAnswers.length > 0 && category && (
                  <div className="space-y-2">
                    <p className="text-[11px] font-bold text-slate-600">Questionnaire Responses</p>
                    <table className="w-full text-xs border border-slate-200 rounded-xl overflow-hidden">
                      <tbody>
                        {client.assessmentAnswers.map((a, i) => {
                          const q = category.questions.find((qq) => qq.id === a.questionId);
                          return (
                            <tr key={a.questionId} className={i % 2 === 0 ? "bg-slate-50/60 print:bg-white" : ""}>
                              <td className="px-3.5 py-2 border-b border-slate-200 text-slate-600 w-3/5 align-top text-xs font-medium">
                                {q ? q.question : a.questionId}
                              </td>
                              <td className="px-3.5 py-2 border-b border-slate-200 font-bold text-slate-900 align-top text-xs">{a.answer}</td>
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
          <Section title="Package & Attendance Metrics">
            {!record ? (
              <p className="text-xs text-slate-400 italic">No therapy package ledger on record.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3.5 bg-slate-50/70 p-4 rounded-xl border border-slate-200/70">
                <InfoItem label="Package Plan" value={record.packageName} />
                <InfoItem label="Remaining Credits" value={`${record.remainingCredit} / ${record.totalCredit} sessions`} />
                <InfoItem label="Leave Allotment" value={`${record.leaveUsed} / ${record.leaveQuota} used${record.leaveUsed > record.leaveQuota ? " (Over quota)" : ""}`} />
                <InfoItem label="Purchase Date" value={fmtDate(record.purchaseDate)} />
              </div>
            )}
          </Section>

          {/* Session history */}
          <Section title={`Clinical Session Log (${history.length} total · ${completed} completed · ${cancelled} cancelled · ${rescheduled} rescheduled)`}>
            {history.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No therapy sessions recorded yet.</p>
            ) : (
              <table className="w-full text-xs border border-slate-200 rounded-xl overflow-hidden" data-testid="print-report-history-table">
                <thead>
                  <tr className="bg-slate-100 print:bg-white text-left text-slate-700 font-bold">
                    <th className="px-3 py-2 border-b border-slate-200">Date</th>
                    <th className="px-3 py-2 border-b border-slate-200">Time</th>
                    <th className="px-3 py-2 border-b border-slate-200">Therapist</th>
                    <th className="px-3 py-2 border-b border-slate-200">Type</th>
                    <th className="px-3 py-2 border-b border-slate-200">Status</th>
                    <th className="px-3 py-2 border-b border-slate-200">Progress Note</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((s) => {
                    const t = getTherapist(s.therapistId);
                    return (
                      <tr key={s.id} className="align-top hover:bg-slate-50/50">
                        <td className="px-3 py-2 border-b border-slate-200 font-bold whitespace-nowrap text-slate-900">{fmtDate(s.date)}</td>
                        <td className="px-3 py-2 border-b border-slate-200 tabular-nums whitespace-nowrap text-slate-500 font-medium">{s.startTime}–{s.endTime}</td>
                        <td className="px-3 py-2 border-b border-slate-200 text-slate-800 font-medium">{t ? t.name : "\u2014"}</td>
                        <td className="px-3 py-2 border-b border-slate-200 capitalize font-semibold">{s.type}</td>
                        <td className="px-3 py-2 border-b border-slate-200 capitalize"><StatusBadge status={s.status} /></td>
                        <td className="px-3 py-2 border-b border-slate-200 italic text-slate-600 leading-snug">{s.progressNote || "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </Section>

          {/* Footer */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-400 font-medium">
            <span>Therapedia Developmental Center — Confidential Patient Clinical Record</span>
            <span>Official Clinical Summary System</span>
          </div>
        </div>
      </div>
    </div>
  );
}

