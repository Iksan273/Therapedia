import { api } from "@/services/http/httpClient";
import { tokenStore } from "@/services/http/tokenStore";
import { ENDPOINTS } from "@/services/api/endpoints";
import { clientSessionToAuth, staffSessionToAuth } from "@/services/api/mappers/authMapper";
import { useAuth } from "@/stores/authStore";

// Use-case auth mode API (M1): satu fungsi = satu endpoint. Menyentuh token (services) + sesi (authStore), jadi lewat hook.
// Fungsi melempar `ApiError` (`message`, `fieldErrors`); toast & navigate tetap di komponen (aturan 7).
export function useAuthActions() {
  const { applySession, markPasswordChanged } = useAuth();

  // POST /auth/login → simpan token, pasang sesi. Hasil: state auth (`mustChangePassword` menentukan dialog ganti password).
  const loginStaff = async ({ email, password }) => {
    const data = await api.post(ENDPOINTS.auth.staffLogin, { email, password });
    tokenStore.set(data.token);
    const session = staffSessionToAuth(data.user);
    applySession(session);
    return session;
  };

  // POST /auth/client-login (kode client + tanggal lahir anak yyyy-MM-dd)
  const loginClient = async ({ clientCode, dateOfBirth }) => {
    const data = await api.post(ENDPOINTS.auth.clientLogin, { clientCode, dateOfBirth });
    tokenStore.set(data.token);
    const session = clientSessionToAuth(data.client);
    applySession(session);
    return session;
  };

  // POST /auth/change-password. Server menghapus token perangkat lain; token ini tetap berlaku.
  const changePassword = async ({ currentPassword, password }) => {
    await api.post(ENDPOINTS.auth.changePassword, { currentPassword, password, passwordConfirmation: password });
    markPasswordChanged();
  };

  // POST /auth/forgot-password: respons selalu generik (204); 429 bila terlalu sering, 503 bila email gagal terkirim.
  const requestPasswordOtp = async (email) => {
    await api.post(ENDPOINTS.auth.forgotPassword, { email });
    return { sent: true };
  };

  // POST /auth/reset-password: 204 = berhasil; salah/kedaluwarsa → 422 (pesan dari server).
  const resetPasswordWithOtp = async ({ email, otp, newPassword }) => {
    try {
      await api.post(ENDPOINTS.auth.resetPassword, { email, otp, password: newPassword });
      return { ok: true };
    } catch (error) {
      return { ok: false, message: error.fieldErrors?.otp || error.fieldErrors?.password || error.message };
    }
  };

  return { loginStaff, loginClient, changePassword, requestPasswordOtp, resetPasswordWithOtp };
}
