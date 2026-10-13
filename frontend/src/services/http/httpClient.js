import axios from "axios";
import { ENV } from "@/config/env";
import { keysToCamel, keysToSnake } from "@/shared/lib/caseConverter";
import { toApiError } from "@/services/http/apiError";
import { tokenStore } from "@/services/http/tokenStore";

// Instance axios tunggal untuk Laravel API (Sanctum bearer token).
// - Request body & params: camelCase → snake_case
// - Response data: snake_case → camelCase
// - Error: dinormalisasi jadi ApiError; 401 menghapus token & memicu onUnauthorized
//
// SATU format key, tanpa pengecualian: snake_case di kabel, camelCase di frontend; konversi hanya terjadi di sini.
// Karena semua key ikut dikonversi, kontrak API melarang data (kode modul, id, kode alasan) menjadi key objek:
// kamus diganti array (mis. `permissions: ["finance"]`, matriks RBAC `[{ module_code, allowed }]`).
export const httpClient = axios.create({
  baseURL: ENV.API_BASE_URL,
  timeout: ENV.API_TIMEOUT_MS,
  headers: { Accept: "application/json" },
});

let onUnauthorized = () => {};
// Dipasang sekali oleh lapisan auth (misal: logout + redirect ke /login)
export const setUnauthorizedHandler = (handler) => {
  onUnauthorized = handler;
};

httpClient.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (config.data && !(config.data instanceof FormData)) config.data = keysToSnake(config.data);
  if (config.params) config.params = keysToSnake(config.params);
  return config;
});

httpClient.interceptors.response.use(
  (response) => {
    response.data = keysToCamel(response.data);
    return response;
  },
  (error) => {
    const apiError = toApiError(error);
    if (apiError.isUnauthorized) {
      tokenStore.clear();
      onUnauthorized(apiError);
    }
    return Promise.reject(apiError);
  }
);

// Helper ringkas: mengembalikan `data` (Laravel API Resource membungkus payload di `data`)
// Hanya objek yang punya `data`; string/angka/kosong (mis. respons 204) dikembalikan apa adanya.
export const unwrap = (res) => (res.data && typeof res.data === "object" && "data" in res.data ? res.data.data : res.data);

// `options.signal` (AbortSignal) meneruskan pembatalan request, kompatibel dengan `queryFn({ signal })` react-query.
export const api = {
  get: (url, params, options = {}) => httpClient.get(url, { params, signal: options.signal }).then(unwrap),
  post: (url, body) => httpClient.post(url, body).then(unwrap),
  put: (url, body) => httpClient.put(url, body).then(unwrap),
  patch: (url, body) => httpClient.patch(url, body).then(unwrap),
  delete: (url) => httpClient.delete(url).then(unwrap),
  // Upload file (bukti bayar, dokumen): kirim FormData apa adanya (key tidak dikonversi)
  upload: (url, formData) => httpClient.post(url, formData).then(unwrap),
  // Endpoint list ber-pagination: kembalikan { items, meta } (format paginator Laravel)
  list: (url, params, options = {}) =>
    httpClient.get(url, { params, signal: options.signal }).then((res) => ({ items: res.data.data ?? [], meta: res.data.meta ?? null })),
};
