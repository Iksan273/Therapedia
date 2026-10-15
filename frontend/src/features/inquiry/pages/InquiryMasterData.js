import React from "react";
import { Stethoscope, Grid2x2, Database, CalendarX2, LogOut } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { ServicesTab } from "@/features/inquiry/components/masterData/ServicesTab";
import { QuadrantsTab } from "@/features/inquiry/components/masterData/QuadrantsTab";
import { ReasonListTab } from "@/features/inquiry/components/masterData/ReasonListTab";
import { useMasterData } from "@/stores/masterDataStore";

// Master Data Inquiry (modul `inquiry_master_data`): kerangka tab. Isi tiap tab (daftar, dialog, aturan hapus) ada di
// components/masterData/{ServicesTab,QuadrantsTab,ReasonListTab}.
export default function InquiryMasterData() {
  const {
    services,
    quadrants,
    cancelReasons, addCancelReason, updateCancelReason, deleteCancelReason,
    dischargeReasons, addDischargeReason, updateDischargeReason, deleteDischargeReason,
  } = useMasterData();

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16" data-testid="inquiry-master-data-page">
      <div className="flex items-start gap-4 bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs">
        <div className="w-12 h-12 rounded-2xl bg-sky-600 text-white flex items-center justify-center shrink-0">
          <Database className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Master Data Inquiry</h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Kelola daftar layanan klinis, kuadran sensori, serta pilihan cepat alasan cancel / off, therapist off, dan discharge.
          </p>
        </div>
      </div>

      <Tabs defaultValue="services">
        <TabsList className="rounded-xl h-auto flex-wrap justify-start">
          <TabsTrigger value="services" className="gap-1.5 text-xs font-bold" data-testid="tab-master-services">
            <Stethoscope className="w-3.5 h-3.5" /> Layanan ({services.length})
          </TabsTrigger>
          <TabsTrigger value="quadrants" className="gap-1.5 text-xs font-bold" data-testid="tab-master-quadrants">
            <Grid2x2 className="w-3.5 h-3.5" /> Kuadran Sensori ({quadrants.length})
          </TabsTrigger>
          <TabsTrigger value="cancel-reasons" className="gap-1.5 text-xs font-bold" data-testid="tab-master-cancel-reasons">
            <CalendarX2 className="w-3.5 h-3.5" /> Alasan Cancel / Off ({cancelReasons.length})
          </TabsTrigger>
          <TabsTrigger value="discharge-reasons" className="gap-1.5 text-xs font-bold" data-testid="tab-master-discharge-reasons">
            <LogOut className="w-3.5 h-3.5" /> Alasan Discharge ({dischargeReasons.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="services" className="mt-4">
          <ServicesTab />
        </TabsContent>

        <TabsContent value="quadrants" className="mt-4">
          <QuadrantsTab />
        </TabsContent>

        <TabsContent value="cancel-reasons" className="mt-4">
          <ReasonListTab
            noun="alasan cancel / off"
            icon={CalendarX2}
            hint="Pilihan alasan Cancel / Off sesi."
            codeMode
            items={cancelReasons}
            onAdd={addCancelReason}
            onUpdate={updateCancelReason}
            onDelete={deleteCancelReason}
            flag={{
              key: "therapistOff",
              label: "Therapist Off",
              help: "Centang untuk alasan karena terapis berhalangan (bukan client). Sesi yang dibatalkan dengan kode ini tetap dihitung di Cancellation Rate keseluruhan dan dipisahkan sebagai Therapist Off Rate di Schedule Dashboard.",
            }}
            testId="cancel-reason"
          />
        </TabsContent>

        <TabsContent value="discharge-reasons" className="mt-4">
          <ReasonListTab
            noun="alasan discharge"
            icon={LogOut}
            hint="Pilihan cepat saat men-discharge client. User juga bisa memilih “Lainnya” dan mengetik alasan sendiri; alasan disimpan sebagai teks, tanpa relasi ke daftar ini."
            items={dischargeReasons}
            onAdd={addDischargeReason}
            onUpdate={updateDischargeReason}
            onDelete={deleteDischargeReason}
            testId="discharge-reason"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
