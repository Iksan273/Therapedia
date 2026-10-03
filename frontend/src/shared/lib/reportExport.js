// Export laporan sesi (portal orang tua): dokumen cetak sederhana yang bisa disimpan sebagai PDF lewat dialog cetak browser.
// Tanpa dependency tambahan. Isi laporan di-escape agar aman dari injeksi HTML.

const esc = (v) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const block = (title, text) =>
  `<div class="block"><h3>${esc(title)}</h3><p>${text && String(text).trim() ? esc(text).replace(/\n/g, "<br/>") : '<em class="empty">Belum diisi</em>'}</p></div>`;

// items: [{ dateLabel, timeLabel, therapistName, activity, note, homework }]
// meta: { clientName, clientCode, branchName, generatedLabel }
export function buildSessionReportsHtml(items, meta = {}) {
  const sections = items
    .map(
      (it) => `<section class="session">
  <h2>${esc(it.dateLabel)} <span class="time">${esc(it.timeLabel)}</span></h2>
  <p class="meta">Praktisi: ${esc(it.therapistName || "—")}</p>
  ${block("Aktivitas Klinis Terapi", it.activity)}
  ${block("Catatan Evaluasi & Observasi Terapis", it.note)}
  ${block("PR & Latihan Mandiri di Rumah", it.homework)}
</section>`
    )
    .join("\n");

  return `<!doctype html>
<html lang="id"><head><meta charset="utf-8"/><title>Laporan Sesi Terapi — ${esc(meta.clientName)}</title>
<style>
  body{font-family:Arial,Helvetica,sans-serif;color:#0f172a;margin:32px;line-height:1.5}
  h1{font-size:20px;margin:0 0 4px} .sub{color:#475569;font-size:12px;margin-bottom:20px}
  .session{border:1px solid #cbd5e1;border-radius:10px;padding:14px 16px;margin-bottom:16px;page-break-inside:avoid}
  h2{font-size:15px;margin:0 0 2px} .time{font-weight:normal;color:#475569;font-size:12px;margin-left:8px}
  .meta{font-size:12px;color:#475569;margin:0 0 10px} h3{font-size:12px;margin:10px 0 2px;text-transform:uppercase;letter-spacing:.04em;color:#334155}
  p{font-size:13px;margin:0} .empty{color:#94a3b8}
  .footer{margin-top:24px;font-size:11px;color:#64748b}
  @media print{body{margin:12mm}}
</style></head>
<body>
  <h1>Laporan Sesi Terapi</h1>
  <div class="sub">Ananda <strong>${esc(meta.clientName)}</strong> • Kode ${esc(meta.clientCode)} • ${esc(meta.branchName || "Therapedia Developmental Center")}</div>
  ${sections || '<p class="empty">Tidak ada sesi.</p>'}
  <div class="footer">Dicetak ${esc(meta.generatedLabel || "")} • Therapedia Developmental Center</div>
</body></html>`;
}

// Buka jendela cetak (pengguna bisa memilih "Simpan sebagai PDF"). Mengembalikan false bila pop-up diblokir.
export function printHtmlDocument(html) {
  const win = typeof window !== "undefined" ? window.open("", "_blank") : null;
  if (!win) return false;
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();
  win.setTimeout(() => win.print(), 250);
  return true;
}
