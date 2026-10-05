import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowRightLeft } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Label } from "@/shared/ui/label";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { Switch } from "@/shared/ui/switch";
import { Button } from "@/shared/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { fmtCurrency } from "@/shared/lib/format";
import { invoicePackageName, packageBaseName } from "@/domain/credit";
import { useCredits } from "@/stores/creditsStore";
import { usePackageConversionActions } from "@/features/finance/hooks/usePackageConversionActions";

// Konversi sisa sesi paket invoice ke paket lain. Otomatis = nilai sisa ÷ harga per sesi tujuan (dibulatkan ke bawah);
// manual = Finance mengisi jumlah sesi (tidak boleh melebihi nilai sisa, alasan wajib). Lebihan rupiah → saldo client.
export function ConvertPackageDialog({ invoice, open, onOpenChange }) {
  const { getMasterPackages, getCreditBalance } = useCredits();
  const { previewConversion, convertInvoicePackage, upcomingSchedules, sourceInfo } = usePackageConversionActions();
  const [targetId, setTargetId] = useState("");
  const [manual, setManual] = useState(false);
  const [sessions, setSessions] = useState("");
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (open) {
      setTargetId("");
      setManual(false);
      setSessions("");
      setReason("");
    }
  }, [open, invoice?.id]);

  const targets = useMemo(() => getMasterPackages().filter((p) => p.id !== invoice?.packageId), [getMasterPackages, invoice?.packageId]);
  const target = targets.find((p) => p.id === targetId) || null;
  const auto = target && invoice ? previewConversion({ invoice, target }) : null;
  const preview = target && invoice ? previewConversion({ invoice, target, sessions: manual ? sessions : null }) : null;
  const src = invoice ? sourceInfo(invoice) : null;
  const sourceLabel = src ? `${packageBaseName(src.name)} (sisa ${src.remainingCredit} sesi)` : "";
  const upcoming = invoice ? upcomingSchedules(invoice.clientId).length : 0;
  const balance = invoice ? getCreditBalance(invoice.clientId) : 0;

  const handleSubmit = (e) => {
    e.preventDefault();
    const res = convertInvoicePackage({ invoice, target, sessions: manual ? sessions : null, reason });
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(
      `Paket dikonversi: ${res.result.sessions} sesi ${target.name}.` +
        (res.result.leftover > 0 ? ` Lebihan ${fmtCurrency(res.result.leftover)} masuk saldo client.` : "") +
        (res.deletedSchedules ? ` ${res.deletedSchedules} jadwal mendatang dihapus.` : "")
    );
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[calc(100dvh-2.5rem)] overflow-y-auto rounded-2xl p-6 border-slate-200" data-testid="convert-package-dialog">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-sky-600" /> Konversi Paket
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            {invoice ? `${invoice.invoiceNumber} • ${invoice.clientName} • ${invoicePackageName(invoice)}` : ""}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3.5 pt-2">
          <div className="space-y-1">
            <Label className="text-xs font-bold text-slate-700">Paket tujuan *</Label>
            <Select value={targetId} onValueChange={setTargetId}>
              <SelectTrigger className="border-slate-200 bg-slate-50 text-xs font-semibold" data-testid="convert-target-select">
                <SelectValue placeholder="Pilih paket tujuan..." />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-200">
                {targets.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} ({p.credits} sesi) — {fmtCurrency(p.price)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {target && (
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 min-h-10">
              <Label htmlFor="convert-manual" className="text-xs font-bold text-slate-700 cursor-pointer">Atur jumlah sesi manual</Label>
              <Switch id="convert-manual" checked={manual} onCheckedChange={(v) => { setManual(v); setSessions(v && auto?.ok ? String(auto.sessions) : ""); }} data-testid="convert-manual-switch" />
            </div>
          )}

          {target && manual && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Jumlah sesi{auto?.ok ? ` (maks ${auto.maxSessions})` : ""} *</Label>
                <Input type="number" min={1} className="border-slate-200 bg-slate-50 text-xs font-bold" value={sessions} onChange={(e) => setSessions(e.target.value)} data-testid="convert-sessions-input" />
              </div>
            </div>
          )}

          {target && (
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Catatan Finance *</Label>
              <Textarea rows={2} className="border-slate-200 bg-slate-50 text-xs" value={reason} onChange={(e) => setReason(e.target.value)} placeholder={manual ? "Mis. kesepakatan dengan orang tua" : "Mis. ortu minta pindah ke paket Regular"} data-testid="convert-reason-input" />
              <p className="text-[11px] text-slate-500">Catatan ini tampil di log invoice.</p>
            </div>
          )}

          {preview && (
            <div className="rounded-xl border border-sky-200 bg-sky-50/60 p-3 text-xs space-y-1" data-testid="convert-preview">
              {preview.ok ? (
                <>
                  <p className="flex justify-between"><span className="text-slate-600">Nilai sisa paket asal</span><b className="tabular-nums">{fmtCurrency(preview.remainingValue)}</b></p>
                  <p className="flex justify-between"><span className="text-slate-600">Harga per sesi tujuan</span><b className="tabular-nums">{fmtCurrency(preview.targetUnit)}</b></p>
                  <p className="flex justify-between"><span className="text-slate-600">Sesi di paket baru</span><b className="tabular-nums">{preview.sessions} sesi</b></p>
                  <p className="flex justify-between gap-3" data-testid="convert-preview-package"><span className="text-slate-600 shrink-0">Paket client</span><b className="text-right">{sourceLabel} → {target.name} ({preview.sessions} sesi)</b></p>
                  <p className="flex justify-between"><span className="text-slate-600">Lebihan → saldo client</span><b className="tabular-nums">{fmtCurrency(preview.leftover)}</b></p>
                  {balance > 0 && <p className="text-[11px] text-slate-500">Saldo client saat ini {fmtCurrency(balance)}; dipotong dari invoice paket berikutnya.</p>}
                </>
              ) : (
                <p className="font-semibold text-rose-700">{preview.error}</p>
              )}
            </div>
          )}

          {target && (
            <ul className="text-[11px] text-slate-500 list-disc pl-4 space-y-0.5">
              <li>Kuota cancel paket lama ikut pindah ke paket baru.</li>
              <li>
                {upcoming > 0 ? `${upcoming} jadwal terapi mendatang client ini akan dihapus` : "Tidak ada jadwal terapi mendatang"}; admin schedule menjadwalkan ulang sesuai paket & terapis baru.
              </li>
            </ul>
          )}

          <DialogFooter className="mt-4 gap-2">
            <Button type="button" variant="outline" className="border-slate-200" onClick={() => onOpenChange(false)}>Batal</Button>
            <Button type="submit" disabled={!preview?.ok || !reason.trim()} className="bg-sky-600 hover:bg-sky-700 text-white font-bold" data-testid="convert-submit">
              Konversi Paket
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
