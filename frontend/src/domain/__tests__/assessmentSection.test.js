import {
  isLocalPdfUrl,
  isQuestionRequired,
  isValidDocumentUrl,
  requiredProgress,
  requiredQuestions,
  toDocumentEmbedUrl,
  unansweredRequired,
} from "@/domain/assessment";

const DOC_ID = "1S6hlRRTrXswUBPjOrnPAfXJzSPq_SJ8P8S3HzDhHGEk";

describe("dokumen section: link Google → URL embed", () => {
  test("Google Docs /edit, /view, parameter lain → /preview", () => {
    const expected = `https://docs.google.com/document/d/${DOC_ID}/preview`;
    expect(toDocumentEmbedUrl(`https://docs.google.com/document/d/${DOC_ID}/edit?usp=drive_link`)).toBe(expected);
    expect(toDocumentEmbedUrl(`https://docs.google.com/document/d/${DOC_ID}/edit?tab=t.0`)).toBe(expected);
    expect(toDocumentEmbedUrl(`https://docs.google.com/document/d/${DOC_ID}/view`)).toBe(expected);
    expect(toDocumentEmbedUrl(`  https://docs.google.com/document/d/${DOC_ID}  `)).toBe(expected);
  });

  test("dokumen yang dipublikasikan → /pub?embedded=true", () => {
    expect(toDocumentEmbedUrl("https://docs.google.com/document/d/e/2PACX-1vAbCdEfGhIjKlMn/pub")).toBe(
      "https://docs.google.com/document/d/e/2PACX-1vAbCdEfGhIjKlMn/pub?embedded=true"
    );
  });

  test("file Google Drive → /preview", () => {
    expect(toDocumentEmbedUrl(`https://drive.google.com/file/d/${DOC_ID}/view?usp=sharing`)).toBe(`https://drive.google.com/file/d/${DOC_ID}/preview`);
  });

  test("host selain Google, http, bukan dokumen, atau kosong → null", () => {
    expect(toDocumentEmbedUrl(`https://evil.example.com/document/d/${DOC_ID}/edit`)).toBeNull();
    expect(toDocumentEmbedUrl(`https://docs.google.com.evil.com/document/d/${DOC_ID}/edit`)).toBeNull();
    expect(toDocumentEmbedUrl(`http://docs.google.com/document/d/${DOC_ID}/edit`)).toBeNull();
    expect(toDocumentEmbedUrl("https://docs.google.com/spreadsheets/d/abc")).toBeNull();
    expect(toDocumentEmbedUrl("https://drive.google.com/drive/folders/xyz")).toBeNull();
    expect(toDocumentEmbedUrl("bukan url")).toBeNull();
    expect(toDocumentEmbedUrl("")).toBeNull();
    expect(toDocumentEmbedUrl(null)).toBeNull();
  });

  test("isValidDocumentUrl: link Google atau PDF lokal; selain itu ditolak", () => {
    expect(isValidDocumentUrl(`https://docs.google.com/document/d/${DOC_ID}/edit`)).toBe(true);
    expect(isValidDocumentUrl("/documents/kesepakatan-asesmen.pdf")).toBe(true);
    expect(isValidDocumentUrl("https://contoh.com/dokumen.pdf")).toBe(false);
  });

  test("isLocalPdfUrl hanya menerima /documents/*.pdf same-origin", () => {
    expect(isLocalPdfUrl("/documents/kesepakatan.PDF")).toBe(true);
    expect(isLocalPdfUrl("/documents/../secret.pdf")).toBe(false);
    expect(isLocalPdfUrl("/documents/sub/a.pdf")).toBe(false);
    expect(isLocalPdfUrl("//evil.com/documents/a.pdf")).toBe(false);
    expect(isLocalPdfUrl("/images/a.pdf")).toBe(false);
    expect(isLocalPdfUrl("/documents/a.html")).toBe(false);
    expect(isLocalPdfUrl("")).toBe(false);
  });
});

describe("soal wajib / opsional", () => {
  const questions = [{ id: "a" }, { id: "b", required: false }, { id: "c", required: true }, { id: "d" }];

  test("tanpa flag = wajib; hanya required:false yang opsional", () => {
    expect(isQuestionRequired({})).toBe(true);
    expect(isQuestionRequired({ required: true })).toBe(true);
    expect(isQuestionRequired({ required: false })).toBe(false);
    expect(isQuestionRequired(undefined)).toBe(true);
    expect(requiredQuestions(questions).map((q) => q.id)).toEqual(["a", "c", "d"]);
  });

  test("unansweredRequired mengabaikan soal opsional kosong; jawaban 0 dihitung terisi", () => {
    expect(unansweredRequired(questions, { a: 0, c: "x" }).map((q) => q.id)).toEqual(["d"]);
    expect(unansweredRequired(questions, { a: 1, c: "x", d: "   " }).map((q) => q.id)).toEqual(["d"]);
    expect(unansweredRequired(questions, { a: 1, c: "x", d: "ok" })).toEqual([]);
  });

  test("requiredProgress: 100% walau soal opsional kosong; soal opsional terisi tidak menambah", () => {
    expect(requiredProgress(questions, { a: 1, c: 1, d: 1 })).toEqual({ answered: 3, total: 3, percent: 100 });
    expect(requiredProgress(questions, { a: 1, b: "isi", c: 1 })).toEqual({ answered: 2, total: 3, percent: 67 });
    expect(requiredProgress([{ id: "x", required: false }], {})).toEqual({ answered: 0, total: 0, percent: 100 });
  });
});
