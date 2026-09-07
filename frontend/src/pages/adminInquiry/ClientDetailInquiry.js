import React, { useMemo, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft,
  Check,
  Copy,
  FileText,
  KeyRound,
  Phone,
  Mail,
  Receipt,
  ExternalLink,
  Calendar,
  CalendarPlus,
  CheckCircle2,
  AlertCircle,
  Building2,
  Plus,
  Eye,
  School,
  XCircle,
  Clock,
  Printer,
  FileQuestion,
  UserCheck,
  Pencil
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import DateFilterPicker from "@/components/common/DateFilterPicker";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/common/StatusBadge";
import { AddScheduleModal } from "@/components/calendar/AddScheduleModal";
import { PaymentProofViewerModal } from "@/components/common/PaymentProofViewerModal";
import { useClients } from "@/context/ClientsContext";
import { useSchedules } from "@/context/SchedulesContext";
import { useCredits } from "@/context/CreditsContext";
import { useAssessments } from "@/context/AssessmentsContext";
import { useTherapists } from "@/context/TherapistsContext";
import {
  CLINICAL_SERVICES,
  BRANCHES,
  calcAge,
  fmtDate,
  genCode,
  fmtCurrency,
  todayStr,
} from "@/lib/appUtils";
import { cn } from "@/lib/utils";

export default function ClientDetailInquiry() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { clients, updateClient } = useClients();
  const { schedules } = useSchedules();
  const { getInvoicesForClient, addRecord, getRecordForClient } = useCredits();
  const { categories } = useAssessments();
  const { getTherapist } = useTherapists();

  const client = clients.find((c) => c.id === id);

  // Modals & local state
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [discontinueOpen, setDiscontinueOpen] = useState(false);
  const [discontinueReason, setDiscontinueReason] = useState("");
  const [newQuestionnaireCategory, setNewQuestionnaireCategory] = useState("cat-001");

  // Invoices & Credits
  const invoices = client ? getInvoicesForClient(client.id) : [];
  const latestInvoice = invoices.length > 0 ? invoices[0] : null;
  const creditRecord = client ? getRecordForClient(client.id) : null;
  const remainingCredit = creditRecord ? creditRecord.remainingCredit : 0;
  const [proofModalOpen, setProofModalOpen] = useState(false);

  // Edit Intake State
  const [editIntakeOpen, setEditIntakeOpen] = useState(false);
  const [editIntakeForm, setEditIntakeForm] = useState({
    clientName: "",
    dob: "",
    parentName: "",
    parentContact: "",
    parentEmail: "",
    branchId: "branch-sby-timur",
  });

  const handleOpenEditIntake = () => {
    if (!client) return;
    setEditIntakeForm({
      clientName: client.clientName || "",
      dob: client.dob || "",
      parentName: client.parentName || "",
      parentContact: client.parentContact || "",
      parentEmail: client.parentEmail || "",
      branchId: client.branchId || "branch-sby-timur",
    });
    setEditIntakeOpen(true);
  };

  const handleSaveEditIntake = (e) => {
    e.preventDefault();
    if (!editIntakeForm.clientName.trim()) {
      toast.error("Nama anak tidak boleh kosong.");
      return;
    }
    updateClient(client.id, {
      clientName: editIntakeForm.clientName.trim(),
      dob: editIntakeForm.dob,
      parentName: editIntakeForm.parentName.trim(),
      parentContact: editIntakeForm.parentContact.trim(),
      parentEmail: editIntakeForm.parentEmail.trim(),
      branchId: editIntakeForm.branchId,
      updatedAt: new Date().toISOString(),
    });
    toast.success("Data New Intake berhasil diperbarui!");
    setEditIntakeOpen(false);
  };

  // Schedules associated with this client
  const clientSchedules = useMemo(() => {
    if (!client) return [];
    return schedules.filter((s) => s.clientId === client.id);
  }, [client, schedules]);

  // Multiple assessment sessions support
  const assessmentSessions = useMemo(() => {
    return clientSchedules.filter((s) => s.type === "assessment");
  }, [clientSchedules]);

  // Multiple clinical services support (with backwards compatibility)
  const selectedServices = useMemo(() => {
    if (!client) return [];
    if (Array.isArray(client.serviceTypes) && client.serviceTypes.length > 0) {
      return client.serviceTypes;
    }
    return client.serviceType ? [client.serviceType] : [];
  }, [client]);

  if (!client) {
    return (
      <div className="p-8 text-center space-y-3">
        <p className="text-base text-slate-600">Client tidak ditemukan di pipeline inquiry.</p>
        <Button onClick={() => navigate("/admin-inquiry/pipeline")} variant="outline" className="rounded-xl text-xs">
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Kembali ke Pipeline
        </Button>
      </div>
    );
  }

  const br = BRANCHES.find((b) => b.id === client.branchId);

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} disalin ke clipboard!`);
  };

  // STEP 2: Handle Multi-Service Selection
  const handleToggleService = (serviceValue) => {
    const current = selectedServices;
    const next = current.includes(serviceValue)
      ? current.filter((s) => s !== serviceValue)
      : [...current, serviceValue];

    const allowsSchool = next.some((s) => {
      const found = CLINICAL_SERVICES.find((cs) => cs.value === s);
      return found?.allowsSchoolCompanion;
    });

    updateClient(client.id, {
      serviceTypes: next,
      serviceType: next[0] || "",
      hasSchoolCompanionProfile: allowsSchool ? client.hasSchoolCompanionProfile : false,
      status: next.length > 0 && client.status === "inquiry" ? "service_selected" : client.status,
    });
    toast.success(next.includes(serviceValue) ? "Layanan klinis ditambahkan." : "Layanan klinis dibatalkan.");
  };

  const handleToggleSchoolCompanion = (checked) => {
    updateClient(client.id, {
      hasSchoolCompanionProfile: Boolean(checked),
    });
    toast.success(checked ? "School Companion Profile diaktifkan." : "School Companion Profile dinonaktifkan.");
  };

  // STEP 3: Generate Multi-Questionnaire Code
  const handleGenerateQuestionnaireCode = () => {
    const selectedCat = categories.find((c) => c.id === newQuestionnaireCategory) || categories[0];
    const newCode = genCode("ASM");
    const existingCodes = client.assessmentCodes || [];

    const updatedCodes = [
      ...existingCodes,
      {
        code: newCode,
        categoryId: selectedCat.id,
        name: selectedCat.categoryName,
        createdAt: todayStr(),
      },
    ];

    updateClient(client.id, {
      assessmentCodes: updatedCodes,
      status: ["inquiry", "service_selected"].includes(client.status) ? "assessment_scheduled" : client.status,
    });

    toast.success(`Kode kuesioner baru '${newCode}' (${selectedCat.categoryName}) berhasil dibuat!`);
  };

  // STEP 6: Save GDrive Client Link
  const handleSaveGDriveLink = (url) => {
    updateClient(client.id, {
      gdriveClientLink: url.trim(),
    });
    toast.success("Link Google Drive client tersimpan.");
  };

  // STEP 8: Final Decision Outcomes
  const handleOutcomeAdmit = () => {
    // Admit to Active Client (even if credit is 0!)
    updateClient(client.id, {
      status: "admitted",
      finalOutcome: "admitted",
      dateOfJoin: todayStr(),
    });

    // Ensure credit record exists (even with 0 packages)
    if (!creditRecord) {
      addRecord({
        id: `cr-${client.id}`,
        clientId: client.id,
        branchId: client.branchId,
        packages: [],
        cancelCountTotal: 0,
        history: [],
      });
    }

    toast.success(`${client.clientName} resmi menjadi Active Client! Sesi terapi sudah dapat dijadwalkan.`);
  };

  const handleOutcomeDoneConsult = () => {
    updateClient(client.id, {
      status: "done_consult",
      finalOutcome: "done_consult",
    });
    toast.info("Status client ditandai: Done Consult (Konsultasi Selesai).");
  };

  const handleOutcomeDoneAssessment = () => {
    updateClient(client.id, {
      status: "done_assessment",
      finalOutcome: "done_assessment",
    });
    toast.info("Status client ditandai: Done Assessment (Laporan Selesai).");
  };

  const handleOutcomeDiscontinue = () => {
    if (!discontinueReason.trim()) {
      toast.error("Mohon tuliskan alasan discontinue.");
      return;
    }
    updateClient(client.id, {
      status: "discontinued",
      finalOutcome: "discontinued",
      dischargeReason: "other",
      dischargeNote: discontinueReason.trim(),
    });
    setDiscontinueOpen(false);
    toast.warning("Status client ditandai: Discontinued.");
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto" data-testid="client-detail-inquiry-page">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl border-slate-200 text-slate-600 hover:bg-slate-100 h-9"
            onClick={() => navigate("/admin-inquiry/pipeline")}
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Pipeline
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900">{client.clientName}</h1>
              <StatusBadge status={client.status} />
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Kode Akses Portal: <strong className="font-mono text-slate-800">{client.clientAccessCode}</strong> • Cabang: {br ? br.name : "Surabaya"}
            </p>
          </div>
        </div>

        {/* Quick jump actions */}
        <div className="flex flex-wrap items-center gap-2">
          {client.gdriveClientLink && (
            <a
              href={client.gdriveClientLink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100 transition-colors shadow-2xs"
            >
              <ExternalLink className="w-3.5 h-3.5" /> GDrive Client
            </a>
          )}

          
        </div>
      </div>

      {/* 8 NON-SEQUENTIAL PIPELINE STEPS */}
      <div className="space-y-4">
        {/* STEP 1: DATA NEW INTAKE */}
        <Card className="rounded-2xl border border-slate-200/90 bg-white shadow-2xs overflow-hidden">
          <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-xl bg-sky-100 text-sky-800 font-bold text-xs flex items-center justify-center">
                1
              </span>
              <div>
                <CardTitle className="text-sm font-bold text-slate-900">Data New Intake</CardTitle>
                <CardDescription className="text-xs text-slate-500">Profil anak, kontak orang tua, dan lokasi cabang</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 rounded-xl border-slate-200 hover:bg-sky-50 hover:text-sky-700 hover:border-sky-300 font-bold text-xs shadow-2xs"
                onClick={handleOpenEditIntake}
                data-testid="btn-edit-intake-step1"
              >
                <Pencil className="w-3.5 h-3.5 text-sky-600" /> Edit Data Intake
              </Button>
              <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                <Check className="w-3.5 h-3.5" /> Lengkap
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400">Nama Anak</span>
              <p className="font-bold text-slate-900 mt-0.5">{client.clientName}</p>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400">Tanggal Lahir / Usia</span>
              <p className="font-semibold text-slate-800 mt-0.5">
                {fmtDate(client.dob)} {calcAge(client.dob) != null ? `(${calcAge(client.dob)} th)` : ""}
              </p>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400">Nama Orang Tua</span>
              <p className="font-semibold text-slate-800 mt-0.5">{client.parentName || "—"}</p>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400">Kontak WhatsApp & Email</span>
              <p className="font-semibold text-slate-800 mt-0.5">{client.parentContact || "—"}</p>
              <p className="text-[11px] text-slate-500">{client.parentEmail || "—"}</p>
            </div>
          </CardContent>
        </Card>

        {/* DIALOG EDIT DATA INTAKE */}
        <Dialog open={editIntakeOpen} onOpenChange={setEditIntakeOpen}>
          <DialogContent className="max-w-md rounded-2xl p-6 border-slate-200">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Pencil className="w-5 h-5 text-sky-600" /> Edit Data New Intake
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Perbarui data dasar profil anak, orang tua, dan cabang pendaftaran.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSaveEditIntake} className="space-y-3.5 pt-2">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Nama Lengkap Anak *</Label>
                <Input
                  className="rounded-xl border-slate-200 bg-slate-50 text-xs h-10"
                  value={editIntakeForm.clientName}
                  onChange={(e) => setEditIntakeForm({ ...editIntakeForm, clientName: e.target.value })}
                  placeholder="e.g. Kenzo Danendra"
                  data-testid="edit-intake-client-name"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Tanggal Lahir Anak (DD/MM/YYYY)</Label>
                <DateFilterPicker
                  placeholder="DD/MM/YYYY"
                  className="w-full bg-slate-50 h-10"
                  value={editIntakeForm.dob}
                  onChange={(e) => setEditIntakeForm({ ...editIntakeForm, dob: e?.target?.value ?? e })}
                  data-testid="edit-intake-dob"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Nama Orang Tua / Wali</Label>
                <Input
                  className="rounded-xl border-slate-200 bg-slate-50 text-xs h-10"
                  value={editIntakeForm.parentName}
                  onChange={(e) => setEditIntakeForm({ ...editIntakeForm, parentName: e.target.value })}
                  placeholder="e.g. Ibu Liana Santoso"
                  data-testid="edit-intake-parent-name"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">No. WhatsApp / HP</Label>
                <Input
                  className="rounded-xl border-slate-200 bg-slate-50 text-xs h-10"
                  value={editIntakeForm.parentContact}
                  onChange={(e) => setEditIntakeForm({ ...editIntakeForm, parentContact: e.target.value })}
                  placeholder="+62 812-xxxx-xxxx"
                  data-testid="edit-intake-parent-contact"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Email Orang Tua</Label>
                <Input
                  type="email"
                  className="rounded-xl border-slate-200 bg-slate-50 text-xs h-10"
                  value={editIntakeForm.parentEmail}
                  onChange={(e) => setEditIntakeForm({ ...editIntakeForm, parentEmail: e.target.value })}
                  placeholder="liana.santoso@gmail.com"
                  data-testid="edit-intake-parent-email"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Cabang Intake</Label>
                <Select
                  value={editIntakeForm.branchId}
                  onValueChange={(val) => setEditIntakeForm({ ...editIntakeForm, branchId: val })}
                >
                  <SelectTrigger className="rounded-xl border-slate-200 bg-slate-50 text-xs h-10 font-semibold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200">
                    {BRANCHES.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        📍 {b.name} ({b.city})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl text-xs"
                  onClick={() => setEditIntakeOpen(false)}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  className="bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold"
                  data-testid="btn-save-edit-intake"
                >
                  Simpan Perubahan
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* STEP 2: PILIH LAYANAN KLINIS (MULTI-LAYANAN) */}
        <Card className="rounded-2xl border border-slate-200/90 bg-white shadow-2xs overflow-hidden">
          <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-xl bg-purple-100 text-purple-800 font-bold text-xs flex items-center justify-center">
                2
              </span>
              <div>
                <CardTitle className="text-sm font-bold text-slate-900">
                  Pilih Layanan Klinis ({selectedServices.length} Layanan Dipilih)
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Klien dapat memilih lebih dari satu layanan klinis secara bersamaan
                </CardDescription>
              </div>
            </div>

            {selectedServices.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap justify-end">
                {selectedServices.map((val) => {
                  const srv = CLINICAL_SERVICES.find((s) => s.value === val);
                  return (
                    <span
                      key={val}
                      className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-lg border border-purple-200"
                    >
                      ✓ {srv?.shortLabel || val}
                    </span>
                  );
                })}
              </div>
            )}
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <p className="text-[11px] text-slate-500 font-medium">
              💡 Klik pada kartu untuk memilih atau membatalkan pilihan layanan (bisa memilih kombinasi multi-disiplin):
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {CLINICAL_SERVICES.map((srv) => {
                const isSelected = selectedServices.includes(srv.value);
                return (
                  <div
                    key={srv.value}
                    onClick={() => handleToggleService(srv.value)}
                    className={cn(
                      "p-3 rounded-xl border cursor-pointer transition-all flex items-start justify-between gap-2 select-none",
                      isSelected
                        ? "bg-purple-50/70 border-purple-300 ring-2 ring-purple-300/50 shadow-2xs"
                        : "bg-slate-50/80 border-slate-200 hover:bg-white hover:border-slate-300"
                    )}
                  >
                    <div className="flex items-start gap-2 min-w-0">
                      <div
                        className={cn(
                          "w-4 h-4 rounded mt-0.5 flex items-center justify-center border shrink-0 transition-colors",
                          isSelected ? "bg-purple-600 border-purple-600 text-white" : "border-slate-300 bg-white"
                        )}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-xs text-slate-900">{srv.label}</span>
                          {srv.category && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-200/60 text-slate-600">
                              {srv.category}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                          {srv.description || (srv.allowsSchoolCompanion ? "Mendukung tambahan School Companion Profile" : "Layanan Klinis Intake")}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* STEP 3: QUESTIONNAIRE CODE GENERATOR (MULTI-CODE) */}
        <Card className="rounded-2xl border border-slate-200/90 bg-white shadow-2xs overflow-hidden">
          <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-xl bg-blue-100 text-blue-800 font-bold text-xs flex items-center justify-center">
                3
              </span>
              <div>
                <CardTitle className="text-sm font-bold text-slate-900">Questionnaire Code Generator</CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Generate lebih dari 1 kode kuesioner unik (misal Asesmen Utama + School Companion Profile)
                </CardDescription>
              </div>
            </div>
            <span className="text-xs font-bold text-slate-600">
              Total {(client.assessmentCodes || []).length} Kode Terbit
            </span>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Select value={newQuestionnaireCategory} onValueChange={setNewQuestionnaireCategory}>
                <SelectTrigger className="w-72 h-10 text-xs rounded-xl border-slate-200 bg-slate-50 font-semibold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200">
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.categoryName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={handleGenerateQuestionnaireCode}
                className="bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl text-xs h-10 gap-1.5 shadow-xs"
              >
                <Plus className="w-4 h-4" /> Generate Kode Kuesioner
              </Button>
            </div>

            {/* List of Generated Codes */}
            {(client.assessmentCodes || []).length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {client.assessmentCodes.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2"
                  >
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        {item.name}
                      </span>
                      <p className="font-mono font-black text-sm text-slate-900 mt-0.5">{item.code}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 rounded-lg text-slate-500 hover:text-sky-700"
                        onClick={() => copyToClipboard(item.code, `Kode ${item.name}`)}
                        title="Salin Kode"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </Button>
                      <Link
                        to="/assessment"
                        className="inline-flex items-center justify-center h-8 px-2.5 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-sky-700 hover:bg-sky-50"
                      >
                        Buka Form
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* STEP 4: SCHEDULE ASSESSMENT (MENDUKUNG LEBIH DARI 1 SESI ASESMEN) */}
        <Card className="rounded-2xl border border-slate-200/90 bg-white shadow-2xs overflow-hidden">
          <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-xl bg-blue-100 text-blue-800 font-bold text-xs flex items-center justify-center">
                4
              </span>
              <div>
                <CardTitle className="text-sm font-bold text-slate-900">
                  Schedule Assessment ({assessmentSessions.length} Sesi Terjadwal)
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Booking sesi asesmen klinis dengan praktisi terapis di kalender (bisa dijadwalkan lebih dari 1 sesi)
                </CardDescription>
              </div>
            </div>

            {/* BUTTON ALWAYS VISIBLE TO SCHEDULE MULTIPLE ASSESSMENTS */}
            <Button
              size="sm"
              className="bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl text-xs h-8 gap-1.5 shadow-xs"
              onClick={() => setScheduleModalOpen(true)}
            >
              <CalendarPlus className="w-3.5 h-3.5" />
              {assessmentSessions.length === 0 ? "Jadwalkan Asesmen" : "+ Tambah Jadwal Asesmen"}
            </Button>
          </CardHeader>
          <CardContent className="p-4 text-xs text-slate-600 space-y-3">
            {assessmentSessions.length === 0 ? (
              <div className="p-6 text-center border border-dashed border-slate-200 rounded-xl space-y-2">
                <p className="text-slate-400 italic">Belum ada sesi asesmen klinis yang dijadwalkan untuk klien ini.</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-xl text-xs font-bold text-sky-700 border-sky-200 hover:bg-sky-50"
                  onClick={() => setScheduleModalOpen(true)}
                >
                  <CalendarPlus className="w-3.5 h-3.5 mr-1" /> Jadwalkan Sesi Asesmen Pertama
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 pb-1">
                  <span>Daftar Sesi Asesmen Terjadwal:</span>
                  <span className="text-emerald-700 font-bold">
                    {assessmentSessions.filter((s) => s.status === "completed").length} dari {assessmentSessions.length} Selesai
                  </span>
                </div>

                {assessmentSessions.map((s, sIdx) => {
                  const therapist = getTherapist(s.therapistId);
                  return (
                    <div
                      key={s.id}
                      className="p-3 rounded-xl bg-slate-50/80 border border-slate-200 flex items-center justify-between gap-3 hover:bg-white hover:border-slate-300 transition-all shadow-2xs"
                    >
                      <div className="flex items-start gap-2.5">
                        <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-800 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                          {sIdx + 1}
                        </span>
                        <div>
                          <p className="font-bold text-slate-900 text-xs">
                            Sesi Asesmen #{sIdx + 1} — {therapist?.name || "Terapis Klinis"}
                            {therapist?.specialty && (
                              <span className="ml-1 text-[10px] font-medium text-slate-500">
                                ({therapist.specialty})
                              </span>
                            )}
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Tanggal: <strong>{fmtDate(s.date)}</strong> • Jam: <strong>{s.startTime} – {s.endTime}</strong>
                          </p>
                          {s.notes && (
                            <p className="text-[10px] text-slate-400 italic mt-0.5">
                              Catatan: {s.notes}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <StatusBadge status={s.status} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* STEP 5: PARENT ASSESSMENT ANSWER (PSYCHOLOGICAL TABLE & PDF) */}
        <Card className="rounded-2xl border border-slate-200/90 bg-white shadow-2xs overflow-hidden">
          <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-xl bg-teal-100 text-teal-800 font-bold text-xs flex items-center justify-center">
                5
              </span>
              <div>
                <CardTitle className="text-sm font-bold text-slate-900">Parent Assessment Answer</CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Hasil kuesioner ortu & sekolah dalam bentuk format Tabel Psikologi Klinis & Pratinjau PDF
                </CardDescription>
              </div>
            </div>
            <Link
              to={`/admin-inquiry/parent-assessment/${client.id}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-100 transition-colors shadow-2xs"
            >
              <Eye className="w-3.5 h-3.5" /> Buka Laporan Tabel Psikologi
            </Link>
          </CardHeader>
          <CardContent className="p-4 text-xs text-slate-600">
            {(client.assessmentAnswers || []).length > 0 ? (
              <div className="space-y-2">
                <p className="font-semibold text-slate-800">
                  Tersedia {(client.assessmentAnswers || []).length} kuesioner terisi lengkap:
                </p>
                <div className="flex flex-wrap gap-2">
                  {client.assessmentAnswers.map((a, i) => (
                    <span key={i} className="px-2.5 py-1 rounded-lg bg-teal-50 border border-teal-200 font-bold text-teal-800 text-[11px]">
                      ✓ {a.categoryName} ({a.answers?.length || 0} butir terisi)
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-slate-400 italic">Orang tua belum mengisi kuesioner asesmen.</p>
            )}
          </CardContent>
        </Card>

        {/* STEP 6: GOOGLE DRIVE CLIENT LINK */}
        <Card className="rounded-2xl border border-slate-200/90 bg-white shadow-2xs overflow-hidden">
          <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-xl bg-sky-100 text-sky-800 font-bold text-xs flex items-center justify-center">
                6
              </span>
              <div>
                <CardTitle className="text-sm font-bold text-slate-900">Google Drive Client Link</CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Folder arsip berkas asesmen, video observasi, dan dokumen klinis (dapat diakses Asesor & Terapis)
                </CardDescription>
              </div>
            </div>
            {client.gdriveClientLink && (
              <a
                href={client.gdriveClientLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold text-sky-700 bg-sky-50 border border-sky-200"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Buka Folder
              </a>
            )}
          </CardHeader>
          <CardContent className="p-4">
            <div className="flex gap-2">
              <Input
                className="rounded-xl border-slate-200 bg-slate-50 text-xs h-10 font-mono"
                placeholder="https://drive.google.com/drive/folders/..."
                defaultValue={client.gdriveClientLink || ""}
                onBlur={(e) => handleSaveGDriveLink(e.target.value)}
              />
              <Button
                variant="outline"
                className="rounded-xl border-slate-200 text-xs font-bold shrink-0 h-10"
                onClick={(e) => {
                  const input = e.currentTarget.previousSibling;
                  if (input) handleSaveGDriveLink(input.value);
                }}
              >
                Simpan Link
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* STEP 7: INVOICE & BUKTI TRANSFER */}
        <Card className="rounded-2xl border border-slate-200/90 bg-white shadow-2xs overflow-hidden">
          <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-xl bg-amber-100 text-amber-800 font-bold text-xs flex items-center justify-center">
                7
              </span>
              <div>
                <CardTitle className="text-sm font-bold text-slate-900">Tagihan Invoice & Bukti Pembayaran</CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Diskusi via WA → Tagihan diinput Finance → Ortu upload bukti transfer di portal
                </CardDescription>
              </div>
            </div>
            {latestInvoice ? (
              <span
                className={cn(
                  "px-3 py-1 rounded-lg text-xs font-bold border",
                  latestInvoice.status === "paid"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-rose-50 text-rose-700 border-rose-200"
                )}
              >
                {latestInvoice.status === "paid" ? "🟢 LUNAS TERVERIFIKASI" : "🔴 MENUNGGU PEMBAYARAN"}
              </span>
            ) : (
              <span className="px-3 py-1 rounded-lg text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                🔴 BELUM ADA INVOICE
              </span>
            )}
          </CardHeader>
          <CardContent className="p-4 text-xs text-slate-600">
            {latestInvoice ? (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-900">
                    {latestInvoice.invoiceNumber} — {latestInvoice.packageName}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Nominal: {fmtCurrency(latestInvoice.amount)} • Terbit: {fmtDate(latestInvoice.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {latestInvoice.proofOfPaymentUrl || latestInvoice.proofUrl ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200 font-bold flex items-center gap-1.5 rounded-lg cursor-pointer"
                      onClick={() => setProofModalOpen(true)}
                    >
                      <Eye className="w-3.5 h-3.5" /> Lihat Bukti Transfer
                    </Button>
                  ) : (
                    <span className="text-xs text-amber-600 italic">Menunggu upload slip dari ortu</span>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200 text-amber-900">
                Tagihan belum diinput oleh Finance. Setelah diskusi paket dengan orang tua melalui WhatsApp, tim Finance akan memasukkan invoice tagihan agar orang tua dapat mengupload bukti transfer.
              </div>
            )}
          </CardContent>
        </Card>

        {/* STEP 8: FINAL DECISION OUTCOMES */}
        <Card className="rounded-2xl border-2 border-slate-300 bg-white shadow-sm overflow-hidden">
          <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/70 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center">
                8
              </span>
              <div>
                <CardTitle className="text-sm font-bold text-slate-900">Final Decision Outcomes</CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Tentukan keputusan kelanjutan alur client di Therapedia
                </CardDescription>
              </div>
            </div>
            {client.finalOutcome && (
              <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                Outcome: {client.finalOutcome.toUpperCase()}
              </span>
            )}
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Option 1: Admit to Active Client */}
              <div
                onClick={handleOutcomeAdmit}
                className={cn(
                  "p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between gap-3 text-left group",
                  client.status === "admitted"
                    ? "bg-emerald-50 border-emerald-500 ring-2 ring-emerald-300/40"
                    : "bg-white border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/20"
                )}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-extrabold text-sm text-emerald-900">Admit to Active</p>
                    <UserCheck className="w-4 h-4 text-emerald-600" />
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Masuk ke Active Client Roster & siap dijadwalkan. <strong>Bisa di-admit meski kredit masih 0</strong> (slot kalender berstatus Frozen ❄️).
                  </p>
                </div>
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg w-full">
                  {client.status === "admitted" ? "✓ Active Client" : "Admit Client"}
                </Button>
              </div>

              {/* Option 2: Done Consult */}
              <div
                onClick={handleOutcomeDoneConsult}
                className={cn(
                  "p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between gap-3 text-left group",
                  client.status === "done_consult"
                    ? "bg-amber-50 border-amber-500 ring-2 ring-amber-300/40"
                    : "bg-white border-slate-200 hover:border-amber-400 hover:bg-amber-50/20"
                )}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-extrabold text-sm text-amber-900">Done Consult</p>
                    <CheckCircle2 className="w-4 h-4 text-amber-600" />
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Sesi konsultasi evaluasi selesai. Tidak melanjutkan sesi terapi berkala di klinik.
                  </p>
                </div>
                <Button size="sm" variant="outline" className="border-amber-300 text-amber-900 hover:bg-amber-100 font-bold text-xs rounded-lg w-full">
                  Tandai Selesai Konsul
                </Button>
              </div>

              {/* Option 3: Done Assessment */}
              <div
                onClick={handleOutcomeDoneAssessment}
                className={cn(
                  "p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between gap-3 text-left group",
                  client.status === "done_assessment"
                    ? "bg-indigo-50 border-indigo-500 ring-2 ring-indigo-300/40"
                    : "bg-white border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/20"
                )}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-extrabold text-sm text-indigo-900">Done Assessment</p>
                    <FileText className="w-4 h-4 text-indigo-600" />
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Asesmen & penyerahan laporan klinis selesai. Tidak melanjutkan terapi aktif di cabang ini.
                  </p>
                </div>
                <Button size="sm" variant="outline" className="border-indigo-300 text-indigo-900 hover:bg-indigo-100 font-bold text-xs rounded-lg w-full">
                  Tandai Selesai Asesmen
                </Button>
              </div>

              {/* Option 4: Discontinue */}
              <div
                onClick={() => setDiscontinueOpen(true)}
                className={cn(
                  "p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between gap-3 text-left group",
                  client.status === "discontinued"
                    ? "bg-rose-50 border-rose-500 ring-2 ring-rose-300/40"
                    : "bg-white border-slate-200 hover:border-rose-400 hover:bg-rose-50/20"
                )}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-extrabold text-sm text-rose-900">Discontinue</p>
                    <XCircle className="w-4 h-4 text-rose-600" />
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Batal atau tidak melanjutkan proses intake. Sertakan catatan alasan pembatalan.
                  </p>
                </div>
                <Button size="sm" variant="outline" className="border-rose-300 text-rose-900 hover:bg-rose-100 font-bold text-xs rounded-lg w-full">
                  Discontinue
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Discontinue Modal */}
      <Dialog open={discontinueOpen} onOpenChange={setDiscontinueOpen}>
        <DialogContent className="max-w-md rounded-2xl p-6 border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <XCircle className="w-4 h-4 text-rose-600" /> Konfirmasi Discontinue Client
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Tuliskan alasan mengapa client membatalkan atau tidak melanjutkan alur intake.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <Textarea
              className="rounded-xl border-slate-200 bg-slate-50 text-xs min-h-[90px]"
              placeholder="e.g. Keluarga pindah domisili, atau memutuskan terapi di kota lain..."
              value={discontinueReason}
              onChange={(e) => setDiscontinueReason(e.target.value)}
            />
          </div>
          <DialogFooter className="mt-4 gap-2">
            <Button variant="outline" className="rounded-xl text-xs" onClick={() => setDiscontinueOpen(false)}>
              Batal
            </Button>
            <Button
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs"
              onClick={handleOutcomeDiscontinue}
            >
              Simpan Discontinue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule Modal for Assessment */}
      <AddScheduleModal
        open={scheduleModalOpen}
        onOpenChange={setScheduleModalOpen}
        defaults={{
          clientId: client.id,
          lockClient: true,
          lockType: true,
          type: "assessment",
        }}
        defaultClientId={client.id}
        defaultType="assessment"
      />

      {/* Pratinjau Bukti Pembayaran Modal */}
      <PaymentProofViewerModal
        isOpen={proofModalOpen}
        onClose={() => setProofModalOpen(false)}
        invoice={latestInvoice}
        isFinanceView={false}
      />
    </div>
  );
}
