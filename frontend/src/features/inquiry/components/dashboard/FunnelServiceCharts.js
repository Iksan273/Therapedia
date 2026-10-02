import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function FunnelServiceCharts({ conversionRate, funnelData, serviceDistributionData }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Pipeline Progression Funnel */}
        <Card className="rounded-2xl border border-slate-200/90 bg-white shadow-2xs lg:col-span-7">
          <CardHeader className="pb-2 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-slate-900">
                  Funnel Progresi Pipeline Inquiry
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Pergerakan client dari intake baru hingga resmi admitted
                </CardDescription>
              </div>
              <span className="text-xs font-bold text-sky-800 bg-sky-50 px-2.5 py-0.5 rounded-lg border border-sky-200">
                Konversi {conversionRate}%
              </span>
            </div>
          </CardHeader>
          <CardContent className="h-64 pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={funnelData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "#64748b" }} />
                <YAxis
                  dataKey="stage"
                  type="category"
                  tick={{ fontSize: 11, fontWeight: 600, fill: "#1e293b" }}
                  width={130}
                />
                <Tooltip
                  formatter={(val) => [`${val} Client`, "Jumlah"]}
                  contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }}
                />
                <Bar dataKey="count" radius={[0, 8, 8, 0]} maxBarSize={28}>
                  {funnelData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Clinical Service Distribution */}
        <Card className="rounded-2xl border border-slate-200/90 bg-white shadow-2xs lg:col-span-5 flex flex-col justify-between">
          <CardHeader className="pb-2 border-b border-slate-100">
            <CardTitle className="text-sm font-bold text-slate-900">
              Distribusi Layanan Klinis
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Pilihan layanan asesmen dan konsultasi yang diminati
            </CardDescription>
          </CardHeader>
          <CardContent className="h-64 pt-2">
            {serviceDistributionData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Tidak ada data layanan pada filter ini
              </div>
            ) : (
              <div className="h-full flex items-center justify-between">
                <div className="w-1/2 h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={serviceDistributionData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={75}
                        paddingAngle={4}
                      >
                        {serviceDistributionData.map((entry, index) => (
                          <Cell key={`slice-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(val, name, item) => [`${val} Client`, item.payload.fullName]}
                        contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-1/2 space-y-2 pr-2 text-xs">
                  {serviceDistributionData.map((s, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                        <span className="font-semibold text-slate-700 truncate">{s.name}</span>
                      </div>
                      <span className="font-bold font-mono text-slate-900">{s.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
  );
}
