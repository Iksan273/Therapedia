import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { format, parseISO, subMonths } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import {
  ClipboardList,
  Hourglass,
  CalendarCheck,
  FileCheck2,
  FileText,
  CalendarRange,
  UserCheck,
  UserX,
  MailWarning,
  ArrowRight,
  TrendingDown,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 text-white px-3 py-2 rounded-xl text-xs shadow-lg border border-slate-800">
        <p className="font-semibold">{label}</p>
        <p className="text-rose-400 mt-0.5">
          {payload[0].value} {payload[0].value === 1 ? "client" : "clients"} discontinued / discharged
        </p>
      </div>
    );
  }
  return null;
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

  const totalInquiries = clients.filter((c) => c.status !== "discharged").length;

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
    <div className="space-y-7" data-testid="dashboard-inquiry-page">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-100/80 text-sky-800 text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5 text-sky-600" />
            Intake & Pipeline Intelligence
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Inquiry & Intake Dashboard
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time pipeline overview, intake progression, and action items requiring parent follow-up.
          </p>
        </div>
        <Button
          onClick={() => navigate("/admin-inquiry/pipeline")}
          className="bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-xl gap-2 shadow-sm shadow-sky-600/20 w-fit"
        >
          View Pipeline Kanban
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Pipeline counts */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
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
        <Card className="clinical-card rounded-2xl border-slate-200/90 lg:col-span-7">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-slate-900">Discontinued & Discharge Trends</CardTitle>
                <CardDescription className="text-xs text-slate-500">6-month overview of client dropouts and discharges</CardDescription>
              </div>
              <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <TrendingDown className="w-4 h-4 stroke-[2.2]" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="h-72 pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyDiscontinued} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="roseGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F43F5E" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#BE123C" stopOpacity={0.7} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: "#64748B", fontSize: 12, fontWeight: 500 }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fill: "#64748B", fontSize: 12, fontWeight: 500 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Clients" fill="url(#roseGradient)" radius={[8, 8, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Awaiting assessment list */}
        <Card className="clinical-card rounded-2xl border-slate-200/90 lg:col-span-5 flex flex-col">
          <CardHeader className="pb-3 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-slate-900">Awaiting Parent Assessment</CardTitle>
                <CardDescription className="text-xs text-slate-500">Forms sent but pending parent submission</CardDescription>
              </div>
              <span className="text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200/80 px-2.5 py-0.5 rounded-full">
                {awaiting.length} Pending
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-4 flex-1">
            {awaiting.length === 0 ? (
              <EmptyState icon={MailWarning} title="All caught up!" subtitle="Every generated assessment code has been filled by parents." />
            ) : (
              <ul className="divide-y divide-slate-100 space-y-1" data-testid="awaiting-assessment-list">
                {awaiting.map((c) => {
                  const cat = getCategory(c.assessmentCategoryId);
                  return (
                    <li
                      key={c.id}
                      className="py-3 px-3 flex items-center justify-between gap-3 cursor-pointer hover:bg-sky-50/60 rounded-xl transition-colors group"
                      onClick={() => navigate(`/admin-inquiry/clients/${c.id}`)}
                      data-testid={`awaiting-assessment-item-${c.id}`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-800 group-hover:text-sky-700 truncate">
                          {c.clientName}
                        </p>
                        <p className="text-xs text-slate-500 truncate mt-0.5">
                          {cat ? cat.categoryName : "Assessment category pending"} · {fmtDate(c.updatedAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-mono text-xs font-bold bg-sky-50 text-sky-700 border border-sky-200/80 rounded-lg px-2.5 py-1 tracking-wider">
                          {c.assessmentAccessCode}
                        </span>
                        <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-sky-600 transition-transform group-hover:translate-x-0.5" />
                      </div>
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

