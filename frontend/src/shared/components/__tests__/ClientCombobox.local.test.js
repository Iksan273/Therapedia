// @vitest-environment jsdom
// ClientCombobox mode demo / daftar turunan: disaring di klien, tampil 10 per 10 (infinite scroll), cari tetap jalan.
import React, { act, useState } from "react";
import { createRoot } from "react-dom/client";
import { ensureSeedsIfNeeded } from "@/data/seedRegistry";
import { ClientCombobox } from "@/shared/components/ClientCombobox";

// Provider aplikasi dimuat dinamis (batas lapisan: shared/ tidak boleh import app/ secara statis, sama seperti tes API)
const { default: AppProviders } = await import("@/app/providers/AppProviders");

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
globalThis.ResizeObserver = globalThis.ResizeObserver || class { observe() {} unobserve() {} disconnect() {} };
globalThis.scrollTo = globalThis.scrollTo || (() => {});
Element.prototype.scrollIntoView = Element.prototype.scrollIntoView || (() => {});

const CLIENTS = Array.from({ length: 25 }, (_, i) => ({
  id: `c${i + 1}`, clientName: `Anak ${String(i + 1).padStart(2, "0")}`, parentName: i % 5 === 0 ? "Budi Santoso" : "Ortu Lain", clientCode: `AE-${String(i + 1).padStart(5, "0")}`,
}));

let changes;
function Harness(props) {
  const [value, setValue] = useState(props.initial || "");
  return <ClientCombobox clients={CLIENTS} value={value} onChange={(id, client) => { changes.push([id, client?.clientName ?? null]); setValue(id); }} testId="cc" {...props.extra} />;
}

let root;
let container;
const el = (id) => document.querySelector(`[data-testid="${id}"]`);
const optionCount = () => document.querySelectorAll('[data-testid^="cc-option-"]').length;

beforeEach(async () => {
  changes = [];
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

const mount = (props = {}) => act(async () => root.render(<AppProviders><Harness {...props} /></AppProviders>));
const open = () => act(async () => el("cc").click());

test("tampil 10 dulu, gulir (tombol cadangan tanpa IntersectionObserver) memuat 10 berikutnya sampai habis", async () => {
  await mount();
  expect(optionCount()).toBe(0); // belum dibuka: tidak ada daftar
  await open();
  expect(optionCount()).toBe(10);
  expect(el("cc-load-more")).toBeTruthy();

  await act(async () => el("cc-load-more").click());
  expect(optionCount()).toBe(20);
  await act(async () => el("cc-load-more").click());
  expect(optionCount()).toBe(25);
  expect(el("cc-load-more")).toBeNull(); // habis
});

test("infinite scroll lewat IntersectionObserver: sentinel terlihat -> halaman berikutnya", async () => {
  let trigger;
  globalThis.IntersectionObserver = class {
    constructor(cb) { trigger = () => cb([{ isIntersecting: true }]); }
    observe() {}
    disconnect() {}
  };
  try {
    await mount();
    await open();
    expect(optionCount()).toBe(10);
    await act(async () => trigger());
    expect(optionCount()).toBe(20);
  } finally {
    delete globalThis.IntersectionObserver;
  }
});

test("cari tetap bisa di tengah infinite scroll: per kata (nama anak / ortu / kode), hasil kembali ke halaman pertama", async () => {
  await mount();
  await open();
  await act(async () => el("cc-load-more").click());
  expect(optionCount()).toBe(20);

  const input = el("cc-search");
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
  await act(async () => { setter.call(input, "budi"); input.dispatchEvent(new Event("input", { bubbles: true })); });
  expect(optionCount()).toBe(5); // 5 anak dengan ortu "Budi Santoso" (1, 6, 11, 16, 21)
  expect(el("cc-load-more")).toBeNull();

  await act(async () => { setter.call(input, "AE-00007"); input.dispatchEvent(new Event("input", { bubbles: true })); });
  expect(optionCount()).toBe(1);

  await act(async () => { setter.call(input, "zzz"); input.dispatchEvent(new Event("input", { bubbles: true })); });
  expect(optionCount()).toBe(0);
  expect(el("cc-empty").textContent).toContain("tidak ditemukan");
});

test("memilih client memanggil onChange(id, objek client) dan label tombol memuat nama + ortu", async () => {
  await mount();
  await open();
  await act(async () => el("cc-option-c3").click());
  expect(changes).toEqual([["c3", "Anak 03"]]);
  expect(el("cc").textContent).toContain("Anak 03 (Ortu Lain)");
  expect(optionCount()).toBe(0); // popover tertutup
});

test("opsi 'Semua' (allOption) tampil hanya saat tidak mencari", async () => {
  await mount({ extra: { allOption: { value: "all", label: "Semua Client (25)" } }, initial: "all" });
  expect(el("cc").textContent).toContain("Semua Client (25)");
  await open();
  expect(el("cc-option-all")).toBeTruthy();
  const input = el("cc-search");
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
  await act(async () => { setter.call(input, "anak"); input.dispatchEvent(new Event("input", { bubbles: true })); });
  expect(el("cc-option-all")).toBeNull();
});
