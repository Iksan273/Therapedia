import { describe, it, expect } from "vitest";
import { moveId, moveIdTo, suggestCopyName, suggestCopyTypeCode } from "@/domain/assessment";

describe("salinan template", () => {
  it("kode jenis salinan: {kode}C lalu C2, C3 ... (maks 10 karakter, belum dipakai)", () => {
    expect(suggestCopyTypeCode("SP2", ["SP2", "SCP"])).toBe("SP2C");
    expect(suggestCopyTypeCode("SP2", ["SP2", "SP2C"])).toBe("SP2C2");
    expect(suggestCopyTypeCode("SP2", ["sp2c", "SP2C2"])).toBe("SP2C3");
    expect(suggestCopyTypeCode("ABCDEFGHIJ", [])).toBe("ABCDEFGHIC");
    expect(suggestCopyTypeCode("", [])).toBe("ASMC");
  });

  it("nama salinan: (Salinan), (Salinan 2), ... tanpa menumpuk akhiran", () => {
    expect(suggestCopyName("Child Sensory", ["Child Sensory"])).toBe("Child Sensory (Salinan)");
    expect(suggestCopyName("Child Sensory", ["Child Sensory (Salinan)"])).toBe("Child Sensory (Salinan 2)");
    expect(suggestCopyName("Child Sensory (Salinan)", ["Child Sensory (Salinan)"])).toBe("Child Sensory (Salinan 2)");
    expect(suggestCopyName("Child Sensory", ["child sensory (salinan)", "Child Sensory (Salinan 2)"])).toBe("Child Sensory (Salinan 3)");
  });
});

describe("urutan section", () => {
  const ids = ["a", "b", "c", "d"];

  it("moveId naik / turun, di luar batas tidak berubah (referensi sama)", () => {
    expect(moveId(ids, "b", -1)).toEqual(["b", "a", "c", "d"]);
    expect(moveId(ids, "b", 1)).toEqual(["a", "c", "b", "d"]);
    expect(moveId(ids, "a", -1)).toBe(ids);
    expect(moveId(ids, "d", 1)).toBe(ids);
    expect(moveId(ids, "x", 1)).toBe(ids);
  });

  it("moveIdTo (seret & lepas) ke posisi target, ke depan maupun ke belakang", () => {
    expect(moveIdTo(ids, "d", "a")).toEqual(["d", "a", "b", "c"]);
    expect(moveIdTo(ids, "a", "c")).toEqual(["b", "c", "a", "d"]);
    expect(moveIdTo(ids, "b", "b")).toBe(ids);
    expect(moveIdTo(ids, "x", "a")).toBe(ids);
  });
});
