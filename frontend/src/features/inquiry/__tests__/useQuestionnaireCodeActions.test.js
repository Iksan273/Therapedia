// @vitest-environment jsdom
// Hapus kode kuesioner: hanya yang belum diisi ortu; tercatat di audit log; status client tidak mundur.
import { act } from "react";
import { createRoot } from "react-dom/client";
import AppProviders from "@/app/providers/AppProviders";
import { ensureSeedsIfNeeded } from "@/data/seedRegistry";
import { useQuestionnaireCodeActions } from "@/features/inquiry/hooks/useQuestionnaireCodeActions";
import { useClients } from "@/stores/clientsStore";
import { useAudit } from "@/stores/auditStore";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let ctx;
function Probe() {
  ctx = { actions: useQuestionnaireCodeActions(), clients: useClients(), audit: useAudit() };
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

const clientWith = (codes, extra = {}) => {
  const base = ctx.clients.clients.find((c) => c.status === "inquiry" || c.status === "service_selected");
  return { ...base, assessmentAnswers: [], assessmentCodes: codes, ...extra };
};

test("kode yang belum diisi dihapus, tercatat di audit, status client tetap", async () => {
  const issued = { code: "ASM-TEST1", categoryId: "cat-001", name: "Sensory Profile", status: "issued" };
  const keep = { code: "ASM-TEST2", categoryId: "cat-002", name: "School Companion", status: "issued" };
  const client = clientWith([issued, keep], { status: "assessment_scheduled" });
  await act(async () => ctx.clients.updateClient(client.id, { assessmentCodes: client.assessmentCodes, assessmentAnswers: [], status: "assessment_scheduled" }));

  const fresh = ctx.clients.getClient(client.id);
  let result;
  await act(async () => { result = ctx.actions.deleteCode(fresh, issued); });
  expect(result).toEqual({ deleted: true });

  const after = ctx.clients.getClient(client.id);
  expect(after.assessmentCodes.map((c) => c.code)).toEqual(["ASM-TEST2"]);
  expect(after.status).toBe("assessment_scheduled");

  const log = ctx.audit.auditLogs.find((e) => e.action === "assessment_code.deleted" && e.entityId === "ASM-TEST1");
  expect(log).toMatchObject({ subjectId: client.id, entityType: "assessment_code", oldValues: { code: "ASM-TEST1", status: "issued" } });
});

test("kode yang sudah diisi ortu tidak bisa dihapus dan tidak tercatat", async () => {
  const submitted = { code: "ASM-TEST3", categoryId: "cat-001", name: "Sensory Profile", status: "submitted" };
  const client = clientWith([submitted]);
  await act(async () => ctx.clients.updateClient(client.id, { assessmentCodes: [submitted] }));

  const logsBefore = ctx.audit.auditLogs.length;
  let result;
  await act(async () => { result = ctx.actions.deleteCode(ctx.clients.getClient(client.id), submitted); });
  expect(result).toEqual({ deleted: false, reason: "filled" });
  expect(ctx.clients.getClient(client.id).assessmentCodes).toHaveLength(1);
  expect(ctx.audit.auditLogs.length).toBe(logsBefore);
});
