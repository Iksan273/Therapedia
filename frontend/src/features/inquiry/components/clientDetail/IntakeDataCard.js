import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Check, Pencil } from "lucide-react";
import { calcAge, fmtDate } from "@/shared/lib/format";

export function IntakeDataCard({ client, handleOpenEditIntake }) {
  return (
    <Card className="rounded-2xl border border-slate-200/90 bg-white shadow-2xs overflow-hidden">
          <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-xl bg-sky-100 text-sky-800 font-bold text-xs flex items-center justify-center">
                1
              </span>
              <div>
                <CardTitle className="text-sm font-bold text-slate-900">Data New Intake</CardTitle>
                <CardDescription className="text-xs text-slate-500">Profil anak, kontak orang tua, dan lokasi cabang</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 border-slate-200 hover:bg-sky-50 hover:text-sky-700 hover:border-sky-300 font-bold shadow-2xs"
                onClick={handleOpenEditIntake}
                data-testid="btn-edit-intake-step1"
              >
                <Pencil className="w-3.5 h-3.5 text-sky-600" /> Edit Data Intake
              </Button>
              <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                <Check className="w-3.5 h-3.5" /> Lengkap
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-[11px] font-bold uppercase text-slate-400">Nama Anak</span>
              <p className="font-bold text-slate-900 mt-0.5">{client.clientName}</p>
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase text-slate-400">Tanggal Lahir / Usia</span>
              <p className="font-semibold text-slate-800 mt-0.5">
                {fmtDate(client.dob)} {calcAge(client.dob) != null ? `(${calcAge(client.dob)} th)` : ""}
              </p>
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase text-slate-400">Nama Orang Tua</span>
              <p className="font-semibold text-slate-800 mt-0.5">{client.parentName || "—"}</p>
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase text-slate-400">Kontak WhatsApp & Email</span>
              <p className="font-semibold text-slate-800 mt-0.5">{client.parentContact || "—"}</p>
              <p className="text-[11px] text-slate-500">{client.parentEmail || "—"}</p>
            </div>
          </CardContent>
        </Card>
  );
}
