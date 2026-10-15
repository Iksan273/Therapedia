// @vitest-environment jsdom
// Kerangka loading shimmer: tampil sebagai region status yang terbaca pembaca layar, dan memakai kelas shimmer.
import { act } from "react";
import { createRoot } from "react-dom/client";
import { CardGridSkeleton, DetailSkeleton, ListSkeleton, TableSkeleton } from "@/shared/components/LoadingSkeletons";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let root;
let container;
beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

const render = (ui) => act(() => root.render(ui));
const byId = (id) => container.querySelector(`[data-testid="${id}"]`);

test("TableSkeleton: region status aria-busy dengan jumlah baris sesuai, sel memakai kelas shimmer", () => {
  render(<TableSkeleton rows={3} columns={2} label="Memuat data cabang…" testId="t" />);

  const el = byId("t");
  expect(el.getAttribute("role")).toBe("status");
  expect(el.getAttribute("aria-busy")).toBe("true");
  expect(el.textContent).toContain("Memuat data cabang…"); // teks untuk pembaca layar
  expect(el.children.length).toBe(1 + 3); // 1 label sr-only + 3 baris
  expect(el.querySelectorAll(".skeleton-shimmer").length).toBe(3 * (1 + 2)); // avatar + 2 sel per baris
});

test("CardGridSkeleton, ListSkeleton, DetailSkeleton menampilkan jumlah kerangka yang diminta", () => {
  render(
    <>
      <CardGridSkeleton count={4} testId="cards" />
      <ListSkeleton rows={2} testId="list" />
      <DetailSkeleton sections={3} testId="detail" />
    </>
  );

  expect(byId("cards").querySelectorAll(":scope > div").length).toBe(4);
  expect(byId("list").querySelectorAll(":scope > div").length).toBe(2);
  expect(byId("detail").querySelectorAll(":scope > div").length).toBe(1 + 3); // header + bagian
  expect(container.querySelectorAll("[aria-hidden='true'].skeleton-shimmer").length).toBeGreaterThan(10); // kerangka disembunyikan dari pembaca layar
});
