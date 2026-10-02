// Penyimpanan token Sanctum. Dipisah agar mudah diganti (misal ke cookie httpOnly via Sanctum SPA auth).
const TOKEN_KEY = "therapedia_api_token";

export const tokenStore = {
  get() {
    try {
      return window.localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set(token) {
    try {
      window.localStorage.setItem(TOKEN_KEY, token);
    } catch {
      // abaikan
    }
  },
  clear() {
    try {
      window.localStorage.removeItem(TOKEN_KEY);
    } catch {
      // abaikan
    }
  },
};
