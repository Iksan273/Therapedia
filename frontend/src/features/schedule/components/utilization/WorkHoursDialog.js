import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { Clock } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { maxSessionsOf, validateMaxSessions } from "@/domain/workHours";
import { useTherapists } from "@/stores/therapistsStore";

// Atur kapasitas terapis: MAKSIMAL SESI PER BULAN (= total jam kerja sebulan; 1 sesi = 1 jam). Dipakai sebagai penyebut
// Availability & Utilization Rate (disesuaikan dengan filter periode); tidak memblokir penjadwalan.
export function WorkHoursDialog({ therapist, open, onOpenChange }) {
  const { updateTherapistMaxSessions } = useTherapists();
  const [value, setValue] = useState("");

  useEffect(() => {
    if (open && therapist) setValue(String(maxSessionsOf(therapist)));
  }, [open, therapist?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!therapist) return null;

  const handleSave = (e) => {
    e.preventDefault();
    const error = validateMaxSessions(value);
    if (error) {
      toast.error(error);
      return;
    }
    updateTherapistMaxSessions(therapist.id, Number(value));
    toast.success(`Maksimal sesi per bulan ${therapist.name} disimpan (${Number(value)} sesi).`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[calc(100dvh-2.5rem)] overflow-y-auto rounded-2xl p-6 border-slate-200" data-testid="work-hours-dialog">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-sky-600" /> Kapasitas {therapist.name}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Isi total jam kerja dalam 1 bulan = maksimal sesi per bulan (1 sesi = 1 jam). Utilization = jumlah sesi terjadwal ÷ angka ini, disesuaikan dengan periode yang difilter.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-3.5 pt-1">
          <div className="space-y-1">
            <Label className="text-xs font-bold text-slate-700">Maksimal sesi per bulan *</Label>
            <Input type="number" min={1} max={744} inputMode="numeric" className="border-slate-200 bg-slate-50 text-sm font-bold" value={value} onChange={(e) => setValue(e.target.value)} data-testid="max-sessions-input" />
            <p className="text-[11px] text-slate-500">Mis. 6 jam sehari × 25 hari kerja = 150 sesi. Filter minggu / rentang kustom otomatis mengambil porsi hari kerjanya (hari libur dikurangi).</p>
          </div>
          <DialogFooter className="mt-4 gap-2">
            <Button type="button" variant="outline" className="border-slate-200" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" className="bg-sky-600 hover:bg-sky-700 text-white font-bold" data-testid="work-hours-save">
              Simpan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
