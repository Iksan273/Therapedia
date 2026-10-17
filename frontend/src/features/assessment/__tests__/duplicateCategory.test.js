// @vitest-environment jsdom
// Mode demo: duplikat template (salin dalam section + soal) lalu ubah salinan tanpa memengaruhi template asal.
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import AppProviders from "@/app/providers/AppProviders";
import { ensureSeedsIfNeeded } from "@/data/seedRegistry";
import { useAssessments } from "@/stores/assessmentsStore";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let ctx;
function Probe() {
  ctx = useAssessments();
  return null;
}

let root;
let container;
beforeEach(async () => {
  window.localStorage.clear();
  await ensureSeedsIfNeeded();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => root.render(<AppProviders><Probe /></AppProviders>));
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

const count = (c) => c.sections.reduce((n, s) => n + s.questions.length, 0);

test("duplikat menyalin semua section & soal dengan id baru, kode jenis/nama baru; asal tidak berubah", async () => {
  const source = ctx.getCategory("cat-001");
  const before = JSON.stringify(source);
  let copy;
  await act(async () => { copy = await ctx.duplicateCategory("cat-001", { typeCode: "SP9", categoryName: "SP2 Versi Ringkas", respondentProfile: "teacher" }); });

  const stored = ctx.getCategory(copy.id);
  expect(stored).toMatchObject({ typeCode: "SP9", categoryName: "SP2 Versi Ringkas", respondentProfile: "teacher" });
  expect(stored.id).not.toBe("cat-001");
  expect(stored.sections).toHaveLength(source.sections.length);
  expect(count(stored)).toBe(count(source));
  expect(stored.sections[0].title).toBe(source.sections[0].title);
  expect(stored.sections[0].template).toBe(source.sections[0].template);

  // semua id section & soal baru (tidak berbagi dengan asal)
  const oldIds = new Set(source.sections.flatMap((s) => [s.sectionId, ...s.questions.map((q) => q.id)]));
  const newIds = stored.sections.flatMap((s) => [s.sectionId, ...s.questions.map((q) => q.id)]);
  expect(newIds.every((id) => !oldIds.has(id))).toBe(true);
  expect(new Set(newIds).size).toBe(newIds.length);

  expect(JSON.stringify(ctx.getCategory("cat-001"))).toBe(before);
});

test("salinan bisa diubah mandiri: hapus soal tak perlu & tambah soal baru; asal utuh", async () => {
  let copy;
  await act(async () => { copy = await ctx.duplicateCategory("cat-001", { typeCode: "SP9", categoryName: "Salinan" }); });
  const total = count(ctx.getCategory(copy.id));
  const firstSection = ctx.getCategory(copy.id).sections[0];

  await act(async () => { await ctx.deleteQuestion(copy.id, firstSection.sectionId, firstSection.questions[0].id); });
  await act(async () => { await ctx.createQuestion(copy.id, firstSection.sectionId, { question: "Soal tambahan", type: "free_text", options: [], required: false }); });
  await act(async () => { await ctx.createQuestion(copy.id, firstSection.sectionId, { question: "Soal tambahan 2", type: "free_text", options: [], required: false }); });
  await act(async () => { await ctx.deleteSection(copy.id, ctx.getCategory(copy.id).sections[1].sectionId); });

  const edited = ctx.getCategory(copy.id);
  expect(count(edited)).not.toBe(total);
  expect(edited.sections).toHaveLength(ctx.getCategory("cat-001").sections.length - 1);
  expect(count(ctx.getCategory("cat-001"))).toBe(65); // SP2 asli utuh
});

test("duplikat menyalin opsi sebagai array terpisah (ubah opsi salinan tidak mengubah asal)", async () => {
  let copy;
  await act(async () => { copy = await ctx.duplicateCategory("cat-006", { typeCode: "KN2", categoryName: "Konsultasi 2" }); });
  const src = ctx.getCategory("cat-006").sections.flatMap((s) => s.questions).find((q) => Array.isArray(q.options) && q.options.length);
  const dst = ctx.getCategory(copy.id).sections.flatMap((s) => s.questions).find((q) => q.question === src.question);
  expect(dst.options).toEqual(src.options);
  expect(dst.options).not.toBe(src.options);
});

test("reorderSections: urutan section mengikuti daftar id dan hanya kategori itu yang berubah", async () => {
  const cat = ctx.getCategory("cat-001");
  const reversed = cat.sections.map((s) => s.sectionId).reverse();
  const otherBefore = JSON.stringify(ctx.getCategory("cat-002"));
  await act(async () => { await ctx.reorderSections("cat-001", reversed); });
  expect(ctx.getCategory("cat-001").sections.map((s) => s.sectionId)).toEqual(reversed);
  expect(JSON.stringify(ctx.getCategory("cat-002"))).toBe(otherBefore);
  expect(count(ctx.getCategory("cat-001"))).toBe(65); // jumlah soal tidak berubah oleh urutan
});
