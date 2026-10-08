import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Link } from "react-router-dom";
import { Eye } from "lucide-react";
import { listQuestionnaireResults } from "@/domain/assessment";
import { fmtDate } from "@/shared/lib/format";

export function ParentAnswerCard({ client }) {
  const filled = listQuestionnaireResults(client).filter((q) => q.filled);
  return (
    <Card className="rounded-2xl border border-slate-200/90 bg-white shadow-2xs overflow-hidden">
          <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-xl bg-teal-100 text-teal-800 font-bold text-xs flex items-center justify-center">
                5
              </span>
              <div>
                <CardTitle className="text-sm font-bold text-slate-900">Parent Assessment Answer</CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Hasil kuesioner ortu & sekolah dalam bentuk format Tabel Psikologi Klinis & Pratinjau PDF
                </CardDescription>
              </div>
            </div>
            <Link
              to={`/admin-inquiry/parent-assessment/${client.id}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-100 transition-colors shadow-2xs"
            >
              <Eye className="w-3.5 h-3.5" /> Buka Laporan Tabel Psikologi
            </Link>
          </CardHeader>
          <CardContent className="p-4 text-xs text-slate-600">
            {filled.length > 0 ? (
              <div className="space-y-2">
                <p className="font-semibold text-slate-800">Tersedia {filled.length} kuesioner terisi. Klik salah satu untuk melihat hasilnya:</p>
                <div className="flex flex-wrap gap-2">
                  {filled.map((q) => (
                    <Link
                      key={q.key}
                      to={`/admin-inquiry/parent-assessment/${client.id}?kode=${encodeURIComponent(q.key)}`}
                      className="px-2.5 py-1.5 rounded-lg bg-teal-50 border border-teal-200 font-bold text-teal-800 text-[11px] hover:bg-teal-100 transition-colors"
                      data-testid={`answer-link-${q.key}`}
                    >
                      ✓ {q.categoryName}{q.code ? ` • ${q.code}` : ""} ({q.entry?.answers?.length || 0} butir{q.submittedAt ? `, ${fmtDate(q.submittedAt)}` : ""})
                    </Link>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-slate-400 italic">Orang tua belum mengisi kuesioner asesmen.</p>
            )}
          </CardContent>
        </Card>
  );
}
