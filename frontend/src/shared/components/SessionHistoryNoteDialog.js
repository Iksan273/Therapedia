import React, { useEffect, useState } from "react";
import { StickyNote } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Textarea } from "@/shared/ui/textarea";
import { Button } from "@/shared/ui/button";
import { fmtDate } from "@/shared/lib/format";

// Catatan riwayat per sesi (`schedule.historyNote`): dipakai di detail client, detail sesi kalender, dan log kredit Finance.
// Siapa pun yang punya akses halaman boleh menimpa isinya; simpan lewat updateSchedule(id, { historyNote, historyNoteBy }).
export function SessionHistoryNoteDialog({ session, open, onOpenChange, onSave }) {
  const [text, setText] = useState("");
  useEffect(() => {
    if (open) setText(session?.historyNote || "");
  }, [open, session?.id, session?.historyNote]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[calc(100dvh-2.5rem)] overflow-y-auto rounded-2xl p-6 border-slate-200" data-testid="session-history-note-dialog">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <StickyNote className="w-5 h-5 text-sky-600" /> Catatan Riwayat Sesi
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            {session ? `${fmtDate(session.date)} • ${session.startTime}–${session.endTime}. ` : ""}Catatan ini milik satu sesi dan bisa diubah siapa pun.
          </DialogDescription>
        </DialogHeader>
        <Textarea rows={4} className="border-slate-200 bg-slate-50 text-xs" value={text} onChange={(e) => setText(e.target.value)} placeholder="Tulis catatan untuk sesi ini..." data-testid="session-history-note-input" />
        <DialogFooter className="mt-2 gap-2">
          <Button type="button" variant="outline" className="border-slate-200" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button type="button" className="bg-sky-600 hover:bg-sky-700 text-white font-bold" onClick={() => onSave(text.trim())} data-testid="session-history-note-save">Simpan</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
