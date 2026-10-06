// @vitest-environment jsdom
// Tautan /assessment?code=XXX langsung memproses kode tanpa ortu mengetik.
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import AppProviders from "@/app/providers/AppProviders";
import { ensureSeedsIfNeeded } from "@/data/seedRegistry";
import AssessmentFill from "@/features/assessment/pages/AssessmentFill";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
globalThis.ResizeObserver = globalThis.ResizeObserver || class { observe() {} unobserve() {} disconnect() {} }; // dipakai Radix di kuesioner

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

const renderAt = (url) => act(async () => root.render(<AppProviders><MemoryRouter initialEntries={[url]}><AssessmentFill /></MemoryRouter></AppProviders>));

test("kode valid di link langsung membuka kuesioner (atau langkah unggah bukti)", async () => {
  await renderAt("/assessment?code=ASM-2016");
  expect(container.querySelector('[data-testid="assessment-question-form"], [data-testid="assessment-proof-card"]')).toBeTruthy();
  expect(container.querySelector('[data-testid="assessment-code-form"]')).toBeFalsy();
});

test("kode tidak dikenal di link tetap di form kode dengan pesan error", async () => {
  await renderAt("/assessment?code=ZZZ-NOPE");
  expect(container.querySelector('[data-testid="assessment-code-error"]')).toBeTruthy();
});

test("tanpa kode di link: form kode kosong seperti biasa", async () => {
  await renderAt("/assessment");
  expect(container.querySelector('[data-testid="assessment-code-form"]')).toBeTruthy();
  expect(container.querySelector('[data-testid="assessment-code-error"]')).toBeFalsy();
});
