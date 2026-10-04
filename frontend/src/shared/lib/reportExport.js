// Export laporan sesi (portal orang tua): dokumen cetak bermerek yang bisa disimpan sebagai PDF lewat dialog cetak browser.
// Tanpa dependency tambahan. Isi laporan di-escape agar aman dari injeksi HTML.

const esc = (v) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

// Tiga bagian laporan: warna aksen + ikon emoji kecil agar mudah dipindai orang tua
const SECTIONS = [
  { key: "activity", title: "Aktivitas Klinis Terapi", cls: "act", icon: "🧩" },
  { key: "note", title: "Catatan Evaluasi & Observasi Terapis", cls: "note", icon: "📝" },
  { key: "homework", title: "PR & Latihan Mandiri di Rumah", cls: "hw", icon: "🏠" },
];

const block = (sec, text) =>
  `<div class="block ${sec.cls}"><h3><span class="ic">${sec.icon}</span>${esc(sec.title)}</h3><p>${
    text && String(text).trim() ? esc(text).replace(/\n/g, "<br/>") : '<em class="empty">Belum diisi</em>'
  }</p></div>`;

const STYLE = `
  *{box-sizing:border-box}
  @page{size:A4;margin:12mm}
  html{-webkit-print-color-adjust:exact;print-color-adjust:exact}
  body{font-family:"Segoe UI",Roboto,Arial,Helvetica,sans-serif;color:#0f172a;margin:0;padding:28px;line-height:1.55;background:#fff}
  .page{max-width:820px;margin:0 auto}
  .hero{background:linear-gradient(135deg,#007AFF 0%,#0A4FB8 100%);color:#fff;border-radius:16px;padding:22px 26px;display:flex;align-items:center;justify-content:space-between;gap:16px}
  .brand{display:flex;align-items:center;gap:14px}
  .logo{width:54px;height:54px;border-radius:14px;background:#fff;padding:5px;object-fit:contain}
  .brand .org{font-size:17px;font-weight:800;line-height:1.2}
  .brand .tag{font-size:11.5px;opacity:.85;margin-top:2px}
  .doc{text-align:right}
  .doc .t{font-size:11px;letter-spacing:.14em;text-transform:uppercase;opacity:.85}
  .doc .h{font-size:21px;font-weight:800;margin-top:2px}
  .info{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:16px 0 18px}
  .info div{background:#f1f7ff;border:1px solid #d6e8ff;border-radius:12px;padding:10px 12px}
  .info small{display:block;font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:#64748b;font-weight:700}
  .info b{display:block;font-size:13.5px;margin-top:2px;color:#0b2a5b;word-break:break-word}
  .intro{font-size:12.5px;color:#475569;margin:0 0 14px}
  .session{border:1px solid #dbe4ef;border-radius:14px;margin-bottom:16px;overflow:hidden;page-break-inside:avoid;break-inside:avoid}
  .s-head{display:flex;align-items:center;justify-content:space-between;gap:10px;background:#f8fafc;border-bottom:1px solid #e2e8f0;padding:11px 16px}
  .s-head .left{display:flex;align-items:center;gap:12px}
  .num{width:30px;height:30px;border-radius:50%;background:#007AFF;color:#fff;font-weight:800;font-size:13px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
  .s-head h2{font-size:14.5px;margin:0;font-weight:800;color:#0f172a}
  .s-head .time{font-size:11.5px;color:#64748b;font-weight:600}
  .chip{font-size:11px;font-weight:700;color:#0A4FB8;background:#e6f1ff;border:1px solid #c7e0ff;border-radius:999px;padding:3px 10px;white-space:nowrap}
  .s-body{padding:6px 16px 14px}
  .block{margin-top:10px;border-left:4px solid #94a3b8;background:#fbfdff;border-radius:0 10px 10px 0;padding:8px 12px}
  .block.act{border-color:#007AFF;background:#f1f7ff}
  .block.note{border-color:#7c3aed;background:#f7f3ff}
  .block.hw{border-color:#f59e0b;background:#fffaf0}
  h3{font-size:11px;margin:0 0 3px;text-transform:uppercase;letter-spacing:.07em;color:#334155;font-weight:800}
  .ic{margin-right:6px}
  .block p{font-size:13px;margin:0;color:#1e293b}
  .empty{color:#94a3b8}
  .note-box{margin-top:18px;border:1px dashed #b6d4fb;background:#f5faff;border-radius:12px;padding:11px 14px;font-size:11.5px;color:#475569}
  .footer{margin-top:18px;padding-top:10px;border-top:2px solid #007AFF;display:flex;justify-content:space-between;gap:12px;font-size:10.5px;color:#64748b}
  @media print{body{padding:0}}
  @media (max-width:640px){.info{grid-template-columns:repeat(2,1fr)}.hero{flex-direction:column;align-items:flex-start}.doc{text-align:left}}
`;

// items: [{ dateLabel, timeLabel, therapistName, activity, note, homework }]
// meta: { clientName, clientCode, branchName, generatedLabel, logoUrl }
export function buildSessionReportsHtml(items, meta = {}) {
  const branch = meta.branchName || "Therapedia Developmental Center";
  const therapistCount = new Set(items.map((it) => it.therapistName).filter(Boolean)).size;
  const logo = meta.logoUrl ? `<img class="logo" src="${esc(meta.logoUrl)}" alt="Therapedia"/>` : "";

  const sessions = items
    .map(
      (it, i) => `<section class="session">
  <div class="s-head">
    <div class="left"><span class="num">${i + 1}</span>
      <div><h2>${esc(it.dateLabel)}</h2><span class="time">${esc(it.timeLabel)}</span></div>
    </div>
    <span class="chip">👩‍⚕️ ${esc(it.therapistName || "—")}</span>
  </div>
  <div class="s-body">
    ${SECTIONS.map((sec) => block(sec, it[sec.key])).join("\n    ")}
  </div>
</section>`
    )
    .join("\n");

  return `<!doctype html>
<html lang="id"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Laporan Sesi Terapi — ${esc(meta.clientName)}</title>
<style>${STYLE}</style></head>
<body><div class="page">
  <header class="hero">
    <div class="brand">${logo}
      <div><div class="org">Therapedia Developmental Center</div><div class="tag">Pediatric Occupational &amp; Developmental Therapy</div></div>
    </div>
    <div class="doc"><div class="t">Dokumen</div><div class="h">Laporan Sesi Terapi</div></div>
  </header>

  <div class="info">
    <div><small>Nama Ananda</small><b>${esc(meta.clientName || "—")}</b></div>
    <div><small>Kode Client</small><b>${esc(meta.clientCode || "—")}</b></div>
    <div><small>Cabang</small><b>${esc(branch)}</b></div>
    <div><small>Ringkasan</small><b>${items.length} sesi · ${therapistCount || 1} terapis</b></div>
  </div>

  <p class="intro">Berikut ringkasan kegiatan, observasi, dan latihan di rumah dari setiap sesi terapi ananda, disusun oleh terapis yang menangani.</p>

  ${sessions || '<p class="empty">Tidak ada sesi.</p>'}

  <div class="note-box">💡 Latihan di rumah paling efektif bila dilakukan rutin dan menyenangkan. Bila ada pertanyaan tentang laporan ini, silakan hubungi admin cabang Anda.</div>

  <footer class="footer">
    <span>Dicetak ${esc(meta.generatedLabel || "")} • Therapedia Developmental Center</span>
    <span>Dokumen rahasia — hanya untuk orang tua/wali</span>
  </footer>
</div></body></html>`;
}

// Buka jendela cetak (pengguna bisa memilih "Simpan sebagai PDF"). Mengembalikan false bila pop-up diblokir.
// Menunggu logo selesai dimuat (maks. 1,5 dtk) supaya tidak hilang di hasil cetak.
export function printHtmlDocument(html) {
  const win = typeof window !== "undefined" ? window.open("", "_blank") : null;
  if (!win) return false;
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();
  let done = false;
  const go = () => {
    if (done) return;
    done = true;
    win.print();
  };
  const imgs = Array.from(win.document.images || []).filter((im) => !im.complete);
  if (imgs.length === 0) {
    win.setTimeout(go, 250);
  } else {
    let left = imgs.length;
    const tick = () => {
      left -= 1;
      if (left <= 0) win.setTimeout(go, 100);
    };
    imgs.forEach((im) => {
      im.addEventListener("load", tick);
      im.addEventListener("error", tick);
    });
    win.setTimeout(go, 1500);
  }
  return true;
}
