import React, { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft,
  CalendarPlus,
  LogOut,
  Printer,
  RefreshCw,
  Search,
  Wallet,
  User,
  Phone,
  Mail,
  Sparkles,
  Clock,
  CheckCircle2,
  ShieldCheck,
  Edit3,
  Snowflake,
  MessageCircle,
  Activity,
  Target,
  FileText,
  AlertCircle,
  HelpCircle,
  TrendingUp,
  Award
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { cn } from "@/lib/utils";

// Sample clinical developmental milestones
const DEFAULT_DOMAINS = [
  { id: "sensory", name: "Sensory Processing & Regulation", level: "In Progress", score: 75, target: "Tolerates tactile & auditory input in therapy environment" },
  { id: "motor", name: "Fine Motor & Bilateral Coordination", level: "In Progress", score: 60, target: "Tri-pod pencil grasp and scissor cut along curved lines" },
  { id: "attention", name: "Attention Span & Task Completion", level: "Emerging", score: 45, target: "Maintains structured activity focus for 15+ minutes" },
  { id: "social", name: "Social Communication & Turn Taking", level: "Mastered", score: 90, target: "Initiates peer greetings and follows two-step group rules" },
  { id: "adl", name: "Activities of Daily Living (Self-Care)", level: "In Progress", score: 70, target: "Independent shoe fastening and button alignment" },
];

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
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [sessionFilter, setSessionFilter] = useState("all"); // all | upcoming | completed | cancelled

  const client = clients.find((c) => c.id === id);
  const record = client ? getRecordForClient(client.id) : null;
  const renewals = client ? getRenewalsForClient(client.id) : [];

  // Edit form state
  const [editForm, setEditForm] = useState({
    clientName: "",
    parentName: "",
    parentContact: "",
    parentEmail: "",
    dob: "",
    serviceType: "therapy",
    parentComplaint: "",
  });

  const openEditModal = () => {
    if (!client) return;
    setEditForm({
      clientName: client.clientName || "",
      parentName: client.parentName || "",
      parentContact: client.parentContact || "",
      parentEmail: client.parentEmail || "",
      dob: client.dob || "",
      serviceType: client.serviceType || "therapy",
      parentComplaint: client.parentComplaint || "",
    });
    setEditProfileOpen(true);
  };

  const handleSaveProfile = (e) => {
    e.preventDefault();
    if (!editForm.clientName.trim()) {
      toast.error("Client name is required.");
      return;
    }
    updateClient(id, editForm);
    setEditProfileOpen(false);
    toast.success("Client profile updated successfully.");
  };

  const clientSchedules = useMemo(
    () =>
      schedules
        .filter((s) => s.clientId === id)
        .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime)),
    [schedules, id]
  );

  const upcoming = useMemo(
    () => clientSchedules.filter((s) => s.date >= todayStr() && s.status !== "cancelled"),
    [clientSchedules]
  );
  const past = useMemo(
    () => clientSchedules.filter((s) => s.date < todayStr() || s.status === "completed").reverse(),
    [clientSchedules]
  );

  const filteredSchedules = useMemo(() => {
    if (sessionFilter === "upcoming") return upcoming;
    if (sessionFilter === "completed") return clientSchedules.filter((s) => s.status === "completed").reverse();
    if (sessionFilter === "cancelled") return clientSchedules.filter((s) => s.status === "cancelled" || s.status === "rescheduled").reverse();
    return clientSchedules.slice().reverse();
  }, [clientSchedules, upcoming, sessionFilter]);

  if (!client) {
    return (
      <EmptyState
        icon={Search}
        title="Client profile not found"
        subtitle="This client may have been removed or reset in demo state."
        action={
          <Link to="/admin-schedule/clients">
            <Button variant="outline" className="rounded-xl border-slate-200">Back to active clients</Button>
          </Link>
        }
      />
    );
  }

  const isDischarged = client.status === "discharged";
  const cleanPhone = client.parentContact ? client.parentContact.replace(/[^0-9]/g, "") : "";

  const handleDischarge = () => {
    if (!dischargeReason) {
      toast.error("Please select a discharge reason.");
      return;
    }
    updateClient(id, {
      status: "discharged",
      dischargeReason,
      dischargeNote: dischargeNote.trim() || null,
      dateOfDischarge: todayStr(),
    });
    setDischargeOpen(false);
    toast.success(`${client.clientName} successfully discharged.`);
  };

  const handleCreateRenewal = () => {
    let creditsAmount;
    let packageName;
    if (renewKey === "custom") {
      creditsAmount = Number(renewCustom);
      packageName = `Custom (${creditsAmount} sessions)`;
      if (!creditsAmount || creditsAmount <= 0) {
        toast.error("Enter a valid session count.");
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
    toast.success(`Renewal invoice created (+${creditsAmount} sessions, Unpaid). Mark paid to apply.`);
  };

  const handleMarkRenewalPaid = (renewal) => {
    markRenewalPaid(renewal.id);
    toast.success(`Renewal invoice marked as Paid — +${renewal.credits} credits added for ${client.clientName}.`);
  };

  const SessionRow = ({ s }) => (
    <button
      type="button"
      onClick={() => {
        setSelectedSession(s);
        setSessionOpen(true);
      }}
      className="w-full flex flex-wrap items-center gap-3.5 rounded-xl border border-slate-200/90 p-3.5 text-sm text-left hover:bg-sky-50/50 transition-colors group cursor-pointer bg-white"
      data-testid={`client-session-row-${s.id}`}
    >
      <div className="flex items-center gap-2 font-bold text-slate-900 text-xs">
        <Clock className="w-3.5 h-3.5 text-sky-600" />
        <span>{fmtDate(s.date)}</span>
      </div>
      <span className="tabular-nums font-semibold text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">{s.startTime}–{s.endTime}</span>
      <span className="text-xs text-slate-600 font-medium">Therapist: <strong className="text-slate-800">{getTherapist(s.therapistId) ? getTherapist(s.therapistId).name : "—"}</strong></span>
      <StatusBadge status={s.type} />
      <span className="ml-auto">
        <StatusBadge status={s.status} />
      </span>
      {s.progressNote && (
        <span className="basis-full text-xs text-slate-600 bg-slate-50 rounded-lg p-2.5 border border-slate-100 italic leading-relaxed">
          Observation: {s.progressNote}
        </span>
      )}
    </button>
  );

  return (
    <div className="max-w-4xl space-y-6" data-testid="active-client-detail-page">
      <Link
        to="/admin-schedule/clients"
        className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-sky-700 transition-colors"
        data-testid="active-client-back-link"
      >
        <ArrowLeft className="w-4 h-4" /> Back to active client roster
      </Link>

      {/* Header Profile Hero */}
      <Card className="rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden clinical-card">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-5">
            <div className="space-y-3">
              <div className="flex items-center gap-3.5">
                <div className="w-14 h-14 rounded-2xl bg-sky-100 text-sky-800 flex items-center justify-center font-black text-lg shadow-2xs">
                  {client.clientName.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h1 className="text-2xl font-black tracking-tight text-slate-900" data-testid="active-client-name">
                      {client.clientName}
                    </h1>
                    <StatusBadge status={client.status} />
                  </div>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Age {calcAge(client.dob) != null ? `${calcAge(client.dob)} Years` : "—"} · DOB {fmtDate(client.dob)} · Enrolled {fmtDate(client.dateOfJoin)}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  Parent: <strong>{client.parentName}</strong>
                </div>

                {client.parentContact && (
                  <a
                    href={`https://wa.me/${cleanPhone}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition-colors"
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                    {client.parentContact}
                  </a>
                )}

                {client.parentEmail && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    {client.parentEmail}
                  </div>
                )}

                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-sky-50 border border-sky-200 text-xs font-bold text-sky-800">
                  <ShieldCheck className="w-3.5 h-3.5 text-sky-600" />
                  Access Code: <span className="font-mono text-sky-900">#{client.clientAccessCode}</span>
                </div>
              </div>

              {client.parentComplaint && (
                <div className="rounded-xl bg-amber-50/70 border border-amber-200/80 p-3.5 max-w-2xl" data-testid="active-client-complaint">
                  <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider mb-1">Chief Concern / Clinical Intake Note</p>
                  <p className="text-xs text-slate-700 leading-relaxed font-medium">{client.parentComplaint}</p>
                </div>
              )}

              {(client.concernTags || []).length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {(client.concernTags || []).map((t) => (
                    <ConcernTag key={t} tag={t} />
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-wrap md:flex-col gap-2 shrink-0">
              <Button
                variant="outline"
                className="w-full gap-2 rounded-xl border-slate-200 font-semibold text-xs h-9"
                onClick={openEditModal}
              >
                <Edit3 className="w-3.5 h-3.5 text-slate-600" /> Edit Profile
              </Button>
              <Link to={`/print/client/${id}`}>
                <Button variant="outline" className="w-full gap-2 rounded-xl border-slate-200 font-semibold text-xs h-9" data-testid="print-report-link-button">
                  <Printer className="w-3.5 h-3.5 text-slate-600" /> Print Summary
                </Button>
              </Link>
              {!isDischarged && (
                <>
                  <Button
                    className="w-full gap-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold text-xs h-9 shadow-xs"
                    onClick={() => setAddOpen(true)}
                    data-testid="client-add-schedule-button"
                  >
                    <CalendarPlus className="w-3.5 h-3.5" /> Book Session
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full gap-2 text-rose-600 border-rose-200 hover:bg-rose-50 rounded-xl font-semibold text-xs h-9"
                    onClick={() => setDischargeOpen(true)}
                    data-testid="discharge-client-button"
                  >
                    <LogOut className="w-3.5 h-3.5" /> Discharge
                  </Button>
                </>
              )}
            </div>
          </div>

          {isDischarged && (
            <div className="mt-5 rounded-xl bg-slate-100 border border-slate-200 p-4 text-xs text-slate-700 leading-relaxed font-medium" data-testid="discharged-banner">
              <strong className="text-slate-900">Client Discharged:</strong> Completed therapy on {fmtDate(client.dateOfDischarge)} · Reason: <span className="font-semibold text-slate-800">{DISCHARGE_REASONS.find((r) => r.value === client.dischargeReason)?.label || client.dischargeReason}</span>
              {client.dischargeNote ? ` — Note: ${client.dischargeNote}` : ""}
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="schedule" className="space-y-4">
        <TabsList className="bg-slate-100 p-1 rounded-xl border border-slate-200">
          <TabsTrigger value="schedule" className="rounded-lg text-xs font-bold px-4 data-[state=active]:bg-white data-[state=active]:text-sky-900 data-[state=active]:shadow-2xs cursor-pointer" data-testid="client-tab-schedule">
            Session History ({clientSchedules.length})
          </TabsTrigger>
          <TabsTrigger value="credit" className="rounded-lg text-xs font-bold px-4 data-[state=active]:bg-white data-[state=active]:text-sky-900 data-[state=active]:shadow-2xs cursor-pointer" data-testid="client-tab-credit">
            Package & Credits ({record ? `${record.remainingCredit}/${record.totalCredit}` : "0"})
          </TabsTrigger>
          <TabsTrigger value="milestones" className="rounded-lg text-xs font-bold px-4 data-[state=active]:bg-white data-[state=active]:text-sky-900 data-[state=active]:shadow-2xs cursor-pointer" data-testid="client-tab-milestones">
            <Target className="w-3.5 h-3.5 mr-1 text-teal-600" /> Clinical Milestones
          </TabsTrigger>
          <TabsTrigger value="info" className="rounded-lg text-xs font-bold px-4 data-[state=active]:bg-white data-[state=active]:text-sky-900 data-[state=active]:shadow-2xs cursor-pointer" data-testid="client-tab-info">
            <FileText className="w-3.5 h-3.5 mr-1 text-sky-600" /> Full Demographics
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Schedule */}
        <TabsContent value="schedule" className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Select value={sessionFilter} onValueChange={setSessionFilter}>
                <SelectTrigger className="w-40 h-8 text-xs rounded-xl border-slate-200 bg-white font-semibold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200">
                  <SelectItem value="all">All Sessions ({clientSchedules.length})</SelectItem>
                  <SelectItem value="upcoming">Upcoming ({upcoming.length})</SelectItem>
                  <SelectItem value="completed">Completed ({clientSchedules.filter((s) => s.status === "completed").length})</SelectItem>
                  <SelectItem value="cancelled">Cancelled / Rescheduled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {!isDischarged && (
              <Button size="sm" className="h-8 gap-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold" onClick={() => setAddOpen(true)}>
                <CalendarPlus className="w-3.5 h-3.5" /> Book Session
              </Button>
            )}
          </div>

          <Card className="rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
            <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center justify-between">
                <span>Session Timeline & Observations ({filteredSchedules.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-2.5">
              {filteredSchedules.length === 0 ? (
                <EmptyState icon={CalendarPlus} title="No sessions match filter" subtitle="Book a session slot or adjust filter." />
              ) : (
                filteredSchedules.map((s) => <SessionRow key={s.id} s={s} />)
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Credit & Billing */}
        <TabsContent value="credit" className="space-y-4">
          {!record ? (
            <Card className="rounded-2xl border border-slate-200/90 bg-white shadow-sm">
              <CardContent className="p-6">
                <EmptyState icon={Wallet} title="No active package recorded" subtitle="This client has no credit ledger assigned." />
              </CardContent>
            </Card>
          ) : (
            <>
              <Card className="rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
                <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50 flex flex-row items-center justify-between space-y-0">
                  <div>
                    <CardTitle className="text-sm font-bold text-slate-900">Active Package: {record.packageName}</CardTitle>
                    <p className="text-xs text-slate-400 mt-0.5">Purchased on {fmtDate(record.purchaseDate)}</p>
                  </div>
                  {!isDischarged && (
                    <Button
                      className="bg-sky-600 hover:bg-sky-700 text-white font-bold gap-2 h-9 text-xs rounded-xl"
                      onClick={() => setRenewOpen(true)}
                      data-testid="renew-package-button"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Renew Package
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <CreditBar remaining={record.remainingCredit} total={record.totalCredit} />
                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <LeaveInfo leaveUsed={record.leaveUsed} leaveQuota={record.leaveQuota} />
                  </div>
                </CardContent>
              </Card>

              {renewals.length > 0 && (
                <Card className="rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
                  <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
                    <CardTitle className="text-sm font-bold text-slate-900">Renewal Invoices & Ledgers</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-2.5">
                    {renewals.map((r) => (
                      <div key={r.id} className="flex flex-wrap items-center gap-3.5 rounded-xl border border-slate-200/90 p-3.5 text-xs bg-slate-50/40" data-testid={`renewal-row-${r.id}`}>
                        <span className="font-bold text-slate-900">{r.packageName}</span>
                        <span className="text-sky-800 font-extrabold tabular-nums bg-sky-100 px-2 py-0.5 rounded-md">+{r.credits} Sessions</span>
                        <span className="text-slate-400 font-medium">Created {fmtDate(r.createdAt)}</span>
                        <StatusBadge status={r.status} />
                        {r.status === "unpaid" && !isDischarged && (
                          <Button
                            size="sm"
                            className="ml-auto h-8 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs"
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

              <Card className="rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
                <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
                  <CardTitle className="text-sm font-bold text-slate-900">Credit Audit Trail</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {record.history.length === 0 ? (
                    <EmptyState icon={Wallet} title="No credit ledger history" subtitle="Completed sessions, leave allocations, and renewals will log here." />
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50/70 hover:bg-slate-50/70 border-b border-slate-200">
                          <TableHead className="font-bold text-slate-700 text-xs py-3 pl-6">Transaction Date</TableHead>
                          <TableHead className="font-bold text-slate-700 text-xs">Action Type</TableHead>
                          <TableHead className="font-bold text-slate-700 text-xs text-right pr-6">Credit Change</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {[...record.history].reverse().map((h, idx) => (
                          <TableRow key={idx} className="border-b border-slate-100 hover:bg-slate-50/50">
                            <TableCell className="pl-6 text-xs font-semibold text-slate-700">{fmtDate(h.date)}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <StatusBadge status={h.action === "used" ? "completed" : h.action === "leave" ? "rescheduled" : "paid"} className="capitalize" />
                                <span className="text-xs text-slate-500 capitalize font-medium">{h.action}</span>
                              </div>
                            </TableCell>
                            <TableCell className={cn("text-right tabular-nums font-extrabold text-xs pr-6", h.creditChange > 0 ? "text-emerald-600" : "text-slate-800")}>
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

        {/* Tab 3: Developmental Milestones */}
        <TabsContent value="milestones" className="space-y-4">
          <Card className="rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
            <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Target className="w-4 h-4 text-teal-600" />
                Developmental Domains & Therapy Objectives
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Functional outcome goals and milestone progression track for {client.clientName}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {DEFAULT_DOMAINS.map((d) => (
                <div key={d.id} className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-900">{d.name}</span>
                      <span className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                        d.level === "Mastered" ? "bg-emerald-50 text-emerald-800 border-emerald-200" :
                        d.level === "In Progress" ? "bg-sky-50 text-sky-800 border-sky-200" :
                        "bg-amber-50 text-amber-800 border-amber-200"
                      )}>
                        {d.level}
                      </span>
                    </div>
                    <span className="text-xs font-black tabular-nums text-slate-700">{d.score}%</span>
                  </div>

                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        d.level === "Mastered" ? "bg-emerald-500" : d.level === "In Progress" ? "bg-sky-500" : "bg-amber-500"
                      )}
                      style={{ width: `${d.score}%` }}
                    />
                  </div>

                  <p className="text-xs text-slate-500 font-medium pt-0.5">
                    <strong>Target Objective:</strong> {d.target}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 4: Full Demographics */}
        <TabsContent value="info" className="space-y-4">
          <Card className="rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
            <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
              <CardTitle className="text-sm font-bold text-slate-900">Demographic & Intake Profile</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                  <p className="text-slate-400 font-medium">Child Full Name</p>
                  <p className="font-bold text-slate-800">{client.clientName}</p>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                  <p className="text-slate-400 font-medium">Date of Birth</p>
                  <p className="font-bold text-slate-800">{fmtDate(client.dob)} ({calcAge(client.dob)} yrs)</p>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                  <p className="text-slate-400 font-medium">Enrollment Date</p>
                  <p className="font-bold text-slate-800">{fmtDate(client.dateOfJoin)}</p>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                  <p className="text-slate-400 font-medium">Parent / Guardian</p>
                  <p className="font-bold text-slate-800">{client.parentName}</p>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                  <p className="text-slate-400 font-medium">Phone / WhatsApp</p>
                  <p className="font-bold text-slate-800">{client.parentContact || "—"}</p>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                  <p className="text-slate-400 font-medium">Parent Email</p>
                  <p className="font-bold text-slate-800">{client.parentEmail || "—"}</p>
                </div>
              </div>

              {client.assessmentReportNote && (
                <div className="p-4 rounded-xl bg-sky-50 border border-sky-200 text-xs space-y-1">
                  <p className="font-bold text-sky-900 uppercase tracking-wider text-[10px]">Clinical Intake Assessment Note</p>
                  <p className="text-slate-700 leading-relaxed font-medium">{client.assessmentReportNote}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Profile Modal */}
      <Dialog open={editProfileOpen} onOpenChange={setEditProfileOpen}>
        <DialogContent className="max-w-md rounded-2xl p-6 border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">Edit Client Demographics</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Update client and caregiver contact records.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveProfile} className="space-y-3.5 pt-2">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Child's Name *</Label>
              <Input
                className="rounded-xl border-slate-200 bg-slate-50 text-xs h-10"
                value={editForm.clientName}
                onChange={(e) => setEditForm({ ...editForm, clientName: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Date of Birth</Label>
                <Input
                  type="date"
                  className="rounded-xl border-slate-200 bg-slate-50 text-xs h-10"
                  value={editForm.dob}
                  onChange={(e) => setEditForm({ ...editForm, dob: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Parent Name</Label>
                <Input
                  className="rounded-xl border-slate-200 bg-slate-50 text-xs h-10"
                  value={editForm.parentName}
                  onChange={(e) => setEditForm({ ...editForm, parentName: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">WhatsApp / Phone</Label>
                <Input
                  className="rounded-xl border-slate-200 bg-slate-50 text-xs h-10"
                  value={editForm.parentContact}
                  onChange={(e) => setEditForm({ ...editForm, parentContact: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Email Address</Label>
                <Input
                  type="email"
                  className="rounded-xl border-slate-200 bg-slate-50 text-xs h-10"
                  value={editForm.parentEmail}
                  onChange={(e) => setEditForm({ ...editForm, parentEmail: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Chief Referral Concern</Label>
              <Textarea
                rows={2}
                className="rounded-xl border-slate-200 bg-slate-50 text-xs"
                value={editForm.parentComplaint}
                onChange={(e) => setEditForm({ ...editForm, parentComplaint: e.target.value })}
              />
            </div>
            <DialogFooter className="pt-2 gap-2">
              <Button type="button" variant="outline" className="rounded-xl border-slate-200" onClick={() => setEditProfileOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl">Save Changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Booking Modal */}
      <AddScheduleModal
        open={addOpen}
        onOpenChange={setAddOpen}
        defaults={{ clientId: id, lockClient: true, type: "therapy" }}
      />
      <SessionDetailModal schedule={selectedSession} open={sessionOpen} onOpenChange={setSessionOpen} />

      {/* Discharge dialog */}
      <Dialog open={dischargeOpen} onOpenChange={setDischargeOpen}>
        <DialogContent className="max-w-sm rounded-2xl p-6 border-slate-200" data-testid="discharge-dialog">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">Discharge {client.clientName}</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Select discharge reason and record clinical summary note. Removes client from active schedules.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3.5 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Discharge Reason</label>
              <Select value={dischargeReason} onValueChange={setDischargeReason}>
                <SelectTrigger className="rounded-xl border-slate-200 bg-slate-50 focus:bg-white text-xs" data-testid="discharge-reason-select">
                  <SelectValue placeholder="Select reason..." />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200">
                  {DISCHARGE_REASONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Clinical Summary Note (Optional)</label>
              <Textarea
                rows={2}
                className="rounded-xl border-slate-200 bg-slate-50 focus:bg-white text-xs"
                placeholder="Discharge summary, goals achieved, transition plans..."
                value={dischargeNote}
                onChange={(e) => setDischargeNote(e.target.value)}
                data-testid="discharge-note-input"
              />
            </div>
          </div>
          <DialogFooter className="mt-5 gap-2">
            <Button variant="outline" className="rounded-xl border-slate-200" onClick={() => setDischargeOpen(false)}>Cancel</Button>
            <Button className="bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl" onClick={handleDischarge} data-testid="confirm-discharge-button">
              Confirm Discharge
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Renew dialog */}
      <Dialog open={renewOpen} onOpenChange={setRenewOpen}>
        <DialogContent className="max-w-sm rounded-2xl p-6 border-slate-200" data-testid="renew-dialog">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">Renew Therapy Package</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Generates an invoice for package renewal. Credits are credited upon marking invoice as Paid.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3.5 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Package Tier</label>
              <Select value={renewKey} onValueChange={setRenewKey}>
                <SelectTrigger className="rounded-xl border-slate-200 bg-slate-50 focus:bg-white text-xs" data-testid="renew-package-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200">
                  {PACKAGE_OPTIONS.map((p) => (
                    <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>
                  ))}
                  <SelectItem value="custom">Custom Session Count...</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {renewKey === "custom" && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Number of Sessions</label>
                <Input
                  type="number"
                  min="1"
                  className="rounded-xl border-slate-200 bg-slate-50 focus:bg-white text-xs"
                  placeholder="e.g. 15"
                  value={renewCustom}
                  onChange={(e) => setRenewCustom(e.target.value)}
                  data-testid="renew-custom-credits-input"
                />
              </div>
            )}
          </div>
          <DialogFooter className="mt-5 gap-2">
            <Button variant="outline" className="rounded-xl border-slate-200" onClick={() => setRenewOpen(false)}>Cancel</Button>
            <Button className="bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl" onClick={handleCreateRenewal} data-testid="confirm-renew-button">
              Create Invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
