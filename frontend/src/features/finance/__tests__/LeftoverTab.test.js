// @vitest-environment jsdom
// Tab Saldo Lebihan: menampilkan sisa saldo, sumber (invoice asal konversi), pemakaian, dan penanda tidak sinkron.
import { act } from "react";
import { createRoot } from "react-dom/client";
import AppProviders from "@/app/providers/AppProviders";
import { ensureSeedsIfNeeded } from "@/data/seedRegistry";
import { Tabs } from "@/shared/ui/tabs";
import { LeftoverTab } from "@/features/finance/components/LeftoverTab";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let root;
let container;
beforeEach(async () => {
  window.localStorage.clear();
  await ensureSeedsIfNeeded();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

const row = (over = {}) => ({
  clientId: "c1",
  client: { id: "c1", clientName: "Kenzo Wirawan", clientCode: "KO-00001", parentName: "Lia", branchId: "branch-sby-timur" },
  balance: 70000,
  totalIn: 100000,
  totalOut: 30000,
  expected: 70000,
  inSync: true,
  sources: [{ conversionId: "cv1", invoiceId: "i1", invoiceNumber: "INV-SEN-20261001-001", toPackageName: "Regular", toSessions: 8, mode: "auto", amount: 100000, date: "2026-10-02" }],
  uses: [{ invoiceId: "i2", invoiceNumber: "INV-REG-20261003-002", status: "paid", amount: 30000, returned: false, date: "2026-10-03" }],
  ...over,
});
const pg = (rows) => ({ pageItems: rows, page: 1, totalPages: 1, totalItems: rows.length, pageSize: 10, setPage: () => {}, setPageSize: () => {} });

const render = async (rows, props = {}) =>
  act(async () =>
    root.render(
      <AppProviders>
        <Tabs value="leftover">
          <LeftoverTab rows={rows} leftoverPg={pg(rows)} includeZero={false} setIncludeZero={() => {}} {...props} />
        </Tabs>
      </AppProviders>
    )
  );

test("menampilkan sisa saldo, invoice asal lebihan, dan invoice pemakai", async () => {
  await render([row()]);
  const text = container.textContent;
  expect(container.querySelector('[data-testid="leftover-row-c1"]')).toBeTruthy();
  expect(text).toContain("Kenzo Wirawan");
  expect(text).toContain("INV-SEN-20261001-001"); // sumber
  expect(text).toContain("INV-REG-20261003-002"); // dipakai di
  expect(text).not.toContain("Tidak sinkron");
});

test("saldo yang tidak cocok dengan hitungan ditandai tidak sinkron; daftar kosong menampilkan state kosong", async () => {
  await render([row({ balance: 999, inSync: false })]);
  expect(container.textContent).toContain("Tidak sinkron");
  await render([]);
  expect(container.textContent).toContain("Tidak ada saldo lebihan");
});
