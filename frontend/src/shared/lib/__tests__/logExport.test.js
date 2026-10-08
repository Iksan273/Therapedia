import { buildLogDocumentHtml, safeFilename } from "@/shared/lib/logExport";
import { buildXlsx } from "@/shared/lib/xlsxWriter";

const spec = {
  title: "Riwayat Sesi",
  meta: [{ label: "Nama Anak", value: "Ayla <b>" }],
  columns: [{ key: "a", label: "Kolom A" }, { key: "b", label: "Angka", align: "right" }],
  rows: [{ a: "x & y", b: "1" }, { a: "", b: "2" }],
};

test("dokumen cetak meng-escape isi dan menampilkan strip untuk sel kosong", () => {
  const html = buildLogDocumentHtml(spec);
  expect(html).toContain("Ayla &lt;b&gt;");
  expect(html).toContain("x &amp; y");
  expect(html).toContain("<td class=\"\">—</td>");
});

test("tanpa baris menampilkan pesan kosong; nama file aman", () => {
  expect(buildLogDocumentHtml({ ...spec, rows: [] })).toContain("Tidak ada data.");
  expect(safeFilename("log kredit", "AE-00001 / Reg (10x)", "2026-10-08")).toBe("log-kredit-ae-00001-reg-10x-2026-10-08");
});

test("xlsx: arsip ZIP valid (signature, entri OOXML, isi ter-escape)", () => {
  const bytes = buildXlsx({ ...spec, generatedLabel: "08/10/2026" });
  expect(Array.from(bytes.slice(0, 4))).toEqual([0x50, 0x4b, 0x03, 0x04]); // "PK"
  const text = new TextDecoder().decode(bytes);
  ["[Content_Types].xml", "xl/workbook.xml", "xl/worksheets/sheet1.xml", "xl/styles.xml"].forEach((n) => expect(text).toContain(n));
  expect(text).toContain("x &amp; y");
  expect(text).toContain("Ayla &lt;b&gt;");
});
