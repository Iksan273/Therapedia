import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Clock,
  Sparkles,
  Users,
  Search,
  Plus,
  Calendar,
  MessageCircle,
  CalendarPlus,
  Baby,
  ShieldCheck,
  UserX,
  Phone,
  AlertTriangle,
  ArrowRight,
  Filter,
  CheckCircle2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConcernTag } from "@/components/common/StatusBadge";
import { EmptyState } from "@/components/common/EmptyState";
import { AddScheduleModal } from "@/components/calendar/AddScheduleModal";
import { WhatsAppAutomationModal } from "@/components/common/WhatsAppAutomationModal";
import { useClients } from "@/context/ClientsContext";
import { useAssessments } from "@/context/AssessmentsContext";
import { calcAge, fmtDate, todayStr, uid, genCode, CONCERN_TAGS } from "@/lib/appUtils";
import { cn } from "@/lib/utils";

const TIME_PREFERENCES = [
  { value: "all", label: "All Preferred Windows" },
  { value: "sat_morning", label: "Saturday Morning (08:00 - 12:00)" },
  { value: "sat_afternoon", label: "Saturday Afternoon (13:00 - 17:00)" },
  { value: "weekday_morning", label: "Weekday Morning (08:00 - 12:00)" },
  { value: "weekday_afternoon", label: "Weekday Afternoon (13:00 - 17:00)" },
  { value: "anytime", label: "Flexible / Any Open Slot" },
];

const PRIORITY_LEVELS = [
  { value: "all", label: "All Priority Tiers" },
  { value: "urgent", label: "🚨 Urgent (Early Intervention)" },
  { value: "high", label: "⚡ High Priority" },
  { value: "regular", label: "Standard Queue" },
];

export default function WaitingListHub() {
  const navigate = useNavigate();
  const { clients, addClient, updateClient } = useClients();
  const { categories } = useAssessments();

  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [timeFilter, setTimeFilter] = useState("all");
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [scheduleModalClient, setScheduleModalClient] = useState(null);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);

  // WhatsApp Automation state
  const [waModalOpen, setWaModalOpen] = useState(false);
  const [waTargetClientId, setWaTargetClientId] = useState(null);

  // New waiting prospective inquiry form
  const [newForm, setNewForm] = useState({
    clientName: "",
    parentName: "",
    parentContact: "",
    dob: "",
    priority: "urgent",
    timePreference: "sat_morning",
    concernTags: ["sensory"],
    parentComplaint: "",
  });

  // Prospective Intake Waiting Queue (Only for new inquiry / pending intake leads)
  const intakeWaitingList = useMemo(() => {
    return clients
      .filter((c) => ["inquiry", "pending"].includes(c.status) && c.isWaitingList !== false)
      .filter((c) => {
        const q = search.trim().toLowerCase();
        const matchSearch =
          !q ||
          c.clientName.toLowerCase().includes(q) ||
          (c.parentName && c.parentName.toLowerCase().includes(q)) ||
          (c.parentContact && c.parentContact.toLowerCase().includes(q));

        const isUrgentAge = (calcAge(c.dob) || 5) <= 3;
        const matchPriority =
          priorityFilter === "all" ||
          (priorityFilter === "urgent" && (isUrgentAge || c.urgency === "urgent")) ||
          (priorityFilter === "high" && c.urgency === "high") ||
          (priorityFilter === "regular" && (!c.urgency || c.urgency === "regular"));

        const matchTime =
          timeFilter === "all" ||
          (c.timePreference && c.timePreference === timeFilter) ||
          timeFilter === "anytime";

        return matchSearch && matchPriority && matchTime;
      });
  }, [clients, search, priorityFilter, timeFilter]);

  // Analytics Metrics
  const earlyInterventionCount = useMemo(() => {
    return intakeWaitingList.filter((c) => (calcAge(c.dob) || 5) <= 3).length;
  }, [intakeWaitingList]);

  const satMorningDemandCount = useMemo(() => {
    return intakeWaitingList.filter((c) => c.timePreference === "sat_morning").length;
  }, [intakeWaitingList]);

  const urgentCount = useMemo(() => {
    return intakeWaitingList.filter(
      (c) => c.urgency === "urgent" || (calcAge(c.dob) || 5) <= 3
    ).length;
  }, [intakeWaitingList]);

  const handleCreateWaitingClient = (e) => {
    e.preventDefault();
    if (!newForm.clientName.trim() || !newForm.parentName.trim()) {
      toast.error("Child name and parent name are required.");
      return;
    }

    const newId = uid();
    const accessCode = genCode("TP");
    const asmCode = genCode("ASM");

    addClient({
      id: newId,
      clientName: newForm.clientName.trim(),
      parentName: newForm.parentName.trim(),
      parentContact: newForm.parentContact.trim(),
      dob: newForm.dob || "2023-01-01",
      status: "inquiry",
      isWaitingList: true,
      serviceType: "assessment",
      clientAccessCode: accessCode,
      assessmentAccessCode: asmCode,
      assessmentCategoryId: categories[0]?.id || "cat-1",
      urgency: newForm.priority,
      timePreference: newForm.timePreference,
      concernTags: newForm.concernTags,
      parentComplaint:
        newForm.parentComplaint.trim() || "Waiting list intake for pediatric therapy consultation.",
      createdAt: todayStr(),
    });

    setAddModalOpen(false);
    toast.success(`${newForm.clientName} successfully added to Inquiry Waiting List!`);
    setNewForm({
      clientName: "",
      parentName: "",
      parentContact: "",
      dob: "",
      priority: "urgent",
      timePreference: "sat_morning",
      concernTags: ["sensory"],
      parentComplaint: "",
    });
  };

  const handleOpenWhatsApp = (client) => {
    setWaTargetClientId(client.id);
    setWaModalOpen(true);
  };

  const handleBookAssessment = (client) => {
    setScheduleModalClient({
      clientId: client.id,
      type: "assessment",
    });
    setScheduleModalOpen(true);
  };

  const handleRemoveFromWaitlist = (e, client) => {
    e.stopPropagation();
    updateClient(client.id, { isWaitingList: false });
    toast.info(`${client.clientName} removed from Waiting List.`);
  };

  return (
    <div className="space-y-6" data-testid="waiting-list-hub-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-100/80 text-purple-800 text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            New Inquiries · Pre-Admission Queue
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Prospective Inquiry Waiting List
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage prospective intake families awaiting initial clinical assessment and slot allocation. Active clients are excluded.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            className="gap-2 rounded-xl border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 h-10 shadow-2xs"
            onClick={() => setWaModalOpen(true)}
          >
            <MessageCircle className="w-4 h-4 text-emerald-600" /> WhatsApp Hub
          </Button>
          <Button
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl gap-2 shadow-sm shadow-purple-600/20 text-xs h-10"
            onClick={() => setAddModalOpen(true)}
            data-testid="add-waiting-client-button"
          >
            <Plus className="w-4 h-4" /> Add Inquiry to Waitlist
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>Intake Waitlist Queue</span>
            <Users className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 tabular-nums">{intakeWaitingList.length}</p>
          <p className="text-[11px] font-medium text-slate-500">New Inquiry Prospects</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>Early Intervention (≤ 3 yrs)</span>
            <Baby className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-2xl font-black text-rose-600 tabular-nums">
            {earlyInterventionCount}
          </p>
          <p className="text-[11px] font-semibold text-rose-700">Golden Age Priority</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>Urgent Triage Cases</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-amber-600 tabular-nums">{urgentCount}</p>
          <p className="text-[11px] font-medium text-amber-700">High Clinical Priority</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>Peak Demand Window</span>
            <Clock className="w-4 h-4 text-sky-600" />
          </div>
          <p className="text-lg font-black text-sky-800">Saturday Morning</p>
          <p className="text-[11px] font-medium text-slate-500">{satMorningDemandCount} families requesting</p>
        </div>
      </div>

      {/* Main Table Card */}
      <Card className="rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
        {/* Filter Bar */}
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-white">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              className="pl-10 h-10 rounded-xl border-slate-200 bg-slate-50 focus:bg-white text-xs font-medium"
              placeholder="Search by child name, parent name, or contact number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-48 h-10 text-xs rounded-xl border-slate-200 bg-slate-50 font-semibold">
                <SelectValue placeholder="Priority Tier" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-200">
                {PRIORITY_LEVELS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={timeFilter} onValueChange={setTimeFilter}>
              <SelectTrigger className="w-52 h-10 text-xs rounded-xl border-slate-200 bg-slate-50 font-semibold">
                <SelectValue placeholder="Preferred Window" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-200">
                {TIME_PREFERENCES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <CardContent className="p-0">
          {intakeWaitingList.length === 0 ? (
            <div className="p-10">
              <EmptyState
                icon={Users}
                title="No prospective inquiries in waiting queue"
                subtitle="All inquiry families have been scheduled for clinical assessment or there are no waitlisted leads."
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/70 hover:bg-slate-50/70 border-b border-slate-200">
                  <TableHead className="font-bold text-slate-700 text-xs py-3.5 pl-6">Child Profile & Age</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs">Parent / Contact</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs">Triage Priority</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs">Preferred Window</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs">Primary Concern</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs text-right pr-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {intakeWaitingList.map((c) => {
                  const age = calcAge(c.dob);
                  const isUrgent = age != null && age <= 3;

                  return (
                    <TableRow
                      key={c.id}
                      className="border-b border-slate-100 hover:bg-purple-50/30 transition-colors group cursor-pointer"
                      onClick={() => navigate(`/admin-inquiry/clients/${c.id}`)}
                    >
                      <TableCell className="py-3.5 pl-6">
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              "w-10 h-10 rounded-2xl flex items-center justify-center font-black text-xs shadow-2xs shrink-0",
                              isUrgent ? "bg-rose-100 text-rose-800" : "bg-purple-100 text-purple-800"
                            )}
                          >
                            {c.clientName.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-extrabold text-sm text-slate-900 group-hover:text-purple-700 transition-colors">
                              {c.clientName}
                            </p>
                            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                              {age != null ? `${age} Years Old` : "—"} · Intake: {fmtDate(c.createdAt)}
                            </p>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="text-xs font-medium text-slate-700">
                        <p className="font-bold text-slate-900">{c.parentName}</p>
                        {c.parentContact && (
                          <span className="font-mono text-[11px] text-slate-500">{c.parentContact}</span>
                        )}
                      </TableCell>

                      <TableCell>
                        {isUrgent ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            🚨 Early Intervention
                          </span>
                        ) : c.urgency === "high" ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            ⚡ High Priority
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
                            Regular Queue
                          </span>
                        )}
                      </TableCell>

                      <TableCell className="text-xs text-slate-700 font-semibold">
                        {c.timePreference === "sat_morning"
                          ? "Saturday Morning"
                          : c.timePreference === "sat_afternoon"
                          ? "Saturday Afternoon"
                          : c.timePreference === "weekday_morning"
                          ? "Weekday Morning"
                          : c.timePreference === "weekday_afternoon"
                          ? "Weekday Afternoon"
                          : "Flexible / Any Slot"}
                      </TableCell>

                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-[170px]">
                          {(c.concernTags || []).slice(0, 2).map((t) => (
                            <ConcernTag key={t} tag={t} />
                          ))}
                        </div>
                        {c.parentComplaint && (
                          <p className="text-[11px] text-slate-500 italic truncate max-w-[170px] mt-0.5">
                            {c.parentComplaint}
                          </p>
                        )}
                      </TableCell>

                      <TableCell className="pr-6 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 px-2.5 rounded-xl border-emerald-200 text-emerald-700 hover:bg-emerald-50 text-xs font-bold shadow-2xs"
                            onClick={() => handleOpenWhatsApp(c)}
                            title="Send WhatsApp Message"
                          >
                            <MessageCircle className="w-3.5 h-3.5 mr-1" /> WhatsApp
                          </Button>
                          <Button
                            size="sm"
                            className="h-8 px-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-2xs"
                            onClick={() => handleBookAssessment(c)}
                            title="Book Initial Assessment Slot"
                          >
                            <CalendarPlus className="w-3.5 h-3.5 mr-1" /> Book Assessment
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 px-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 text-xs"
                            onClick={(e) => handleRemoveFromWaitlist(e, c)}
                            title="Remove from Waiting List"
                          >
                            <UserX className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Waiting Client Dialog (Strictly for new inquiry prospects) */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className="max-w-md rounded-2xl p-6 border-slate-200">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                <Plus className="w-4 h-4" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-extrabold text-slate-900">
                  Add Prospective Inquiry to Waitlist
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Register a new family waiting for initial clinical intake assessment.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleCreateWaitingClient} className="space-y-3.5 pt-2">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Child's Full Name *</Label>
              <Input
                className="rounded-xl border-slate-200 bg-slate-50 text-xs h-10 font-medium"
                placeholder="e.g. Liam Henderson"
                value={newForm.clientName}
                onChange={(e) => setNewForm({ ...newForm, clientName: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Parent / Guardian *</Label>
                <Input
                  className="rounded-xl border-slate-200 bg-slate-50 text-xs h-10 font-medium"
                  placeholder="e.g. Eleanor Henderson"
                  value={newForm.parentName}
                  onChange={(e) => setNewForm({ ...newForm, parentName: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">WhatsApp / Phone *</Label>
                <Input
                  className="rounded-xl border-slate-200 bg-slate-50 text-xs h-10 font-medium"
                  placeholder="e.g. +62 812-3456-7890"
                  value={newForm.parentContact}
                  onChange={(e) => setNewForm({ ...newForm, parentContact: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Date of Birth</Label>
                <Input
                  type="date"
                  className="rounded-xl border-slate-200 bg-slate-50 text-xs h-10 font-medium"
                  value={newForm.dob}
                  onChange={(e) => setNewForm({ ...newForm, dob: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Triage Priority</Label>
                <Select
                  value={newForm.priority}
                  onValueChange={(val) => setNewForm({ ...newForm, priority: val })}
                >
                  <SelectTrigger className="rounded-xl border-slate-200 bg-slate-50 text-xs h-10 font-semibold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200">
                    <SelectItem value="urgent">🚨 Urgent (Early Intervention)</SelectItem>
                    <SelectItem value="high">⚡ High Priority</SelectItem>
                    <SelectItem value="regular">Standard Queue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Preferred Time Window</Label>
              <Select
                value={newForm.timePreference}
                onValueChange={(val) => setNewForm({ ...newForm, timePreference: val })}
              >
                <SelectTrigger className="rounded-xl border-slate-200 bg-slate-50 text-xs h-10 font-semibold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200">
                  <SelectItem value="sat_morning">Saturday Morning (08:00 - 12:00)</SelectItem>
                  <SelectItem value="sat_afternoon">Saturday Afternoon (13:00 - 17:00)</SelectItem>
                  <SelectItem value="weekday_morning">Weekday Morning (08:00 - 12:00)</SelectItem>
                  <SelectItem value="weekday_afternoon">Weekday Afternoon (13:00 - 17:00)</SelectItem>
                  <SelectItem value="anytime">Flexible / Any Open Slot</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Referral Concern & Notes</Label>
              <Textarea
                rows={2}
                className="rounded-xl border-slate-200 bg-slate-50 text-xs font-medium"
                placeholder="e.g. Speech delay, sensory sensitivity to auditory stimuli..."
                value={newForm.parentComplaint}
                onChange={(e) => setNewForm({ ...newForm, parentComplaint: e.target.value })}
              />
            </div>

            <DialogFooter className="pt-2 gap-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl border-slate-200 text-xs"
                onClick={() => setAddModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs"
              >
                Save to Waitlist
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Booking Modal (Booking an assessment for waitlist candidate) */}
      {scheduleModalClient && (
        <AddScheduleModal
          open={scheduleModalOpen}
          onOpenChange={(open) => {
            setScheduleModalOpen(open);
            if (!open) setScheduleModalClient(null);
          }}
          defaults={{
            clientId: scheduleModalClient.clientId,
            lockClient: true,
            type: "assessment",
            lockType: true,
          }}
          onCreated={() => {
            updateClient(scheduleModalClient.clientId, {
              status: "assessment_scheduled",
              isWaitingList: false,
            });
            toast.success("Assessment booked! Client progressed from waiting list.");
          }}
        />
      )}

      {/* WhatsApp Automation Modal */}
      <WhatsAppAutomationModal
        open={waModalOpen}
        onOpenChange={setWaModalOpen}
        defaultClientId={waTargetClientId}
        defaultTemplateId="assessment_invite"
      />
    </div>
  );
}
