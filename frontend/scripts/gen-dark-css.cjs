/* eslint-disable */
// Generator CSS mode gelap. Memindai semua class Tailwind warna (bg-, text-, border-, ring-, divide-) di src/
// dan menulis padanan gelapnya ke src/styles/dark-utilities.css, aktif hanya di bawah `.dark`.
// Jalankan ulang (`npm run gen:dark`) bila menambah class warna baru; otomatis dijalankan sebelum dev & build.
//
// Aturan pemetaan (ringkas):
//   bg-white / bg-slate-50..300  → permukaan gelap bertingkat
//   bg-<warna>-50..300           → warna dasar transparan (tint) di atas permukaan gelap
//   text-slate-500..950          → abu terang;  text-<warna>-600..950 → shade 400..200
//   border/ring/divide           → garis gelap / tint warna
//   bg solid (500+), text-white  → tidak diubah
const fs = require("fs");
const path = require("path");
const colors = require("tailwindcss/colors");
const resolveConfig = require("tailwindcss/resolveConfig");
const tailwindConfig = require("../tailwind.config.js");

const theme = resolveConfig(tailwindConfig).theme.colors;
const SRC = path.resolve(__dirname, "../src");
const OUT = path.join(SRC, "styles", "dark-utilities.css");

const NEUTRALS = ["slate", "gray", "zinc", "neutral", "stone"];
const FAMILIES = [...NEUTRALS, "red", "orange", "amber", "yellow", "lime", "green", "emerald", "teal", "cyan", "sky", "blue", "indigo", "violet", "purple", "fuchsia", "pink", "rose"];

const SURFACE = { white: "#111a2e", 50: "#151f36", 100: "#1a2540", 200: "#243252", 300: "#2e3f63" };
const NEUTRAL_TEXT = { 950: "#f1f5f9", 900: "#f1f5f9", 800: "#e2e8f0", 700: "#cbd5e1", 600: "#b3bfd1", 500: "#94a3b8" };
const NEUTRAL_BORDER = { white: "#26344f", 50: "#1c2742", 100: "#1c2742", 200: "#26344f", 300: "#334562", 400: "#475a7a" };
const TINT_BG = { 50: 0.1, 100: 0.16, 200: 0.24, 300: 0.32 };
const TINT_BORDER = { 50: 0.18, 100: 0.22, 200: 0.32, 300: 0.42, 400: 0.52 };
const COLOR_TEXT_SHADE = { 950: 200, 900: 200, 800: 200, 700: 300, 600: 400 };

const BREAKPOINTS = { sm: 640, md: 768, lg: 1024, xl: 1280, "2xl": 1536 };
const STATES = { hover: ":hover", focus: ":focus", "focus-visible": ":focus-visible", active: ":active", disabled: ":disabled" };
// Varian data-state shadcn/Radix, mis. data-[state=active]:bg-white → [data-state="active"]
const DATA_STATES = ["active", "inactive", "open", "closed", "checked", "unchecked", "on", "off"];
const DATA_VARIANT_RE = "data-\\[state=(?:" + DATA_STATES.join("|") + ")\\]";

const hexToRgb = (hex) => {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
};
const rgba = (hex, alpha) => {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${Math.round(alpha * 1000) / 1000})`;
};
const paletteHex = (family, shade) => {
  const entry = theme[family] || colors[family];
  return entry && entry[shade];
};

// Kembalikan { color } (nilai CSS) atau null bila token tidak perlu diubah
function darkColor(kind, family, shade, opacity) {
  const alpha = opacity == null ? 1 : opacity / 100;
  const isNeutral = NEUTRALS.includes(family);

  if (family === "white") {
    // Putih transparan tipis (bg-white/10) = efek kilap di atas area yang memang gelap: jangan diubah
    if (kind === "bg" && alpha >= 0.5) return rgba(SURFACE.white, alpha);
    return null; // text-white tetap putih; border-white / ring-white diabaikan
  }

  if (kind === "bg") {
    if (isNeutral) {
      const hex = SURFACE[shade];
      return hex ? rgba(hex, alpha) : null;
    }
    const a = TINT_BG[shade];
    const base = paletteHex(family, 500);
    return a && base ? rgba(base, a * alpha) : null;
  }

  if (kind === "text") {
    if (isNeutral) {
      const hex = NEUTRAL_TEXT[shade];
      return hex ? rgba(hex, alpha) : null;
    }
    const target = COLOR_TEXT_SHADE[shade];
    const hex = target && paletteHex(family, target);
    return hex ? rgba(hex, alpha) : null;
  }

  // border / ring / divide
  if (isNeutral) {
    const hex = NEUTRAL_BORDER[shade];
    return hex ? rgba(hex, alpha) : null;
  }
  const a = TINT_BORDER[shade];
  const base = paletteHex(family, 500);
  return a && base ? rgba(base, a * alpha) : null;
}

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "styles") continue;
      walk(full, files);
    } else if (/\.(js|jsx)$/.test(entry.name) && !/\.test\./.test(entry.name)) files.push(full);
  }
  return files;
}

const TOKEN_RE = /[A-Za-z0-9_\-:/.[\]=]+/g;
const COLOR_RE = new RegExp(
  `^((?:(?:${[...Object.keys(BREAKPOINTS), ...Object.keys(STATES), DATA_VARIANT_RE].join("|")}):)*)(bg|text|border|ring|divide|from|via|to)-(white|${FAMILIES.join("|")})(?:-(\\d{2,3}))?(?:/(\\d{1,3}))?$`
);

const tokens = new Set();
for (const file of walk(SRC)) {
  const text = fs.readFileSync(file, "utf8");
  for (const match of text.match(TOKEN_RE) || []) tokens.add(match);
}

const escapeToken = (t) => t.replace(/([:/.[\]=])/g, "\\$1");
const rules = new Map(); // key = media|selector → declaration

for (const token of [...tokens].sort()) {
  const m = COLOR_RE.exec(token);
  if (!m) continue;
  const [, prefix, kind, family, shadeRaw, opacityRaw] = m;
  if (family !== "white" && !shadeRaw) continue;
  const shade = shadeRaw ? Number(shadeRaw) : "white";
  // Titik gradasi (from/via/to) dipetakan seperti latar (bg)
  const value = darkColor(["from", "via", "to"].includes(kind) ? "bg" : kind, family, shade, opacityRaw ? Number(opacityRaw) : null);
  if (!value) continue;

  const variants = prefix.split(":").filter(Boolean);
  const media = variants.map((v) => BREAKPOINTS[v]).filter(Boolean)[0];
  const pseudo = variants
    .map((v) => {
      if (STATES[v]) return STATES[v];
      const d = /^data-\[state=(.+)\]$/.exec(v);
      return d ? `[data-state="${d[1]}"]` : "";
    })
    .join("");

  let selector = `.dark .${escapeToken(token)}${pseudo}`;
  let declaration;
  if (kind === "bg") declaration = `background-color: ${value};`;
  else if (kind === "text") declaration = `color: ${value};`;
  else if (kind === "border") declaration = `border-color: ${value};`;
  else if (kind === "ring") declaration = `--tw-ring-color: ${value};`;
  else if (kind === "from") declaration = `--tw-gradient-from: ${value} var(--tw-gradient-from-position);`;
  else if (kind === "to") declaration = `--tw-gradient-to: ${value} var(--tw-gradient-to-position);`;
  else if (kind === "via") declaration = `--tw-gradient-stops: var(--tw-gradient-from), ${value} var(--tw-gradient-via-position), var(--tw-gradient-to, rgba(0, 0, 0, 0));`;
  else {
    selector += " > :not([hidden]) ~ :not([hidden])";
    declaration = `border-color: ${value};`;
  }
  rules.set(`${media || 0}|${selector}`, declaration);
}

const lines = [
  "/* DIHASILKAN OTOMATIS oleh scripts/gen-dark-css.cjs — jangan diedit manual. Jalankan `npm run gen:dark`. */",
  "/* Padanan gelap untuk class warna Tailwind; aktif hanya di bawah `.dark` (AppLayout). */",
  "",
];
const base = [...rules].filter(([k]) => k.startsWith("0|"));
for (const [k, decl] of base) lines.push(`${k.slice(2)} { ${decl} }`);
for (const [bp, px] of Object.entries(BREAKPOINTS)) {
  const inMedia = [...rules].filter(([k]) => k.startsWith(`${px}|`));
  if (!inMedia.length) continue;
  lines.push("", `@media (min-width: ${px}px) {`);
  for (const [k, decl] of inMedia) lines.push(`  ${k.slice(String(px).length + 1)} { ${decl} }`);
  lines.push("}");
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
const next = lines.join("\n") + "\n";
const prev = fs.existsSync(OUT) ? fs.readFileSync(OUT, "utf8") : "";
if (prev !== next) fs.writeFileSync(OUT, next);
console.log(`dark-utilities.css: ${rules.size} aturan${prev === next ? " (tanpa perubahan)" : " (diperbarui)"}`);
