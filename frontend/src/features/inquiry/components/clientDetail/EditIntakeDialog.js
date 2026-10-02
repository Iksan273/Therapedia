import React from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Pencil } from "lucide-react";
import { Label } from "@/shared/ui/label";
import { Input } from "@/shared/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import DateFilterPicker from "@/shared/components/DateFilterPicker";
import { BRANCHES } from "@/domain/branch";
import { Button } from "@/shared/ui/button";

export function EditIntakeDialog({ editIntakeForm, editIntakeOpen, handleSaveEditIntake, setEditIntakeForm, setEditIntakeOpen }) {
  return (
    <Dialog open={editIntakeOpen} onOpenChange={setEditIntakeOpen}>
          <DialogContent className="max-w-md rounded-2xl p-6 border-slate-200">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Pencil className="w-5 h-5 text-sky-600" /> Edit Data New Intake
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Perbarui data dasar profil anak, orang tua, dan cabang pendaftaran.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSaveEditIntake} className="space-y-3.5 pt-2">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Nama Lengkap Anak *</Label>
                <Input
                  className="border-slate-200 bg-slate-50 text-xs"
                  value={editIntakeForm.clientName}
                  onChange={(e) => setEditIntakeForm({ ...editIntakeForm, clientName: e.target.value })}
                  placeholder="e.g. Kenzo Danendra"
                  data-testid="edit-intake-client-name"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700">Jenis Kelamin Anak</Label>
                  <Select value={editIntakeForm.gender} onValueChange={(val) => setEditIntakeForm({ ...editIntakeForm, gender: val })}>
                    <SelectTrigger className="border-slate-200 bg-slate-50 text-xs font-semibold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-slate-200">
                      <SelectItem value="male">Laki-laki (Male)</SelectItem>
                      <SelectItem value="female">Perempuan (Female)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700">Tanggal Lahir Anak (DD/MM/YYYY)</Label>
                  <DateFilterPicker
                    placeholder="DD/MM/YYYY"
                    className="w-full bg-slate-50 h-10"
                    value={editIntakeForm.dob}
                    onChange={(e) => setEditIntakeForm({ ...editIntakeForm, dob: e?.target?.value ?? e })}
                    data-testid="edit-intake-dob"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Nama Orang Tua / Wali</Label>
                <Input
                  className="border-slate-200 bg-slate-50 text-xs"
                  value={editIntakeForm.parentName}
                  onChange={(e) => setEditIntakeForm({ ...editIntakeForm, parentName: e.target.value })}
                  placeholder="e.g. Ibu Liana Santoso"
                  data-testid="edit-intake-parent-name"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">No. WhatsApp / HP</Label>
                <Input
                  className="border-slate-200 bg-slate-50 text-xs"
                  value={editIntakeForm.parentContact}
                  onChange={(e) => setEditIntakeForm({ ...editIntakeForm, parentContact: e.target.value })}
                  placeholder="+62 812-xxxx-xxxx"
                  data-testid="edit-intake-parent-contact"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Email Orang Tua</Label>
                <Input
                  type="email"
                  className="border-slate-200 bg-slate-50 text-xs"
                  value={editIntakeForm.parentEmail}
                  onChange={(e) => setEditIntakeForm({ ...editIntakeForm, parentEmail: e.target.value })}
                  placeholder="liana.santoso@gmail.com"
                  data-testid="edit-intake-parent-email"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Cabang Intake</Label>
                <Select
                  value={editIntakeForm.branchId}
                  onValueChange={(val) => setEditIntakeForm({ ...editIntakeForm, branchId: val })}
                >
                  <SelectTrigger className="border-slate-200 bg-slate-50 text-xs font-semibold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200">
                    {BRANCHES.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name} ({b.city})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className=""
                  onClick={() => setEditIntakeOpen(false)}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  className="bg-sky-600 hover:bg-sky-700 text-white font-bold"
                  data-testid="btn-save-edit-intake"
                >
                  Simpan Perubahan
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
  );
}
