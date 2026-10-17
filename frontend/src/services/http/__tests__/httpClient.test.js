// Kontrak httpClient: satu format key (snake_case di kabel, camelCase di frontend), unwrap `data`, dan opsi `signal`.
import { api, httpClient, unwrap } from "@/services/http/httpClient";

// Adapter palsu: menangkap request (setelah interceptor request) dan membalas isi tertentu (sebelum interceptor respons).
let lastConfig;
const respondWith = (data, status = 200) => {
  httpClient.defaults.adapter = async (config) => {
    lastConfig = config;
    return { data, status, statusText: "OK", headers: {}, config };
  };
};

beforeEach(() => {
  lastConfig = undefined;
});

describe("konversi key", () => {
  test("request camelCase → snake_case (body dan params)", async () => {
    respondWith({ data: { ok: true } });
    await api.post("/x", { clientCode: "AE-1", nested: { dateOfBirth: "2018-05-17" }, list: [{ perPage: 10 }] });

    expect(JSON.parse(lastConfig.data)).toEqual({ client_code: "AE-1", nested: { date_of_birth: "2018-05-17" }, list: [{ per_page: 10 }] });

    await api.get("/x", { branchId: 2, perPage: 10 });
    expect(lastConfig.params).toEqual({ branch_id: 2, per_page: 10 });
  });

  test("respons snake_case → camelCase, nilai (termasuk kode modul di array) tidak berubah", async () => {
    respondWith({ data: { user: { must_change_password: true, permissions: ["inquiry_pipeline", "finance"] } } });
    const data = await api.get("/auth/me");

    expect(data).toEqual({ user: { mustChangePassword: true, permissions: ["inquiry_pipeline", "finance"] } });
  });

  test("FormData tidak dikonversi", async () => {
    respondWith({ data: { id: 1 } });
    const form = new FormData();
    form.append("file_name", "bukti.pdf");
    await api.upload("/invoices/1/proof", form);

    expect(lastConfig.data).toBeInstanceOf(FormData);
    expect(lastConfig.data.get("file_name")).toBe("bukti.pdf");
  });
});

describe("unwrap", () => {
  test("membuka `data` bila ada", () => {
    expect(unwrap({ data: { data: { id: 1 } } })).toEqual({ id: 1 });
  });

  test("objek tanpa `data` dikembalikan apa adanya", () => {
    expect(unwrap({ data: { id: 1 } })).toEqual({ id: 1 });
  });

  test("string dan respons kosong (204) tidak melempar error", () => {
    expect(unwrap({ data: "OK" })).toBe("OK");
    expect(unwrap({ data: "" })).toBe("");
    expect(unwrap({ data: undefined })).toBeUndefined();
  });
});

describe("api", () => {
  test("get meneruskan `signal` untuk pembatalan (react-query)", async () => {
    respondWith({ data: [] });
    const controller = new AbortController();
    await api.get("/clients", { q: "ad" }, { signal: controller.signal });

    expect(lastConfig.signal).toBe(controller.signal);
  });

  test("get meneruskan `responseType: blob` dan mengembalikan Blob apa adanya (file PDF dengan bearer)", async () => {
    const blob = new Blob(["%PDF-1.4"], { type: "application/pdf" });
    respondWith(blob);
    const res = await api.get("/assessment-sections/1/document", undefined, { responseType: "blob" });

    expect(lastConfig.responseType).toBe("blob");
    expect(res).toBe(blob);
  });

  test("list mengembalikan { items, meta }", async () => {
    respondWith({ data: [{ id: 1 }], meta: { total: 1, page: 1, per_page: 10, last_page: 1 } });
    const res = await api.list("/clients", { page: 1 });

    expect(res.items).toEqual([{ id: 1 }]);
    expect(res.meta).toEqual({ total: 1, page: 1, perPage: 10, lastPage: 1 });
  });

  test("galat dinormalisasi jadi ApiError dengan fieldErrors", async () => {
    httpClient.defaults.adapter = async (config) => {
      const error = new Error("Request failed");
      error.isAxiosError = true;
      error.config = config;
      error.response = { status: 422, data: { message: "Data tidak valid", errors: { email: ["Email wajib diisi."] } }, config };
      throw error;
    };

    await expect(api.post("/auth/login", {})).rejects.toMatchObject({ status: 422, isValidation: true, fieldErrors: { email: "Email wajib diisi." } });
  });

  test("429 membawa retryAfter (detik) dari body `retry_after`, atau header Retry-After bila body tidak punya", async () => {
    const fail = (data, headers = {}) => {
      httpClient.defaults.adapter = async (config) => {
        const error = new Error("Request failed");
        error.isAxiosError = true;
        error.config = config;
        error.response = { status: 429, data, headers, config };
        throw error;
      };
    };

    fail({ message: "Terlalu banyak percobaan login. Coba lagi dalam 42 detik.", code: "too_many_attempts", retry_after: 42 });
    await expect(api.post("/auth/login", {})).rejects.toMatchObject({ status: 429, isTooManyRequests: true, retryAfter: 42 });

    fail({ message: "Too Many Attempts." }, { "retry-after": "17" });
    await expect(api.post("/auth/login", {})).rejects.toMatchObject({ retryAfter: 17 });

    fail({ message: "x" });
    await expect(api.post("/auth/login", {})).rejects.toMatchObject({ retryAfter: null });
  });
});
