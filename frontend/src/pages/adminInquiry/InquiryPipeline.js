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
  Layers,
  Building2,
  ExternalLink,
  Mail,
  Phone,
  ArrowRight,
  ClipboardList
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
import { useClients } from "@/context/ClientsContext";
import { useAuth } from "@/context/AuthContext";
import {
  PIPELINE_STATUSES,
  STATUS_META,
  BRANCHES,
  calcAge,
  fmtDate,
  makeInquiryClient,
  CLINICAL_SERVICES,
} from "@/lib/appUtils";
import { cn } from "@/lib/utils";

const STAGE_COLUMNS = [
  { status: "inquiry", label: "1. New Intake", accent: "bg-sky-500", desc: "Data awal masuk" },
  { status: "service_selected", label: "2. Layanan Dipilih", accent: "bg-purple-500", desc: "B-OTA, F-OTA, Consultion" },
  { status: "assessment_scheduled", label: "3. Asesmen Terjadwal", accent: "bg-blue-500", desc: "Kode kuesioner aktif" },
  { status: "assessment_done", label: "4. Asesmen Selesai", accent: "bg-teal-500", desc: "GDrive & Tabel Psikologi" },
  { status: "admitted", label: "5. Active Client", accent: "bg-emerald-500", desc: "Lanjut sesi terapi" },
  { status: "done_consult", label: "Done Consult", accent: "bg-amber-500", desc: "Konsultasi selesai" },
  { status: "done_assessment", label: "Done Assessment", accent: "bg-indigo-500", desc: "Laporan selesai" },
  { status: "discontinued", label: "Discontinued", accent: "bg-rose-500", desc: "Batal / tidak lanjut" },
];

export default function InquiryPipeline() {
  const navigate = useNavigate();
  const { clients, addClient } = useClients();
  const { activeBranch } = useAuth();

  const [search, setSearch] = useState("");
  const [branchFilter, setBranchFilter] = useState(activeBranch || "all");
  const [newIntakeOpen, setNewIntakeOpen] = useState(false);

  // New Intake Form
  const [newForm, setNewForm] = useState({
    clientName: "",
    parentName: "",
    parentContact: "",
    parentEmail: "",
    dob: "",
    branchId: "branch-sby-timur",
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return clients.filter((c) => {
      // Filter branch
      if (branchFilter !== "all" && c.branchId !== branchFilter) return false;
      // Filter search query
      if (q) {
        const nameMatch = c.clientName?.toLowerCase().includes(q);
        const parentMatch = c.parentName?.toLowerCase().includes(q);
        const codeMatch = c.clientAccessCode?.toLowerCase().includes(q);
        const emailMatch = c.parentEmail?.toLowerCase().includes(q);
        if (!nameMatch && !parentMatch && !codeMatch && !emailMatch) return false;
      }
      return true;
    });
  }, [clients, search, branchFilter]);

  const clientsByStage = useMemo(() => {
    const groups = {};
    STAGE_COLUMNS.forEach((col) => {
      groups[col.status] = [];
    });
    filtered.forEach((c) => {
      if (groups[c.status]) {
        groups[c.status].push(c);
      } else {
        // Fallback mapping
        if (c.status === "active") groups["admitted"]?.push(c);
        else if (groups["inquiry"]) groups["inquiry"].push(c);
      }
    });
    return groups;
  }, [filtered]);

  const handleCreateIntake = (e) => {
    e.preventDefault();
    if (!newForm.clientName.trim() || !newForm.parentName.trim() || !newForm.parentContact.trim() || !newForm.dob) {
      toast.error("Mohon lengkapi nama anak, orang tua, kontak WhatsApp, dan tanggal lahir.");
      return;
    }

    const newClient = makeInquiryClient({
      ...newForm,
      status: "inquiry",
    });

    addClient(newClient);
    toast.success(`Data New Intake ${newClient.clientName} berhasil ditambahkan!`);
    setNewIntakeOpen(false);
    setNewForm({
      clientName: "",
      parentName: "",
      parentContact: "",
      parentEmail: "",
      dob: "",
      branchId: "branch-sby-timur",
    });

    navigate(`/admin-inquiry/pipeline/${newClient.id}`);
  };

  return (
    <div className="space-y-6" data-testid="inquiry-pipeline-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-100/80 text-sky-800 text-xs font-semibold mb-2">
            <ClipboardList className="w-3.5 h-3.5 text-sky-600" />
            Flexible Non-Sequential Inquiry Pipeline
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Inquiry & Intake Pipeline
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Alur pendaftaran client baru fleksibel non-sekuensial. Setiap langkah dapat dilompati atau diproses sesuai kebutuhan klinis.
          </p>
        </div>

        <Button
          className="bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl gap-2 shadow-sm shadow-sky-600/20 text-xs h-10 self-start sm:self-auto"
          onClick={() => setNewIntakeOpen(true)}
          data-testid="add-new-intake-button"
        >
          <Plus className="w-4 h-4" /> New Intake Client
        </Button>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-4">
        <div className="relative flex-1 min-w-[260px]">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            className="pl-10 h-10 rounded-xl border-slate-200 bg-slate-50 focus:bg-white text-xs"
            placeholder="Cari nama anak, orang tua, email, atau kode akses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="inquiry-search-input"
          />
        </div>

        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-sky-600 shrink-0" />
          <Select value={branchFilter} onValueChange={setBranchFilter}>
            <SelectTrigger className="w-48 h-10 text-xs rounded-xl border-slate-200 bg-slate-50 font-semibold">
              <SelectValue placeholder="Semua Cabang" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-slate-200">
              <SelectItem value="all">🏢 Semua Cabang (All)</SelectItem>
              {BRANCHES.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  📍 {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Horizontal Kanban Columns */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-[1400px]">
          {STAGE_COLUMNS.map((col) => {
            const list = clientsByStage[col.status] || [];
            return (
              <div
                key={col.status}
                className="w-80 shrink-0 bg-slate-100/70 border border-slate-200/80 rounded-2xl flex flex-col max-h-[calc(100vh-250px)]"
              >
                {/* Column Header */}
                <div className="p-3.5 border-b border-slate-200 bg-white/70 rounded-t-2xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={cn("w-2 h-4 rounded-full", col.accent)} />
                    <div>
                      <h3 className="text-xs font-black text-slate-900">{col.label}</h3>
                      <p className="text-[10px] text-slate-400">{col.desc}</p>
                    </div>
                  </div>
                  <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center">
                    {list.length}
                  </span>
                </div>

                {/* Cards Container */}
                <div className="p-3 space-y-3 flex-1 overflow-y-auto">
                  {list.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400">
                      Kosong di tahap ini
                    </div>
                  ) : (
                    list.map((c) => {
                      const br = BRANCHES.find((b) => b.id === c.branchId);
                      return (
                        <div
                          key={c.id}
                          className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs hover:border-sky-300 hover:shadow-xs transition-all cursor-pointer group space-y-2.5"
                          onClick={() => navigate(`/admin-inquiry/pipeline/${c.id}`)}
                          data-testid={`client-card-${c.id}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h4 className="font-bold text-sm text-slate-900 group-hover:text-sky-700 transition-colors">
                                {c.clientName}
                              </h4>
                              <p className="text-[11px] text-slate-500 font-medium">
                                {calcAge(c.dob)} th • DOB: {fmtDate(c.dob)}
                              </p>
                            </div>
                            <span className="text-[10px] font-mono font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                              {c.clientAccessCode}
                            </span>
                          </div>

                          {/* Contact Info */}
                          <div className="space-y-1 text-xs text-slate-600 pt-1 border-t border-slate-100">
                            <div className="flex items-center gap-1.5 truncate">
                              <User className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="font-semibold text-slate-800">{c.parentName}</span>
                            </div>
                            <div className="flex items-center gap-1.5 truncate">
                              <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                              <span>{c.parentContact}</span>
                            </div>
                            {c.parentEmail && (
                              <div className="flex items-center gap-1.5 truncate text-[11px] text-slate-500">
                                <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                                <span className="truncate">{c.parentEmail}</span>
                              </div>
                            )}
                          </div>

                          {/* Badges footer */}
                          <div className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-slate-100">
                            <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                              📍 {br ? br.name : "Surabaya"}
                            </span>
                            {((c.serviceTypes && c.serviceTypes.length > 0) ? c.serviceTypes : (c.serviceType ? [c.serviceType] : [])).map((st) => {
                              const srv = CLINICAL_SERVICES.find((s) => s.value === st);
                              return (
                                <span key={st} className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                                  {srv?.shortLabel || st}
                                </span>
                              );
                            })}
                            {c.hasSchoolCompanionProfile && (
                              <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                                + School Profile
                              </span>
                            )}
                            {c.gdriveClientLink && (
                              <span className="text-[10px] font-bold text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded-md border border-sky-200 flex items-center gap-1">
                                <ExternalLink className="w-2.5 h-2.5" /> GDrive
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* New Intake Modal (Clean, email included, no complaints/tags) */}
      <Dialog open={newIntakeOpen} onOpenChange={setNewIntakeOpen}>
        <DialogContent className="max-w-md rounded-2xl p-6 border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Plus className="w-5 h-5 text-sky-600" /> New Intake Pendaftaran
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Input data dasar client dan orang tua. Pemilihan layanan klinis dan kuesioner asesmen dapat diproses fleksibel pada langkah pipeline berikutnya.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateIntake} className="space-y-3.5 pt-2">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Nama Lengkap Anak *</Label>
              <Input
                className="rounded-xl border-slate-200 bg-slate-50 text-xs h-10"
                placeholder="e.g. Kenzo Danendra"
                value={newForm.clientName}
                onChange={(e) => setNewForm({ ...newForm, clientName: e.target.value })}
                data-testid="intake-client-name"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Tanggal Lahir Anak *</Label>
              <Input
                type="date"
                className="rounded-xl border-slate-200 bg-slate-50 text-xs h-10"
                value={newForm.dob}
                onChange={(e) => setNewForm({ ...newForm, dob: e.target.value })}
                data-testid="intake-dob"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Nama Orang Tua / Wali *</Label>
              <Input
                className="rounded-xl border-slate-200 bg-slate-50 text-xs h-10"
                placeholder="e.g. Ibu Liana Santoso"
                value={newForm.parentName}
                onChange={(e) => setNewForm({ ...newForm, parentName: e.target.value })}
                data-testid="intake-parent-name"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">No. WhatsApp / HP *</Label>
              <Input
                className="rounded-xl border-slate-200 bg-slate-50 text-xs h-10"
                placeholder="+62 812-xxxx-xxxx"
                value={newForm.parentContact}
                onChange={(e) => setNewForm({ ...newForm, parentContact: e.target.value })}
                data-testid="intake-parent-contact"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Email Orang Tua *</Label>
              <Input
                type="email"
                className="rounded-xl border-slate-200 bg-slate-50 text-xs h-10"
                placeholder="liana.santoso@gmail.com"
                value={newForm.parentEmail}
                onChange={(e) => setNewForm({ ...newForm, parentEmail: e.target.value })}
                data-testid="intake-parent-email"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Cabang Tujuan *</Label>
              <Select value={newForm.branchId} onValueChange={(val) => setNewForm({ ...newForm, branchId: val })}>
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

            <DialogFooter className="mt-5 gap-2.5 pt-2 border-t border-slate-100">
              <Button type="button" variant="outline" className="rounded-xl border-slate-200 text-xs font-bold h-10 px-4" onClick={() => setNewIntakeOpen(false)}>
                Batal
              </Button>
              <Button type="submit" className="bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl text-xs h-10 px-5 shadow-xs" data-testid="submit-intake-button">
                Daftarkan ke Pipeline
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
