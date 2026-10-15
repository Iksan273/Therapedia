import { IfCanDelete } from "@/shared/components/DeleteControls";
import React, { useMemo, useState } from "react";
import { useConfirm } from "@/shared/components/ConfirmDialog";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { useMasterData, QUADRANT_COLORS, getQuadrantColor } from "@/stores/masterDataStore";
import { useAssessments } from "@/stores/assessmentsStore";
import { cn } from "@/shared/lib/utils";
import { apiErrorText } from "@/domain/auth";
import { isApiMode } from "@/config/env";

const EMPTY_QUADRANT = {
  open: false,
  editingCode: null,
  code: "",
  title: "",
  fullName: "",
  description: "",
  color: "blue",
};

const questionsOf = (cat) =>
  cat.sections && cat.sections.length > 0
    ? cat.sections.flatMap((s) => s.questions || [])
    : cat.questions || [];

// Tab Kuadran Sensori di Master Data Inquiry: kartu kuadran + tambah/ubah/hapus (dialog di komponen ini).
export function QuadrantsTab() {
  const { confirm, confirmDialog } = useConfirm();
  const { quadrants, addQuadrant, updateQuadrant, deleteQuadrant } = useMasterData();
  const { categories } = useAssessments();

  const [quadDialog, setQuadDialog] = useState(EMPTY_QUADRANT);

  // Badge "N soal" = jumlah soal; pengaman hapus memakai `quadrantBlockers` (soal + skor hasil di mode API)
  // Mode API: angka asli dari server (`questionCount` di item master). Mode demo: dihitung dari store lokal.
  const quadrantUsage = useMemo(() => {
    const usage = {};
    if (isApiMode()) {
      quadrants.forEach((q) => { usage[q.code] = q.questionCount ?? 0; });
      return usage;
    }
    categories.forEach((cat) => {
      questionsOf(cat).forEach((q) => {
        const code = q.quadrant || "SN";
        usage[code] = (usage[code] || 0) + 1;
      });
    });
    return usage;
  }, [categories, quadrants]);

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

  const saveQuadrant = async () => {
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

    try {
      if (quadDialog.editingCode) {
        await updateQuadrant(quadDialog.editingCode, payload);
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
        await addQuadrant({ code, ...payload });
        toast.success(`Kuadran ${code} ditambahkan.`);
      }
      setQuadDialog(EMPTY_QUADRANT);
    } catch (err) {
      toast.error(apiErrorText(err, ["code", "title", "full_name"]));
    }
  };

  // Kuadran yang belum dipakai boleh dihapus semua (tidak ada batas minimal).
  const removeQuadrant = async (q) => {
    const used = quadrantUsage[q.code] || 0;
    if (used > 0) {
      toast.error(`Kuadran ${q.code} dipakai di ${used} butir soal. Pindahkan soalnya ke kuadran lain terlebih dahulu.`);
      return;
    }
    if (!(await confirm({ title: "Hapus kuadran?", description: `Kuadran ${q.code} - ${q.title} akan dihapus.` }))) return;
    try {
      await deleteQuadrant(q.code);
      toast.success(`Kuadran ${q.code} dihapus.`);
    } catch (err) {
      toast.error(apiErrorText(err)); // 409 bila dipakai soal / skor hasil asesmen
    }
  };

  return (
    <>
      {confirmDialog}
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
                    <IfCanDelete module="inquiry_master_data">
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
                    </IfCanDelete>
                  </div>
                </div>
                <p className={cn("text-sm font-bold", color.text)}>{q.fullName || q.title}</p>
                <p className={cn("text-xs leading-snug", color.textSoft)}>{q.description || "—"}</p>
              </div>
            );
          })}
        </div>
      </div>

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
    </>
  );
}
