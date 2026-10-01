import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function TrendCharts({ monthlyIntakeTrends }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 6-Month Intake History */}
        <Card className="rounded-2xl border border-slate-200/90 bg-white shadow-2xs lg:col-span-12">
          <CardHeader className="pb-2 border-b border-slate-100">
            <CardTitle className="text-sm font-bold text-slate-900">
              Tren Intake 6 Bulan Terakhir
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Volume pendaftaran client baru dan hasil konversi per bulan
            </CardDescription>
          </CardHeader>
          <CardContent className="h-64 pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyIntakeTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="intakeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0284c7" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#0284c7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="month" tick={{ fill: "#64748B", fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fill: "#64748B", fontSize: 11 }} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
                <Area
                  type="monotone"
                  dataKey="totalIntake"
                  name="Intake Baru"
                  stroke="#0284c7"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#intakeGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
  );
}
