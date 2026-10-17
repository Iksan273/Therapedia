// @vitest-environment jsdom
// Pilihan layanan invoice asesmen: hanya master paket berflag `isAssessment`; tanpa paket asesmen tampil pesan (bukan semua paket).
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { AssessmentServiceSelect } from "@/shared/components/AssessmentServiceSelect";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const PKGS = [
  { id: "pkg-reguler", name: "Regular Therapist", credits: 10, price: 2500000, isAssessment: false },
  { id: "pkg-asesmen", name: "Paket Asesmen", credits: 0, price: 500000, isAssessment: true },
];

let root;
let container;
beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

test("tanpa paket asesmen: pesan arahan ke Master Paket, bukan daftar semua paket", async () => {
  await act(async () => root.render(<AssessmentServiceSelect packages={[PKGS[0]]} value="" onChange={() => {}} testId="svc" />));
  expect(container.querySelector('[data-testid="svc-empty"]').textContent).toContain("Belum ada paket asesmen");
  expect(container.querySelector('[data-testid="svc"]')).toBeNull();
});

test("ada paket asesmen: selector tampil (paket terapi tidak ikut jadi pilihan)", async () => {
  await act(async () => root.render(<AssessmentServiceSelect packages={PKGS} value="" onChange={() => {}} testId="svc" />));
  expect(container.querySelector('[data-testid="svc"]')).toBeTruthy();
  expect(container.querySelector('[data-testid="svc-empty"]')).toBeNull();
});
