// @vitest-environment jsdom
// Reaktivasi client discharged/discontinued: kembali Active, data discharge bersih, kredit tersedia, tercatat di audit.
import { act } from "react";
import { createRoot } from "react-dom/client";
import AppProviders from "@/app/providers/AppProviders";
import { ensureSeedsIfNeeded } from "@/data/seedRegistry";
import { useClientOutcomeActions } from "@/features/inquiry";
import { useClients } from "@/stores/clientsStore";
import { useCredits } from "@/stores/creditsStore";
import { useAudit } from "@/stores/auditStore";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let ctx;
function Probe() {
  ctx = { actions: useClientOutcomeActions(), clients: useClients(), credits: useCredits(), audit: useAudit() };
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

test("discharge dari pipeline: status discharged, tanggal & alasan tersimpan, tercatat di audit", async () => {
  const client = ctx.clients.clients.find((c) => c.status === "admitted");
  await act(async () => ctx.actions.discharge(client, " moving ", "  catatan "));

  const after = ctx.clients.getClient(client.id);
  expect(after).toMatchObject({ status: "discharged", dischargeReason: "moving", dischargeNote: "catatan" });
  expect(after.dateOfDischarge).toBeTruthy();
  expect(ctx.audit.auditLogs.some((l) => l.action === "client.discharged" && l.entityId === client.id)).toBe(true);
});
