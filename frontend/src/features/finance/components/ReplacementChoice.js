import React from "react";
import { Label } from "@/shared/ui/label";
import { cn } from "@/shared/lib/utils";

// Pilihan WAJIB (tanpa default) bila client punya invoice void (kredit dipertahankan) yang paketnya belum diambil alih:
// invoice baru ini menggantikan salah satunya (paket lama dipakai ulang, kredit tidak dobel) atau pembelian paket baru.
// Dipakai di Buat Tagihan dan Renewal. `value`: "" belum dipilih | id invoice void | "none".
export function ReplacementChoice({ options = [], value, onChange }) {
  if (options.length === 0) return null;
  const itemClass = (active) =>
    cn("w-full min-h-10 rounded-lg border p-2.5 text-left text-xs cursor-pointer", active ? "border-sky-500 bg-sky-50 text-sky-900" : "border-slate-200 bg-white text-slate-600");
  return (
    <div className="space-y-1.5 rounded-xl border border-amber-200 bg-amber-50/60 p-3" role="radiogroup" aria-label="Invoice pengganti" data-testid="replacement-choice">
      <Label className="text-xs font-bold text-amber-900">Client ini punya paket dari invoice yang di-void. Invoice baru ini: * (wajib dipilih)</Label>
      {options.map((o) => (
        <button key={o.id} type="button" role="radio" aria-checked={value === o.id} onClick={() => onChange(o.id)} data-testid={`replace-${o.id}`} className={itemClass(value === o.id)}>
          <span className="block font-bold">Menggantikan {o.invoiceNumber}</span>
          <span className="block text-[11px] font-normal">Pakai ulang paket {o.packageName} (sisa {o.remaining} sesi). Kredit tidak bertambah dua kali.</span>
        </button>
      ))}
      <button type="button" role="radio" aria-checked={value === "none"} onClick={() => onChange("none")} data-testid="replace-none" className={itemClass(value === "none")}>
        <span className="block font-bold">Bukan pengganti: pembelian paket baru</span>
        <span className="block text-[11px] font-normal">Setelah lunas, paket baru ditambahkan.</span>
      </button>
    </div>
  );
}
