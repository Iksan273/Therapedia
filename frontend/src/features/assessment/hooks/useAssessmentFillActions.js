import { useClients } from "@/stores/clientsStore";
import { useAssessmentDrafts } from "@/stores/assessmentDraftsStore";
import { isScoredQuestionType } from "@/features/assessment/components/masterData/assessmentConfig";
import { nowIso } from "@/shared/lib/id";
import { isAnswerFilled } from "@/domain/assessment";

// Use-case pengisian kuesioner oleh ortu (publik, tanpa login). Fase API:
// getDraft → bagian dari GET /public/assessments/{code} (respons membawa draft),
// saveProgress → PUT /public/assessments/{code}/draft (patch jawaban + version, simpan otomatis),
// submit → POST /public/assessments/{code}/responses (validasi soal wajib + consent; draft dihapus di transaksi yang sama).
export function useAssessmentFillActions() {
  const { updateClient } = useClients();
  const { getDraft, saveDraft, removeDraft } = useAssessmentDrafts();

  // `answers` = PATCH (nilai null menghapus jawaban). Kode yang belum punya draft otomatis dibuatkan.
  const saveProgress = ({ code, clientId, answers, validQuestionIds, lastSectionId, consentAt }) => {
    saveDraft({ code, clientId, answers, validQuestionIds, lastSectionId, consentAt });
  };

  // Kirim final (sekali isi). `questions` = daftar soal ter-render (id, itemNo, quadrant, domain, question, type).
  const submit = ({ client, category, code, questions, answers, consentAt }) => {
    const usedCode = String(code || "").trim().toUpperCase();
    const submittedAt = nowIso();
    const formattedAnswers = questions.map((q) => {
      const val = answers[q.id];
      let score = null;
      if (!isScoredQuestionType(q.type) || !isAnswerFilled(val)) score = null;
      else if (typeof val === "number") score = val;
      else if (typeof val === "string" && /^\d+/.test(val)) score = parseInt(val.match(/^\d+/)[0], 10);
      return {
        questionId: q.id,
        itemNo: q.itemNo,
        quadrant: q.quadrant,
        domain: q.domain || "Umum",
        question: q.question,
        // Soal opsional boleh kosong: jawaban "" (bukan "undefined"), tanpa skor
        answer: !isAnswerFilled(val) ? "" : Array.isArray(val) ? val.join(", ") : String(val),
        score,
      };
    });

    // Satu entri per KODE (client bisa punya beberapa kode sekategori); entri lama tanpa `code` dipertahankan.
    const filteredExisting = (client.assessmentAnswers || []).filter((a) => String(a.code || "").toUpperCase() !== usedCode);
    updateClient(client.id, {
      assessmentCodes: (client.assessmentCodes || []).map((c) =>
        c.code && c.code.toUpperCase() === usedCode ? { ...c, status: "submitted", submittedAt } : c
      ),
      assessmentAnswers: [
        ...filteredExisting,
        { code: usedCode, categoryId: category.id, categoryName: category.categoryName, submittedAt, consentAt: consentAt || submittedAt, answers: formattedAnswers },
      ],
      // Status pipeline TIDAK berubah: client tetap "Asesmen Terjadwal" sampai sesi asesmen selesai (atau diubah manual).
    });
    removeDraft(usedCode); // draft bukan hasil: hilang bersama submit sukses
    return { ok: true, submittedAt };
  };

  return { getDraft, saveProgress, submit };
}
