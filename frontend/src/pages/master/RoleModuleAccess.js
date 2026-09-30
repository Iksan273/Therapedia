import React, { useState } from "react";
import { toast } from "sonner";
import {
  ShieldCheck,
  Plus,
  Pencil,
  Trash2,
  AlertCircle,
  Check,
  Search,
  SlidersHorizontal,
  Layers,
  Lock,
  ShieldAlert,
  UserCheck,
  CheckCircle2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth, ACCESS_MODULES } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

export default function RoleModuleAccess() {
  const { rolesList, addRole, updateRole, deleteRole, rbacPermissions, updateRolePermission } = useAuth();
  const [activeTab, setActiveTab] = useState("matrix"); // 'matrix' | 'roles'
  const [searchRole, setSearchRole] = useState("");

  // Dialog State
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);

  // Add Form state
  const [addForm, setAddForm] = useState({
    id: "",
    label: "",
    badge: "",
    description: "",
    initialPermissions: ACCESS_MODULES.reduce((acc, m) => {
      acc[m.key] = true;
      return acc;
    }, {}),
  });

  // Edit Form state
  const [editForm, setEditForm] = useState({
    label: "",
    badge: "",
    description: "",
  });

  const filteredRoles = (rolesList || []).filter((r) => {
    if (!searchRole.trim()) return true;
    const q = searchRole.toLowerCase();
    return (
      r.label.toLowerCase().includes(q) ||
      r.id.toLowerCase().includes(q) ||
      (r.badge && r.badge.toLowerCase().includes(q))
    );
  });

  const handleTogglePermission = (roleId, moduleKey, currentAllowed) => {
    updateRolePermission(roleId, moduleKey, !currentAllowed);
    toast.success(`Hak akses '${moduleKey}' untuk role '${roleId}' diperbarui.`);
  };

  const handleAddSubmit = (e) => {
    e.preventDefault();
    if (!addForm.label.trim()) {
      toast.error("Nama Role wajib diisi!");
      return;
    }

    try {
      const created = addRole(addForm);
      toast.success(`Role '${created.label}' berhasil ditambahkan!`);
      setAddModalOpen(false);
      setAddForm({
        id: "",
        label: "",
        badge: "",
        description: "",
        initialPermissions: ACCESS_MODULES.reduce((acc, m) => {
          acc[m.key] = true;
          return acc;
        }, {}),
      });
    } catch (err) {
      toast.error(err.message || "Gagal menambahkan role baru");
    }
  };

  const handleOpenEdit = (role) => {
    setEditingRole(role);
    setEditForm({
      label: role.label,
      badge: role.badge || "",
      description: role.description || "",
    });
    setEditModalOpen(true);
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    if (!editingRole || !editForm.label.trim()) return;

    updateRole(editingRole.id, editForm);
    toast.success(`Role '${editForm.label}' berhasil diperbarui!`);
    setEditModalOpen(false);
    setEditingRole(null);
  };

  const handleDeleteRole = (role) => {
    if (role.isSystem) {
      toast.error("System Role bawaan tidak dapat dihapus!");
      return;
    }
    if (window.confirm(`Apakah Anda yakin ingin menghapus Role '${role.label}'?`)) {
      try {
        deleteRole(role.id);
        toast.info(`Role '${role.label}' telah dihapus.`);
      } catch (err) {
        toast.error(err.message);
      }
    }
  };

  return (
    <div className="space-y-6" data-testid="rbac-module-access-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100/80 text-emerald-800 text-xs font-semibold mb-2">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            Role-Based Access Control (RBAC) & Role Management
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            RBAC & CRUD Role Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Kelola daftar peran pengguna (Role List CRUD) dan tentukan hak akses ke 10 modul operasional Therapedia.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl gap-2 shadow-sm shadow-emerald-600/20 text-xs h-10"
            onClick={() => setAddModalOpen(true)}
            data-testid="add-new-role-button"
          >
            <Plus className="w-4 h-4" /> Tambah Role Baru
          </Button>
        </div>
      </div>

      {/* Info Policy Card */}
      <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold">Informasi Kebijakan Hak Akses & System Roles:</p>
          <p className="text-amber-800 mt-0.5 leading-relaxed">
            Role <strong>Master Director</strong> memiliki hak penuh tak terbatas secara default. Role kustom dan bawaan staff lainnya dapat diatur hak visibilitas modulnya secara mandiri pada <strong>Matriks Hak Akses</strong>. Catatan: Role bawaan sistem (*System Role*) dilindungi dari penghapusan tidak sengaja. Parent Portal tidak tercantum dalam RBAC karena menggunakan alur *login by access code*.
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("matrix")}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
              activeTab === "matrix"
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200/80"
            )}
            data-testid="tab-matrix-button"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Matriks Hak Akses Modul (10 Modul)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("roles")}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
              activeTab === "roles"
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200/80"
            )}
            data-testid="tab-roles-button"
          >
            <Layers className="w-4 h-4" />
            <span>Daftar Role List ({rolesList?.length || 0})</span>
          </button>
        </div>
      </div>

      {/* TAB 1: MODULE ACCESS MATRIX */}
      {activeTab === "matrix" && (
        <Card className="rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
          <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-sm font-bold text-slate-900">Matriks Hak Akses 10 Modul Operasional</CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Aktifkan atau nonaktifkan switch modul untuk masing-masing role secara real-time.
              </CardDescription>
            </div>
            <span className="text-xs font-semibold text-slate-500 bg-white border border-slate-200 px-3 py-1 rounded-xl shadow-2xs">
              {rolesList?.length || 0} Active Roles &bull; 10 Access Modules
            </span>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table className="min-w-[900px] w-full">
              <TableHeader>
                <TableRow className="bg-slate-50/80 hover:bg-slate-50/80 border-b border-slate-200">
                  <TableHead className="font-bold text-slate-700 text-xs py-3.5 pl-6 min-w-[240px]">Modul Akses Sistem</TableHead>
                  {rolesList.map((r) => (
                    <TableHead key={r.id} className="font-bold text-slate-700 text-xs text-center min-w-[130px]">
                      <div className="flex flex-col items-center">
                        <span className="font-bold text-slate-900">{r.label}</span>
                        <span className="text-[10px] text-slate-400 font-normal">{r.badge || r.id}</span>
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {ACCESS_MODULES.map((mod) => (
                  <TableRow key={mod.key} className="border-b border-slate-100 hover:bg-slate-50/60 transition-colors">
                    <TableCell className="py-3.5 pl-6">
                      <div className="flex items-start gap-2.5">
                        <div className="mt-0.5 p-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 shrink-0">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <p className="font-bold text-sm text-slate-900">{mod.label}</p>
                          <p className="text-[11px] text-slate-500">{mod.desc}</p>
                        </div>
                      </div>
                    </TableCell>
                    {rolesList.map((r) => {
                      const isMaster = r.id === "master";
                      const rolePerms = rbacPermissions?.[r.id] || {};
                      const isAllowed = isMaster ? true : Boolean(rolePerms[mod.key]);
                      return (
                        <TableCell key={r.id} className="text-center">
                          <div className="flex items-center justify-center">
                            {isMaster ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                                <Lock className="w-3 h-3" /> Full
                              </span>
                            ) : (
                              <Switch
                                checked={isAllowed}
                                onCheckedChange={() => handleTogglePermission(r.id, mod.key, isAllowed)}
                                data-testid={`rbac-toggle-${r.id}-${mod.key}`}
                              />
                            )}
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
      )}

      {/* TAB 2: ROLE LIST & CRUD MANAGEMENT */}
      {activeTab === "roles" && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                className="pl-10 h-10 rounded-xl border-slate-200 bg-slate-50 focus:bg-white text-xs"
                placeholder="Cari role berdasarkan nama, slug, atau badge..."
                value={searchRole}
                onChange={(e) => setSearchRole(e.target.value)}
              />
            </div>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl gap-2 text-xs h-10 shrink-0"
              onClick={() => setAddModalOpen(true)}
            >
              <Plus className="w-4 h-4" /> Buat Role Baru
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRoles.map((r) => {
              const rolePerms = rbacPermissions?.[r.id] || {};
              const enabledCount = r.id === "master"
                ? ACCESS_MODULES.length
                : ACCESS_MODULES.filter((m) => Boolean(rolePerms[m.key])).length;

              return (
                <Card
                  key={r.id}
                  className="rounded-2xl border border-slate-200/90 bg-white shadow-xs hover:shadow-md transition-shadow relative overflow-hidden"
                  data-testid={`role-card-${r.id}`}
                >
                  <CardContent className="p-5 flex flex-col justify-between h-full space-y-4">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-0.5 rounded-full">
                          {r.badge || "Role"}
                        </span>
                        {r.isSystem ? (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                            <Lock className="w-3 h-3" /> System Role
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-sky-700 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-md">
                            Custom Role
                          </span>
                        )}
                      </div>

                      <h3 className="font-extrabold text-base text-slate-900 leading-snug">{r.label}</h3>
                      <p className="text-xs font-mono text-slate-400 mt-0.5">ID: {r.id}</p>
                      <p className="text-xs text-slate-600 mt-2 leading-relaxed">{r.description}</p>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      <div className="text-xs font-semibold text-slate-500">
                        Akses Modul: <strong className="text-emerald-700 font-bold">{enabledCount} / 10</strong>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                          onClick={() => handleOpenEdit(r)}
                          title="Edit Role Detail"
                          data-testid={`edit-role-${r.id}`}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        {!r.isSystem && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                            onClick={() => handleDeleteRole(r)}
                            title="Hapus Role"
                            data-testid={`delete-role-${r.id}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* DIALOG 1: ADD ROLE MODAL */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className="max-w-lg rounded-2xl p-6 border-slate-200 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Plus className="w-5 h-5 text-emerald-600" /> Buat Peran (Role) Baru
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Tambahkan role kustom baru ke dalam sistem Therapedia dan tentukan izin awal untuk 10 modul.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddSubmit} className="space-y-4 pt-2">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Nama Role (Label) *</Label>
              <Input
                className="rounded-xl border-slate-200 bg-slate-50 text-xs h-10"
                placeholder="e.g. Branch Supervisor, Head Therapist"
                value={addForm.label}
                onChange={(e) => setAddForm({ ...addForm, label: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Role ID / Slug (Opsional)</Label>
                <Input
                  className="rounded-xl border-slate-200 bg-slate-50 text-xs h-10 font-mono"
                  placeholder="e.g. branch_supervisor"
                  value={addForm.id}
                  onChange={(e) => setAddForm({ ...addForm, id: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Category Badge</Label>
                <Input
                  className="rounded-xl border-slate-200 bg-slate-50 text-xs h-10"
                  placeholder="e.g. Supervisi"
                  value={addForm.badge}
                  onChange={(e) => setAddForm({ ...addForm, badge: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Deskripsi Role</Label>
              <Input
                className="rounded-xl border-slate-200 bg-slate-50 text-xs h-10"
                placeholder="Penjelasan wewenang operasional role ini..."
                value={addForm.description}
                onChange={(e) => setAddForm({ ...addForm, description: e.target.value })}
              />
            </div>

            {/* Initial Permissions Selector */}
            <div className="pt-2 border-t border-slate-200">
              <Label className="text-xs font-bold text-slate-900 block mb-2">Akses Modul Awal (10 Modul):</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 rounded-xl bg-slate-50 border border-slate-200">
                {ACCESS_MODULES.map((m) => {
                  const isChecked = Boolean(addForm.initialPermissions[m.key]);
                  return (
                    <label key={m.key} className="flex items-center gap-2 text-xs font-medium text-slate-800 cursor-pointer p-1 hover:bg-slate-100 rounded-lg">
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={(val) =>
                          setAddForm({
                            ...addForm,
                            initialPermissions: {
                              ...addForm.initialPermissions,
                              [m.key]: Boolean(val),
                            },
                          })
                        }
                      />
                      <span className="truncate">{m.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <DialogFooter className="mt-4 gap-2">
              <Button type="button" variant="outline" className="rounded-xl border-slate-200 text-xs" onClick={() => setAddModalOpen(false)}>
                Batal
              </Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs">
                Simpan Role Baru
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG 2: EDIT ROLE MODAL */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-md rounded-2xl p-6 border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Pencil className="w-5 h-5 text-sky-600" /> Edit Detail Role
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Ubah nama, badge, atau deskripsi untuk role <strong>{editingRole?.id}</strong>.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditSubmit} className="space-y-3.5 pt-2">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Nama Role (Label) *</Label>
              <Input
                className="rounded-xl border-slate-200 bg-slate-50 text-xs h-10"
                value={editForm.label}
                onChange={(e) => setEditForm({ ...editForm, label: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Category Badge</Label>
              <Input
                className="rounded-xl border-slate-200 bg-slate-50 text-xs h-10"
                value={editForm.badge}
                onChange={(e) => setEditForm({ ...editForm, badge: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Deskripsi Role</Label>
              <Input
                className="rounded-xl border-slate-200 bg-slate-50 text-xs h-10"
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              />
            </div>

            <DialogFooter className="mt-4 gap-2">
              <Button type="button" variant="outline" className="rounded-xl border-slate-200 text-xs" onClick={() => setEditModalOpen(false)}>
                Batal
              </Button>
              <Button type="submit" className="bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl text-xs">
                Simpan Perubahan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

