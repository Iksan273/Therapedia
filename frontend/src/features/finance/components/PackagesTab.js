import React from "react";
import { TabsContent } from "@/shared/ui/tabs";
import { Button } from "@/shared/ui/button";
import { Plus } from "lucide-react";
import { Card } from "@/shared/ui/card";
import { fmtCurrency } from "@/shared/lib/format";

export function PackagesTab({ masterPackages, setNewPkgOpen }) {
  return (
    <TabsContent value="packages" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">
              Master katalog paket kredit yang dapat dipilih saat intake, penjadwalan, atau renewal.
            </p>
            <Button size="sm"
              className="bg-sky-600 hover:bg-sky-700 text-white font-bold gap-1.5 shadow-xs"
              onClick={() => setNewPkgOpen(true)}
              data-testid="add-new-package-button"
            >
              <Plus className="w-3.5 h-3.5" /> Tambah Paket Baru
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {masterPackages.map((pkg) => (
              <Card key={pkg.id} className="rounded-2xl border border-slate-200/90 bg-white shadow-2xs p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">{pkg.name}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">{pkg.description || "Paket sesi terapi resmi"}</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-xl bg-sky-50 text-sky-700 border border-sky-200 text-xs font-bold shrink-0">
                    {pkg.credits} Sesi
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400">Harga Standar:</span>
                  <span className="text-base font-extrabold text-slate-900 tabular-nums">
                    {fmtCurrency(pkg.price)}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>
  );
}
