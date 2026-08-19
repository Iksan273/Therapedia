import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Search,
  Plus,
  Inbox,
  Filter,
  Sparkles,
  User,
  Calendar,
  Tag,
  CalendarPlus,
  Clock,
  Layers,
  Zap,
  Baby,
  CheckCircle2,
  AlertCircle,
  XCircle,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { AddScheduleModal } from "@/components/calendar/AddScheduleModal";
import { useClients } from "@/context/ClientsContext";
import { useAssessments } from "@/context/AssessmentsContext";
import {
  PIPELINE_STATUSES,
  STATUS_META,
  CONCERN_TAGS,
  SESSION_TYPES,
  calcAge,
  fmtDate,
  genCode,
  makeInquiryClient,
} from "@/lib/appUtils";
import { cn } from "@/lib/utils";

const STAGE_ACCENT_BAR = {
  inquiry: "bg-sky-500",
  pending: "bg-amber-500",
  assessment_scheduled: "bg-blue-500",
  assessment_done: "bg-teal-500",
  report_ready: "bg-indigo-500",
  scheduling: "bg-cyan-500",
  admitted: "bg-emerald-500",
  discontinued: "bg-rose-500",
};

export default function InquiryPipeline() {
  const navigate = useNavigate();
  const { clients, addClient, updateClient } = useClients();
  const { categories } = useAssessments();

  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState("all");
  const [quickScheduleClientId, setQuickScheduleClientId] = useState(null);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);

  // New Intake Modal State
  const [newIntakeOpen, setNewIntakeOpen] = useState(false);
  const [newForm, setNewForm] = useState({
    clientName: "",
    parentName: "",
    parentContact: "",
    parentEmail: "",
    dob: "",
    parentComplaint: "",
    concernTags: ["sensory"],
    serviceTypes: ["assessment", "therapy"],
    isWaitingList: false,
    urgency: "regular",
    timePreference: "sat_morning",
  });

  // Direct Card Waitlist Modal State
  const [waitlistModalOpen, setWaitlistModalOpen] = useState(false);
  const [waitlistTargetClient, setWaitlistTargetClient] = useState(null);
  const [waitlistUrgency, setWaitlistUrgency] = useState("regular");
  const [waitlistTimePref, setWaitlistTimePref] = useState("sat_morning");
  const [waitlistActive, setWaitlistActive] = useState(true);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return clients.filter((c) => {
      if (q && !c.clientName.toLowerCase().includes(q) && !c.parentName.toLowerCase().includes(q)) return false;
      if (tagFilter !== "all" && !(c.concernTags || []).includes(tagFilter)) return false;
      return true;
    });
  }, [clients, search, tagFilter]);

  const grouped = useMemo(() => {
    const map = {};
    PIPELINE_STATUSES.forEach((s) => {
      map[s] = filtered
        .filter((c) => c.status === s)
        .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
    });
    return map;
  }, [filtered]);

  const handleQuickBookAssessment = (e, client) => {
    e.stopPropagation();
    if (!client.assessmentAccessCode) {
      const code = genCode("ASM");
      const catId = client.assessmentCategoryId || (categories[0] ? categories[0].id : null);
      updateClient(client.id, {
        assessmentAccessCode: code,
        assessmentCategoryId: catId,
        serviceType: client.serviceType || "assessment",
      });
    }
    setQuickScheduleClientId(client.id);
    setScheduleModalOpen(true);
  };

  const handleOpenCardWaitlist = (e, client) => {
    e.stopPropagation();
    setWaitlistTargetClient(client);
    setWaitlistActive(client.isWaitingList !== false);
    setWaitlistUrgency(client.urgency || (calcAge(client.dob) <= 3 ? "urgent" : "regular"));
    setWaitlistTimePref(client.timePreference || "sat_morning");
    setWaitlistModalOpen(true);
  };

  const handleSaveCardWaitlist = () => {
    if (!waitlistTargetClient) return;

    updateClient(waitlistTargetClient.id, {
      isWaitingList: waitlistActive,
      urgency: waitlistUrgency,
      timePreference: waitlistTimePref,
    });

    if (waitlistActive) {
      toast.success(`${waitlistTargetClient.clientName} placed on Priority Waiting List.`);
    } else {
      toast.info(`${waitlistTargetClient.clientName} removed from Waiting List.`);
    }
    setWaitlistModalOpen(false);
  };

  const toggleServiceType = (val) => {
    setNewForm((prev) => {
      const cur = prev.serviceTypes || [];
      if (cur.includes(val)) {
        if (cur.length === 1) return prev;
        return { ...prev, serviceTypes: cur.filter((v) => v !== val) };
      } else {
        return { ...prev, serviceTypes: [...cur, val] };
      }
    });
  };

  const toggleConcernTag = (val) => {
    setNewForm((prev) => {
      const cur = prev.concernTags || [];
      return {
        ...prev,
        concernTags: cur.includes(val) ? cur.filter((v) => v !== val) : [...cur, val],
      };
    });
  };

  const handleCreateNewIntake = (e) => {
    e.preventDefault();
    if (!newForm.clientName.trim() || !newForm.parentName.trim()) {
      toast.error("Child name and parent name are required.");
      return;
    }

    const newClient = makeInquiryClient({
      ...newForm,
      assessmentCategoryId: categories[0]?.id || "cat-1",
    });

    addClient(newClient);
    setNewIntakeOpen(false);

    if (newForm.isWaitingList) {
      toast.success(`${newForm.clientName} added directly to Priority Waiting List!`);
    } else {
      toast.success(`New intake created for ${newForm.clientName}!`);
    }

    // Reset form
    setNewForm({
      clientName: "",
      parentName: "",
      parentContact: "",
      parentEmail: "",
      dob: "",
      parentComplaint: "",
      concernTags: ["sensory"],
      serviceTypes: ["assessment", "therapy"],
      isWaitingList: false,
      urgency: "regular",
      timePreference: "sat_morning",
    });
  };

  return (
    <div className="space-y-6" data-testid="inquiry-pipeline-page">
      {/* Header & Filter Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-100/80 text-sky-800 text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5 text-sky-600" />
            Active Intake Pipeline
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">Inquiry Pipeline</h1>
          <p className="text-sm text-slate-500 mt-1">
            Track and progress every family from initial inquiry through assessment to clinic admission.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              className="pl-9 w-48 sm:w-60 bg-white border-slate-200 rounded-xl text-xs h-10"
              placeholder="Search child or parent..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-testid="pipeline-search-input"
            />
          </div>

          <Select value={tagFilter} onValueChange={setTagFilter}>
            <SelectTrigger className="w-44 h-10 bg-white border-slate-200 rounded-xl text-xs font-semibold" data-testid="pipeline-tag-filter">
              <SelectValue placeholder="Filter concern" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-slate-200">
              <SelectItem value="all">All concerns</SelectItem>
              {CONCERN_TAGS.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            className="bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl gap-2 shadow-sm shadow-sky-600/20 text-xs h-10"
            onClick={() => setNewIntakeOpen(true)}
            data-testid="pipeline-new-inquiry-button"
          >
            <Plus className="w-4 h-4" /> New Intake
          </Button>
        </div>
      </div>

      <p className="md:hidden text-xs text-slate-500 flex items-center gap-1">
        <span>← Swipe horizontally to browse stages →</span>
      </p>

      {/* Kanban Board Columns */}
      <div className="overflow-x-auto pb-4 kanban-scroll snap-x snap-mandatory md:snap-none scroll-px-4">
        <div className="flex gap-3.5 min-w-max pb-2">
          {PIPELINE_STATUSES.map((status) => (
            <div
              key={status}
              className="w-[84vw] max-w-[310px] sm:w-[285px] sm:max-w-none shrink-0 snap-start rounded-2xl bg-slate-100/70 border border-slate-200/80 flex flex-col shadow-2xs overflow-hidden"
              data-testid={`kanban-column-${status}`}
            >
              {/* Colored top accent bar */}
              <div className={cn("h-1.5 w-full", STAGE_ACCENT_BAR[status] || "bg-sky-500")} />

              {/* Column header */}
              <div className="px-3.5 py-3 flex items-center justify-between border-b border-slate-200/70 bg-white/70">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  {STATUS_META[status].label}
                </span>
                <span
                  className="text-xs font-bold bg-white text-slate-700 border border-slate-200 rounded-full px-2.5 py-0.5 tabular-nums shadow-2xs"
                  data-testid={`kanban-column-${status}-count`}
                >
                  {grouped[status].length}
                </span>
              </div>

              {/* Column cards container */}
              <div className="p-2.5 space-y-2.5 min-h-[140px] max-h-[66vh] overflow-y-auto">
                {grouped[status].length === 0 && (
                  <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                    <Inbox className="w-6 h-6 opacity-40 mb-1.5 stroke-[1.5]" />
                    <span className="text-xs font-medium">No clients in stage</span>
                  </div>
                )}

                {grouped[status].map((c) => {
                  const services = c.serviceTypes && c.serviceTypes.length > 0 ? c.serviceTypes : (c.serviceType ? [c.serviceType] : []);

                  return (
                    <div
                      key={c.id}
                      onClick={() => navigate(`/admin-inquiry/clients/${c.id}`)}
                      className="w-full text-left rounded-xl bg-white border border-slate-200/90 p-3.5 shadow-xs hover:shadow-md hover:border-sky-300 hover:-translate-y-0.5 transition-all duration-150 group cursor-pointer space-y-2"
                      data-testid={`kanban-card-${c.id}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-extrabold text-slate-900 group-hover:text-sky-700 transition-colors leading-snug">
                          {c.clientName}
                        </p>
                        {calcAge(c.dob) != null && (
                          <span className="text-[11px] font-bold text-slate-500 bg-slate-50 border border-slate-200 px-1.5 py-0.2 rounded-md shrink-0">
                            {calcAge(c.dob)}y
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-500 flex items-center gap-1.5 font-medium">
                        <User className="w-3 h-3 text-slate-400" />
                        <span className="truncate">{c.parentName}</span>
                      </p>

                      {/* Multiple Clinical Service Badges */}
                      {services.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {services.map((srv) => (
                            <StatusBadge key={srv} status={srv} showDot={false} className="text-[10px] px-1.5 py-0" />
                          ))}
                        </div>
                      )}

                      {(c.concernTags || []).length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {(c.concernTags || []).slice(0, 3).map((t) => (
                            <ConcernTag key={t} tag={t} />
                          ))}
                        </div>
                      )}

                      {c.parentComplaint && (
                        <p className="text-[11px] text-slate-600 bg-slate-50/80 rounded-lg p-2 leading-relaxed line-clamp-2 italic border border-slate-100 font-medium">
                          “{c.parentComplaint}”
                        </p>
                      )}

                      {/* Quick Action Buttons on Initial Stages */}
                      {(status === "inquiry" || status === "pending") && (
                        <div className="grid grid-cols-2 gap-1.5 mt-1" onClick={(e) => e.stopPropagation()}>
                          <Button
                            size="sm"
                            className="h-8 px-2 gap-1 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 text-[11px] font-bold rounded-lg shadow-2xs"
                            onClick={(e) => handleQuickBookAssessment(e, c)}
                            title="Book assessment slot directly onto timetable"
                          >
                            <CalendarPlus className="w-3.5 h-3.5 text-sky-600" /> Book Slot
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className={cn(
                              "h-8 px-2 gap-1 text-[11px] font-bold rounded-lg border",
                              c.isWaitingList
                                ? "bg-purple-50 text-purple-700 border-purple-300 hover:bg-purple-100"
                                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                            )}
                            onClick={(e) => handleOpenCardWaitlist(e, c)}
                            title={c.isWaitingList ? "Client is on waiting list (Click to edit triage)" : "Place client on priority waiting list"}
                          >
                            <Clock className="w-3.5 h-3.5 text-purple-600" />
                            {c.isWaitingList ? "On Waitlist" : "Put Waitlist"}
                          </Button>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
                        {c.isWaitingList ? (
                          <span className="font-bold text-[10px] text-purple-700 bg-purple-50 border border-purple-200 px-1.5 py-0.2 rounded-md flex items-center gap-1">
                            <Clock className="w-3 h-3 text-purple-600" /> Waiting List
                          </span>
                        ) : (
                          <span className="text-slate-400 font-medium">Intake ID: {c.clientAccessCode?.slice(-4) || "—"}</span>
                        )}
                        <span className="text-slate-400 tabular-nums">{fmtDate(c.createdAt)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* DIRECT CARD WAITING LIST MANAGEMENT DIALOG */}
      <Dialog open={waitlistModalOpen} onOpenChange={setWaitlistModalOpen}>
        <DialogContent className="max-w-md p-5 sm:p-6">
          <DialogHeader className="pb-1">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-extrabold text-slate-900">
                  Priority Waiting List Management
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Place family on triage queue when clinical assessment slots are currently full.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {waitlistTargetClient && (
            <div className="space-y-3.5 pt-1 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <p className="text-sm font-bold text-slate-900">{waitlistTargetClient.clientName}</p>
                <p className="text-slate-500">
                  Parent: <strong>{waitlistTargetClient.parentName}</strong> ({waitlistTargetClient.parentContact || "No Phone"})
                </p>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-purple-50/50 border border-purple-200">
                <div>
                  <p className="font-bold text-purple-950 text-xs">Waiting List Status</p>
                  <p className="text-[11px] text-purple-700">Include in Waiting List Hub & Cancellation Radar</p>
                </div>
                <Switch
                  checked={waitlistActive}
                  onCheckedChange={setWaitlistActive}
                  data-testid="card-waitlist-toggle"
                />
              </div>

              {waitlistActive && (
                <div className="space-y-3 pt-1">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-700">Triage Priority Tier</Label>
                    <Select value={waitlistUrgency} onValueChange={setWaitlistUrgency}>
                      <SelectTrigger className="rounded-xl border-slate-200 bg-white text-xs h-9 font-semibold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-slate-200">
                        <SelectItem value="urgent">🚨 Urgent (Early Intervention ≤ 3 yrs)</SelectItem>
                        <SelectItem value="high">⚡ High Priority</SelectItem>
                        <SelectItem value="regular">Standard Queue</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-700">Preferred Session Window</Label>
                    <Select value={waitlistTimePref} onValueChange={setWaitlistTimePref}>
                      <SelectTrigger className="rounded-xl border-slate-200 bg-white text-xs h-9 font-semibold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-slate-200">
                        <SelectItem value="sat_morning">Saturday Morning (08:00 - 12:00)</SelectItem>
                        <SelectItem value="sat_afternoon">Saturday Afternoon (13:00 - 17:00)</SelectItem>
                        <SelectItem value="weekday_morning">Weekday Morning</SelectItem>
                        <SelectItem value="weekday_afternoon">Weekday Afternoon</SelectItem>
                        <SelectItem value="anytime">Flexible / Any Open Slot</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              <DialogFooter className="mt-4 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl border-slate-200 text-xs font-bold h-9"
                  onClick={() => setWaitlistModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  className="bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs h-9 shadow-xs"
                  onClick={handleSaveCardWaitlist}
                  data-testid="save-card-waitlist-button"
                >
                  {waitlistActive ? "Save to Waitlist" : "Remove from Waitlist"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* NEW INTAKE & WAITING LIST DIALOG */}
      <Dialog open={newIntakeOpen} onOpenChange={setNewIntakeOpen}>
        <DialogContent className="max-w-xl max-h-[calc(100dvh-2.5rem)] overflow-y-auto p-5 sm:p-6">
          <DialogHeader className="pb-1">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center font-bold shrink-0">
                <Plus className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-extrabold text-slate-900">
                  New Pediatric Intake Registration
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Register incoming family inquiry with multi-service clinical disciplines or direct waiting list placement.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleCreateNewIntake} className="space-y-4 pt-1 text-xs">
            {/* Child & Parent Basic Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Child's Full Name *</Label>
                <Input
                  className="rounded-xl border-slate-200 bg-slate-50 text-xs h-9"
                  placeholder="e.g. Leo Hernandez"
                  value={newForm.clientName}
                  onChange={(e) => setNewForm({ ...newForm, clientName: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Date of Birth</Label>
                <Input
                  type="date"
                  className="rounded-xl border-slate-200 bg-slate-50 text-xs h-9"
                  value={newForm.dob}
                  onChange={(e) => setNewForm({ ...newForm, dob: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Parent / Guardian Name *</Label>
                <Input
                  className="rounded-xl border-slate-200 bg-slate-50 text-xs h-9"
                  placeholder="e.g. Maria Hernandez"
                  value={newForm.parentName}
                  onChange={(e) => setNewForm({ ...newForm, parentName: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">WhatsApp / Phone Number *</Label>
                <Input
                  className="rounded-xl border-slate-200 bg-slate-50 text-xs h-9"
                  placeholder="+62 812-3456-7890"
                  value={newForm.parentContact}
                  onChange={(e) => setNewForm({ ...newForm, parentContact: e.target.value })}
                />
              </div>
            </div>

            {/* MULTI-SERVICE DISCIPLINE SELECTION */}
            <div className="space-y-1.5 p-3 rounded-2xl bg-slate-50/80 border border-slate-200">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-sky-600" />
                  Clinical Services & Disciplines
                </Label>
                <span className="text-[10px] text-slate-500 font-semibold">
                  (Select all required services)
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1">
                {SESSION_TYPES.map((srv) => {
                  const active = (newForm.serviceTypes || []).includes(srv.value);
                  return (
                    <button
                      key={srv.value}
                      type="button"
                      onClick={() => toggleServiceType(srv.value)}
                      className={cn(
                        "px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer",
                        active
                          ? "bg-sky-600 border-sky-600 text-white shadow-2xs"
                          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                      )}
                    >
                      {srv.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Clinical Concern Tags */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Referral Focus Tags</Label>
              <div className="flex flex-wrap gap-1.5">
                {CONCERN_TAGS.map((t) => {
                  const active = (newForm.concernTags || []).includes(t.value);
                  return (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => toggleConcernTag(t.value)}
                      className={cn(
                        "rounded-full px-2.5 py-1 text-[11px] font-bold border transition-all cursor-pointer",
                        active
                          ? "bg-purple-600 border-purple-600 text-white shadow-2xs"
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"
                      )}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Parent Complaint & Intake Notes</Label>
              <Textarea
                rows={2}
                className="rounded-xl border-slate-200 bg-slate-50 text-xs"
                placeholder="Sensory sensitivities, speech delays, attention span, school reports..."
                value={newForm.parentComplaint}
                onChange={(e) => setNewForm({ ...newForm, parentComplaint: e.target.value })}
              />
            </div>

            {/* DIRECT WAITING LIST PLACEMENT TOGGLE */}
            <div className="space-y-2.5 rounded-2xl border border-purple-200 bg-purple-50/40 p-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                    <Clock className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-purple-950">
                      Slots currently full? Place directly on Waiting List
                    </p>
                    <p className="text-[10px] text-purple-700">
                      Automatically registers family in the Waiting List Hub triage queue
                    </p>
                  </div>
                </div>
                <Switch
                  checked={newForm.isWaitingList}
                  onCheckedChange={(val) => setNewForm({ ...newForm, isWaitingList: val })}
                />
              </div>

              {newForm.isWaitingList && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-purple-200/70">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-slate-700">Triage Priority</Label>
                    <Select
                      value={newForm.urgency}
                      onValueChange={(val) => setNewForm({ ...newForm, urgency: val })}
                    >
                      <SelectTrigger className="rounded-xl border-slate-200 bg-white text-xs h-8 font-semibold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-slate-200">
                        <SelectItem value="urgent">🚨 Urgent (Early Intervention)</SelectItem>
                        <SelectItem value="high">⚡ High Priority</SelectItem>
                        <SelectItem value="regular">Standard Queue</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-slate-700">Preferred Time Window</Label>
                    <Select
                      value={newForm.timePreference}
                      onValueChange={(val) => setNewForm({ ...newForm, timePreference: val })}
                    >
                      <SelectTrigger className="rounded-xl border-slate-200 bg-white text-xs h-8 font-semibold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-slate-200">
                        <SelectItem value="sat_morning">Saturday Morning</SelectItem>
                        <SelectItem value="sat_afternoon">Saturday Afternoon</SelectItem>
                        <SelectItem value="weekday_morning">Weekday Morning</SelectItem>
                        <SelectItem value="weekday_afternoon">Weekday Afternoon</SelectItem>
                        <SelectItem value="anytime">Flexible / Any Open Slot</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="mt-4 gap-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl border-slate-200 text-xs font-bold h-9"
                onClick={() => setNewIntakeOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl text-xs h-9 shadow-xs"
              >
                {newForm.isWaitingList ? "Add to Waiting List" : "Register Intake"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Fast Track Booking Modal */}
      {quickScheduleClientId && (
        <AddScheduleModal
          open={scheduleModalOpen}
          onOpenChange={(open) => {
            setScheduleModalOpen(open);
            if (!open) setQuickScheduleClientId(null);
          }}
          defaults={{
            clientId: quickScheduleClientId,
            lockClient: true,
            type: "assessment",
            lockType: true,
          }}
          onCreated={() =>
            updateClient(quickScheduleClientId, {
              status: "assessment_scheduled",
              isWaitingList: false,
            })
          }
        />
      )}
    </div>
  );
}
