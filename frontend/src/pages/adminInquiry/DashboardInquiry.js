import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { format, parseISO, subMonths } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { ClipboardList, Hourglass, CalendarCheck, FileCheck2, FileText, CalendarRange, UserCheck, UserX, MailWarning } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/common/StatCard";
import { EmptyState } from "@/components/common/EmptyState";
import { useClients } from "@/context/ClientsContext";
import { useAssessments } from "@/context/AssessmentsContext";
import { PIPELINE_STATUSES, STATUS_META, fmtDate } from "@/lib/appUtils";

const STATUS_ICONS = {
  inquiry: ClipboardList,
  pending: Hourglass,
  assessment_scheduled: CalendarCheck,
  assessment_done: FileCheck2,
  report_ready: FileText,
  scheduling: CalendarRange,
  admitted: UserCheck,
  discontinued: UserX,
};

const STATUS_ACCENTS = {
  inquiry: "primary",
  pending: "warning",
  assessment_scheduled: "info",
  assessment_done: "info",
  report_ready: "warning",
  scheduling: "primary",
  admitted: "success",
  discontinued: "danger",
};

export default function DashboardInquiry() {
  const navigate = useNavigate();
  const { clients } = useClients();
  const { getCategory } = useAssessments();

  const counts = useMemo(() => {
    const map = {};
    PIPELINE_STATUSES.forEach((s) => {
      map[s] = clients.filter((c) => c.status === s).length;
    });
    return map;
  }, [clients]);

  const awaiting = useMemo(
    () =>
      clients.filter(
        (c) =>
          c.assessmentAccessCode &&
          (!c.assessmentAnswers || c.assessmentAnswers.length === 0) &&
          !["admitted", "discharged", "discontinued"].includes(c.status)
      ),
    [clients]
  );

  const monthlyDiscontinued = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const month = subMonths(now, 5 - i);
      const key = format(month, "yyyy-MM");
      const count = clients.filter(
        (c) =>
          ["discontinued", "discharged"].includes(c.status) &&
          c.dateOfDischarge &&
          c.dateOfDischarge.startsWith(key)
      ).length;
      return { month: format(month, "MMM"), count };
    });
  }, [clients]);

  return (
    <div className="space-y-6" data-testid="dashboard-inquiry-page">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Inquiry Dashboard</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">Pipeline overview and follow-ups that need attention.</p>
      </div>

      {/* Pipeline counts */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {PIPELINE_STATUSES.map((status) => (
          <StatCard
            key={status}
            label={STATUS_META[status].label}
            value={counts[status]}
            icon={STATUS_ICONS[status]}
            accent={STATUS_ACCENTS[status]}
            onClick={() => navigate("/admin-inquiry/pipeline")}
            testid={`pipeline-count-card-${status}`}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Monthly discontinued chart */}
        <Card className="rounded-xl border-[var(--color-border)] shadow-sm lg:col-span-7">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Discontinued / Discharged per Month</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyDiscontinued} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(229,231,235,0.9)" />
                <XAxis dataKey="month" tick={{ fill: "#6B7280", fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fill: "#6B7280", fontSize: 12 }} />
                <Tooltip cursor={{ fill: "rgba(47,168,224,0.06)" }} />
                <Bar dataKey="count" name="Clients" fill="#EF4444" radius={[6, 6, 0, 0]} maxBarSize={44} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Awaiting assessment list */}
        <Card className="rounded-xl border-[var(--color-border)] shadow-sm lg:col-span-5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Assessments Awaiting Parent Response</CardTitle>
          </CardHeader>
          <CardContent>
            {awaiting.length === 0 ? (
              <EmptyState icon={MailWarning} title="All caught up" subtitle="Every generated assessment code has been filled in." />
            ) : (
              <ul className="divide-y divide-[var(--color-border)]" data-testid="awaiting-assessment-list">
                {awaiting.map((c) => {
                  const cat = getCategory(c.assessmentCategoryId);
                  return (
                    <li
                      key={c.id}
                      className="py-3 flex items-center justify-between gap-3 cursor-pointer hover:bg-[rgba(47,168,224,0.04)] rounded-lg px-2 -mx-2"
                      onClick={() => navigate(`/admin-inquiry/clients/${c.id}`)}
                      data-testid={`awaiting-assessment-item-${c.id}`}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{c.clientName}</p>
                        <p className="text-xs text-[var(--color-text-muted)] truncate">
                          {cat ? cat.categoryName : "Category not set"} · sent {fmtDate(c.updatedAt)}
                        </p>
                      </div>
                      <span className="font-mono text-xs bg-[var(--color-primary-light)] text-[var(--color-primary-dark)] rounded-full px-2.5 py-1">
                        {c.assessmentAccessCode}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
