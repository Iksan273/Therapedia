import React, { useRef, useState } from "react";
import { Receipt, Upload, FileText } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { fmtCurrency } from "@/shared/lib/format";
import { PROOF_ACCEPT } from "@/domain/credit";
import { formatFileSize, processProofFile } from "@/shared/lib/fileUpload";

// Langkah wajib sebelum kuesioner: ortu mengunggah bukti transfer invoice assessment (JPG/PNG/PDF maks 5 MB).
// `onSubmit(processedFile)` dipanggil setelah file valid; Finance memverifikasi lunas secara terpisah.
export function AssessmentProofCard({ invoice, onSubmit, onBack }) {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null); // hasil processProofFile
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const handlePick = async (e) => {
    const picked = e.target.files?.[0];
    if (!picked) return;
    setError("");
    setBusy(true);
    try {
      setFile(await processProofFile(picked));
    } catch (err) {
      setFile(null);
      setError(err.message);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!file) {
      setError("Bukti transfer wajib diunggah sebelum mengisi kuesioner.");
      return;
    }
    onSubmit(file);
  };

  return (
    <Card className="rounded-2xl border border-slate-200/90 shadow-sm bg-white overflow-hidden clinical-card" data-testid="assessment-proof-card">
      <CardHeader className="pb-4 border-b border-slate-100 bg-slate-50/50">
        <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Receipt className="w-5 h-5 text-[#007AFF]" /> Upload Bukti Transfer Assessment
        </CardTitle>
        <CardDescription className="text-xs text-slate-500">
          Sebelum mengisi kuesioner, unggah bukti transfer untuk invoice <strong>{invoice.invoiceNumber}</strong> sebesar{" "}
          <strong>{fmtCurrency(invoice.amount)}</strong>. Pembayaran akan dikonfirmasi oleh tim Finance.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4" data-testid="assessment-proof-form">
          <input ref={inputRef} type="file" accept={PROOF_ACCEPT} className="hidden" onChange={handlePick} data-testid="assessment-proof-input" />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="w-full min-h-[96px] rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 flex flex-col items-center justify-center gap-1.5 text-slate-600 cursor-pointer p-4 text-center"
            data-testid="assessment-proof-pick"
          >
            {file ? <FileText className="w-6 h-6 text-emerald-600" /> : <Upload className="w-6 h-6 text-slate-400" />}
            <span className="text-xs font-bold break-all">{file ? `${file.fileName} (${formatFileSize(file.fileSize)})` : busy ? "Memproses file..." : "Pilih file bukti transfer (JPG, PNG, atau PDF, maks 5 MB)"}</span>
          </button>
          {error && <p className="text-xs font-semibold text-rose-600" data-testid="assessment-proof-error">{error}</p>}
          <Button type="submit" size="lg" disabled={busy} className="w-full bg-[#007AFF] hover:bg-[#0062cc] text-white font-bold cursor-pointer" data-testid="assessment-proof-submit">
            Kirim Bukti & Lanjut ke Kuesioner
          </Button>
          <Button type="button" variant="ghost" onClick={onBack} className="w-full text-xs font-bold text-slate-500 cursor-pointer" data-testid="assessment-proof-back">
            Kembali
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
