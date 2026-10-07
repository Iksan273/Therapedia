// @vitest-environment jsdom
// Re-assessment client aktif: sesi asesmen tidak memotong kredit dan tidak memundurkan status; kode kuesioner baru
// menerbitkan invoice assessment otomatis.
import { act } from "react";
import { createRoot } from "react-dom/client";
import AppProviders from "@/app/providers/AppProviders";
import { ensureSeedsIfNeeded } from "@/data/seedRegistry";
import { useSessionActions } from "@/features/schedule/hooks/useSessionActions";
import { useQuestionnaireCodeActions } from "@/features/inquiry";
import { useSchedules } from "@/stores/schedulesStore";
import { useCredits } from "@/stores/creditsStore";
import { useClients } from "@/stores/clientsStore";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let ctx;
function Probe() {
  ctx = { actions: useSessionActions(), codes: useQuestionnaireCodeActions(), sch: useSchedules(), credits: useCredits(), clients: useClients() };
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

const remainingOf = (clientId) => (ctx.credits.getRecordForClient(clientId)?.packages || []).reduce((n, p) => n + (p.remainingCredit || 0), 0);

test("sesi asesmen client admitted: kredit tidak terpotong dan status tidak mundur", async () => {
  const client = ctx.clients.clients.find((c) => c.status === "admitted" && remainingOf(c.id) > 0);
  expect(client).toBeTruthy();
  const before = remainingOf(client.id);
  const s = { id: "re-1", clientId: client.id, branchId: client.branchId, type: "assessment", status: "scheduled", date: "2031-06-03", startTime: "09:00", endTime: "10:00", therapistId: "tx", creditPackageId: null };
  await act(async () => { ctx.actions.createSessions([s]); });
  expect(ctx.clients.clients.find((c) => c.id === client.id).status).toBe("admitted");

  await act(async () => { ctx.actions.completeSession(ctx.sch.schedules.find((x) => x.id === "re-1"), {}); });
  expect(ctx.sch.schedules.find((x) => x.id === "re-1").status).toBe("completed");
  expect(remainingOf(client.id)).toBe(before);
  expect(ctx.clients.clients.find((c) => c.id === client.id).status).toBe("admitted");
});

test("kode re-assessment: kode tertaut client + invoice assessment otomatis, status tetap admitted", async () => {
  const client = ctx.clients.clients.find((c) => c.status === "admitted");
  const category = { id: "cat-x", categoryName: "Asesmen Ulang", typeCode: "ASU" };
  let item;
  await act(async () => { item = ctx.codes.issueCode(client, category, { servicePackage: { id: "pkg-consult", name: "Paket Konsultasi", price: 500000 } }); });
  const fresh = ctx.clients.clients.find((c) => c.id === client.id);
  expect(fresh.status).toBe("admitted");
  expect(fresh.assessmentCodes.some((c) => c.code === item.code)).toBe(true);
  const inv = ctx.credits.getInvoicesForClient(client.id).find((i) => i.assessmentCode === item.code);
  expect(inv).toMatchObject({ type: "assessment", status: "unpaid", amount: 500000 });
});
