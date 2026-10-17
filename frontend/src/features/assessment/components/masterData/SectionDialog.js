import React from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Label } from "@/shared/ui/label";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { Button } from "@/shared/ui/button";
import { DocumentEmbed } from "@/shared/components/DocumentEmbed";
import { isValidDocumentUrl } from "@/domain/assessment";
import { SECTION_TEMPLATE_OPTIONS } from "@/domain/assessmentTemplate";
import { makeSectionDialog } from "@/features/assessment/components/masterData/assessmentConfig";
import { isApiMode } from "@/config/env";
import { formatFileSize } from "@/shared/lib/fileUpload";

export const MAX_SECTION_PDF_BYTES = 10 * 1024 * 1024;
const apiMode = isApiMode();

// Pratinjau PDF section: file yang BARU dipilih (dari memori, belum diunggah) atau file yang sudah tersimpan di server (diambil
// sebagai Blob dengan sesi staf). Mengembalikan { url, loading, error } dan melepas object URL saat berganti / ditutup.
function useSectionPdfPreview(secDialog, fetchDocument) {
  const [state, setState] = React.useState({ url: null, loading: false, error: false });
  const { open, pendingFile, existingFile, removeFile, editingSectionId } = secDialog;
  const fetchRef = React.useRef(fetchDocument); // identitas fungsi berubah tiap render store: jangan jadi dependensi efek
  fetchRef.current = fetchDocument;

  React.useEffect(() => {
    if (!apiMode || !open) {
      setState({ url: null, loading: false, error: false });
      return undefined;
    }
    let cancelled = false;
    let objectUrl = null;

    if (pendingFile) {
      objectUrl = URL.createObjectURL(pendingFile);
      setState({ url: objectUrl, loading: false, error: false });
    } else if (existingFile && !removeFile && editingSectionId && fetchRef.current) {
      setState({ url: null, loading: true, error: false });
      fetchRef.current(editingSectionId)
        .then((blob) => {
          if (cancelled) return;
          objectUrl = URL.createObjectURL(blob);
          setState({ url: objectUrl, loading: false, error: false });
        })
        .catch(() => {
          if (!cancelled) setState({ url: null, loading: false, error: true });
        });
    } else {
      setState({ url: null, loading: false, error: false });
    }

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [open, pendingFile, existingFile, removeFile, editingSectionId]);

  return state;
}

export function SectionDialog({ fetchDocument, saveSection, secDialog, setSecDialog }) {
  const pdfPreview = useSectionPdfPreview(secDialog, fetchDocument);
  const documentUrl = (secDialog.documentUrl || "").trim();
  const documentInvalid = documentUrl !== "" && !isValidDocumentUrl(documentUrl);
  const [fileError, setFileError] = React.useState("");

  const pickFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!(file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf"))) {
      setFileError("Dokumen harus berformat PDF.");
      return;
    }
    if (file.size > MAX_SECTION_PDF_BYTES) {
      setFileError("Ukuran PDF maksimal 10 MB.");
      return;
    }
    setFileError("");
    // Satu sumber saja: file menggantikan link
    setSecDialog((prev) => ({ ...prev, pendingFile: file, removeFile: false, documentUrl: "" }));
  };

  return (
    <Dialog open={secDialog.open} onOpenChange={(open) => setSecDialog((prev) => ({ ...prev, open }))}>
      <DialogContent className="max-w-2xl max-h-[calc(100dvh-2.5rem)] overflow-y-auto rounded-3xl p-6 sm:p-7 border-slate-200 shadow-xl" data-testid="section-dialog">
        <DialogHeader className="space-y-1.5">
          <DialogTitle className="text-xl font-black text-slate-900">
            {secDialog.editingSectionId ? "Edit Section" : "Tambah Section Baru"}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500 font-medium">
            Section mengelompokkan butir pertanyaan (mis. Pemrosesan Auditori, Kesepakatan Asesmen). Teks panduan dan dokumen tampil di atas soal-soal section ini.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700">Judul Section</Label>
            <Input
              placeholder="misal: Pemrosesan Auditori atau Kesepakatan Konsultasi dan Asesmen"
              value={secDialog.title}
              onChange={(e) => setSecDialog((prev) => ({ ...prev, title: e.target.value }))}
              className="border-slate-200 text-xs font-medium"
              data-testid="section-title-input"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700">Template Hasil</Label>
            <select
              value={secDialog.template || ""}
              onChange={(e) => setSecDialog((prev) => ({ ...prev, template: e.target.value }))}
              className="flex h-10 w-full rounded-md border border-slate-200 bg-background px-3 text-xs font-medium"
              data-testid="section-template-select"
            >
              <option value="">Tanpa template (form biasa)</option>
              {SECTION_TEMPLATE_OPTIONS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label} ({t.ageHint})
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-400">
              Hanya section ber-template yang dibuat menjadi tabel psikologi (skor mentah per section). Section tanpa template tampil sebagai pertanyaan–jawaban biasa.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700">
              Teks Panduan Section <span className="font-medium text-slate-400">(opsional, boleh pendek atau panjang)</span>
            </Label>
            <Textarea
              placeholder={"misal: Anakku ...\natau kunci penilaian: 5 = Hampir Selalu, 4 = Sering, ..."}
              value={secDialog.description}
              onChange={(e) => setSecDialog((prev) => ({ ...prev, description: e.target.value }))}
              className="rounded-xl border-slate-200 text-xs min-h-[110px] leading-relaxed font-medium"
              data-testid="section-description-input"
            />
            <p className="text-[11px] text-slate-400">Baris baru dipertahankan saat ditampilkan ke orang tua.</p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700">
              Link Dokumen Google Docs / Drive <span className="font-medium text-slate-400">(opsional)</span>
            </Label>
            <Input
              placeholder="https://docs.google.com/document/d/.../edit"
              value={secDialog.documentUrl}
              onChange={(e) => setSecDialog((prev) => ({ ...prev, documentUrl: e.target.value }))}
              className="border-slate-200 text-xs font-medium"
              data-testid="section-document-url-input"
            />
            {documentInvalid ? (
              <p className="text-[11px] font-semibold text-rose-600" data-testid="section-document-url-error">
                Link harus dari Google Docs (docs.google.com/document/...) atau file Google Drive (drive.google.com/file/...), atau PDF di aplikasi (/documents/nama-file.pdf).
              </p>
            ) : (
              <p className="text-[11px] text-slate-400">
                Dokumen tampil langsung di layar orang tua (mis. kesepakatan). Atur sharing dokumen ke <strong>"Siapa saja yang memiliki link: Viewer"</strong>, kalau tidak orang tua diminta masuk akun Google.
                <br />
                <strong>Tips tampilan HP:</strong> di Google Docs pilih <strong>File → Bagikan → Publikasikan ke web → Publikasikan</strong>, lalu tempel link <code>.../d/e/.../pub</code> itu di sini. Tampilannya otomatis menyesuaikan layar HP (link biasa <code>/edit</code> tampil seperti zoom).
              </p>
            )}
            {documentUrl && !documentInvalid && (
              <DocumentEmbed url={documentUrl} title={secDialog.title.trim() || "Pratinjau dokumen"} height="h-[320px]" testId="section-document-preview" />
            )}
          </div>

          {apiMode && (
            <div className="space-y-1.5" data-testid="section-pdf-block">
              <Label className="text-xs font-bold text-slate-700">
                File PDF <span className="font-medium text-slate-400">(opsional, maks 10 MB; menggantikan link di atas)</span>
              </Label>
              {secDialog.pendingFile ? (
                <div className="flex items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs" data-testid="section-pdf-pending">
                  <span className="font-bold text-emerald-900 break-all">{secDialog.pendingFile.name} ({formatFileSize(secDialog.pendingFile.size)}) — diunggah saat disimpan</span>
                  <Button type="button" variant="ghost" size="sm" className="text-rose-600" onClick={() => setSecDialog((prev) => ({ ...prev, pendingFile: null }))}>Batal</Button>
                </div>
              ) : secDialog.existingFile && !secDialog.removeFile ? (
                <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs" data-testid="section-pdf-existing">
                  <span className="font-bold text-slate-800 break-all">{secDialog.existingFile.name} ({formatFileSize(secDialog.existingFile.size)})</span>
                  <Button type="button" variant="ghost" size="sm" className="text-rose-600" onClick={() => setSecDialog((prev) => ({ ...prev, removeFile: true }))} data-testid="section-pdf-remove">Hapus file</Button>
                </div>
              ) : secDialog.removeFile ? (
                <p className="text-[11px] font-semibold text-amber-700" data-testid="section-pdf-removed">File PDF akan dihapus saat disimpan.</p>
              ) : null}
              <input type="file" accept="application/pdf,.pdf" onChange={pickFile} className="block w-full text-xs text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-sky-50 file:px-3 file:py-2 file:text-xs file:font-bold file:text-sky-700" data-testid="section-pdf-input" />
              {fileError && <p className="text-[11px] font-semibold text-rose-600" data-testid="section-pdf-error">{fileError}</p>}
              {pdfPreview.loading && <p className="text-[11px] font-semibold text-slate-500 animate-pulse" data-testid="section-pdf-preview-loading">Memuat pratinjau PDF…</p>}
              {pdfPreview.error && <p className="text-[11px] font-semibold text-rose-600" data-testid="section-pdf-preview-error">Pratinjau PDF tidak dapat dimuat. File tetap tersimpan di server.</p>}
              {pdfPreview.url && <DocumentEmbed url={pdfPreview.url} pdf title={secDialog.pendingFile?.name || secDialog.existingFile?.name || "Pratinjau PDF"} testId="section-pdf-preview" />}
              <p className="text-[11px] text-slate-400">PDF disimpan di server (privat) dan hanya tampil ke orang tua yang memegang kode kuesioner.</p>
            </div>
          )}
        </div>

        <DialogFooter className="mt-4 gap-2">
          <Button variant="outline" className="font-bold" onClick={() => setSecDialog(makeSectionDialog())}>
            Batal
          </Button>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs cursor-pointer"
            onClick={saveSection}
            data-testid="section-save-button"
          >
            Simpan Section
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
