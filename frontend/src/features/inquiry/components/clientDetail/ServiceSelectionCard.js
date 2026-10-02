import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { cn } from "@/shared/lib/utils";
import { Check } from "lucide-react";

export function ServiceSelectionCard({ getService, handleToggleService, selectedServices, services }) {
  return (
    <Card className="rounded-2xl border border-slate-200/90 bg-white shadow-2xs overflow-hidden">
          <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-xl bg-purple-100 text-purple-800 font-bold text-xs flex items-center justify-center">
                2
              </span>
              <div>
                <CardTitle className="text-sm font-bold text-slate-900">
                  Pilih Layanan Klinis ({selectedServices.length} Layanan Dipilih)
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Klien dapat memilih lebih dari satu layanan klinis secara bersamaan
                </CardDescription>
              </div>
            </div>

            {selectedServices.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap justify-end">
                {selectedServices.map((val) => {
                  const srv = getService(val);
                  return (
                    <span
                      key={val}
                      className="text-[11px] font-bold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-lg border border-purple-200"
                    >
                      ✓ {srv?.shortLabel || val}
                    </span>
                  );
                })}
              </div>
            )}
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <p className="text-[11px] text-slate-500 font-medium">
              Klik pada kartu untuk memilih atau membatalkan pilihan layanan (bisa memilih kombinasi multi-disiplin):
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {services.filter((s) => s.active !== false || selectedServices.includes(s.value)).map((srv) => {
                const isSelected = selectedServices.includes(srv.value);
                return (
                  <div role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); (() => handleToggleService(srv.value))(e); } }}
                    key={srv.value}
                    onClick={() => handleToggleService(srv.value)}
                    className={cn(
                      "p-3 rounded-xl border cursor-pointer transition-all flex items-start justify-between gap-2 select-none",
                      isSelected
                        ? "bg-purple-50/70 border-purple-300 ring-2 ring-purple-300/50 shadow-2xs"
                        : "bg-slate-50/80 border-slate-200 hover:bg-white hover:border-slate-300"
                    )}
                  >
                    <div className="flex items-start gap-2 min-w-0">
                      <div
                        className={cn(
                          "w-4 h-4 rounded mt-0.5 flex items-center justify-center border shrink-0 transition-colors",
                          isSelected ? "bg-purple-600 border-purple-600 text-white" : "border-slate-300 bg-white"
                        )}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-xs text-slate-900">{srv.label}</span>
                          {srv.category && (
                            <span className="text-[11px] font-bold px-1.5 py-0.2 rounded bg-slate-200/60 text-slate-600">
                              {srv.category}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                          {srv.description || "Layanan Klinis Intake"}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
  );
}
