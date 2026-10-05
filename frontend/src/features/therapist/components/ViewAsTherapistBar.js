import React from "react";
import { Eye } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";

// Mode simulasi untuk Master / role non-terapis yang memiliki akses modul terapis: pilih terapis yang ingin dilihat.
export function ViewAsTherapistBar({ acting }) {
  if (!acting.isViewAs) return null;
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 p-3.5 rounded-2xl bg-violet-50/70 border border-violet-200" data-testid="view-as-therapist-bar">
      <p className="flex items-center gap-2 text-xs font-bold text-violet-900">
        <Eye className="w-4 h-4 text-violet-600 shrink-0" /> Mode simulasi: melihat modul terapis sebagai
      </p>
      <div className="sm:w-72">
        <Select value={acting.therapistId || ""} onValueChange={acting.setViewAs}>
          <SelectTrigger className="border-violet-200 bg-white text-xs font-semibold min-h-10" data-testid="view-as-therapist-select" aria-label="Pilih terapis">
            <SelectValue placeholder="Pilih terapis..." />
          </SelectTrigger>
          <SelectContent className="rounded-xl border-slate-200 max-h-64">
            {acting.options.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
