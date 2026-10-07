import React, { useState } from "react";
import { toast } from "sonner";
import { ClipboardCheck, Copy, CalendarPlus, Link2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Button } from "@/shared/ui/button";
import { Switch } from "@/shared/ui/switch";
import { AssessmentServiceSelect } from "@/shared/components/AssessmentServiceSelect";
import { AddScheduleModal } from "@/features/schedule/components/calendar/AddScheduleModal";
import { useQuestionnaireCodeActions } from "@/features/inquiry";
import { useAssessments } from "@/stores/assessmentsStore";
import { useCredits } from "@/stores/creditsStore";
import { useAuth } from "@/stores/authStore";
import { canManageSchedule } from "@/domain/schedule";
import { isQuestionnaireCodeFilled } from "@/domain/client";
import { CODE_VALIDITY_OPTIONS, buildQuestionnaireLink } from "@/domain/assessment";
import { fmtCurrency, fmtDate } from "@/shared/lib/format";

// Re-assessment client aktif (revisi 7 Okt 2026): Admin Schedule menerbitkan kode kuesioner baru (sekaligus invoice assessment
// otomatis, sama seperti di Inquiry) dan menjadwalkan sesi asesmen TANPA memotong kredit (tipe sesi `assessment`).
// Status client tidak mundur: `advanceStatus` hanya maju, jadi client admitted tetap admitted.
export function ReassessmentCard({ client }) {
  const { categories } = useAssessments();
  const { getMasterPackages } = useCredits();
  const { hasPermission } = useAuth();
  const codeActions = useQuestionnaireCodeActions();
  const masterPackages = getMasterPackages();
  const canManage = canManageSchedule(hasPermission);

  const [categoryId, setCategoryId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [validity, setValidity] = useState("none");
  const [withInvoice, setWithInvoice] = useState(true); // false = kode gratis (tanpa invoice)
  const [scheduleOpen, setScheduleOpen] = useState(false);

  const codes = client.assessmentCodes || [];

  const copy = (text, label) => {
    navigator.clipboard?.writeText(text);
    toast.success(`${label} disalin ke clipboard!`);
  };

  const handleIssue = () => {
    const category = categories.find((c) => c.id === categoryId) || categories[0];
    const servicePackage = masterPackages.find((m) => m.id === serviceId);
    if (!category) {
      toast.error("Belum ada jenis asesmen. Tambahkan dulu di Master Asesmen.");
      return;
    }
    if (withInvoice && !servicePackage) {
      toast.error("Pilih layanan dulu: harganya dipakai untuk invoice assessment.");
      return;
    }
    const option = CODE_VALIDITY_OPTIONS.find((o) => o.value === validity);
    const item = codeActions.issueCode(client, category, { validityDays: option?.days ?? null, servicePackage, withInvoice });
    toast.success(`Kode re-assessment '${item.code}' (${category.categoryName}) dibuat. ${withInvoice ? `Invoice assessment ${fmtCurrency(servicePackage.price)} diterbitkan.` : "Kode gratis: tanpa invoice."}`, {
      action: { label: "Salin Link", onClick: () => copy(buildQuestionnaireLink(item.code, window.location.origin), "Link kuesioner") },
    });
  };

  return (
    <Card className="rounded-2xl border border-slate-200 bg-white shadow-2xs overflow-hidden" id="reassessment-card" data-testid="reassessment-card">
      <CardHeader className="p-5 sm:p-6 pb-4 border-b border-slate-100 bg-slate-50/50">
        <CardTitle className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
          <ClipboardCheck className="w-4 h-4 text-teal-600" /> Re-assessment
        </CardTitle>
        <CardDescription className="text-xs text-slate-500 mt-0.5">
          Terbitkan kode kuesioner baru (invoice assessment ikut terbit; matikan "Masuk invoice" untuk kode gratis) dan jadwalkan sesi asesmen tanpa memotong kredit sesi.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-5 sm:p-6 space-y-4">
        {canManage ? (
          <div className="flex flex-wrap items-center gap-2">
            <Select value={categoryId || categories[0]?.id || ""} onValueChange={setCategoryId}>
              <SelectTrigger className="w-64 text-xs border-slate-200 bg-slate-50 font-semibold" data-testid="reassessment-category-select">
                <SelectValue placeholder="Pilih jenis asesmen" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-200">
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.categoryName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 h-10 text-xs font-bold text-slate-700">
              <Switch checked={withInvoice} onCheckedChange={setWithInvoice} data-testid="reassessment-invoice-toggle" /> Masuk invoice
            </label>
            {withInvoice && <AssessmentServiceSelect packages={masterPackages} value={serviceId} onChange={setServiceId} testId="reassessment-service-select" />}
            <Select value={validity} onValueChange={setValidity}>
              <SelectTrigger className="w-44 text-xs border-slate-200 bg-slate-50 font-semibold" data-testid="reassessment-validity-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-200">
                {CODE_VALIDITY_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button className="bg-teal-600 hover:bg-teal-700 text-white font-bold gap-1.5 min-h-10 md:min-h-0" onClick={handleIssue} data-testid="reassessment-issue-code">
              <ClipboardCheck className="w-4 h-4" /> Terbitkan Kode Re-assessment
            </Button>
            <Button variant="outline" className="font-bold gap-1.5 border-sky-200 text-sky-700 hover:bg-sky-50 min-h-10 md:min-h-0" onClick={() => setScheduleOpen(true)} data-testid="reassessment-schedule-button">
              <CalendarPlus className="w-4 h-4" /> Jadwalkan Asesmen
            </Button>
          </div>
        ) : (
          <p className="text-xs text-slate-500">Hanya akun dengan akses jadwal yang dapat menerbitkan kode dan menjadwalkan asesmen.</p>
        )}

        {codes.length === 0 ? (
          <p className="text-xs text-slate-400 italic">Belum ada kode kuesioner untuk client ini.</p>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3" data-testid="reassessment-codes">
            {codes.map((item) => {
              const filled = isQuestionnaireCodeFilled(client, item);
              return (
                <li key={item.code} className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{item.name}</span>
                    <p className="font-mono font-black text-sm text-slate-900 mt-0.5">{item.code}{item.invoiceRequired === false && <span className="ml-2 align-middle text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md">Gratis</span>}</p>
                    {item.expiresAt && !filled && <p className="text-[11px] font-semibold text-slate-500 mt-0.5">Berlaku s.d. {fmtDate(item.expiresAt)}</p>}
                    <span className={`inline-block mt-1 text-[11px] font-bold px-1.5 py-0.5 rounded-md border ${filled ? "text-emerald-700 bg-emerald-50 border-emerald-200" : "text-amber-700 bg-amber-50 border-amber-200"}`} data-testid={`reassessment-code-status-${item.code}`}>
                      {filled ? "Sudah diisi" : "Belum diisi"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button aria-label="Salin Kode" size="icon" variant="ghost" className="text-slate-500 hover:text-sky-700" onClick={() => copy(item.code, `Kode ${item.name}`)} title="Salin Kode">
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                    {!filled && (
                      <Button aria-label="Salin Link" size="icon" variant="ghost" className="text-slate-500 hover:text-sky-700" onClick={() => copy(buildQuestionnaireLink(item.code, window.location.origin), `Link kuesioner ${item.name}`)} title="Salin link untuk dikirim ke ortu">
                        <Link2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>

      <AddScheduleModal
        open={scheduleOpen}
        onOpenChange={setScheduleOpen}
        defaults={{ clientId: client.id, lockClient: true, lockType: true, type: "assessment" }}
        defaultType="assessment"
      />
    </Card>
  );
}
