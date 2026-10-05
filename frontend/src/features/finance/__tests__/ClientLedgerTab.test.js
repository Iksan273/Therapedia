// @vitest-environment jsdom
// Tab "Log Kredit & Saldo": daftar client + laporan per client (rupiah) dari seed demo.
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import AppProviders from "@/app/providers/AppProviders";
import { ensureSeedsIfNeeded } from "@/data/seedRegistry";
import { Tabs } from "@/shared/ui/tabs";
import { ClientLedgerTab } from "@/features/finance/components/ClientLedgerTab";
import { useClients } from "@/stores/clientsStore";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let root;
let container;
let clientsCtx;
function Probe() {
  clientsCtx = useClients();
  return null;
}
function Page() {
  const { clients } = useClients();
  return (
    <Tabs value="ledger">
      <ClientLedgerTab clients={clients} search="" />
    </Tabs>
  );
}

beforeEach(async () => {
  window.localStorage.clear();
  await ensureSeedsIfNeeded();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => root.render(<AppProviders><Probe /><Page /></AppProviders>));
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

test("daftar client punya tombol Lihat Log yang membuka laporan dengan kolom Per Sesi & Saldo", async () => {
  expect(clientsCtx.clients.length).toBeGreaterThan(0);
  const open = container.querySelector('[data-testid^="ledger-open-"]');
  expect(open).toBeTruthy();
  await act(async () => open.dispatchEvent(new MouseEvent("click", { bubbles: true })));
  const dialog = document.body.querySelector('[data-testid="client-ledger-dialog"]');
  expect(dialog).toBeTruthy();
  expect(dialog.textContent).toMatch(/Per Sesi/);
  expect(dialog.textContent).toMatch(/Saldo/);
});

test("Sisa Sesi di daftar dihitung dari paket client (bukan 0 untuk semua)", () => {
  const cells = [...container.querySelectorAll('[data-testid^="ledger-client-"] td')].map((td) => td.textContent.trim());
  const remaining = [...container.querySelectorAll('[data-testid^="ledger-client-"]')].map((row) => Number(row.querySelectorAll("td")[2]?.textContent.trim()));
  expect(cells.length).toBeGreaterThan(0);
  expect(remaining.some((n) => n > 0)).toBe(true);
});

test("laporan log kredit & saldo diurutkan dari yang terlama ke terbaru (baris pertama = top up awal)", async () => {
  const open = [...container.querySelectorAll('[data-testid^="ledger-open-"]')].pop();
  await act(async () => open.dispatchEvent(new MouseEvent("click", { bubbles: true })));
  const rows = [...document.body.querySelectorAll('[data-testid^="ledger-by-"]')].map((el) => el.closest("tr"));
  expect(rows.length).toBeGreaterThan(1);
  expect(rows[0].textContent).toMatch(/Top up paket/);
});

test("saldo saat ini di laporan sama dengan Saldo di daftar client, dan laporan terbuka di halaman terakhir", async () => {
  const rowEl = [...container.querySelectorAll('[data-testid^="ledger-client-"]')].pop();
  const listBalance = rowEl.querySelectorAll("td")[3].textContent.trim();
  const id = rowEl.getAttribute("data-testid").replace("ledger-client-", "");
  await act(async () => container.querySelector(`[data-testid="ledger-open-${id}"]`).dispatchEvent(new MouseEvent("click", { bubbles: true })));
  const dialog = document.body.querySelector('[data-testid="client-ledger-dialog"]');
  expect(dialog.querySelector('[data-testid="client-ledger-current-balance"]').textContent).toContain(listBalance);
  const balances = [...dialog.querySelectorAll("tbody tr")].map((tr) => tr.querySelectorAll("td")[8]?.textContent.trim());
  expect(balances[balances.length - 1]).toBe(listBalance);
});
