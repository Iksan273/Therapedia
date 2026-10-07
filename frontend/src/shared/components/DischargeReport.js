import React from "react";
import { LogOut } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

// Laporan discharge (revisi 7 Okt 2026): total client discharged pada filter aktif dan pembagiannya per alasan.
// `stats` = hasil `dischargeStats` (domain/client.js). Periode memakai tanggal discharge, bukan tanggal intake.
export function DischargeReport({ stats }) {
  return (
    <Card className="rounded-2xl border border-slate-200/90 bg-white shadow-2xs" data-testid="discharge-report">
      <CardHeader className="pb-2 border-b border-slate-100">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <LogOut className="w-4 h-4 text-slate-600" /> Report Discharge per Alasan
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Client yang sudah discharged, dikelompokkan menurut alasan (periode = tanggal discharge)
            </CardDescription>
          </div>
          <span className="text-xs font-bold text-slate-800 bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200 whitespace-nowrap" data-testid="discharge-report-total">
            Total {stats.total}
          </span>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        {stats.total === 0 ? (
          <p className="py-8 text-center text-xs text-slate-400" data-testid="discharge-report-empty">Belum ada client discharged pada filter ini.</p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.rows} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "#64748b" }} />
                  <YAxis dataKey="label" type="category" tick={{ fontSize: 11, fontWeight: 600, fill: "#1e293b" }} width={140} />
                  <Tooltip formatter={(val) => [`${val} Client`, "Jumlah"]} contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
                  <Bar dataKey="count" fill="#64748b" radius={[0, 8, 8, 0]} maxBarSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <ul className="space-y-2 text-xs self-center" data-testid="discharge-report-list">
              {stats.rows.map((r) => (
                <li key={r.key} className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2" data-testid={`discharge-reason-${r.key}`}>
                  <span className="font-semibold text-slate-800">{r.label}</span>
                  <span className="tabular-nums text-slate-600">
                    <strong className="text-slate-900">{r.count}</strong> client • {r.percent}%
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
