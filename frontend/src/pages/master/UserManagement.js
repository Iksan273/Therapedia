import React, { useState, useMemo } from "react";
import { toast } from "sonner";
import {
  UserCog,
  Plus,
  Users,
  Building2,
  Mail,
  ShieldCheck,
  Trash2,
  CheckCircle2,
  Search,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/context/AuthContext";
import { BRANCHES } from "@/lib/appUtils";
import { cn } from "@/lib/utils";

const ROLE_OPTIONS = [
  { value: "manager", label: "Branch Manager" },
  { value: "admin_inquiry", label: "Admin Inquiry & Intake" },
  { value: "admin_schedule", label: "Admin Schedule & Timetable" },
  { value: "finance", label: "Role Finance (Billing & Verification)" },
  { value: "therapist", label: "Clinical Therapist" },
];

export default function UserManagement() {
  const { staffUsers, addStaffUser, removeStaffUser } = useAuth();

  const [search, setSearch] = useState("");
  const [branchFilter, setBranchFilter] = useState("all");
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    role: "admin_inquiry",
    branchId: "branch-sby-timur",
  });

  const filteredStaff = (staffUsers || []).filter((u) => {
    if (branchFilter !== "all" && u.branchId !== branchFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.role.toLowerCase().includes(q);
    }
    return true;
  });

  // Staff Table Pagination
  const [staffPage, setStaffPage] = useState(1);
  const staffPageSize = 8;
  const totalStaffPages = Math.ceil(filteredStaff.length / staffPageSize) || 1;
  const paginatedStaff = useMemo(() => {
    const start = (staffPage - 1) * staffPageSize;
    return filteredStaff.slice(start, start + staffPageSize);
  }, [filteredStaff, staffPage, staffPageSize]);

  const handleAddSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      toast.error("Nama lengkap dan email staff wajib diisi.");
      return;
    }

    addStaffUser(form);
    toast.success(`Akun staff ${form.name} berhasil ditambahkan!`);
    setAddOpen(false);
    setForm({
      name: "",
      email: "",
      role: "admin_inquiry",
      branchId: "branch-sby-timur",
    });
  };

  const handleRemove = (id, name) => {
    if (window.confirm(`Hapus akun staff ${name}?`)) {
      removeStaffUser(id);
      toast.info(`Akun staff ${name} telah dihapus.`);
    }
  };

  return (
    <div className="space-y-6" data-testid="user-management-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-100/80 text-sky-800 text-xs font-semibold mb-2">
            <UserCog className="w-3.5 h-3.5 text-sky-600" />
            Master User & Staff Administration
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            User Management per Cabang
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Kelola penugasan akun staff, hak operasional, dan lokasi cabang untuk seluruh personel klinis Therapedia.
          </p>
        </div>

        <Button
          className="bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl gap-2 shadow-sm shadow-sky-600/20 text-xs h-10"
          onClick={() => setAddOpen(true)}
          data-testid="add-staff-button"
        >
          <Plus className="w-4 h-4" /> Tambah Staff Baru
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-4">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            className="pl-10 h-10 rounded-xl border-slate-200 bg-slate-50 focus:bg-white text-xs"
            placeholder="Cari berdasarkan nama staff, email, atau peran..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <Select value={branchFilter} onValueChange={setBranchFilter}>
            <SelectTrigger className="w-48 h-10 text-xs rounded-xl border-slate-200 bg-slate-50 font-semibold">
              <SelectValue placeholder="Semua Cabang" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-slate-200">
              <SelectItem value="all">🏢 Semua Cabang</SelectItem>
              {BRANCHES.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  📍 {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Staff Table */}
      <Card className="rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
        <CardContent className="p-0 overflow-x-auto">
          <Table className="min-w-[850px] w-full">
            <TableHeader>
              <TableRow className="bg-slate-50/70 hover:bg-slate-50/70 border-b border-slate-200">
                <TableHead className="font-bold text-slate-700 text-xs py-3.5 pl-6 min-w-[200px] whitespace-nowrap">Profil Staff</TableHead>
                <TableHead className="font-bold text-slate-700 text-xs min-w-[190px] whitespace-nowrap">Email Akun</TableHead>
                <TableHead className="font-bold text-slate-700 text-xs min-w-[170px] whitespace-nowrap">Penugasan Cabang</TableHead>
                <TableHead className="font-bold text-slate-700 text-xs min-w-[160px] whitespace-nowrap">Peran (Role)</TableHead>
                <TableHead className="font-bold text-slate-700 text-xs text-right pr-6 min-w-[90px] whitespace-nowrap">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedStaff.map((u) => {
                const br = BRANCHES.find((b) => b.id === u.branchId);
                const roleMeta = ROLE_OPTIONS.find((r) => r.value === u.role);
                return (
                  <TableRow key={u.id} className="border-b border-slate-100 hover:bg-sky-50/30 transition-colors">
                    <TableCell className="py-3.5 pl-6 min-w-[200px] whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-800 font-bold text-xs flex items-center justify-center shrink-0">
                          {u.name[0]}
                        </div>
                        <p className="font-bold text-sm text-slate-900 whitespace-nowrap">{u.name}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs font-mono text-slate-600 min-w-[190px] whitespace-nowrap">{u.email}</TableCell>
                    <TableCell className="text-xs min-w-[170px] whitespace-nowrap">
                      <span className="font-semibold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 inline-flex items-center gap-1.5 whitespace-nowrap">
                        📍 {br ? br.name : "Surabaya"}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs min-w-[160px] whitespace-nowrap">
                      <span className="font-bold text-sky-800 bg-sky-50 border border-sky-200 px-2.5 py-1 rounded-lg inline-flex items-center whitespace-nowrap">
                        {roleMeta ? roleMeta.label : u.role}
                      </span>
                    </TableCell>
                    <TableCell className="text-right pr-6 min-w-[90px] whitespace-nowrap">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                        onClick={() => handleRemove(u.id, u.name)}
                        title="Hapus Staff"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>

        {/* Pagination for Staff Table */}
        {filteredStaff.length > 0 && (
          <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 bg-slate-50/50">
            <span className="font-medium">
              Menampilkan {(staffPage - 1) * staffPageSize + 1} –{" "}
              {Math.min(staffPage * staffPageSize, filteredStaff.length)} dari {filteredStaff.length} staff
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                variant="outline"
                className="h-8 px-2.5 rounded-xl text-xs font-semibold border-slate-200 hover:bg-slate-100 cursor-pointer"
                disabled={staffPage <= 1}
                onClick={() => setStaffPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Prev
              </Button>
              <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 font-bold text-slate-800 text-xs shadow-2xs">
                {staffPage} / {totalStaffPages}
              </span>
              <Button
                size="sm"
                variant="outline"
                className="h-8 px-2.5 rounded-xl text-xs font-semibold border-slate-200 hover:bg-slate-100 cursor-pointer"
                disabled={staffPage >= totalStaffPages}
                onClick={() => setStaffPage((p) => Math.min(totalStaffPages, p + 1))}
              >
                Next <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Add Staff Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md rounded-2xl p-6 border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <UserCog className="w-5 h-5 text-sky-600" /> Tambah Akun Staff
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Daftarkan personil baru ke sistem Therapedia dengan penetapan role dan cabang operasional.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddSubmit} className="space-y-3.5 pt-2">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Nama Lengkap Staff *</Label>
              <Input
                className="rounded-xl border-slate-200 bg-slate-50 text-xs h-10"
                placeholder="e.g. Maya Sari, S.Psi"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Alamat Email *</Label>
              <Input
                type="email"
                className="rounded-xl border-slate-200 bg-slate-50 text-xs h-10"
                placeholder="maya.sari@therapedia.id"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Peran Akun (Role) *</Label>
              <Select value={form.role} onValueChange={(val) => setForm({ ...form, role: val })}>
                <SelectTrigger className="rounded-xl border-slate-200 bg-slate-50 text-xs h-10 font-semibold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200">
                  {ROLE_OPTIONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Penugasan Cabang *</Label>
              <Select value={form.branchId} onValueChange={(val) => setForm({ ...form, branchId: val })}>
                <SelectTrigger className="rounded-xl border-slate-200 bg-slate-50 text-xs h-10 font-semibold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200">
                  {BRANCHES.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      📍 {b.name} ({b.city})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="mt-4 gap-2">
              <Button type="button" variant="outline" className="rounded-xl border-slate-200 text-xs" onClick={() => setAddOpen(false)}>
                Batal
              </Button>
              <Button type="submit" className="bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl text-xs">
                Simpan Staff Baru
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
