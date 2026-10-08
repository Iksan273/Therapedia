// Export log berbentuk tabel (riwayat sesi client, Log Kredit & Saldo Finance): dokumen bermerek siap cetak/PDF dan file Excel
// (.xlsx asli lewat `xlsxWriter.js`). Tanpa dependency tambahan; isi di-escape.
// Spesifikasi: { title, subtitle?, meta: [{ label, value }], columns: [{ key, label, align?, width? }], rows: [{...}], generatedLabel?, logoUrl? }
// `rows` berisi teks yang sudah diformat pemanggil (tanggal, rupiah, label status).

const esc = (v) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const cell = (v) => (v === null || v === undefined || v === "" ? "—" : esc(v).replace(/\n/g, "<br/>"));

const STYLE = `
  *{box-sizing:border-box}
  @page{size:A4 landscape;margin:10mm}
  html{-webkit-print-color-adjust:exact;print-color-adjust:exact}
  body{font-family:"Segoe UI",Roboto,Arial,Helvetica,sans-serif;color:#0f172a;margin:0;padding:24px;line-height:1.45;background:#fff}
  .hero{background:linear-gradient(135deg,#007AFF 0%,#0A4FB8 100%);color:#fff;border-radius:14px;padding:16px 22px;display:flex;align-items:center;justify-content:space-between;gap:16px}
  .brand{display:flex;align-items:center;gap:12px}
  .logo{width:46px;height:46px;border-radius:12px;background:#fff;padding:4px;object-fit:contain}
  .org{font-size:15px;font-weight:800}
  .tag{font-size:11px;opacity:.85;margin-top:2px}
  .doc{text-align:right}
  .doc .t{font-size:10px;letter-spacing:.14em;text-transform:uppercase;opacity:.85}
  .doc .h{font-size:18px;font-weight:800;margin-top:2px}
  .meta{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;margin:14px 0}
  .meta div{background:#f1f7ff;border:1px solid #d6e8ff;border-radius:10px;padding:8px 11px}
  .meta small{display:block;font-size:9.5px;letter-spacing:.08em;text-transform:uppercase;color:#64748b;font-weight:700}
  .meta b{display:block;font-size:12.5px;margin-top:1px;color:#0b2a5b;word-break:break-word}
  table{width:100%;border-collapse:collapse;font-size:11px}
  thead{display:table-header-group}
  th{background:#0A4FB8;color:#fff;text-align:left;font-weight:700;padding:8px 9px;font-size:10.5px;letter-spacing:.03em}
  td{padding:7px 9px;border-bottom:1px solid #e2e8f0;vertical-align:top}
  tr{page-break-inside:avoid;break-inside:avoid}
  tbody tr:nth-child(even) td{background:#f8fafc}
  .r{text-align:right;font-variant-numeric:tabular-nums}
  .c{text-align:center}
  .empty{color:#94a3b8;text-align:center;padding:18px}
  .footer{margin-top:14px;padding-top:8px;border-top:2px solid #007AFF;display:flex;justify-content:space-between;gap:12px;font-size:10px;color:#64748b}
  @media print{body{padding:0}}
`;

const alignClass = (c) => (c.align === "right" ? "r" : c.align === "center" ? "c" : "");

export function buildLogDocumentHtml({ title, subtitle = "", meta = [], columns = [], rows = [], generatedLabel = "", logoUrl = "" }) {
  const logo = logoUrl ? `<img class="logo" src="${esc(logoUrl)}" alt="Therapedia"/>` : "";
  const head = columns.map((c) => `<th class="${alignClass(c)}"${c.width ? ` style="width:${esc(c.width)}"` : ""}>${esc(c.label)}</th>`).join("");
  const body = rows.length
    ? rows.map((r) => `<tr>${columns.map((c) => `<td class="${alignClass(c)}">${cell(r[c.key])}</td>`).join("")}</tr>`).join("\n")
    : `<tr><td class="empty" colspan="${columns.length}">Tidak ada data.</td></tr>`;
  const metaHtml = [...meta, { label: "Jumlah Baris", value: String(rows.length) }]
    .map((m) => `<div><small>${esc(m.label)}</small><b>${esc(m.value || "—")}</b></div>`)
    .join("");

  return `<!doctype html>
<html lang="id"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${esc(title)}</title>
<style>${STYLE}</style></head>
<body>
  <header class="hero">
    <div class="brand">${logo}<div><div class="org">Therapedia Developmental Center</div><div class="tag">Pediatric Occupational &amp; Developmental Therapy</div></div></div>
    <div class="doc"><div class="t">${esc(subtitle || "Dokumen")}</div><div class="h">${esc(title)}</div></div>
  </header>
  <div class="meta">${metaHtml}</div>
  <table><thead><tr>${head}</tr></thead><tbody>
${body}
  </tbody></table>
  <footer class="footer"><span>Dicetak ${esc(generatedLabel)} • Therapedia Developmental Center</span><span>Dokumen internal — rahasia</span></footer>
</body></html>`;
}

export const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

// Simpan data (Uint8Array / string) sebagai file unduhan. Mengembalikan false bila lingkungan tidak mendukung (mis. tanpa DOM).
export function downloadFile(filename, content, mime = XLSX_MIME) {
  if (typeof document === "undefined" || typeof URL === "undefined" || !URL.createObjectURL) return false;
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}

// Nama file aman: huruf/angka/strip.
export const safeFilename = (...parts) =>
  parts
    .filter(Boolean)
    .join("-")
    .replace(/[^\w-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
