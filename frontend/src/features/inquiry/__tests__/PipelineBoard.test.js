// @vitest-environment jsdom
// Papan pipeline: infinite scroll per kolom (10 kartu per halaman). IntersectionObserver dipalsukan agar tes bisa
// memicu "sentinel di dasar kolom terlihat".
import { act } from "react";
import { createRoot } from "react-dom/client";
import { PipelineBoard } from "@/features/inquiry/components/pipeline/PipelineBoard";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let observers = [];
class FakeObserver {
  constructor(callback) {
    this.callback = callback;
    observers.push(this);
  }
  observe() {}
  disconnect() {
    observers = observers.filter((o) => o !== this);
  }
}
const showSentinel = () => act(() => observers.forEach((o) => o.callback([{ isIntersecting: true }])));

const COLUMNS = [{ group: "main", status: "inquiry", label: "1. New Intake", accent: "bg-sky-500", desc: "" }];
const makeClients = (n, from = 1) =>
  Array.from({ length: n }, (_, i) => ({ id: String(from + i), clientName: `Anak ${from + i}`, clientCode: `AE-${from + i}`, dob: "2019-03-10", status: "inquiry", branchId: "1", serviceTypes: [] }));

let root;
let container;
beforeEach(() => {
  observers = [];
  vi.stubGlobal("IntersectionObserver", FakeObserver);
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

const render = (props) =>
  act(() => root.render(<PipelineBoard columns={COLUMNS} getService={() => null} onOpen={() => {}} emptyText="Kosong" {...props} />));
const cards = () => container.querySelectorAll('[data-testid^="client-card-"]').length;
const byId = (id) => container.querySelector(`[data-testid="${id}"]`);

test("mode demo: tampil 10 kartu, menambah 10 tiap sentinel terlihat, sentinel hilang saat habis", async () => {
  render({ clientsByStage: { inquiry: makeClients(25) } });
  expect(cards()).toBe(10);
  expect(byId("stage-sentinel-inquiry")).not.toBeNull();

  await showSentinel();
  expect(cards()).toBe(20);
  await showSentinel();
  expect(cards()).toBe(25);
  expect(byId("stage-sentinel-inquiry")).toBeNull(); // semua sudah tampil
});

test("mode API: sentinel memanggil onLoadMore(status) selama kartu termuat < total; angka header memakai total server", async () => {
  const onLoadMore = vi.fn();
  render({ clientsByStage: { inquiry: makeClients(10) }, totals: { inquiry: 37 }, onLoadMore });
  expect(cards()).toBe(10); // tidak dipotong lagi di klien
  expect(container.textContent).toContain("37");

  await showSentinel();
  expect(onLoadMore).toHaveBeenCalledWith("inquiry");
});

test("mode API: selama memuat tampil shimmer dan sentinel tidak memicu muat ganda; gagal tampil tombol coba lagi", async () => {
  const onLoadMore = vi.fn();
  render({ clientsByStage: { inquiry: makeClients(10) }, totals: { inquiry: 37 }, onLoadMore, loadingMore: { inquiry: true } });
  expect(byId("stage-loading-more-inquiry")).not.toBeNull();
  expect(observers.length).toBe(0); // pengamat dimatikan selama memuat
  expect(onLoadMore).not.toHaveBeenCalled();

  render({ clientsByStage: { inquiry: makeClients(10) }, totals: { inquiry: 37 }, onLoadMore, loadMoreFailed: { inquiry: true } });
  expect(byId("stage-loading-more-inquiry")).toBeNull();
  await act(async () => byId("retry-more-inquiry").click());
  expect(onLoadMore).toHaveBeenCalledWith("inquiry");
});

test("tanpa IntersectionObserver: tersedia tombol 'Muat lebih banyak' sebagai gantinya", async () => {
  vi.stubGlobal("IntersectionObserver", undefined);
  render({ clientsByStage: { inquiry: makeClients(12) } });
  expect(cards()).toBe(10);
  await act(async () => byId("show-more-inquiry").click());
  expect(cards()).toBe(12);
});

test("refreshing (pencarian / filter berjalan): bar progres tampil, papan lama diredupkan tetapi tidak dikosongkan", async () => {
  render({ clientsByStage: { inquiry: makeClients(3) }, totals: { inquiry: 3 }, refreshing: true });
  expect(byId("pipeline-refreshing")).not.toBeNull();
  expect(cards()).toBe(3); // data lama tetap terlihat
  expect(byId("pipeline-board").getAttribute("aria-busy")).toBe("true");
  expect(container.querySelector(".opacity-50")).not.toBeNull();

  render({ clientsByStage: { inquiry: makeClients(3) }, totals: { inquiry: 3 }, refreshing: false });
  expect(byId("pipeline-refreshing")).toBeNull();
  expect(container.querySelector(".opacity-50")).toBeNull();
});
