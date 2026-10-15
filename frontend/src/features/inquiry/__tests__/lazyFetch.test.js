// @vitest-environment jsdom
// Aturan "jangan fetch data yang tidak diperlukan halaman" (docs/guide/08): di mode API, halaman hanya memanggil endpoint
// untuk data yang benar-benar dibacanya. Store (master, terapis, hari libur, paket, cache client) baru mengambil daftarnya
// saat ada komponen yang membacanya. httpClient di-mock; tes menghitung URL yang dipanggil.
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter, Route, Routes } from "react-router-dom";
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
const { useMasterData } = await import("@/stores/masterDataStore");
const { useTherapists } = await import("@/stores/therapistsStore");
const { useHolidays } = await import("@/stores/holidaysStore");
const { useClients } = await import("@/stores/clientsStore");
const { tokenStore } = await import("@/services/http/tokenStore");
const { default: InquiryPipeline } = await import("@/features/inquiry/pages/InquiryPipeline");
const { default: ClientDetailInquiry } = await import("@/features/inquiry/pages/ClientDetailInquiry");

const DETAIL = {
  id: 5, clientCode: "AE-00005", childName: "Anak 5", gender: "female", dateOfBirth: "2019-03-10", parentName: "Ortu", parentPhone: "0812", parentEmail: "o@x.id",
  branchId: 1, branch: { id: 1, code: "EAST", name: "East" }, status: "inquiry", creditBalance: 0, frozen: true, serviceCodes: [], version: 1, gdriveLinks: [], invoices: [], packages: [],
};

let auth;
function AuthProbe() {
  auth = useAuth();
  return null;
}
let store;
function StoreProbe({ read }) {
  store = { master: useMasterData(), therapists: useTherapists(), holidays: useHolidays(), clients: useClients() };
  read?.(store);
  return null;
}

let root;
const flush = () => act(async () => { await new Promise((r) => setTimeout(r, 40)); });
const mount = async (ui) => {
  root = createRoot(document.createElement("div"));
  await act(async () => root.render(<AppProviders><AuthProbe />{ui}</AppProviders>));
  await flush();
};
const login = async () => {
  await act(async () => {
    tokenStore.set("1|token");
    auth.applySession({ role: "admin_inquiry", userId: 2, staffName: "Admin", branchId: "1", permissions: { inquiry_pipeline: true } });
  });
  await flush();
};
const fetched = () => [...apiMock.get.mock.calls.map(([url]) => url), ...apiMock.list.mock.calls.map(([url]) => url)];

beforeEach(async () => {
  window.localStorage.clear();
  Object.values(apiMock).forEach((fn) => fn.mockReset());
  apiMock.post.mockResolvedValue("");
  apiMock.get.mockImplementation(async (url) => {
    if (url === "/clients/board") return { stages: [] };
    if (url === "/branches") return [{ id: 1, code: "EAST", name: "East", city: "Surabaya", isActive: true, bankAccounts: [] }];
    if (url === "/master/services") return [{ code: "b_ota", label: "BOT-A", category: "Asesmen", isActive: true, sortOrder: 1 }];
    if (url.startsWith("/clients/")) return DETAIL;
    return [];
  });
  apiMock.list.mockResolvedValue({ items: [], meta: null });
  await ensureSeedsIfNeeded();
});
afterEach(async () => {
  await act(async () => auth.logout());
  await act(async () => root.unmount());
});

test("halaman pipeline hanya memanggil papan, cabang, dan layanan master", async () => {
  await mount(<MemoryRouter><InquiryPipeline /></MemoryRouter>);
  await login();

  expect([...new Set(fetched())].sort()).toEqual(["/branches", "/clients/board", "/master/services"]);
  expect(apiMock.list).not.toHaveBeenCalled(); // tanpa cache 50 client
});

test("halaman detail client tidak mengambil terapis, hari libur, kuadran, alasan cancel/discharge, atau daftar client", async () => {
  await mount(
    <MemoryRouter initialEntries={["/admin-inquiry/pipeline/5"]}>
      <Routes>
        <Route path="/admin-inquiry/pipeline/:id" element={<ClientDetailInquiry />} />
      </Routes>
    </MemoryRouter>
  );
  await login();

  const urls = new Set(fetched());
  expect(urls.has("/clients/5")).toBe(true);
  for (const unwanted of ["/therapists", "/holidays", "/master/quadrants", "/master/cancel-reasons", "/master/discharge-reasons"]) {
    expect(urls.has(unwanted), `${unwanted} tidak boleh dipanggil`).toBe(false);
  }
  expect(apiMock.list).not.toHaveBeenCalled();
});

test("daftar baru diambil saat dibaca: alasan discharge, terapis, hari libur, client; yang tidak dibaca tidak diambil", async () => {
  await mount(
    <StoreProbe
      read={(st) => {
        void st.master.activeDischargeReasons;
        void st.therapists.therapists;
        void st.holidays.holidays;
        void st.clients.clients;
      }}
    />
  );
  await login();

  const urls = new Set(fetched());
  for (const wanted of ["/master/discharge-reasons", "/therapists", "/holidays", "/clients"]) {
    expect(urls.has(wanted), `${wanted} harus dipanggil saat dibaca`).toBe(true);
  }
  for (const unwanted of ["/master/quadrants", "/master/cancel-reasons", "/master/services", "/master/packages"]) {
    expect(urls.has(unwanted), `${unwanted} tidak dibaca, tidak boleh dipanggil`).toBe(false);
  }
});

test("fungsi pembantu (getTherapist / getClient) yang hanya diambil dari context tidak memicu fetch", async () => {
  await mount(
    <StoreProbe
      read={(st) => {
        void st.therapists.getTherapist; // mengambil fungsi saja
        void st.clients.getClient;
        void st.master.getService;
      }}
    />
  );
  await login();

  expect(fetched()).not.toContain("/therapists");
  expect(fetched()).not.toContain("/master/services");
  expect(apiMock.list).not.toHaveBeenCalled();
});

test("fungsi pembantu baru meminta data saat DIPANGGIL saat render", async () => {
  await mount(
    <StoreProbe
      read={(st) => {
        st.therapists.getTherapist("7");
        st.clients.getClient("3");
        st.master.getService("b_ota");
      }}
    />
  );
  await login();

  expect(fetched()).toContain("/therapists");
  expect(fetched()).toContain("/clients");
  expect(fetched()).toContain("/master/services");
});
