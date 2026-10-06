// @vitest-environment jsdom
// Off + invoice cuti opsional: nominal manual, tidak memengaruhi pilihan potong kredit.
import { act } from "react";
import { createRoot } from "react-dom/client";
import AppProviders from "@/app/providers/AppProviders";
import { ensureSeedsIfNeeded } from "@/data/seedRegistry";
import { useSessionActions } from "@/features/schedule/hooks/useSessionActions";
import { useSchedules } from "@/stores/schedulesStore";
import { useCredits } from "@/stores/creditsStore";
import { useClients } from "@/stores/clientsStore";
import { invoiceType, invoiceTypeLabel } from "@/domain/credit";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let ctx;
function Probe() {
  ctx = { actions: useSessionActions(), sch: useSchedules(), credits: useCredits(), clients: useClients() };
  return null;
}
let root;
beforeEach(async () => {
  window.localStorage.clear();
  await ensureSeedsIfNeeded();
  root = createRoot(document.createElement("div"));
  await act(async () => root.render(<AppProviders><Probe /></AppProviders>));
});
afterEach(() => act(() => root.unmount()));

const addSession = async (id) => {
  const client = ctx.clients.clients[0];
  const s = { id, clientId: client.id, branchId: client.branchId, type: "therapy", status: "scheduled", date: "2031-05-05", startTime: "09:00", endTime: "10:00", therapistId: "x", creditPackageId: null };
  await act(async () => ctx.sch.addSchedule(s));
  return { client, s };
};

test("Off dengan invoice cuti: invoice type leave unpaid terhubung ke sesi, nominal manual", async () => {
  const { client, s } = await addSession("off-1");
  let res;
  await act(async () => { res = ctx.actions.offSession(s, { offReason: "S", note: "", deductCredit: false, leaveInvoiceAmount: 250000 }); });
  expect(res.leaveInvoiced).toBe(true);
  const inv = ctx.credits.getInvoicesForClient(client.id).find((i) => i.leaveScheduleId === "off-1");
  expect(inv).toMatchObject({ type: "leave", status: "unpaid", amount: 250000, credits: 0 });
  expect(inv.invoiceNumber).toMatch(/^INV-CUT-/);
  expect(invoiceType(inv)).toBe("leave");
  expect(invoiceTypeLabel(inv)).toBe("Cuti");
  expect(ctx.sch.schedules.find((x) => x.id === "off-1").status).toBe("off");
});

test("Off tanpa invoice cuti: tidak ada invoice baru; Finance menandai lunas invoice cuti tanpa membuat paket", async () => {
  const { client, s } = await addSession("off-2");
  await act(async () => { ctx.actions.offSession(s, { offReason: "S", deductCredit: false }); });
  expect(ctx.credits.getInvoicesForClient(client.id).some((i) => i.leaveScheduleId === "off-2")).toBe(false);

  const { s: s3 } = await addSession("off-3");
  await act(async () => { ctx.actions.offSession(s3, { offReason: "S", deductCredit: false, leaveInvoiceAmount: 100000 }); });
  const inv = ctx.credits.getInvoicesForClient(client.id).find((i) => i.leaveScheduleId === "off-3");
  const packagesBefore = (ctx.credits.getRawRecord(client.id)?.packages || []).length;
  await act(async () => ctx.credits.verifyPaymentProof({ invoiceId: inv.id, status: "paid", by: "Finance" }));
  expect(ctx.credits.getInvoicesForClient(client.id).find((i) => i.id === inv.id).status).toBe("paid");
  expect((ctx.credits.getRawRecord(client.id)?.packages || []).length).toBe(packagesBefore);
});
