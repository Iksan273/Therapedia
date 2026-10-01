import React, { useMemo, useState } from "react";
import { useConfirm } from "@/components/common/ConfirmDialog";
import { toast } from "sonner";
import { Pencil, Plus, Trash2, Stethoscope, Grid2x2, Database, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/common/EmptyState";
import { useMasterData, QUADRANT_COLORS, getQuadrantColor } from "@/context/MasterDataContext";
import { useClients } from "@/context/ClientsContext";
import { useSchedules } from "@/context/SchedulesContext";
import { useAssessments } from "@/context/AssessmentsContext";
import { cn } from "@/lib/utils";

const EMPTY_SERVICE = {
  open: false,
  editingValue: null,
  value: "",
  label: "",
  shortLabel: "",
  category: "Asesmen",
  description: "",
  active: true,
};

const EMPTY_QUADRANT = {
  open: false,
  editingCode: null,
  code: "",
  title: "",
  fullName: "",
  description: "",
  color: "blue",
};

const PAGE_SIZE = 10;

const slugify = (text) =>
  text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const questionsOf = (cat) =>
  cat.sections && cat.sections.length > 0
    ? cat.sections.flatMap((s) => s.questions || [])
    : cat.questions || [];

export default function InquiryMasterData() {
  const { confirm, confirmDialog } = useConfirm();
  const { services, addService, updateService, deleteService, quadrants, addQuadrant, updateQuadrant, deleteQuadrant } =
    useMasterData();
  const { clients } = useClients();
  const { schedules } = useSchedules();
  const { categories } = useAssessments();

  const [svcDialog, setSvcDialog] = useState(EMPTY_SERVICE);
  const [quadDialog, setQuadDialog] = useState(EMPTY_QUADRANT);
  const [servicePage, setServicePage] = useState(1);

  const totalServicePages = Math.ceil(services.length / PAGE_SIZE) || 1;
  // Setelah hapus, halaman bisa melewati batas; tampilkan halaman terakhir yang valid
  const currentServicePage = Math.min(servicePage, totalServicePages);
  const pagedServices = useMemo(() => {
    const start = (currentServicePage - 1) * PAGE_SIZE;
    return services.slice(start, start + PAGE_SIZE);
  }, [services, currentServicePage]);

  // Jumlah pemakaian tiap layanan / kuadran, dipakai untuk badge dan pengaman hapus
  const serviceUsage = useMemo(() => {
    const usage = {};
    clients.forEach((c) => {
      const list = c.serviceTypes && c.serviceTypes.length > 0 ? c.serviceTypes : c.serviceType ? [c.serviceType] : [];
      list.forEach((v) => {
        usage[v] = (usage[v] || 0) + 1;
      });
    });
    (schedules || []).forEach((s) => {
      if (s.serviceType) usage[s.serviceType] = (usage[s.serviceType] || 0) + 1;
    });
    return usage;
  }, [clients, schedules]);

  const quadrantUsage = useMemo(() => {
    const usage = {};
    categories.forEach((cat) => {
      questionsOf(cat).forEach((q) => {
        const code = q.quadrant || "SN";
        usage[code] = (usage[code] || 0) + 1;
      });
    });
    return usage;
  }, [categories]);

  const categoryOptions = useMemo(
    () => Array.from(new Set(["Asesmen", "Konsultasi", "Terapi", ...services.map((s) => s.category).filter(Boolean)])),
    [services]
  );

  // ---------- Layanan ----------
  const openEditService = (srv) =>
    setSvcDialog({
      open: true,
      editingValue: srv.value,
      value: srv.value,
      label: srv.label || "",
      shortLabel: srv.shortLabel || "",
      category: srv.category || "Asesmen",
      description: srv.description || "",
      active: srv.active !== false,
    });

  const saveService = () => {
    const label = svcDialog.label.trim();
    const shortLabel = svcDialog.shortLabel.trim() || label;
    if (!label) {
      toast.error("Nama layanan wajib diisi.");
      return;
    }
    const payload = {
      label,
      fullLabel: label,
      shortLabel,
      category: svcDialog.category.trim() || "Lainnya",
      description: svcDialog.description.trim(),
      active: svcDialog.active,
    };

    if (svcDialog.editingValue) {
      updateService(svcDialog.editingValue, payload);
      toast.success(`Layanan "${shortLabel}" diperbarui.`);
    } else {
      const code = slugify(svcDialog.value || shortLabel);
      if (!code) {
        toast.error("Kode layanan tidak valid.");
        return;
      }
      if (services.some((s) => s.value === code)) {
        toast.error(`Kode layanan "${code}" sudah dipakai.`);
        return;
      }
      addService({ value: code, ...payload });
      toast.success(`Layanan "${shortLabel}" ditambahkan.`);
    }
    setSvcDialog(EMPTY_SERVICE);
  };

  const removeService = async (srv) => {
    const used = serviceUsage[srv.value] || 0;
    if (used > 0) {
      toast.error(`Layanan "${srv.shortLabel}" dipakai di ${used} data. Nonaktifkan saja agar riwayat tetap utuh.`);
      return;
    }
    if (!(await confirm({ title: "Hapus layanan?", description: `Layanan "${srv.label}" akan dihapus dari daftar.` }))) return;
    deleteService(srv.value);
    toast.success(`Layanan "${srv.shortLabel}" dihapus.`);
  };

  // ---------- Kuadran ----------
  const openEditQuadrant = (q) =>
    setQuadDialog({
      open: true,
      editingCode: q.code,
      code: q.code,
      title: q.title || "",
      fullName: q.fullName || "",
      description: q.description || "",
      color: q.color || "blue",
    });

  const saveQuadrant = () => {
    const title = quadDialog.title.trim();
    if (!title) {
      toast.error("Nama kuadran wajib diisi.");
      return;
    }
    const payload = {
      title,
      fullName: quadDialog.fullName.trim() || title,
      description: quadDialog.description.trim(),
      color: quadDialog.color,
    };

    if (quadDialog.editingCode) {
      updateQuadrant(quadDialog.editingCode, payload);
      toast.success(`Kuadran ${quadDialog.editingCode} diperbarui.`);
    } else {
      const code = quadDialog.code.trim().toUpperCase();
      if (!/^[A-Z0-9]{1,4}$/.test(code)) {
        toast.error("Kode kuadran harus 1-4 karakter huruf/angka.");
        return;
      }
      if (quadrants.some((q) => q.code === code)) {
        toast.error(`Kode kuadran "${code}" sudah dipakai.`);
        return;
      }
      addQuadrant({ code, ...payload });
      toast.success(`Kuadran ${code} ditambahkan.`);
    }
    setQuadDialog(EMPTY_QUADRANT);
  };

  const removeQuadrant = async (q) => {
    const used = quadrantUsage[q.code] || 0;
    if (used > 0) {
      toast.error(`Kuadran ${q.code} dipakai di ${used} butir soal. Pindahkan soalnya ke kuadran lain terlebih dahulu.`);
      return;
    }
    if (quadrants.length <= 1) {
      toast.error("Minimal harus ada 1 kuadran.");
      return;
    }
    if (!(await confirm({ title: "Hapus kuadran?", description: `Kuadran ${q.code} - ${q.title} akan dihapus.` }))) return;
    deleteQuadrant(q.code);
    toast.success(`Kuadran ${q.code} dihapus.`);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16" data-testid="inquiry-master-data-page">
      {confirmDialog}
      <div className="flex items-start gap-4 bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs">
        <div className="w-12 h-12 rounded-2xl bg-sky-600 text-white flex items-center justify-center shrink-0">
          <Database className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Master Data Inquiry</h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Kelola daftar layanan klinis dan kuadran sensori yang dipakai di pipeline inquiry, jadwal, dan kuesioner.
          </p>
        </div>
      </div>

      <Tabs defaultValue="services">
        <TabsList className="rounded-xl">
          <TabsTrigger value="services" className="gap-1.5 text-xs font-bold" data-testid="tab-master-services">
            <Stethoscope className="w-3.5 h-3.5" /> Layanan ({services.length})
          </TabsTrigger>
          <TabsTrigger value="quadrants" className="gap-1.5 text-xs font-bold" data-testid="tab-master-quadrants">
            <Grid2x2 className="w-3.5 h-3.5" /> Kuadran Sensori ({quadrants.length})
          </TabsTrigger>
        </TabsList>

        {/* ===== LAYANAN ===== */}
        <TabsContent value="services" className="mt-4">
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden">
            <div className="flex items-center justify-between gap-3 p-4 sm:p-5 border-b border-slate-100">
              <p className="text-xs text-slate-500 font-medium">
                Layanan nonaktif tidak muncul di pilihan baru, tetapi data lama tetap terbaca.
              </p>
              <Button size="sm"
                className="gap-1.5 font-bold bg-sky-600 hover:bg-sky-700 text-white cursor-pointer"
                onClick={() => setSvcDialog({ ...EMPTY_SERVICE, open: true })}
                data-testid="add-service-button"
              >
                <Plus className="w-4 h-4" /> Tambah Layanan
              </Button>
            </div>

            {services.length === 0 ? (
              <EmptyState icon={Stethoscope} title="Belum ada layanan" subtitle="Tambahkan layanan klinis pertama." />
            ) : (
              <div className="overflow-x-auto">
                <Table stackOnMobile>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs font-bold">Layanan</TableHead>
                      <TableHead className="text-xs font-bold">Kode</TableHead>
                      <TableHead className="text-xs font-bold">Kategori</TableHead>
                      <TableHead className="text-xs font-bold text-center">Dipakai</TableHead>
                      <TableHead className="text-xs font-bold text-center">Status</TableHead>
                      <TableHead className="text-xs font-bold text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagedServices.map((srv) => (
                      <TableRow key={srv.value} data-testid={`service-row-${srv.value}`}>
                        <TableCell data-nolabel className="min-w-[240px]">
                          <p className="text-xs font-bold text-slate-900">{srv.label}</p>
                          {srv.description && (
                            <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{srv.description}</p>
                          )}
                        </TableCell>
                        <TableCell data-label="Kode" className="font-mono text-[11px] text-slate-600">{srv.value}</TableCell>
                        <TableCell data-label="Kategori">
                          <Badge variant="outline" className="text-[11px] font-bold">{srv.category || "—"}</Badge>
                        </TableCell>
                        <TableCell data-label="Dipakai" className="text-center text-xs font-mono">{serviceUsage[srv.value] || 0}</TableCell>
                        <TableCell data-label="Status" className="text-center">
                          <Switch
                            checked={srv.active !== false}
                            onCheckedChange={(checked) => {
                              updateService(srv.value, { active: checked });
                              toast.success(`"${srv.shortLabel}" ${checked ? "diaktifkan" : "dinonaktifkan"}.`);
                            }}
                            aria-label={`Aktifkan ${srv.shortLabel}`}
                          />
                        </TableCell>
                        <TableCell data-nolabel className="text-right whitespace-nowrap">
                          <Button aria-label="Edit layanan"
                            size="icon"
                            variant="ghost"
                            className="cursor-pointer"
                            onClick={() => openEditService(srv)}
                            title="Edit layanan"
                            data-testid={`edit-service-${srv.value}`}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button aria-label="Hapus layanan"
                            size="icon"
                            variant="ghost"
                            className="text-rose-600 hover:bg-rose-50 cursor-pointer"
                            onClick={() => removeService(srv)}
                            title="Hapus layanan"
                            data-testid={`delete-service-${srv.value}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {services.length > 0 && (
              <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 bg-slate-50/50">
                <span>
                  Menampilkan {(currentServicePage - 1) * PAGE_SIZE + 1} –{" "}
                  {Math.min(currentServicePage * PAGE_SIZE, services.length)} dari {services.length} layanan
                </span>
                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    className=""
                    disabled={currentServicePage <= 1}
                    onClick={() => setServicePage(currentServicePage - 1)}
                    data-testid="service-prev-page"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" /> Prev
                  </Button>
                  <span className="px-2 font-bold text-slate-800">
                    Halaman {currentServicePage} / {totalServicePages}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    className=""
                    disabled={currentServicePage >= totalServicePages}
                    onClick={() => setServicePage(currentServicePage + 1)}
                    data-testid="service-next-page"
                  >
                    Next <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ===== KUADRAN ===== */}
        <TabsContent value="quadrants" className="mt-4">
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden">
            <div className="flex items-center justify-between gap-3 p-4 sm:p-5 border-b border-slate-100">
              <p className="text-xs text-slate-500 font-medium">
                Kuadran dipakai untuk mengelompokkan butir soal di kuesioner (Sensory Profile).
              </p>
              <Button size="sm"
                className="gap-1.5 font-bold bg-sky-600 hover:bg-sky-700 text-white cursor-pointer"
                onClick={() => setQuadDialog({ ...EMPTY_QUADRANT, open: true })}
                data-testid="add-quadrant-button"
              >
                <Plus className="w-4 h-4" /> Tambah Kuadran
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 sm:p-5 max-h-[460px] overflow-y-auto content-start" data-testid="quadrant-scroll-area">
              {quadrants.map((q) => {
                const color = getQuadrantColor(q.color);
                return (
                  <div
                    key={q.code}
                    className={cn("p-4 rounded-2xl border space-y-2", color.card)}
                    data-testid={`quadrant-card-${q.code}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={cn("px-2 py-0.5 rounded text-[11px]", color.solid)}>{q.code}</span>
                      <div className="flex items-center gap-0.5">
                        <span className={cn("text-xs font-black mr-2", color.count)}>
                          {quadrantUsage[q.code] || 0} soal
                        </span>
                        <Button aria-label="Edit kuadran"
                          size="icon"
                          variant="ghost"
                          className="cursor-pointer"
                          onClick={() => openEditQuadrant(q)}
                          title="Edit kuadran"
                          data-testid={`edit-quadrant-${q.code}`}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button aria-label="Hapus kuadran"
                          size="icon"
                          variant="ghost"
                          className="text-rose-600 hover:bg-rose-50 cursor-pointer"
                          onClick={() => removeQuadrant(q)}
                          title="Hapus kuadran"
                          data-testid={`delete-quadrant-${q.code}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                    <p className={cn("text-sm font-bold", color.text)}>{q.fullName || q.title}</p>
                    <p className={cn("text-xs leading-snug", color.textSoft)}>{q.description || "—"}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialog Layanan */}
      <Dialog open={svcDialog.open} onOpenChange={(open) => !open && setSvcDialog(EMPTY_SERVICE)}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle>{svcDialog.editingValue ? "Edit Layanan" : "Tambah Layanan"}</DialogTitle>
            <DialogDescription>Layanan ini akan muncul di pilihan layanan inquiry dan jadwal.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Nama Layanan *</Label>
              <Input
                value={svcDialog.label}
                onChange={(e) => setSvcDialog((p) => ({ ...p, label: e.target.value }))}
                placeholder="mis. Parent Coaching Session"
                data-testid="service-label-input"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Nama Singkat</Label>
                <Input
                  value={svcDialog.shortLabel}
                  onChange={(e) => setSvcDialog((p) => ({ ...p, shortLabel: e.target.value }))}
                  placeholder="mis. Coaching"
                  data-testid="service-short-input"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Kode</Label>
                <Input
                  value={svcDialog.value}
                  disabled={Boolean(svcDialog.editingValue)}
                  onChange={(e) => setSvcDialog((p) => ({ ...p, value: e.target.value }))}
                  placeholder={slugify(svcDialog.shortLabel || svcDialog.label) || "otomatis"}
                  className="font-mono text-xs"
                  data-testid="service-code-input"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Kategori</Label>
              <Input
                list="service-category-options"
                value={svcDialog.category}
                onChange={(e) => setSvcDialog((p) => ({ ...p, category: e.target.value }))}
              />
              <datalist id="service-category-options">
                {categoryOptions.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Deskripsi</Label>
              <Textarea
                rows={2}
                value={svcDialog.description}
                onChange={(e) => setSvcDialog((p) => ({ ...p, description: e.target.value }))}
              />
            </div>
            <div className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
              <Label className="text-xs font-bold">Aktif</Label>
              <Switch checked={svcDialog.active} onCheckedChange={(v) => setSvcDialog((p) => ({ ...p, active: v }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="" onClick={() => setSvcDialog(EMPTY_SERVICE)}>
              Batal
            </Button>
            <Button className="bg-sky-600 hover:bg-sky-700 text-white" onClick={saveService} data-testid="save-service-button">
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Kuadran */}
      <Dialog open={quadDialog.open} onOpenChange={(open) => !open && setQuadDialog(EMPTY_QUADRANT)}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle>{quadDialog.editingCode ? `Edit Kuadran ${quadDialog.editingCode}` : "Tambah Kuadran"}</DialogTitle>
            <DialogDescription>Kuadran akan tersedia saat menyusun butir soal kuesioner.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Kode *</Label>
                <Input
                  value={quadDialog.code}
                  disabled={Boolean(quadDialog.editingCode)}
                  maxLength={4}
                  onChange={(e) => setQuadDialog((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
                  placeholder="AV"
                  className="font-mono"
                  data-testid="quadrant-code-input"
                />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs font-bold">Nama Singkat *</Label>
                <Input
                  value={quadDialog.title}
                  onChange={(e) => setQuadDialog((p) => ({ ...p, title: e.target.value }))}
                  placeholder="Avoiding"
                  data-testid="quadrant-title-input"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Nama Lengkap</Label>
              <Input
                value={quadDialog.fullName}
                onChange={(e) => setQuadDialog((p) => ({ ...p, fullName: e.target.value }))}
                placeholder="Sensation Avoiding"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Deskripsi</Label>
              <Textarea
                rows={2}
                value={quadDialog.description}
                onChange={(e) => setQuadDialog((p) => ({ ...p, description: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Warna</Label>
              <Select value={quadDialog.color} onValueChange={(v) => setQuadDialog((p) => ({ ...p, color: v }))}>
                <SelectTrigger className="text-xs font-semibold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {Object.entries(QUADRANT_COLORS).map(([key, c]) => (
                    <SelectItem key={key} value={key} className="text-xs font-bold">
                      <span className="inline-flex items-center gap-2">
                        <span className={cn("w-3 h-3 rounded-full", c.dot)} /> {c.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="" onClick={() => setQuadDialog(EMPTY_QUADRANT)}>
              Batal
            </Button>
            <Button className="bg-sky-600 hover:bg-sky-700 text-white" onClick={saveQuadrant} data-testid="save-quadrant-button">
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
