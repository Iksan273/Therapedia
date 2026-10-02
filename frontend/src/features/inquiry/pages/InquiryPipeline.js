import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Plus, ClipboardList } from "lucide-react";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { Button } from "@/shared/ui/button";
import { Label } from "@/shared/ui/label";
import DateFilterPicker from "@/shared/components/DateFilterPicker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { FilterBar, FilterField, SearchInput } from "@/shared/components/FilterBar";
import { BranchFilter } from "@/shared/components/BranchFilter";
import { useUrlFilters } from "@/shared/hooks/useUrlFilters";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { useClients } from "@/stores/clientsStore";
import { useAuth } from "@/stores/authStore";
import { BRANCHES, branchName } from "@/domain/branch";
import { makeInquiryClient, getClientServiceIds } from "@/domain/client";
import { useMasterData } from "@/stores/masterDataStore";
import { PipelineBoard } from "@/features/inquiry/components/pipeline/PipelineBoard";
import { STAGE_COLUMNS } from "@/features/inquiry/components/pipeline/pipelineConfig";



export default function InquiryPipeline() {
  const navigate = useNavigate();
  const { clients, addClient } = useClients();
  const { activeServices, getService } = useMasterData();
  const { activeBranch, auth } = useAuth();
  const isMaster = auth?.role === "master";
  const defaultBranch = isMaster ? (activeBranch || "all") : (auth?.branchId || activeBranch || "branch-sby-timur");

  const { values: filters, setFilter, reset: resetFilters } = useUrlFilters({
    q: "",
    branch: defaultBranch,
    service: "all",
  });
  const search = filters.q;
  const branchFilter = filters.branch;
  const serviceFilter = filters.service;
  const [newIntakeOpen, setNewIntakeOpen] = useState(false);

  // New Intake Form
  const [newForm, setNewForm] = useState({
    clientName: "",
    gender: "male",
    parentName: "",
    parentContact: "",
    parentEmail: "",
    dob: "",
    intakeNote: "",
    branchId: auth?.branchId || "branch-sby-timur",
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return clients.filter((c) => {
      // Filter branch
      if (branchFilter !== "all" && c.branchId !== branchFilter) return false;
      if (serviceFilter !== "all" && !getClientServiceIds(c).includes(serviceFilter)) return false;
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
  }, [clients, search, branchFilter, serviceFilter]);

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

  const filterChips = [];
  if (search.trim()) {
    filterChips.push({ key: "q", label: `Cari: "${search.trim()}"`, onRemove: () => setFilter("q", "") });
  }
  if (branchFilter !== defaultBranch) {
    filterChips.push({
      key: "branch",
      label: `Cabang: ${branchFilter === "all" ? "Semua" : branchName(branchFilter)}`,
      onRemove: () => setFilter("branch", defaultBranch),
    });
  }
  if (serviceFilter !== "all") {
    filterChips.push({
      key: "service",
      label: `Layanan: ${getService(serviceFilter)?.shortLabel || serviceFilter}`,
      onRemove: () => setFilter("service", "all"),
    });
  }

  const openClient = (id) => navigate(`/admin-inquiry/pipeline/${id}`);

  const handleCreateIntake = (e) => {
    e.preventDefault();
    if (
      !newForm.clientName.trim() ||
      !newForm.parentName.trim() ||
      !newForm.parentContact.trim() ||
      !newForm.dob ||
      !newForm.parentEmail.trim()
    ) {
      toast.error("Mohon lengkapi seluruh data wajib: nama anak, tanggal lahir, nama orang tua, kontak WhatsApp, dan email.");
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
      gender: "male",
      parentName: "",
      parentContact: "",
      parentEmail: "",
      dob: "",
      intakeNote: "",
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
          className="bg-sky-600 hover:bg-sky-700 text-white font-bold gap-2 shadow-sm shadow-sky-600/20 self-start sm:self-auto"
          onClick={() => setNewIntakeOpen(true)}
          data-testid="add-new-intake-button"
        >
          <Plus className="w-4 h-4" /> New Intake Client
        </Button>
      </div>

      {/* Filter Toolbar */}
      <FilterBar
        title="Cari & Filter"
        chips={filterChips}
        onReset={resetFilters}
        resultText={`${filtered.length} client`}
        gridClassName="lg:grid-cols-[2fr_1fr_1fr]"
      >
        <FilterField label="Pencarian">
          <SearchInput
            className="min-w-0"
            placeholder="Nama anak, orang tua, email, atau kode akses..."
            value={search}
            onChange={(v) => setFilter("q", v)}
            data-testid="inquiry-search-input"
          />
        </FilterField>
        <FilterField label="Cabang">
          <BranchFilter value={branchFilter} onChange={(v) => setFilter("branch", v)} isMaster={isMaster} />
        </FilterField>
        <FilterField label="Layanan">
          <Select value={serviceFilter} onValueChange={(v) => setFilter("service", v)}>
            <SelectTrigger className="text-xs border-slate-200 bg-slate-50 font-semibold" aria-label="Filter layanan">
              <SelectValue placeholder="Semua Layanan" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-slate-200">
              <SelectItem value="all">Semua Layanan</SelectItem>
              {activeServices.map((sv) => (
                <SelectItem key={sv.value} value={sv.value}>
                  {sv.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>
      </FilterBar>

      <PipelineBoard
        columns={STAGE_COLUMNS}
        clientsByStage={clientsByStage}
        getService={getService}
        onOpen={openClient}
        emptyText={filtered.length === 0 && clients.length > 0 ? "Tidak ada yang cocok dengan filter" : "Kosong di tahap ini"}
      />

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
                className="border-slate-200 bg-slate-50 text-xs"
                placeholder="e.g. Kenzo Danendra"
                value={newForm.clientName}
                onChange={(e) => setNewForm({ ...newForm, clientName: e.target.value })}
                data-testid="intake-client-name"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Jenis Kelamin Anak *</Label>
                <Select value={newForm.gender} onValueChange={(val) => setNewForm({ ...newForm, gender: val })}>
                  <SelectTrigger className="border-slate-200 bg-slate-50 text-xs font-semibold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200">
                    <SelectItem value="male">Laki-laki (Male)</SelectItem>
                    <SelectItem value="female">Perempuan (Female)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Tanggal Lahir Anak</Label>
                <DateFilterPicker
                  placeholder="DD/MM/YYYY"
                  className="w-full bg-slate-50 h-10"
                  value={newForm.dob}
                  onChange={(e) => setNewForm({ ...newForm, dob: e?.target?.value ?? e })}
                  data-testid="intake-dob"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Nama Orang Tua / Wali *</Label>
              <Input
                className="border-slate-200 bg-slate-50 text-xs"
                placeholder="e.g. Ibu Liana Santoso"
                value={newForm.parentName}
                onChange={(e) => setNewForm({ ...newForm, parentName: e.target.value })}
                data-testid="intake-parent-name"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">No. WhatsApp / HP *</Label>
              <Input
                className="border-slate-200 bg-slate-50 text-xs"
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
                className="border-slate-200 bg-slate-50 text-xs"
                placeholder="liana.santoso@gmail.com"
                value={newForm.parentEmail}
                onChange={(e) => setNewForm({ ...newForm, parentEmail: e.target.value })}
                data-testid="intake-parent-email"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Catatan Intake (opsional)</Label>
              <Textarea
                className="border-slate-200 bg-slate-50 text-xs min-h-[70px]"
                placeholder="Keluhan utama orang tua, sumber rujukan, atau catatan awal lain..."
                value={newForm.intakeNote}
                onChange={(e) => setNewForm({ ...newForm, intakeNote: e.target.value })}
                data-testid="intake-note"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Cabang Tujuan *</Label>
              <Select value={newForm.branchId} onValueChange={(val) => setNewForm({ ...newForm, branchId: val })}>
                <SelectTrigger className="border-slate-200 bg-slate-50 text-xs font-semibold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200">
                  {BRANCHES.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name} ({b.city})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="mt-5 gap-2.5 pt-2 border-t border-slate-100">
              <Button type="button" variant="outline" className="border-slate-200 font-bold px-4" onClick={() => setNewIntakeOpen(false)}>
                Batal
              </Button>
              <Button type="submit" className="bg-sky-600 hover:bg-sky-700 text-white font-bold px-5 shadow-xs" data-testid="submit-intake-button">
                Daftarkan ke Pipeline
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
