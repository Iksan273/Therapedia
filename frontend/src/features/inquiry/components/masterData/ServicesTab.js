import { IfCanDelete } from "@/shared/components/DeleteControls";
import React, { useMemo, useState } from "react";
import { useConfirm } from "@/shared/components/ConfirmDialog";
import { toast } from "sonner";
import { Pencil, Plus, Trash2, Stethoscope, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import { Switch } from "@/shared/ui/switch";
import { Badge } from "@/shared/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { EmptyState } from "@/shared/components/EmptyState";
import { useMasterData } from "@/stores/masterDataStore";
import { useClients } from "@/stores/clientsStore";
import { useSchedules } from "@/stores/schedulesStore";
import { apiErrorText } from "@/domain/auth";
import { isApiMode } from "@/config/env";

// Kategori layanan: tiga pilihan tetap + "Lainnya" (ketik sendiri, `otherCategory`)
const SERVICE_CATEGORIES = ["Asesmen", "Terapi", "Konsultasi"];
const OTHER_CATEGORY = "__other";

const EMPTY_SERVICE = {
  open: false,
  editingValue: null,
  value: "",
  label: "",
  category: "Asesmen",
  otherCategory: false,
  description: "",
  active: true,
};

const PAGE_SIZE = 10;

const slugify = (text) =>
  text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

// Tab Layanan di Master Data Inquiry: daftar layanan + tambah/ubah/aktif-nonaktif/hapus (dialog di komponen ini).
export function ServicesTab() {
  const { confirm, confirmDialog } = useConfirm();
  const { services, addService, updateService, deleteService } = useMasterData();
  const { clients } = useClients();
  const { schedules } = useSchedules();

  const [svcDialog, setSvcDialog] = useState(EMPTY_SERVICE);
  const [servicePage, setServicePage] = useState(1);

  const totalServicePages = Math.ceil(services.length / PAGE_SIZE) || 1;
  // Setelah hapus, halaman bisa melewati batas; tampilkan halaman terakhir yang valid
  const currentServicePage = Math.min(servicePage, totalServicePages);
  const pagedServices = useMemo(() => {
    const start = (currentServicePage - 1) * PAGE_SIZE;
    return services.slice(start, start + PAGE_SIZE);
  }, [services, currentServicePage]);

  // Jumlah pemakaian tiap layanan, dipakai untuk pengaman hapus.
  // Mode API: angka asli dari server (`usageCount` di item master). Mode demo: dihitung dari store lokal.
  const serviceUsage = useMemo(() => {
    const usage = {};
    if (isApiMode()) {
      services.forEach((s) => { usage[s.value] = s.usageCount ?? 0; });
      return usage;
    }
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
  }, [clients, schedules, services]);

  const openEditService = (srv) => {
    const category = srv.category || "Asesmen";
    setSvcDialog({
      open: true,
      editingValue: srv.value,
      value: srv.value,
      label: srv.label || "",
      category,
      otherCategory: !SERVICE_CATEGORIES.includes(category), // kategori lama di luar tiga pilihan tampil sebagai "Lainnya"
      description: srv.description || "",
      active: srv.active !== false,
    });
  };

  // Mutasi master bisa menolak (mode API: 422 kode ganda, 409 masih dipakai): pesan server ditampilkan sebagai toast.
  const saveService = async () => {
    const label = svcDialog.label.trim();
    if (!label) {
      toast.error("Nama layanan wajib diisi.");
      return;
    }
    const category = svcDialog.category.trim();
    if (!category) {
      toast.error("Kategori layanan wajib diisi.");
      return;
    }
    const payload = {
      label,
      category,
      description: svcDialog.description.trim(),
      active: svcDialog.active,
    };

    try {
      if (svcDialog.editingValue) {
        await updateService(svcDialog.editingValue, payload);
        toast.success(`Layanan "${label}" diperbarui.`);
      } else {
        const code = slugify(svcDialog.value || label);
        if (!code) {
          toast.error("Kode layanan tidak valid.");
          return;
        }
        if (services.some((s) => s.value === code)) {
          toast.error(`Kode layanan "${code}" sudah dipakai.`);
          return;
        }
        await addService({ value: code, ...payload });
        toast.success(`Layanan "${label}" ditambahkan.`);
      }
      setSvcDialog(EMPTY_SERVICE);
    } catch (err) {
      toast.error(apiErrorText(err, ["code", "label", "category"]));
    }
  };

  const toggleService = async (srv, checked) => {
    try {
      await updateService(srv.value, { active: checked });
      toast.success(`"${srv.label}" ${checked ? "diaktifkan" : "dinonaktifkan"}.`);
    } catch (err) {
      toast.error(apiErrorText(err));
    }
  };

  const removeService = async (srv) => {
    const used = serviceUsage[srv.value] || 0;
    if (used > 0) {
      toast.error(`Layanan "${srv.label}" dipakai di ${used} data. Nonaktifkan saja agar riwayat tetap utuh.`);
      return;
    }
    if (!(await confirm({ title: "Hapus layanan?", description: `Layanan "${srv.label}" akan dihapus dari daftar.` }))) return;
    try {
      await deleteService(srv.value);
      toast.success(`Layanan "${srv.label}" dihapus.`);
    } catch (err) {
      toast.error(apiErrorText(err)); // 409 bila masih dipakai client / jadwal
    }
  };

  return (
    <>
      {confirmDialog}
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
                    <TableCell data-label="Status" className="text-center">
                      <Switch
                        checked={srv.active !== false}
                        onCheckedChange={(checked) => toggleService(srv, checked)}
                        aria-label={`Aktifkan ${srv.label}`}
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
                      <IfCanDelete module="inquiry_master_data">
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
                      </IfCanDelete>
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
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Kode</Label>
              <Input
                value={svcDialog.value}
                disabled={Boolean(svcDialog.editingValue)}
                onChange={(e) => setSvcDialog((p) => ({ ...p, value: e.target.value }))}
                placeholder={slugify(svcDialog.label) || "otomatis"}
                className="font-mono text-xs"
                data-testid="service-code-input"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Kategori</Label>
              <Select
                value={svcDialog.otherCategory ? OTHER_CATEGORY : svcDialog.category}
                onValueChange={(v) =>
                  setSvcDialog((p) => (v === OTHER_CATEGORY ? { ...p, otherCategory: true, category: "" } : { ...p, otherCategory: false, category: v }))
                }
              >
                <SelectTrigger className="text-xs font-semibold" data-testid="service-category-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {SERVICE_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c} className="text-xs font-bold">{c}</SelectItem>
                  ))}
                  <SelectItem value={OTHER_CATEGORY} className="text-xs font-bold">Lainnya (ketik sendiri)</SelectItem>
                </SelectContent>
              </Select>
              {svcDialog.otherCategory && (
                <Input
                  value={svcDialog.category}
                  maxLength={50}
                  placeholder="mis. Parent Coaching"
                  onChange={(e) => setSvcDialog((p) => ({ ...p, category: e.target.value }))}
                  data-testid="service-category-input"
                />
              )}
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
    </>
  );
}
