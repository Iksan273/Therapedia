import { useState } from "react";
import { AlertTriangle, Undo2 } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import { STATUS_META } from "@/domain/status";

const statusLabel = (status) => STATUS_META[status]?.label || status;

// Panel "Batalkan Completed / Cancel" untuk sesi yang salah ditandai. Alasan wajib diisi.
// Efek (status, kredit, kuota, tahap client) dihitung oleh useSessionActions.previewRevert dan ditampilkan sebelum konfirmasi.
export function RevertSessionPanel({ schedule, preview, toSlotLabel, conflicts, onConfirm }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const isReschedule = schedule.status === "rescheduled";
  const isPending = schedule.status === "reschedule_pending";
  const noun = { completed: "Completed", cancelled: "Cancel", off: "Off", rescheduled: "Reschedule", reschedule_pending: "Reschedule Menggantung" }[schedule.status];
  const actionLabel = isReschedule ? "Batalkan Pemindahan Jadwal (Revert)" : `Batalkan Status ${noun} (Revert)`;
  const blocked = conflicts.length > 0;

  const backToOrigin = preview.toStatus === "scheduled";
  const effects = isReschedule
    ? [
        backToOrigin ? `Jadwal kembali ke jadwal asal: ${toSlotLabel}.` : `Jadwal kembali ke jadwal tersimpan terakhir: ${toSlotLabel} (sudah pernah dipindah 2x).`,
        backToOrigin ? "Jejak pemindahan dihapus; status sesi menjadi \"Scheduled\". Kredit tidak berubah." : "Jadwal asal tetap tercatat. Kredit tidak berubah.",
      ]
    : isPending
    ? [`Reschedule menggantung dibatalkan; status sesi kembali ke "${statusLabel(preview.toStatus)}" di jadwal asal.`, "Kredit tidak berubah."]
    : [`Status sesi kembali ke "${statusLabel(preview.toStatus)}".`];
  if (preview.creditChange > 0) effects.push(`+1 kredit dikembalikan ke ${preview.entry.packageName}.`);
  if (preview.quotaChange < 0) effects.push("Kuota cancel paket berkurang 1.");
  if (preview.clientRestore) effects.push(`Tahap client kembali ke "${statusLabel(preview.clientRestore.to)}".`);
  if (!isReschedule && !isPending && preview.creditChange === 0 && preview.quotaChange === 0 && !preview.clientRestore) effects.push("Tidak ada perubahan kredit atau kuota cancel.");

  const close = () => {
    setOpen(false);
    setReason("");
  };

  if (!open) {
    return (
      <div className="pt-4 border-t border-slate-200" data-testid="session-revert-section">
        <Button
          variant="outline"
          className="w-full border-violet-200 text-violet-800 hover:bg-violet-50 font-bold gap-2"
          onClick={() => setOpen(true)}
          data-testid="session-revert-button"
        >
          <Undo2 className="w-4 h-4" /> {actionLabel}
        </Button>
        <p className="text-[11px] text-slate-500 mt-1.5">Untuk koreksi salah klik. Hanya bisa 1x (satu langkah mundur); kredit yang sempat berubah dikembalikan dan tercatat di riwayat kredit.</p>
      </div>
    );
  }

  return (
    <div className="pt-4 border-t border-slate-200" data-testid="session-revert-section">
      <div className="p-4 sm:p-5 rounded-2xl bg-violet-50/70 border border-violet-200 space-y-3.5">
        <h4 className="font-extrabold text-sm text-violet-950 flex items-center gap-2">
          <Undo2 className="w-4 h-4 text-violet-600" /> {isReschedule ? "Batalkan Pemindahan Jadwal" : `Batalkan Status ${noun}`}
        </h4>

        <div className="space-y-1.5">
          <Label className="font-bold text-slate-700 text-xs">Alasan *</Label>
          <Textarea
            className="rounded-xl border-slate-200 bg-white text-xs min-h-[70px]"
            placeholder="e.g. Salah klik, sesi belum berlangsung..."
            value={reason}
            maxLength={300}
            onChange={(e) => setReason(e.target.value)}
            data-testid="session-revert-reason"
          />
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-violet-200 text-xs text-slate-800 space-y-1 leading-relaxed" data-testid="session-revert-effects">
          <p className="font-bold text-slate-900">Yang akan terjadi:</p>
          {effects.map((text) => (
            <p key={text}>• {text}</p>
          ))}
        </div>

        {blocked && (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-xs text-amber-950 flex gap-2" data-testid="session-revert-conflict">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              {conflicts.map((c) => (
                <p key={c}>{c}</p>
              ))}
              <p className="font-semibold">Slot ini sudah terisi. Pindahkan atau batalkan sesi lain terlebih dahulu.</p>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2.5 pt-1">
          <Button variant="outline" className="font-bold flex-1" onClick={close}>
            Kembali
          </Button>
          <Button
            className="bg-violet-600 hover:bg-violet-700 text-white font-bold flex-1"
            disabled={!reason.trim() || blocked}
            onClick={() => onConfirm(reason.trim())}
            data-testid="session-confirm-revert-button"
          >
            Konfirmasi Revert
          </Button>
        </div>
      </div>
    </div>
  );
}
