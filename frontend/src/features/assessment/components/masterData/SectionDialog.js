import React from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Label } from "@/shared/ui/label";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { Button } from "@/shared/ui/button";
import { DocumentEmbed } from "@/shared/components/DocumentEmbed";
import { isValidDocumentUrl } from "@/domain/assessment";
import { makeSectionDialog } from "@/features/assessment/components/masterData/assessmentConfig";

export function SectionDialog({ saveSection, secDialog, setSecDialog }) {
  const documentUrl = (secDialog.documentUrl || "").trim();
  const documentInvalid = documentUrl !== "" && !isValidDocumentUrl(documentUrl);

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
