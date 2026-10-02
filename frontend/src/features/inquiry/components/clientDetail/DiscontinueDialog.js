import React from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { XCircle } from "lucide-react";
import { Textarea } from "@/shared/ui/textarea";
import { Button } from "@/shared/ui/button";

export function DiscontinueDialog({ discontinueOpen, discontinueReason, handleOutcomeDiscontinue, setDiscontinueOpen, setDiscontinueReason }) {
  return (
    <Dialog open={discontinueOpen} onOpenChange={setDiscontinueOpen}>
        <DialogContent className="max-w-md rounded-2xl p-6 border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <XCircle className="w-4 h-4 text-rose-600" /> Konfirmasi Discontinue Client
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Tuliskan alasan mengapa client membatalkan atau tidak melanjutkan alur intake.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <Textarea
              className="rounded-xl border-slate-200 bg-slate-50 text-xs min-h-[90px]"
              placeholder="e.g. Keluarga pindah domisili, atau memutuskan terapi di kota lain..."
              value={discontinueReason}
              onChange={(e) => setDiscontinueReason(e.target.value)}
            />
          </div>
          <DialogFooter className="mt-4 gap-2">
            <Button variant="outline" className="" onClick={() => setDiscontinueOpen(false)}>
              Batal
            </Button>
            <Button
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
              onClick={handleOutcomeDiscontinue}
            >
              Simpan Discontinue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
  );
}
