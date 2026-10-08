// @vitest-environment jsdom
// Reaktivasi client discharged/discontinued: kembali Active, data discharge bersih, kredit tersedia.
import { act } from "react";
import { createRoot } from "react-dom/client";
import AppProviders from "@/app/providers/AppProviders";
import { ensureSeedsIfNeeded } from "@/data/seedRegistry";
import { useClientOutcomeActions } from "@/features/inquiry";
import { useClients } from "@/stores/clientsStore";
import { useCredits } from "@/stores/creditsStore";
import { useSchedules } from "@/stores/schedulesStore";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let ctx;
function Probe() {
  ctx = { actions: useClientOutcomeActions(), clients: useClients(), credits: useCredits(), schedules: useSchedules() };
  return null;
}

let root;
beforeEach(async () => {
  window.localStorage.clear();
  await ensureSeedsIfNeeded();
  const el = document.createElement("div");
  root = createRoot(el);
  await act(async () => root.render(<AppProviders><Probe /></AppProviders>));
});
afterEach(() => act(() => root.unmount()));

test.each(["discharged", "discontinued"])("reactivate client %s menjadi Active", async (status) => {
  const client = ctx.clients.clients.find((c) => c.status === status && c.dateOfDischarge);
  expect(client).toBeTruthy();
  await act(async () => ctx.actions.reactivate(client));

  const after = ctx.clients.getClient(client.id);
  expect(after.status).toBe("admitted");
  expect(after.dateOfDischarge).toBeNull();
  expect(after.dischargeReason).toBeNull();
  expect(after.dateOfJoin).toBe(client.dateOfJoin);
  expect(ctx.credits.getRecordForClient(client.id)).toBeTruthy();
});

test("discharge dari pipeline: status discharged, tanggal & alasan tersimpan", async () => {
  const client = ctx.clients.clients.find((c) => c.status === "admitted");
  await act(async () => ctx.actions.discharge(client, " moving ", "  catatan "));

  const after = ctx.clients.getClient(client.id);
  expect(after).toMatchObject({ status: "discharged", dischargeReason: "moving", dischargeNote: "catatan" });
  expect(after.dateOfDischarge).toBeTruthy();
});

test("discharge menghapus jadwal aktif & menghanguskan sisa sesi (ledger discharge), riwayat tetap", async () => {
  const client = ctx.clients.clients.find((c) => c.status === "admitted" && (ctx.credits.getRecordForClient(c.id)?.remainingCredit || 0) > 0);
  expect(client).toBeTruthy();
  const remaining = ctx.credits.getRecordForClient(client.id).remainingCredit;
  const base = { clientId: client.id, therapistId: "th-1", startTime: "09:00", endTime: "10:00", date: "2099-02-02", type: "therapy" };
  await act(async () => ctx.schedules.addSchedules([
    { ...base, id: "d-sch", status: "scheduled", isRecurring: true },
    { ...base, id: "d-res", status: "rescheduled" },
    { ...base, id: "d-done", status: "completed" },
  ]));

  let res;
  await act(async () => { res = ctx.actions.discharge(client, "selesai"); });
  expect(res.forfeitedCredits).toBe(remaining);
  const ids = ctx.schedules.schedules.filter((s) => s.clientId === client.id).map((s) => s.id);
  expect(ids).not.toContain("d-sch");
  expect(ids).not.toContain("d-res");
  expect(ids).toContain("d-done");

  const after = ctx.credits.getRecordForClient(client.id);
  expect(after.remainingCredit).toBe(0);
  const entries = after.history.filter((h) => h.action === "discharge");
  expect(entries.reduce((n, h) => n + h.creditChange, 0)).toBe(-remaining);
});

test("ubah status manual ke discharged menjalankan efek yang sama (jadwal aktif dihapus, sisa sesi hangus)", async () => {
  const client = ctx.clients.clients.find((c) => c.status === "admitted" && (ctx.credits.getRecordForClient(c.id)?.remainingCredit || 0) > 0);
  const remaining = ctx.credits.getRecordForClient(client.id).remainingCredit;
  await act(async () => ctx.schedules.addSchedules([{ clientId: client.id, id: "m-sch", therapistId: "th-1", startTime: "09:00", endTime: "10:00", date: "2099-03-03", type: "therapy", status: "scheduled" }]));
  let res;
  await act(async () => { res = ctx.actions.changeStatus(client, "discharged", { reason: "pindah kota" }); });
  expect(res).toMatchObject({ changed: true, to: "discharged", forfeitedCredits: remaining });
  expect(ctx.clients.getClient(client.id)).toMatchObject({ status: "discharged", dischargeReason: "pindah kota" });
  expect(ctx.schedules.schedules.some((s) => s.id === "m-sch")).toBe(false);
  expect(ctx.credits.getRecordForClient(client.id).remainingCredit).toBe(0);
});
