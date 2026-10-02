import axios from "axios";
import { ENV } from "@/config/env";
import { keysToCamel, keysToSnake } from "@/shared/lib/caseConverter";
import { toApiError } from "@/services/http/apiError";
import { tokenStore } from "@/services/http/tokenStore";

// Instance axios tunggal untuk Laravel API (Sanctum bearer token).
// - Request body & params: camelCase → snake_case
// - Response data: snake_case → camelCase
// - Error: dinormalisasi jadi ApiError; 401 menghapus token & memicu onUnauthorized
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
const unwrap = (res) => (res.data && "data" in res.data ? res.data.data : res.data);

export const api = {
  get: (url, params) => httpClient.get(url, { params }).then(unwrap),
  post: (url, body) => httpClient.post(url, body).then(unwrap),
  put: (url, body) => httpClient.put(url, body).then(unwrap),
  patch: (url, body) => httpClient.patch(url, body).then(unwrap),
  delete: (url) => httpClient.delete(url).then(unwrap),
  // Upload file (bukti bayar, dokumen): kirim FormData apa adanya (key tidak dikonversi)
  upload: (url, formData) => httpClient.post(url, formData).then(unwrap),
  // Endpoint list ber-pagination: kembalikan { items, meta } (format paginator Laravel)
  list: (url, params) => httpClient.get(url, { params }).then((res) => ({ items: res.data.data ?? [], meta: res.data.meta ?? null })),
};
