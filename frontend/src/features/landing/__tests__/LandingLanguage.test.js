// @vitest-environment jsdom
// Landing page dua bahasa: default Indonesia, bisa diganti ke Inggris dan kembali; pilihan tersimpan.
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import Home from "@/features/landing/pages/Home";
import { localizeItem } from "@/features/landing/i18n/LanguageContext";
import { CLINICAL_PROGRAMS, CLINICAL_TEAM, KNOWLEDGE_ARTICLES, CLINICAL_PILLARS, CLINICAL_BRANCHES } from "@/features/landing/data/landingData";
import { ARTICLES_ID, BRANCHES_ID, PILLARS_ID, PROGRAMS_ID, TEAM_ID, hoursForLang } from "@/features/landing/data/landingDataId";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
// jsdom tidak punya IntersectionObserver / scrollIntoView
globalThis.IntersectionObserver = globalThis.IntersectionObserver || class { observe() {} unobserve() {} disconnect() {} };
window.HTMLElement.prototype.scrollIntoView = window.HTMLElement.prototype.scrollIntoView || (() => {});

let root;
let container;
beforeEach(async () => {
  window.localStorage.clear();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => root.render(<MemoryRouter><Home /></MemoryRouter>));
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

const q = (id) => container.querySelector(`[data-testid="${id}"]`);

test("default Indonesia, ganti ke Inggris, lalu kembali; pilihan tersimpan di browser", async () => {
  expect(container.textContent).toContain("Mengapa Kami");
  expect(container.textContent).toContain("Jadwalkan Konsultasi Klinis");
  expect(container.textContent).not.toContain("Why Us");

  await act(async () => q("landing-lang-en").click());
  expect(container.textContent).toContain("Why Us");
  expect(container.textContent).toContain("Book Clinical Consultation");
  expect(container.textContent).not.toContain("Mengapa Kami");
  expect(JSON.stringify(window.localStorage)).toContain("landing_lang");

  await act(async () => q("landing-lang-id").click());
  expect(container.textContent).toContain("Mengapa Kami");
  expect(container.textContent).toContain("Tonggak Perkembangan Anak");
});

test("konten data (program, tim, artikel) mengikuti bahasa", async () => {
  expect(container.textContent).toContain("Intervensi Terapi Okupasi Reguler");
  expect(container.textContent).toContain("Memahami Sensory Integration");
  await act(async () => q("landing-lang-en").click());
  expect(container.textContent).toContain("Regular Occupational Therapy Intervention");
  expect(container.textContent).toContain("Understanding Sensory Integration");
});

test("setiap item data punya terjemahan Indonesia lengkap", () => {
  const needs = [
    [CLINICAL_PILLARS, PILLARS_ID, ["title", "desc", "badge"]],
    [CLINICAL_PROGRAMS, PROGRAMS_ID, ["title", "shortTitle", "ageGroup", "category", "desc", "fullDesc", "benefits"]],
    [CLINICAL_TEAM, TEAM_ID, ["role", "department", "bio", "specialties"]],
    [CLINICAL_BRANCHES, BRANCHES_ID, ["name", "facilities"]],
    [KNOWLEDGE_ARTICLES, ARTICLES_ID, ["title", "category", "date", "excerpt", "content"]],
  ];
  needs.forEach(([items, table, fields]) => {
    items.forEach((item) => {
      fields.forEach((f) => expect(table[item.id]?.[f], `${item.id}.${f}`).toBeTruthy());
    });
  });
  // jumlah butir manfaat/fasilitas/keahlian sama dengan versi asli
  CLINICAL_PROGRAMS.forEach((p) => expect(PROGRAMS_ID[p.id].benefits).toHaveLength(p.benefits.length));
  CLINICAL_BRANCHES.forEach((b) => expect(BRANCHES_ID[b.id].facilities).toHaveLength(b.facilities.length));
  CLINICAL_TEAM.forEach((m) => expect(TEAM_ID[m.id].specialties).toHaveLength(m.specialties.length));
});

test("localizeItem dan jam layanan", () => {
  expect(localizeItem(CLINICAL_PILLARS[0], PILLARS_ID, "en")).toBe(CLINICAL_PILLARS[0]);
  expect(localizeItem(CLINICAL_PILLARS[0], PILLARS_ID, "id").title).toBe("Tim Berpengalaman");
  expect(localizeItem({ id: "tidak-ada", title: "X" }, PILLARS_ID, "id").title).toBe("X");
  expect(hoursForLang("Senin – Sabtu: 08.00 – 17.00 WIB", "en")).toBe("Monday – Saturday: 08.00 – 17.00 WIB");
  expect(hoursForLang("Senin – Minggu: 09.00 – 18.00 WIB", "id")).toBe("Senin – Minggu: 09.00 – 18.00 WIB");
});
