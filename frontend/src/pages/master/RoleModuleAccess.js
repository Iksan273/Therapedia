import React from "react";
import { toast } from "sonner";
import { ShieldCheck, Lock, Unlock, Check, Sparkles, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";

const MODULES = [
  { key: "revenue", label: "Dashboard Revenue", desc: "Akses omzet dan analitik finansial all-branch" },
  { key: "inquiry", label: "Inquiry Pipeline", desc: "Intake client baru & pipeline penerimaan" },
  { key: "schedule", label: "Weekly Schedule", desc: "Manajemen timetable mingguan dan booking slot" },
  { key: "active_clients", label: "Active Clients & Analytics", desc: "Roster client aktif & Birthday Hub" },
  { key: "finance", label: "Finance Hub", desc: "Verifikasi transfer, input tagihan, & renewal" },
  { key: "therapist", label: "Clinical Notes (Activity & HW)", desc: "Dokumentasi sesi klinis terapis" },
  { key: "user_management", label: "User Management", desc: "Kelola akun staff dan cabang" },
  { key: "rbac", label: "RBAC Module Permissions", desc: "Konfigurasi hak akses modul sistem" },
];

const ROLES = [
  { role: "manager", label: "Branch Manager", badge: "Manajemen Cabang" },
  { role: "admin_inquiry", label: "Admin Inquiry", badge: "Intake & Asesmen" },
  { role: "admin_schedule", label: "Admin Schedule", badge: "Timetable & Roster" },
  { role: "finance", label: "Role Finance", badge: "Billing & Verifikasi" },
  { role: "therapist", label: "Therapist", badge: "Praktisi Klinis" },
  { role: "client", label: "Parent Portal", badge: "Keluarga Client" },
];

export default function RoleModuleAccess() {
  const { rbacPermissions, updateRolePermission } = useAuth();

  const handleToggle = (role, moduleKey, cur) => {
    updateRolePermission(role, moduleKey, !cur);
    toast.success(`Hak akses '${moduleKey}' untuk role '${role}' diperbarui.`);
  };

  return (
    <div className="space-y-6" data-testid="rbac-module-access-page">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100/80 text-emerald-800 text-xs font-semibold mb-2">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          Role-Based Access Control (RBAC)
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
          RBAC Module Access Management
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Hanya Role Master yang memiliki wewenang mengaktifkan atau menonaktifkan visibilitas modul operasional bagi masing-masing role.
        </p>
      </div>

      <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold">Informasi Kebijakan Akses Master:</p>
          <p className="text-amber-800 mt-0.5 leading-relaxed">
            Role <strong>Master</strong> secara default memiliki akses tak terbatas ke seluruh modul sistem. Role staff lain (Manager, Inquiry, Schedule, Finance, Therapist) hanya dapat mengakses modul yang switch-nya diaktifkan pada matriks di bawah ini.
          </p>
        </div>
      </div>

      {/* Permissions Matrix Table */}
      <Card className="rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
        <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
          <CardTitle className="text-sm font-bold text-slate-900">Matriks Hak Akses Modul per Role</CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Perubahan berlaku instan dan tersimpan secara persisten pada sesi pengguna
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table className="min-w-[800px] w-full">
            <TableHeader>
              <TableRow className="bg-slate-50/70 hover:bg-slate-50/70 border-b border-slate-200">
                <TableHead className="font-bold text-slate-700 text-xs py-3.5 pl-6 min-w-[200px]">Modul Aplikasi</TableHead>
                {ROLES.map((r) => (
                  <TableHead key={r.role} className="font-bold text-slate-700 text-xs text-center min-w-[130px]">
                    <p className="font-bold text-slate-900">{r.label}</p>
                    <span className="text-[10px] text-slate-400 font-normal">{r.badge}</span>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {MODULES.map((mod) => (
                <TableRow key={mod.key} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                  <TableCell className="py-3.5 pl-6">
                    <p className="font-bold text-sm text-slate-900">{mod.label}</p>
                    <p className="text-[11px] text-slate-500">{mod.desc}</p>
                  </TableCell>
                  {ROLES.map((r) => {
                    const rolePerms = rbacPermissions?.[r.role] || {};
                    const isAllowed = Boolean(rolePerms[mod.key]);
                    return (
                      <TableCell key={r.role} className="text-center">
                        <div className="flex items-center justify-center">
                          <Switch
                            checked={isAllowed}
                            onCheckedChange={() => handleToggle(r.role, mod.key, isAllowed)}
                            data-testid={`rbac-toggle-${r.role}-${mod.key}`}
                          />
                        </div>
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
