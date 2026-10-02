// Error API yang dinormalisasi. Semua kegagalan request dilempar sebagai ApiError,
// sehingga UI cukup membaca `message` (bahasa Indonesia) dan `fieldErrors` (validasi Laravel 422).

export class ApiError extends Error {
  constructor({ status = 0, message, code = null, fieldErrors = {}, cause = null }) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
    this.cause = cause;
  }

  get isValidation() {
    return this.status === 422;
  }

  get isUnauthorized() {
    return this.status === 401;
  }

  get isForbidden() {
    return this.status === 403;
  }

  get isConflict() {
    return this.status === 409;
  }
}

const DEFAULT_MESSAGES = {
  0: "Tidak dapat terhubung ke server. Periksa koneksi internet.",
  401: "Sesi login berakhir. Silakan masuk kembali.",
  403: "Anda tidak memiliki akses untuk aksi ini.",
  404: "Data tidak ditemukan.",
  409: "Data sudah diubah pengguna lain. Muat ulang lalu coba lagi.",
  422: "Data yang dikirim belum valid.",
  429: "Terlalu banyak permintaan. Coba lagi sebentar.",
  500: "Terjadi kesalahan di server.",
};

// Ubah error axios menjadi ApiError. Format respons Laravel: { message, errors: { field: [msg] }, code? }
export function toApiError(error) {
  if (error instanceof ApiError) return error;
  const status = error?.response?.status ?? 0;
  const body = error?.response?.data ?? {};
  const fieldErrors = Object.fromEntries(
    Object.entries(body.errors || {}).map(([field, msgs]) => [field, Array.isArray(msgs) ? msgs[0] : String(msgs)])
  );
  return new ApiError({
    status,
    code: body.code ?? null,
    message: body.message || DEFAULT_MESSAGES[status] || DEFAULT_MESSAGES[500],
    fieldErrors,
    cause: error,
  });
}
