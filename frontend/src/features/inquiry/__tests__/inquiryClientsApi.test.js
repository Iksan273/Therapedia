// @vitest-environment jsdom
// M4 mode API: pipeline, detail, perubahan status, dan hapus client memakai Laravel lewat react-query. httpClient di-mock;
// payload di bawah = bentuk respons backend setelah interceptor (key camelCase).
import { act } from "react";
import { createRoot } from "react-dom/client";
import { ensureSeedsIfNeeded } from "@/data/seedRegistry";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/config/env", () => ({
  ENV: { DATA_SOURCE: "api", API_BASE_URL: "http://api.test/api/v1", API_TIMEOUT_MS: 1000, LANDING_URL: "", IS_DEV: false },
  isApiMode: () => true,
}));

const apiMock = { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn(), upload: vi.fn(), list: vi.fn() };
vi.mock("@/services/http/httpClient", () => ({ api: apiMock, setUnauthorizedHandler: () => {} }));

const { default: AppProviders } = await import("@/app/providers/AppProviders");
const { useAuth } = await import("@/stores/authStore");
const { useInquiryPipeline, useClientDetail } = await import("@/features/inquiry/hooks/useInquiryClients");
const { useClientOutcomeActions } = await import("@/features/inquiry/hooks/useClientOutcomeActions");
const { useClientDeleteActions } = await import("@/features/inquiry/hooks/useClientDeleteActions");
const { tokenStore } = await import("@/services/http/tokenStore");

const ROW = (id, extra = {}) => ({
  id, clientCode: `AE-0000${id}`, childName: `Anak ${id}`, gender: "female", dateOfBirth: "2019-03-10", parentName: "Ortu", parentPhone: "0812",
  branchId: 1, branch: { id: 1, code: "EAST", name: "East" }, status: "inquiry", finalOutcome: null, statusChangedAt: null, dateOfJoin: null,
  dateOfDischarge: null, dateOfDiscontinue: null, dischargeReason: null, creditBalance: 0, frozen: true, serviceCodes: ["b_ota"], version: 3,
  createdAt: "2026-10-15T08:00:00+00:00", ...extra,
});
const DETAIL = (id, extra = {}) => ({
  ...ROW(id), parentEmail: "o@x.id", address: null, intakeNote: "Rujukan", dischargeNote: null, leaveGranted: 30, leaveCreditBalance: 0, leftoverBalance: 0,
  gdriveLinks: [{ id: 9, type: "gdrive_folder", label: "Obs", url: "https://drive.google.com/x" }], invoices: [], packages: [], ...extra,
});

let ctx;
function Probe({ filters = { branchFilter: "all", serviceFilter: "all", search: "" }, detailId = "5" }) {
  ctx = {
    auth: useAuth(),
    pipeline: useInquiryPipeline(filters),
    detail: useClientDetail(detailId),
    outcome: useClientOutcomeActions(),
    del: useClientDeleteActions(),
  };
  return null;
}

let root;
const flush = () => act(async () => { await new Promise((r) => setTimeout(r, 30)); });
const mount = async (props) => {
  root = createRoot(document.createElement("div"));
  await act(async () => root.render(<AppProviders><Probe {...props} /></AppProviders>));
  await flush();
};
const loginAs = async () => {
  await act(async () => {
    tokenStore.set("1|token");
    ctx.auth.applySession({ role: "admin_inquiry", userId: 2, staffName: "Admin", branchId: "1", permissions: { inquiry_pipeline: true } });
  });
  await flush();
};

beforeEach(async () => {
  window.localStorage.clear();
  Object.values(apiMock).forEach((fn) => fn.mockReset());
  apiMock.post.mockResolvedValue("");
  apiMock.get.mockImplementation(async (url) => {
    if (url === "/branches") return [];
    if (url === "/clients/board") {
      return { stages: [{ status: "inquiry", total: 75, items: [ROW(1), ROW(2)] }, { status: "admitted", total: 1, items: [ROW(3, { status: "admitted" })] }] };
    }
    if (url.startsWith("/clients/")) return DETAIL(5);
    return [];
  });
  apiMock.list.mockImplementation(async () => ({ items: [ROW(1)], meta: { total: 1, page: 1, perPage: 50, lastPage: 1 } })); // cache client
  await ensureSeedsIfNeeded();
});
afterEach(async () => {
  await act(async () => ctx.auth.logout());
  await act(async () => root.unmount());
});

test("belum login: tidak memanggil API client", async () => {
  await mount();
  expect(apiMock.list).not.toHaveBeenCalled();
  expect(apiMock.get).not.toHaveBeenCalledWith(expect.stringMatching(/^\/clients/), expect.anything(), expect.anything());
  expect(ctx.pipeline.isLoading).toBe(false); // tanpa sesi tidak ada yang dimuat
});

test("pipeline: SATU request papan dengan filter server; jumlah asli per tahap; field dipetakan ke bentuk FE", async () => {
  await mount({ filters: { branchFilter: "1", serviceFilter: "b_ota", search: "" } });
  await loginAs();

  const boardCalls = apiMock.get.mock.calls.filter(([url]) => url === "/clients/board");
  expect(boardCalls).toHaveLength(1); // bukan 9 request per tahap
  expect(boardCalls[0][1]).toEqual({ branchId: "1", serviceCode: "b_ota", q: undefined, perStage: 10 });

  expect(ctx.pipeline.totals).toMatchObject({ inquiry: 75, admitted: 1, discharged: 0 });
  expect(ctx.pipeline.total).toBe(76);
  expect(ctx.pipeline.isLoading).toBe(false);
  expect(ctx.pipeline.clientsByStage.inquiry[0]).toMatchObject({ id: "1", clientName: "Anak 1", clientCode: "AE-00001", dob: "2019-03-10", serviceTypes: ["b_ota"], branchId: "1" });
  expect(ctx.pipeline.clientsByStage.discharged).toEqual([]); // tahap yang tak dikirim server tetap ada (kosong)
});

test("pipeline: loadMore mengambil halaman berikutnya SATU tahap dengan filter yang sama, menambah kartu tanpa duplikat", async () => {
  await mount({ filters: { branchFilter: "1", serviceFilter: "b_ota", search: "" } });
  await loginAs();
  expect(ctx.pipeline.clientsByStage.inquiry.map((c) => c.id)).toEqual(["1", "2"]); // total 75, baru 2 termuat

  apiMock.list.mockResolvedValueOnce({ items: [ROW(2), ROW(11), ROW(12)], meta: { total: 75, page: 2, perPage: 10, lastPage: 8 } }); // 2 duplikat halaman 1
  await act(async () => { await ctx.pipeline.loadMore("inquiry"); });

  const call = apiMock.list.mock.calls.find(([, params]) => params?.page === 2);
  expect(call[0]).toBe("/clients");
  expect(call[1]).toEqual({ status: ["inquiry"], branchId: "1", serviceCode: "b_ota", q: undefined, perPage: 10, page: 2, sort: "-created_at" });
  await vi.waitFor(() => expect(ctx.pipeline.clientsByStage.inquiry.map((c) => c.id)).toEqual(["1", "2", "11", "12"]));
  expect(ctx.pipeline.clientsByStage.admitted).toHaveLength(1); // tahap lain tidak tersentuh
});

test("pipeline: loadMore tidak memanggil server bila semua sudah termuat, dan menandai gagal tanpa mengulang otomatis", async () => {
  await mount();
  await loginAs();

  await act(async () => { await ctx.pipeline.loadMore("admitted"); }); // total 1, termuat 1
  expect(apiMock.list.mock.calls.some(([, params]) => params?.page === 2)).toBe(false);

  apiMock.list.mockRejectedValueOnce(new Error("jaringan putus"));
  await act(async () => { await ctx.pipeline.loadMore("inquiry"); });
  await vi.waitFor(() => expect(ctx.pipeline.loadMoreFailed.inquiry).toBe(true));
  expect(ctx.pipeline.loadingMore.inquiry).toBe(false);
});

test("pipeline: isSearching true sejak mengetik (menunggu jeda) sampai hasil pencarian tiba", async () => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"], shouldAdvanceTime: true });
  try {
    let releaseSearch;
    await mount({ filters: { branchFilter: "all", serviceFilter: "all", search: "" } });
    await loginAs();
    expect(ctx.pipeline.isSearching).toBe(false);

    apiMock.get.mockImplementation(async (url) => {
      if (url === "/clients/board") await new Promise((r) => { releaseSearch = r; });
      return url === "/clients/board" ? { stages: [] } : [];
    });
    // pengguna mengetik: state pencarian berubah, tetapi debounce belum selesai -> sudah terhitung "mencari"
    await act(async () => root.render(<AppProviders><Probe filters={{ branchFilter: "all", serviceFilter: "all", search: "ken" }} /></AppProviders>));
    expect(ctx.pipeline.isSearching).toBe(true);

    await act(async () => { await vi.advanceTimersByTimeAsync(400); }); // debounce lewat, request berjalan
    expect(ctx.pipeline.isSearching).toBe(true);
    await act(async () => { releaseSearch(); });
    await vi.waitFor(() => expect(ctx.pipeline.isSearching).toBe(false));
  } finally {
    vi.useRealTimers();
  }
});

test("pipeline: isLoading true selama muat pertama kali", async () => {
  let release;
  apiMock.get.mockImplementation(async (url) => {
    if (url === "/clients/board") await new Promise((r) => { release = r; });
    return url === "/clients/board" ? { stages: [] } : [];
  });
  await mount();
  await loginAs();

  expect(ctx.pipeline.isLoading).toBe(true);
  await act(async () => { release(); });
  await flush();
  expect(ctx.pipeline.isLoading).toBe(false);
});

test("tambah intake: body snake-ready dari form, hasil dipetakan, daftar disegarkan", async () => {
  await mount();
  await loginAs();
  apiMock.post.mockResolvedValueOnce(DETAIL(7, { clientCode: "AE-00007" }));

  let created;
  await act(async () => {
    created = await ctx.pipeline.createIntake({ clientName: " Aisyah ", gender: "female", dob: "2019-03-10", parentName: "Budi", parentContact: "0812", parentEmail: "b@x.id", intakeNote: "", branchId: "1" });
  });

  expect(apiMock.post).toHaveBeenCalledWith("/clients", {
    branchId: 1, childName: "Aisyah", gender: "female", dateOfBirth: "2019-03-10", parentName: "Budi", parentPhone: "0812", parentEmail: "b@x.id", address: undefined, intakeNote: undefined,
  });
  expect(created).toMatchObject({ id: "7", clientCode: "AE-00007" });
  const before = apiMock.list.mock.calls.length;
  await flush();
  expect(apiMock.list.mock.calls.length).toBeGreaterThan(before - 1);
});

test("galat validasi server saat tambah intake dilempar ke komponen dengan fieldErrors", async () => {
  await mount();
  await loginAs();
  apiMock.post.mockRejectedValueOnce(Object.assign(new Error("Data tidak valid"), { status: 422, fieldErrors: { parent_phone: "Nomor telepon tidak valid." } }));

  await expect(ctx.pipeline.createIntake({ clientName: "X", dob: "2019-01-01", parentName: "Y", parentContact: "abc", branchId: "1" })).rejects.toMatchObject({
    fieldErrors: { parent_phone: "Nomor telepon tidak valid." },
  });
});

test("detail: GET /clients/{id} dipetakan (link GDrive pertama, layanan, versi)", async () => {
  await mount();
  await loginAs();

  expect(apiMock.get).toHaveBeenCalledWith("/clients/5", undefined, expect.anything());
  expect(ctx.detail.client).toMatchObject({ id: "5", clientName: "Anak 5", parentEmail: "o@x.id", serviceTypes: ["b_ota"], gdriveClientLink: "https://drive.google.com/x", version: 3 });
  expect(ctx.detail.notFound).toBe(false);
});

test("detail tidak ditemukan (404) ditandai notFound", async () => {
  apiMock.get.mockImplementation(async (url) => {
    if (url.startsWith("/clients/")) throw Object.assign(new Error("Data tidak ditemukan."), { status: 404 });
    return [];
  });
  await mount();
  await loginAs();
  await flush();

  expect(ctx.detail.client).toBeNull();
  expect(ctx.detail.notFound).toBe(true);
});

test("detail: ubah biodata mengirim version, pilih layanan = PUT services, link GDrive diganti", async () => {
  await mount();
  await loginAs();
  await vi.waitFor(() => expect(ctx.detail.client).not.toBeNull()); // muat awal selesai dulu agar tidak menimpa hasil mutasi
  apiMock.patch.mockResolvedValueOnce(DETAIL(5, { childName: "Baru", version: 4 }));
  apiMock.put.mockResolvedValueOnce(DETAIL(5, { serviceCodes: ["b_ota", "f_ota"], status: "service_selected", version: 5 }));

  await act(async () => {
    await ctx.detail.updateProfile({ clientName: "Baru", gender: "female", dob: "2019-03-10", parentName: "Ortu", parentContact: "0812", parentEmail: "o@x.id", intakeNote: "" });
  });
  expect(apiMock.patch).toHaveBeenCalledWith("/clients/5", expect.objectContaining({ version: 3, childName: "Baru", intakeNote: null }));
  await vi.waitFor(() => expect(ctx.detail.client.clientName).toBe("Baru")); // react-query memberi tahu observer secara terbatch

  await act(async () => {
    await ctx.detail.saveServices(["b_ota", "f_ota"]);
  });
  expect(apiMock.put).toHaveBeenCalledWith("/clients/5/services", { serviceCodes: ["b_ota", "f_ota"] });
  await vi.waitFor(() => expect(ctx.detail.client.serviceTypes).toEqual(["b_ota", "f_ota"]));

  apiMock.delete.mockResolvedValue("");
  apiMock.post.mockResolvedValueOnce({ id: 10 });
  await act(async () => {
    await ctx.detail.saveGdriveLink("https://drive.google.com/baru");
  });
  expect(apiMock.delete).toHaveBeenCalledWith("/clients/5/gdrive-links/9");
  expect(apiMock.post).toHaveBeenCalledWith("/clients/5/gdrive-links", { url: "https://drive.google.com/baru" });
});

test("perubahan status = POST transition dengan version; alasan discharge/discontinue dikirim apa adanya", async () => {
  await mount();
  await loginAs();
  const client = ctx.detail.client;
  apiMock.post.mockResolvedValue({ ...DETAIL(5), changed: true });

  await act(async () => {
    await ctx.outcome.admit(client);
    await ctx.outcome.discontinue(client, "  Tidak jadi lanjut ");
    const res = await ctx.outcome.discharge(client, "moving", "Pindah kota");
    expect(res).toMatchObject({ deletedSchedules: 0, forfeitedCredits: 0 });
  });

  expect(apiMock.post).toHaveBeenCalledWith("/clients/5/transition", { toStatus: "admitted", version: 3 });
  expect(apiMock.post).toHaveBeenCalledWith("/clients/5/transition", { toStatus: "discontinued", version: 3, reason: "Tidak jadi lanjut" });
  expect(apiMock.post).toHaveBeenCalledWith("/clients/5/transition", { toStatus: "discharged", version: 3, reason: "moving", note: "Pindah kota" });
});

test("status sama tidak memanggil server; konflik versi dilempar", async () => {
  await mount();
  await loginAs();
  const client = ctx.detail.client;

  const same = await ctx.outcome.changeStatus(client, client.status);
  expect(same).toEqual({ changed: false });
  expect(apiMock.post).not.toHaveBeenCalledWith("/clients/5/transition", expect.anything());

  apiMock.post.mockRejectedValueOnce(Object.assign(new Error("Data sudah diubah pengguna lain."), { status: 409, isConflict: true }));
  await expect(ctx.outcome.changeStatus(client, "admitted")).rejects.toMatchObject({ status: 409 });
});

test("hapus client = DELETE /clients/{id}; 403 selain master dilempar", async () => {
  await mount();
  await loginAs();
  const client = ctx.detail.client;
  apiMock.delete.mockResolvedValueOnce("");

  await act(async () => {
    expect(await ctx.del.deleteClientCascade(client)).toEqual({ sessions: 0, invoices: 0 });
  });
  expect(apiMock.delete).toHaveBeenCalledWith("/clients/5");

  apiMock.delete.mockRejectedValueOnce(Object.assign(new Error("Hanya Master yang boleh menghapus client."), { status: 403 }));
  await expect(ctx.del.deleteClientCascade(client)).rejects.toMatchObject({ status: 403 });
});
