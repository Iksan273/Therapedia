import React, { useState, useEffect } from "react";
import {
  Eye,
  Download,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RefreshCw,
  FileText,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  X,
  FileCheck2,
  Calendar,
  Building2,
  CreditCard
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fmtCurrency, fmtDate } from "@/lib/appUtils";
import { formatFileSize, getProofFileType } from "@/lib/fileUploadUtils";

export function PaymentProofViewerModal({
  isOpen,
  onClose,
  invoice,
  onApprove,
  onReject,
  isFinanceView = false,
}) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  // Reset transform whenever modal opens or invoice changes
  useEffect(() => {
    if (isOpen) {
      setZoom(1);
      setRotation(0);
    }
  }, [isOpen, invoice?.id]);

  if (!invoice) return null;

  const proofUrl = invoice.proofOfPaymentUrl || invoice.proofUrl;
  const fileName = invoice.proofFileName || (invoice.proofFileType?.includes("pdf") ? "bukti-transfer.pdf" : "bukti-transfer.jpg");
  const fileType = invoice.proofFileType || "";
  const fileSize = invoice.proofFileSize;
  const uploadedAt = invoice.proofUploadedAt || invoice.paidAt || invoice.createdAt;
  const isPaid = invoice.status === "paid";

  const detectedType = getProofFileType(proofUrl, fileType, fileName);
  const isPdf = detectedType === "pdf";

  const handleZoomIn = () => setZoom((z) => Math.min(3, +(z + 0.25).toFixed(2)));
  const handleZoomOut = () => setZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2)));
  const handleRotate = () => setRotation((r) => (r + 90) % 360);
  const handleReset = () => {
    setZoom(1);
    setRotation(0);
  };

  const handleDownload = () => {
    if (!proofUrl) return;
    try {
      const link = document.createElement("a");
      link.href = proofUrl;
      link.download = fileName || `bukti-${invoice.invoiceNumber || "transfer"}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      window.open(proofUrl, "_blank");
    }
  };

  const handleOpenNewTab = () => {
    if (!proofUrl) return;
    window.open(proofUrl, "_blank");
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl sm:max-w-4xl max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl border-slate-200">
        {/* Modal Header */}
        <DialogHeader className="px-6 py-4 border-b border-slate-100 bg-slate-50/80 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pr-6">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Eye className="w-5 h-5 text-sky-600" /> Pratinjau Bukti Transfer
                </DialogTitle>
                <Badge
                  variant="outline"
                  className={
                    isPdf
                      ? "bg-rose-50 text-rose-700 border-rose-200 text-[11px] font-semibold flex items-center gap-1"
                      : "bg-sky-50 text-sky-700 border-sky-200 text-[11px] font-semibold flex items-center gap-1"
                  }
                >
                  {isPdf ? <FileText className="w-3 h-3" /> : <ImageIcon className="w-3 h-3" />}
                  {isPdf ? "Dokumen PDF" : "Foto / Gambar"}
                </Badge>
                {isPaid ? (
                  <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-bold">
                    LUNAS TERVERIFIKASI
                  </Badge>
                ) : (
                  <Badge className="bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-bold">
                    MENUNGGU VERIFIKASI
                  </Badge>
                )}
              </div>
              <DialogDescription className="text-xs text-slate-500">
                {invoice.invoiceNumber} • {invoice.clientName} • {invoice.packageName} • {fmtCurrency(invoice.amount)}
              </DialogDescription>
            </div>

            {/* Header Action Buttons */}
            {proofUrl && (
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs font-semibold gap-1.5 rounded-xl border-slate-200 hover:bg-slate-100 text-slate-700 cursor-pointer"
                  onClick={handleOpenNewTab}
                  title="Buka file asli di tab baru"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Tab Baru</span>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs font-semibold gap-1.5 rounded-xl border-slate-200 hover:bg-slate-100 text-slate-700 cursor-pointer"
                  onClick={handleDownload}
                  title="Unduh file bukti transfer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Unduh</span>
                </Button>
              </div>
            )}
          </div>
        </DialogHeader>

        {/* Invoice Metadata Strip */}
        <div className="px-6 py-2.5 bg-slate-100/70 border-b border-slate-200/80 text-xs text-slate-600 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 shrink-0">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="flex items-center gap-1.5 font-medium">
              <CreditCard className="w-3.5 h-3.5 text-slate-400" />
              <strong className="text-slate-800">Nominal:</strong> {fmtCurrency(invoice.amount)}
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <strong className="text-slate-800">Waktu Upload:</strong> {fmtDate(uploadedAt)}
            </span>
            {fileName && (
              <span className="flex items-center gap-1.5 text-slate-500 font-mono text-[11px] truncate max-w-xs" title={fileName}>
                📎 {fileName} {fileSize ? `(${formatFileSize(fileSize)})` : ""}
              </span>
            )}
          </div>
        </div>

        {/* Modal Main Content (Image Viewer or PDF Viewer) */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 bg-slate-900/5 min-h-[360px] max-h-[62vh] flex flex-col items-center justify-center relative">
          {!proofUrl ? (
            <div className="text-center py-12 text-slate-400 space-y-2">
              <AlertCircle className="w-12 h-12 mx-auto text-slate-300" />
              <p className="text-sm font-semibold">Belum Ada File Bukti Pembayaran</p>
              <p className="text-xs text-slate-400">Orang tua client belum mengunggah foto slip atau dokumen PDF transfer.</p>
            </div>
          ) : isPdf ? (
            /* PDF Document Viewer */
            <div className="w-full h-full flex flex-col items-center space-y-3">
              <div className="w-full bg-white rounded-xl border border-slate-200 p-3 shadow-xs flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800 truncate max-w-md">{fileName || "Dokumen Bukti Transfer.pdf"}</p>
                    <p className="text-[11px] text-slate-500">
                      Format: Portable Document Format (PDF) • {fileSize ? formatFileSize(fileSize) : "Terverifikasi"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="default"
                    className="h-8 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-lg gap-1.5"
                    onClick={handleOpenNewTab}
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Buka PDF Penuh
                  </Button>
                </div>
              </div>

              {/* Embedded PDF iframe */}
              <div className="w-full flex-1 min-h-[380px] bg-slate-800 rounded-xl overflow-hidden shadow-inner border border-slate-300 flex items-center justify-center">
                <iframe
                  src={proofUrl}
                  title="Pratinjau Dokumen PDF"
                  className="w-full h-full min-h-[420px] rounded-xl border-0"
                />
              </div>
            </div>
          ) : (
            /* Image Viewer with Zoom & Rotate Controls */
            <div className="w-full h-full flex flex-col items-center justify-center space-y-3">
              {/* Zoom & Rotate Controls Toolbar */}
              <div className="flex items-center gap-1.5 bg-white/90 backdrop-blur-xs px-3 py-1.5 rounded-full border border-slate-200 shadow-sm z-10">
                <Button
                  size="icon"
                  variant="ghost"
                  className="w-7 h-7 rounded-full text-slate-600 hover:text-slate-900"
                  onClick={handleZoomOut}
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </Button>
                <span className="text-[11px] font-mono font-bold text-slate-700 px-2 min-w-[48px] text-center">
                  {Math.round(zoom * 100)}%
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="w-7 h-7 rounded-full text-slate-600 hover:text-slate-900"
                  onClick={handleZoomIn}
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </Button>
                <div className="w-px h-4 bg-slate-200 mx-1" />
                <Button
                  size="icon"
                  variant="ghost"
                  className="w-7 h-7 rounded-full text-slate-600 hover:text-slate-900"
                  onClick={handleRotate}
                  title="Putar 90 Derajat"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="w-7 h-7 rounded-full text-slate-600 hover:text-slate-900"
                  onClick={handleReset}
                  title="Reset Tampilan"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </Button>
              </div>

              {/* Image Frame */}
              <div className="w-full flex-1 flex items-center justify-center overflow-auto p-2">
                <div
                  className="transition-transform duration-200 ease-out origin-center inline-block max-w-full"
                  style={{
                    transform: `scale(${zoom}) rotate(${rotation}deg)`,
                  }}
                >
                  <img
                    src={proofUrl}
                    alt={`Bukti Transfer ${invoice.invoiceNumber}`}
                    className="max-h-[460px] max-w-full h-auto object-contain rounded-xl shadow-md border border-slate-200 bg-white"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <DialogFooter className="px-6 py-3.5 border-t border-slate-100 bg-white flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 font-medium">
            {isPaid ? (
              <span className="text-emerald-700 font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Pembayaran telah terverifikasi lunas
              </span>
            ) : isFinanceView ? (
              <span className="text-amber-700 font-semibold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                Periksa nominal dan rekening pengirim sebelum menyetujui
              </span>
            ) : (
              <span>Tim Finance akan memverifikasi slip pembayaran ini</span>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl text-xs font-semibold h-9 px-4"
              onClick={onClose}
            >
              Tutup
            </Button>

            {/* Quick Action for Finance in Pending status */}
            {isFinanceView && !isPaid && proofUrl && (
              <>
                {onReject && (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9 px-4 text-xs font-bold text-rose-600 hover:bg-rose-50 border-rose-200 rounded-xl"
                    onClick={() => {
                      onReject(invoice);
                      onClose();
                    }}
                  >
                    Tolak Bukti
                  </Button>
                )}
                {onApprove && (
                  <Button
                    type="button"
                    className="h-9 px-4 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm shadow-emerald-600/20"
                    onClick={() => {
                      onApprove(invoice);
                      onClose();
                    }}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                    Setujui & Verifikasi Lunas
                  </Button>
                )}
              </>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
