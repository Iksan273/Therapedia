import { buildSessionReportsHtml } from "@/shared/lib/reportExport";

const items = [
  { dateLabel: "07/10/2030", timeLabel: "09:00–10:00", therapistName: "Ayu", activity: "Main <b>balok</b>", note: "Fokus baik\nkontak mata naik", homework: "" },
  { dateLabel: "14/10/2030", timeLabel: "09:00–10:00", therapistName: "Ayu", activity: "A", note: "B", homework: "C" },
];

test("laporan cetak: ringkasan, kartu per sesi, bagian kosong, dan escape HTML", () => {
  const html = buildSessionReportsHtml(items, { clientName: "Aira <x>", clientCode: "AE-00006", logoUrl: "http://x/logo.png" });
  expect(html).toContain("2 sesi · 1 terapis");
  expect(html.match(/class="session"/g)).toHaveLength(2);
  expect(html).toContain("Belum diisi");
  expect(html).toContain("Main &lt;b&gt;balok&lt;/b&gt;");
  expect(html).toContain("Aira &lt;x&gt;");
  expect(html).toContain("Fokus baik<br/>kontak mata naik");
  expect(html).toContain('src="http://x/logo.png"');
});
