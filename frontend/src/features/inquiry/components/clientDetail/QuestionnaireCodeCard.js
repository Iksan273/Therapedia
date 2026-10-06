import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Button } from "@/shared/ui/button";
import { Copy, Link2, Plus, Trash2 } from "lucide-react";
import { isQuestionnaireCodeFilled } from "@/domain/client";
import { CODE_VALIDITY_OPTIONS, buildQuestionnaireLink, isQuestionnaireCodeExpired } from "@/domain/assessment";
import { fmtDate } from "@/shared/lib/format";
import { Link } from "react-router-dom";
import { AssessmentServiceSelect } from "@/shared/components/AssessmentServiceSelect";
import { IfCanDelete } from "@/shared/components/DeleteControls";

export function QuestionnaireCodeCard({ categories, client, copyToClipboard, handleGenerateQuestionnaireCode, handleDeleteQuestionnaireCode, newQuestionnaireCategory, setNewQuestionnaireCategory, newQuestionnaireValidity = "none", setNewQuestionnaireValidity, masterPackages = [], newQuestionnaireService = "", setNewQuestionnaireService }) {
  return (
    <Card className="rounded-2xl border border-slate-200/90 bg-white shadow-2xs overflow-hidden">
          <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-xl bg-blue-100 text-blue-800 font-bold text-xs flex items-center justify-center">
                3
              </span>
              <div>
                <CardTitle className="text-sm font-bold text-slate-900">Questionnaire Code Generator</CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Generate lebih dari 1 kode kuesioner unik (misal Asesmen Utama + School Companion Profile). Pilih layanan: harganya jadi nominal invoice assessment yang otomatis terbit
                </CardDescription>
              </div>
            </div>
            <span className="text-xs font-bold text-slate-600">
              Total {(client.assessmentCodes || []).length} Kode Terbit
            </span>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Select value={newQuestionnaireCategory} onValueChange={setNewQuestionnaireCategory}>
                <SelectTrigger className="w-72 text-xs border-slate-200 bg-slate-50 font-semibold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200">
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.categoryName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <AssessmentServiceSelect packages={masterPackages} value={newQuestionnaireService} onChange={setNewQuestionnaireService} testId="questionnaire-service-select" />
              <Select value={newQuestionnaireValidity} onValueChange={setNewQuestionnaireValidity}>
                <SelectTrigger className="w-44 text-xs border-slate-200 bg-slate-50 font-semibold" data-testid="questionnaire-validity-select">
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
              <Button
                onClick={handleGenerateQuestionnaireCode}
                className="bg-sky-600 hover:bg-sky-700 text-white font-bold gap-1.5 shadow-xs"
              >
                <Plus className="w-4 h-4" /> Generate Kode Kuesioner
              </Button>
            </div>

            {/* List of Generated Codes */}
            {(client.assessmentCodes || []).length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {client.assessmentCodes.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2"
                  >
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        {item.name}
                      </span>
                      <p className="font-mono font-black text-sm text-slate-900 mt-0.5">{item.code}</p>
                      {!isQuestionnaireCodeFilled(client, item) && item.expiresAt && (
                        <p className={`text-[11px] font-semibold mt-0.5 ${isQuestionnaireCodeExpired(item) ? "text-rose-600" : "text-slate-500"}`} data-testid={`code-expiry-${item.code}`}>
                          {isQuestionnaireCodeExpired(item) ? "Kedaluwarsa" : "Berlaku s.d."} {fmtDate(item.expiresAt)}
                        </p>
                      )}
                      {!isQuestionnaireCodeFilled(client, item) && (
                        <p className="mt-1 max-w-[260px] truncate font-mono text-[11px] text-sky-700" title={buildQuestionnaireLink(item.code, window.location.origin)} data-testid={`code-link-${item.code}`}>
                          {buildQuestionnaireLink(item.code, window.location.origin)}
                        </p>
                      )}
                      {isQuestionnaireCodeFilled(client, item) ? (
                        <span className="inline-block mt-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md" data-testid={`code-status-${item.code}`}>
                          Sudah diisi
                        </span>
                      ) : (
                        <span className="inline-block mt-1 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-md" data-testid={`code-status-${item.code}`}>
                          Belum diisi
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button aria-label="Salin Kode"
                        size="icon"
                        variant="ghost"
                        className="text-slate-500 hover:text-sky-700"
                        onClick={() => copyToClipboard(item.code, `Kode ${item.name}`)}
                        title="Salin Kode"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </Button>
                      {!isQuestionnaireCodeFilled(client, item) && (
                        <Button aria-label="Salin Link"
                          size="icon"
                          variant="ghost"
                          className="text-slate-500 hover:text-sky-700"
                          onClick={() => copyToClipboard(buildQuestionnaireLink(item.code, window.location.origin), `Link kuesioner ${item.name}`)}
                          title="Salin link untuk dikirim ke ortu"
                          data-testid={`copy-link-${item.code}`}
                        >
                          <Link2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      <Link
                        to={`/assessment?code=${encodeURIComponent(item.code)}`}
                        className="inline-flex items-center justify-center h-8 px-2.5 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-sky-700 hover:bg-sky-50"
                      >
                        Buka Form
                      </Link>
                      {!isQuestionnaireCodeFilled(client, item) && (
                        <IfCanDelete module="inquiry_pipeline">
                        <Button aria-label="Hapus Kode"
                          size="icon"
                          variant="ghost"
                          className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                          onClick={() => handleDeleteQuestionnaireCode(item)}
                          title="Hapus kode (belum diisi)"
                          data-testid={`delete-code-${item.code}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                        </IfCanDelete>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
  );
}
