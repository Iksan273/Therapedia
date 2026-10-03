import React, { useState } from "react";
import { toast } from "sonner";
import { KeyRound, Mail, MailCheck } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { OTP_ERROR_MESSAGES, OTP_LENGTH, validateNewPassword } from "@/domain/auth";
import { fmtDate } from "@/shared/lib/format";

// Ganti password wajib: muncul saat login pertama / setelah password diatur ulang oleh Master. Tidak bisa ditutup tanpa mengganti.
export function ForcePasswordChangeDialog({ staff, onSubmit, onCancel }) {
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    const invalid = validateNewPassword(pw, confirm);
    if (invalid) {
      setError(invalid);
      return;
    }
    onSubmit(pw);
  };

  return (
    <Dialog open={Boolean(staff)} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-md rounded-2xl p-6 border-slate-200" data-testid="force-password-change-dialog">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-sky-600" /> Ganti Password
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Password Anda masih sementara dari Master. Buat password baru sebelum melanjutkan (minimal 8 karakter, huruf dan angka).
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3.5 pt-1">
          <div className="space-y-1">
            <Label className="text-xs font-bold text-slate-700">Password baru *</Label>
            <Input type="password" autoComplete="new-password" className="border-slate-200 bg-slate-50 text-xs" value={pw} onChange={(e) => { setPw(e.target.value); setError(""); }} data-testid="new-password-input" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-bold text-slate-700">Konfirmasi password *</Label>
            <Input type="password" autoComplete="new-password" className="border-slate-200 bg-slate-50 text-xs" value={confirm} onChange={(e) => { setConfirm(e.target.value); setError(""); }} data-testid="confirm-password-input" />
          </div>
          {error && <p className="text-xs font-semibold text-rose-600" data-testid="password-change-error">{error}</p>}
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onCancel}>Batal</Button>
            <Button type="submit" className="bg-sky-600 hover:bg-sky-700 text-white font-bold" data-testid="password-change-submit">Simpan & Masuk</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Lupa password staf: minta OTP lewat email, lalu masukkan OTP + password baru. Di mode demo email disimulasikan
// (kode OTP ditampilkan di layar). Respons permintaan OTP selalu generik (tidak membocorkan email terdaftar).
export function ForgotPasswordDialog({ open, onOpenChange, requestOtp, resetWithOtp }) {
  const [step, setStep] = useState("email"); // email | reset
  const [email, setEmail] = useState("");
  const [demoOtp, setDemoOtp] = useState(null);
  const [otp, setOtp] = useState("");
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");

  const close = (next) => {
    onOpenChange(next);
    if (!next) {
      setStep("email");
      setEmail("");
      setDemoOtp(null);
      setOtp("");
      setPw("");
      setConfirm("");
      setError("");
    }
  };

  const handleRequest = (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Masukkan email akun staf.");
      return;
    }
    const res = requestOtp(email);
    setDemoOtp(res.otp ? { code: res.otp, expiresAt: res.expiresAt } : null);
    setStep("reset");
    setError("");
    toast.info("Jika email terdaftar, kode OTP dikirim ke email tersebut.");
  };

  const handleReset = (e) => {
    e.preventDefault();
    const invalid = validateNewPassword(pw, confirm);
    if (invalid) {
      setError(invalid);
      return;
    }
    const res = resetWithOtp({ email, otp, newPassword: pw });
    if (!res.ok) {
      setError(res.reason === "invalid" && res.attemptsLeft != null ? `${OTP_ERROR_MESSAGES.invalid} Sisa percobaan: ${res.attemptsLeft}.` : OTP_ERROR_MESSAGES[res.reason] || "Gagal mengatur ulang password.");
      return;
    }
    toast.success("Password berhasil diganti. Silakan masuk dengan password baru.");
    close(false);
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-md rounded-2xl p-6 border-slate-200" data-testid="forgot-password-dialog">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Mail className="w-5 h-5 text-sky-600" /> Lupa Kata Sandi
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            {step === "email"
              ? "Masukkan email akun staf. Kami mengirim kode OTP untuk mengatur ulang password. Bisa juga minta Master mengatur ulang dari User Management."
              : "Masukkan kode OTP dari email dan password baru Anda."}
          </DialogDescription>
        </DialogHeader>

        {step === "email" ? (
          <form onSubmit={handleRequest} className="space-y-3.5 pt-1">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Email staf *</Label>
              <Input type="email" className="border-slate-200 bg-slate-50 text-xs" placeholder="nama@therapedia.id" value={email} onChange={(e) => { setEmail(e.target.value); setError(""); }} data-testid="forgot-email-input" />
            </div>
            {error && <p className="text-xs font-semibold text-rose-600">{error}</p>}
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => close(false)}>Batal</Button>
              <Button type="submit" className="bg-sky-600 hover:bg-sky-700 text-white font-bold" data-testid="forgot-request-otp">Kirim Kode OTP</Button>
            </DialogFooter>
          </form>
        ) : (
          <form onSubmit={handleReset} className="space-y-3.5 pt-1">
            {demoOtp && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-950 flex items-start gap-2" data-testid="demo-otp-box">
                <MailCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p>
                  <strong>Simulasi email (mode demo):</strong> kode OTP Anda <span className="font-mono font-black tracking-widest text-sm" data-testid="demo-otp-code">{demoOtp.code}</span>, berlaku 10 menit
                  {demoOtp.expiresAt ? ` (s.d. ${fmtDate(demoOtp.expiresAt.slice(0, 10))})` : ""}. Di produksi kode dikirim ke email.
                </p>
              </div>
            )}
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Kode OTP *</Label>
              <Input inputMode="numeric" maxLength={OTP_LENGTH} className="border-slate-200 bg-slate-50 text-xs font-mono tracking-widest" value={otp} onChange={(e) => { setOtp(e.target.value.replace(/\D/g, "")); setError(""); }} data-testid="forgot-otp-input" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Password baru *</Label>
              <Input type="password" autoComplete="new-password" className="border-slate-200 bg-slate-50 text-xs" value={pw} onChange={(e) => { setPw(e.target.value); setError(""); }} data-testid="forgot-new-password" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Konfirmasi password *</Label>
              <Input type="password" autoComplete="new-password" className="border-slate-200 bg-slate-50 text-xs" value={confirm} onChange={(e) => { setConfirm(e.target.value); setError(""); }} data-testid="forgot-confirm-password" />
            </div>
            {error && <p className="text-xs font-semibold text-rose-600" data-testid="forgot-error">{error}</p>}
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setStep("email")}>Kembali</Button>
              <Button type="submit" className="bg-sky-600 hover:bg-sky-700 text-white font-bold" disabled={otp.length < OTP_LENGTH} data-testid="forgot-reset-submit">Ganti Password</Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
