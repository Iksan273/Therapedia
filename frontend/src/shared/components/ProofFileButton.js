import React, { useRef, useState } from "react";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { PROOF_ACCEPT } from "@/domain/credit";
import { processProofFile } from "@/shared/lib/fileUpload";

// Tombol pilih file bukti (JPG/PNG/PDF maks 5 MB). File divalidasi/dikompres lalu diteruskan ke `onFile(processed)`;
// pesan error validasi ditampilkan sebagai toast.
export function ProofFileButton({ label = "Upload Bukti", onFile, testId, className, variant = "outline", size = "sm" }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);

  const handlePick = async (e) => {
    const picked = e.target.files?.[0];
    if (!picked) return;
    setBusy(true);
    try {
      onFile(await processProofFile(picked));
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <>
      <input ref={inputRef} type="file" accept={PROOF_ACCEPT} className="hidden" onChange={handlePick} data-testid={testId ? `${testId}-input` : undefined} />
      <Button type="button" size={size} variant={variant} disabled={busy} className={className} onClick={() => inputRef.current?.click()} data-testid={testId}>
        <Upload className="w-3.5 h-3.5" /> {busy ? "Memproses..." : label}
      </Button>
    </>
  );
}
