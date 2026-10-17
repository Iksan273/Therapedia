import { describe, it, expect } from "vitest";
import {
  applyDraftPatch,
  cleanRespondent,
  diffRespondent,
  missingRespondentFields,
  respondentFields,
  respondentFormatErrors,
  respondentProfileOf,
} from "@/domain/assessment";

describe("profil Data Pengisi", () => {
  it("definisi field per profil", () => {
    expect(respondentFields("none")).toEqual([]);
    expect(respondentFields("parent").map((f) => f.key)).toEqual(["name", "relation", "phone", "email"]);
    expect(respondentFields("teacher").map((f) => f.key)).toEqual(["name", "relation", "school", "class", "phone", "email"]);
  });

  it("kategori tanpa respondentProfile = tanpa langkah (alur lama tidak berubah)", () => {
    expect(respondentProfileOf({})).toBe("none");
    expect(respondentProfileOf(null)).toBe("none");
    expect(respondentProfileOf({ respondentProfile: "aneh" })).toBe("none");
    expect(respondentProfileOf({ respondentProfile: "teacher" })).toBe("teacher");
  });

  it("field wajib yang belum terisi", () => {
    expect(missingRespondentFields("parent", { phone: "0812" })).toEqual(["name", "relation"]);
    expect(missingRespondentFields("teacher", { name: "Bu Ani", relation: "Guru kelas" })).toEqual(["school", "class"]);
    expect(missingRespondentFields("none", {})).toEqual([]);
    expect(missingRespondentFields("parent", { name: "   ", relation: "Ibu" })).toEqual(["name"]);
  });

  it("cleanRespondent: hanya key profil, trim, kosong dibuang", () => {
    expect(cleanRespondent("parent", { name: "  Siti ", relation: "", junk: "x", school: "SD" })).toEqual({ name: "Siti" });
  });

  it("format email dan HP", () => {
    expect(respondentFormatErrors("parent", { email: "salah", phone: "abc" })).toEqual({ email: "Format email tidak valid.", phone: "Format nomor HP tidak valid." });
    expect(respondentFormatErrors("parent", { email: "a@b.co", phone: "0812-3456" })).toEqual({});
    expect(respondentFormatErrors("parent", {})).toEqual({});
  });

  it("diffRespondent: patch, null untuk yang dihapus", () => {
    expect(diffRespondent({ name: "A" }, { name: "A", relation: "Ibu" })).toEqual({ relation: "Ibu" });
    expect(diffRespondent({ name: "A", phone: "1" }, { name: "A" })).toEqual({ phone: null });
    expect(diffRespondent({ name: "A" }, { name: "A " })).toEqual({});
  });

  it("applyDraftPatch menggabungkan respondent dan membuang key di luar profil", () => {
    const d1 = applyDraftPatch(null, { code: "SP2-X", clientId: "c1", respondent: { name: "Siti", junk: "x" }, respondentProfile: "parent" }, "2026-10-17T00:00:00Z");
    expect(d1.respondent).toEqual({ name: "Siti" });
    const d2 = applyDraftPatch(d1, { code: "SP2-X", clientId: "c1", respondent: { relation: "Ibu", name: null }, respondentProfile: "parent" }, "2026-10-17T00:01:00Z");
    expect(d2.respondent).toEqual({ relation: "Ibu" });
    expect(d2.version).toBe(2);
  });
});
