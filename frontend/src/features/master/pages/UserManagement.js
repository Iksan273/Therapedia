import React, { useState, useMemo } from "react";
import { TablePagination, usePagination } from "@/shared/components/TablePagination";
import { useConfirm } from "@/shared/components/ConfirmDialog";
import { toast } from "sonner";
import { UserCog, Plus, KeyRound, UserX, UserCheck, Search } from "lucide-react";
import { Card, CardContent } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { useAuth } from "@/stores/authStore";
import { BRANCHES, activeBranches } from "@/domain/branch";
import { generateTempPassword, validateNewPassword, validateStaffBranch } from "@/domain/auth";

const ROLE_OPTIONS = [
  { value: "manager", label: "Branch Manager" },
  { value: "admin_inquiry", label: "Admin Inquiry & Intake" },
  { value: "admin_schedule", label: "Admin Schedule & Timetable" },
  { value: "finance", label: "Role Finance (Billing & Verification)" },
  { value: "therapist", label: "Clinical Therapist" },
];

export default function UserManagement() {
  const { confirm, confirmDialog } = useConfirm();
  const { staffUsers, addStaffUser, setStaffActive, resetStaffPassword, activeBranch, auth, rolesList } = useAuth();
  const isMaster = auth?.role === "master";
  const defaultBranch = isMaster ? (activeBranch || "all") : (auth?.branchId || activeBranch || "branch-sby-timur");

  const roleOptions = useMemo(() => {
    return (rolesList || []).map((r) => ({
      value: r.id,
      label: `${r.label} (${r.badge || r.id})`,
    }));
  }, [rolesList]);

  const [search, setSearch] = useState("");
  const [branchFilter, setBranchFilter] = useState(defaultBranch);
  const [addOpen, setAddOpen] = useState(false);
  const emptyForm = () => ({
    name: "",
    email: "",
    role: "admin_inquiry",
    branchId: "branch-sby-timur",
    title: "",
    specialty: "",
    bio: "",
    password: generateTempPassword(), // password sementara dari Master; wajib diganti saat login pertama
  });
  const [form, setForm] = useState(emptyForm);
  const [resetTarget, setResetTarget] = useState(null); // staf yang password-nya direset Master
  const [resetPw, setResetPw] = useState("");

  const filteredStaff = (staffUsers || []).filter((u) => {
    if (branchFilter !== "all" && u.branchId !== branchFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.role.toLowerCase().includes(q);
    }
    return true;
  });

  // Staff Table Pagination (kembali ke halaman 1 saat filter berubah)
  const staffPg = usePagination(filteredStaff, 8, `${branchFilter}|${search}`);

  const handleAddSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      toast.error("Nama lengkap dan email staff wajib diisi.");
      return;
    }

    // Semua akun non-master terikat tepat 1 cabang; hanya Master yang boleh semua cabang (tanpa cabang)
    const branchId = form.role === "master" ? null : form.branchId;
    const branchError = validateStaffBranch(form.role, branchId);
    if (branchError) {
      toast.error(branchError);
      return;
    }
    const pwError = validateNewPassword(form.password);
    if (pwError) {
      toast.error(`Password sementara: ${pwError}`);
      return;
    }

    addStaffUser({ ...form, branchId });
    toast.success(`Akun ${form.name} dibuat. Password sementara: ${form.password} (wajib diganti saat login pertama).`, { duration: 9000 });
    setAddOpen(false);
    setForm(emptyForm());
  };

  // Master mengatur ulang password staf (lupa password / bantuan): password sementara baru + wajib ganti
  const handleResetSubmit = (e) => {
    e.preventDefault();
    const pwError = validateNewPassword(resetPw);
    if (pwError) {
      toast.error(`Password sementara: ${pwError}`);
      return;
    }
    resetStaffPassword(resetTarget.id, resetPw);
    toast.success(`Password ${resetTarget.name} diatur ulang: ${resetPw} (wajib diganti saat login berikutnya).`, { duration: 9000 });
    setResetTarget(null);
  };

  // Staf yang berhenti dinonaktifkan (tidak dihapus): riwayat sesi dan data tetap utuh, akun tidak bisa login.
  const handleToggleActive = async (user) => {
    const active = user.isActive !== false;
    if (active) {
      const ok = await confirm({
        title: "Nonaktifkan akun staff?",
        description: `${user.name} tidak akan bisa login. Riwayat sesi dan data tetap tersimpan; akun bisa diaktifkan kembali.`,
        confirmLabel: "Nonaktifkan",
      });
      if (!ok) return;
    }
    setStaffActive(user.id, !active);
    toast.info(active ? `Akun ${user.name} dinonaktifkan.` : `Akun ${user.name} diaktifkan kembali.`);
  };

  return (
    <div className="space-y-6" data-testid="user-management-page">
      {confirmDialog}
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
          className="bg-sky-600 hover:bg-sky-700 text-white font-bold gap-2 shadow-sm shadow-sky-600/20"
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
            className="pl-10 border-slate-200 bg-slate-50 focus:bg-white text-xs"
            placeholder="Cari berdasarkan nama staff, email, atau peran..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          {isMaster ? (
            <Select value={branchFilter} onValueChange={setBranchFilter}>
              <SelectTrigger className="w-48 text-xs border-slate-200 bg-slate-50 font-semibold">
                <SelectValue placeholder="Semua Cabang" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-200">
                <SelectItem value="all">Semua Cabang</SelectItem>
                {BRANCHES.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800">
              <span>{BRANCHES.find((b) => b.id === branchFilter)?.name || "Cabang Terpilih"}</span>
            </div>
          )}
        </div>
      </div>

      {/* Staff Table */}
      <Card className="rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
        <CardContent className="p-0 overflow-x-auto">
          <Table stackOnMobile className="min-w-[850px] w-full">
            <TableHeader>
              <TableRow className="bg-slate-50/70 hover:bg-slate-50/70 border-b border-slate-200">
                <TableHead className="font-bold text-slate-700 text-xs py-3.5 pl-6 min-w-[200px] whitespace-nowrap">Profil Staff</TableHead>
                <TableHead className="font-bold text-slate-700 text-xs min-w-[190px] whitespace-nowrap">Email Akun</TableHead>
                <TableHead className="font-bold text-slate-700 text-xs min-w-[170px] whitespace-nowrap">Penugasan Cabang</TableHead>
                <TableHead className="font-bold text-slate-700 text-xs min-w-[160px] whitespace-nowrap">Peran (Role)</TableHead>
                <TableHead className="font-bold text-slate-700 text-xs text-right pr-6 min-w-[110px] whitespace-nowrap">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staffPg.pageItems.map((u) => {
                const br = BRANCHES.find((b) => b.id === u.branchId);
                const roleObj = (rolesList || []).find((r) => r.id === u.role);
                const roleLabel = roleObj ? roleObj.label : u.role;
                return (
                  <TableRow key={u.id} className="border-b border-slate-100 hover:bg-sky-50/30 transition-colors">
                    <TableCell data-nolabel className="py-3.5 pl-6 min-w-[200px] whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-800 font-bold text-xs flex items-center justify-center shrink-0">
                          {u.name[0]}
                        </div>
                        <div>
                          <p className="font-bold text-sm text-slate-900 whitespace-nowrap">{u.name}</p>
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            {u.isActive === false && <span className="text-[10px] font-bold text-slate-600 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded" data-testid={`staff-inactive-${u.id}`}>Nonaktif</span>}
                            {u.mustChangePassword && <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded" data-testid={`staff-must-change-${u.id}`}>Wajib ganti password</span>}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell data-label="Email Akun" className="text-xs font-mono text-slate-600 min-w-[190px] whitespace-nowrap">{u.email}</TableCell>
                    <TableCell data-label="Penugasan Cabang" className="text-xs min-w-[170px] whitespace-nowrap">
                      <span className="font-semibold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 inline-flex items-center gap-1.5 whitespace-nowrap">
                        {br ? br.name : u.role === "master" ? "Semua cabang" : "—"}
                      </span>
                    </TableCell>
                    <TableCell data-label="Peran (Role)" className="text-xs min-w-[160px] whitespace-nowrap">
                      <span className="font-bold text-sky-800 bg-sky-50 border border-sky-200 px-2.5 py-1 rounded-lg inline-flex items-center whitespace-nowrap">
                        {roleLabel}
                      </span>
                    </TableCell>
                    <TableCell data-nolabel className="text-right pr-6 min-w-[90px] whitespace-nowrap">
                      {isMaster && (
                        <Button aria-label="Reset password"
                          size="icon"
                          variant="ghost"
                          className="text-slate-400 hover:text-sky-700 hover:bg-sky-50 cursor-pointer"
                          onClick={() => {
                            setResetTarget(u);
                            setResetPw(generateTempPassword());
                          }}
                          title="Reset password (password sementara)"
                          data-testid={`reset-password-${u.id}`}
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      <Button aria-label={u.isActive === false ? "Aktifkan staff" : "Nonaktifkan staff"}
                        size="icon"
                        variant="ghost"
                        className={u.isActive === false ? "text-emerald-600 hover:bg-emerald-50 cursor-pointer" : "text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"}
                        onClick={() => handleToggleActive(u)}
                        title={u.isActive === false ? "Aktifkan kembali" : "Nonaktifkan (tidak dihapus)"}
                        data-testid={`toggle-active-${u.id}`}
                      >
                        {u.isActive === false ? <UserCheck className="w-3.5 h-3.5" /> : <UserX className="w-3.5 h-3.5" />}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>

        <TablePagination
          {...staffPg}
          onPageChange={staffPg.setPage}
          onPageSizeChange={staffPg.setPageSize}
          noun="staff"
        />
      </Card>

      {/* Reset Password Dialog (Master) */}
      <Dialog open={Boolean(resetTarget)} onOpenChange={(o) => !o && setResetTarget(null)}>
        <DialogContent className="max-w-md rounded-2xl p-6 border-slate-200" data-testid="reset-password-dialog">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-sky-600" /> Reset Password Staf
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Atur password sementara untuk {resetTarget?.name}. Staf wajib menggantinya saat login berikutnya.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleResetSubmit} className="space-y-3.5 pt-1">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Password sementara *</Label>
              <Input className="border-slate-200 bg-slate-50 text-xs font-mono" value={resetPw} onChange={(e) => setResetPw(e.target.value)} data-testid="reset-password-input" />
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setResetTarget(null)}>Batal</Button>
              <Button type="submit" className="bg-sky-600 hover:bg-sky-700 text-white font-bold" data-testid="reset-password-submit">Atur Ulang Password</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
                className="border-slate-200 bg-slate-50 text-xs"
                placeholder="e.g. Maya Sari, S.Psi"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Alamat Email *</Label>
              <Input
                type="email"
                className="border-slate-200 bg-slate-50 text-xs"
                placeholder="maya.sari@therapedia.id"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Peran Akun (Role) *</Label>
              <Select value={form.role} onValueChange={(val) => setForm({ ...form, role: val })}>
                <SelectTrigger className="border-slate-200 bg-slate-50 text-xs font-semibold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200">
                  {roleOptions.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Password Sementara *</Label>
              <Input
                className="border-slate-200 bg-slate-50 text-xs font-mono"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                data-testid="staff-temp-password"
              />
              <p className="text-[11px] text-slate-500">Berikan ke staf; wajib diganti saat login pertama. Lupa password: OTP email atau reset oleh Master.</p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Penugasan Cabang *</Label>
              {form.role === "master" && <p className="text-[11px] text-slate-500">Role Master berlaku untuk semua cabang. Role lain terikat tepat 1 cabang.</p>}
              <Select value={form.branchId} disabled={form.role === "master"} onValueChange={(val) => setForm({ ...form, branchId: val })}>
                <SelectTrigger className="border-slate-200 bg-slate-50 text-xs font-semibold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200">
                  {activeBranches().map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name} ({b.city})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {form.role === "therapist" && (
              <div className="p-3.5 bg-sky-50/70 rounded-xl border border-sky-200/80 space-y-3">
                <div className="text-xs font-bold text-sky-900 flex items-center gap-1.5">
                  Atribut Spesialisasi Medis / Klinis Terapis (Profil User)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-700">Gelar Klinis (Title)</Label>
                    <Input
                      className="border-slate-200 bg-white text-xs"
                      placeholder="e.g. S.Tr.Kes, S.Ft, A.Md.OT"
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-700">Spesialisasi (Specialty)</Label>
                    <Input
                      className="border-slate-200 bg-white text-xs"
                      placeholder="e.g. Sensory Integration / OT"
                      value={form.specialty}
                      onChange={(e) => setForm({ ...form, specialty: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            )}
            <DialogFooter className="mt-4 gap-2">
              <Button type="button" variant="outline" className="border-slate-200" onClick={() => setAddOpen(false)}>
                Batal
              </Button>
              <Button type="submit" className="bg-sky-600 hover:bg-sky-700 text-white font-bold">
                Simpan Staff Baru
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
