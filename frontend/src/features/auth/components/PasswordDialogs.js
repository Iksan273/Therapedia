import React, { useState } from "react";
import { toast } from "sonner";
import { KeyRound, Mail, MailCheck } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { OTP_ERROR_MESSAGES, OTP_LENGTH, apiErrorText, validateNewPassword } from "@/domain/auth";
import { fmtDate } from "@/shared/lib/format";
import { fmtCountdown, useCountdown } from "@/shared/hooks/useCountdown";

// Jeda minimal sebelum OTP boleh dikirim ulang, dan masa berlaku OTP (sama dengan server: RequestPasswordOtpAction::TTL_MINUTES)
export const RESEND_COOLDOWN_SECONDS = 60;
export const OTP_VALID_SECONDS = 10 * 60;

// Ganti password wajib: muncul saat login pertama / setelah password diatur ulang oleh Master. Tidak bisa ditutup tanpa mengganti.
// `askCurrentPassword` (mode API): server mewajibkan password saat ini. `onSubmit(passwordBaru, passwordSaatIni)` boleh async;
// galatnya (ApiError) ditampilkan di dialog.
export function ForcePasswordChangeDialog({ staff, onSubmit, onCancel, askCurrentPassword = false }) {
  const [current, setCurrent] = useState("");
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (askCurrentPassword && !current) {
      setError("Masukkan password saat ini.");
      return;
    }
    const invalid = validateNewPassword(pw, confirm);
    if (invalid) {
      setError(invalid);
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(pw, current);
    } catch (err) {
      setError(apiErrorText(err, ["current_password", "password"]));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={Boolean(staff)} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="no-input-zoom max-w-md rounded-2xl p-6 border-slate-200" data-testid="force-password-change-dialog">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-sky-600" /> Ganti Password
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Password Anda masih sementara dari Master. Buat password baru sebelum melanjutkan (minimal 8 karakter, huruf dan angka).
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3.5 pt-1">
          {askCurrentPassword && (
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Password saat ini *</Label>
              <Input type="password" autoComplete="current-password" className="border-slate-200 bg-slate-50 text-xs" value={current} onChange={(e) => { setCurrent(e.target.value); setError(""); }} data-testid="current-password-input" />
            </div>
          )}
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
            <Button type="submit" disabled={submitting} className="bg-sky-600 hover:bg-sky-700 text-white font-bold" data-testid="password-change-submit">{submitting ? "Menyimpan..." : "Simpan & Masuk"}</Button>
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
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const cooldown = useCountdown(); // jeda kirim ulang
  const validity = useCountdown(); // masa berlaku OTP

  const close = (next) => {
    onOpenChange(next);
    if (!next) {
      cooldown.reset();
      validity.reset();
      setStep("email");
      setEmail("");
      setDemoOtp(null);
      setOtp("");
      setPw("");
      setConfirm("");
      setError("");
    }
  };

  // requestOtp / resetWithOtp boleh sinkron (demo) atau async (API). Galat permintaan OTP (429 terlalu sering, 503 email
  // gagal terkirim) ditampilkan apa adanya; respons sukses selalu generik.
  const handleRequest = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Masukkan email akun staf.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await requestOtp(email.trim());
      setDemoOtp(res?.otp ? { code: res.otp, expiresAt: res.expiresAt } : null);
      setStep("reset");
      setError("");
      cooldown.start(RESEND_COOLDOWN_SECONDS);
      validity.start(OTP_VALID_SECONDS);
      toast.info("Jika email terdaftar, kode OTP dikirim ke email tersebut.");
    } catch (err) {
      setError(apiErrorText(err, ["email"]));
    } finally {
      setSubmitting(false);
    }
  };

  // Kirim ulang OTP tanpa kembali ke awal: OTP lama otomatis tidak berlaku (hanya kode terbaru yang sah). Server membatasi
  // 3 permintaan per 10 menit per email; pesan pembatasan (429) ditampilkan apa adanya.
  const handleResend = async () => {
    if (resending || cooldown.remaining > 0) return;
    setResending(true);
    try {
      const res = await requestOtp(email.trim());
      setDemoOtp(res?.otp ? { code: res.otp, expiresAt: res.expiresAt } : null);
      setOtp("");
      setError("");
      cooldown.start(RESEND_COOLDOWN_SECONDS);
      validity.start(OTP_VALID_SECONDS);
      toast.success("Kode OTP baru dikirim. Kode sebelumnya tidak berlaku lagi.");
    } catch (err) {
      setError(apiErrorText(err, ["email"]));
      if (err?.status === 429) cooldown.start(err.retryAfter || RESEND_COOLDOWN_SECONDS); // pakai sisa waktu dari server bila ada
    } finally {
      setResending(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    const invalid = validateNewPassword(pw, confirm);
    if (invalid) {
      setError(invalid);
      return;
    }
    setSubmitting(true);
    try {
      const res = await resetWithOtp({ email: email.trim(), otp, newPassword: pw });
      if (!res.ok) {
        setError(res.message || (res.reason === "invalid" && res.attemptsLeft != null ? `${OTP_ERROR_MESSAGES.invalid} Sisa percobaan: ${res.attemptsLeft}.` : OTP_ERROR_MESSAGES[res.reason] || "Gagal mengatur ulang password."));
        return;
      }
      toast.success("Password berhasil diganti. Silakan masuk dengan password baru.");
      close(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="no-input-zoom max-w-md max-h-[calc(100dvh-2.5rem)] overflow-y-auto rounded-2xl p-6 border-slate-200" data-testid="forgot-password-dialog">
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
              <Button type="submit" disabled={submitting} className="bg-sky-600 hover:bg-sky-700 text-white font-bold" data-testid="forgot-request-otp">{submitting ? "Mengirim..." : "Kirim Kode OTP"}</Button>
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
              <div className="flex items-center justify-between gap-3 pt-1 text-[11px]" data-testid="forgot-otp-meta">
                {validity.active && validity.remaining === 0 ? (
                  <span className="font-semibold text-rose-600" data-testid="forgot-otp-expired">Kode OTP sudah kedaluwarsa. Kirim ulang untuk mendapat kode baru.</span>
                ) : (
                  <span className="text-slate-500" data-testid="forgot-otp-validity">Kode berlaku {validity.active ? fmtCountdown(validity.remaining) : "10:00"}</span>
                )}
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resending || cooldown.remaining > 0}
                  className="shrink-0 min-h-10 md:min-h-0 px-1 font-bold text-sky-700 hover:text-sky-900 disabled:text-slate-400 disabled:cursor-not-allowed cursor-pointer"
                  data-testid="forgot-resend-otp"
                >
                  {resending ? "Mengirim…" : cooldown.remaining > 0 ? `Kirim ulang OTP (${cooldown.remaining} dtk)` : "Kirim ulang OTP"}
                </button>
              </div>
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
              <Button type="submit" className="bg-sky-600 hover:bg-sky-700 text-white font-bold" disabled={otp.length < OTP_LENGTH || submitting} data-testid="forgot-reset-submit">{submitting ? "Menyimpan..." : "Ganti Password"}</Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
