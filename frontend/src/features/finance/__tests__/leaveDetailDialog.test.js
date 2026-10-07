// @vitest-environment jsdom
// Detail cuti: riwayat pengajuan → selesai lebih awal → void (void ≠ hapus: log tetap tampil lengkap dengan alasan & pelaku).
import { act } from "react";
import { createRoot } from "react-dom/client";
import AppProviders from "@/app/providers/AppProviders";
import { ensureSeedsIfNeeded } from "@/data/seedRegistry";
import { LeaveDetailDialog } from "@/features/finance/components/leave/LeaveDetailDialog";
import { makeLeave } from "@/domain/leave";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

beforeAll(() => {
  window.ResizeObserver = window.ResizeObserver || class { observe() {} unobserve() {} disconnect() {} };
});

const render = async (leave) => {
  window.localStorage.clear();
  await ensureSeedsIfNeeded();
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => root.render(<AppProviders><LeaveDetailDialog leave={leave} clientName="Aira" open onOpenChange={() => {}} /></AppProviders>));
  return () => { act(() => root.unmount()); container.remove(); };
};

const base = makeLeave({ clientId: "c1", branchId: "b1", startDate: "2031-05-04", endDate: "2031-05-25", countedStart: "2031-05-05", countedEnd: "2031-05-19", sessionIds: ["x1"], reason: "Liburan", note: "Disetujui", by: "Finance A" });
const q = (id) => document.querySelector(`[data-testid="${id}"]`);

test("cuti aktif: hanya event Dicatat", async () => {
  const done = await render(base);
  expect(q("leave-event-created").textContent).toContain("Finance A");
  expect(q("leave-event-created").textContent).toContain("Liburan");
  expect(q("leave-event-early")).toBeNull();
  expect(q("leave-event-void")).toBeNull();
  done();
});

test("selesai lebih awal: event Dicatat + Diakhiri lebih awal (tanggal, pelaku, catatan)", async () => {
  const done = await render({ ...base, returnDate: "2031-05-12", returnNote: "Anak sehat", returnedAt: "2031-05-10T09:00:00.000Z", returnedBy: "Finance B" });
  expect(q("leave-event-early").textContent).toContain("Finance B");
  expect(q("leave-event-early").textContent).toContain("Anak sehat");
  expect(q("leave-detail-status").textContent).toMatch(/Masuk Lebih Awal/);
  done();
});

test("void: event Di-void dengan alasan; log tetap tampil", async () => {
  const done = await render({ ...base, status: "voided", voidReason: "Batal berangkat", voidedAt: "2031-05-02T09:00:00.000Z", voidedBy: "Finance C" });
  expect(q("leave-event-created")).toBeTruthy();
  expect(q("leave-event-void").textContent).toContain("Batal berangkat");
  expect(q("leave-event-void").textContent).toContain("Finance C");
  done();
});
