import { useRef } from "react";
import { useClients } from "@/stores/clientsStore";
import { useAssessmentDrafts } from "@/stores/assessmentDraftsStore";
import { isScoredQuestionType } from "@/features/assessment/components/masterData/assessmentConfig";
import { nowIso } from "@/shared/lib/id";
import { cleanRespondent, isAnswerFilled, respondentProfileOf } from "@/domain/assessment";
import { ENV, isApiMode } from "@/config/env";
import { api } from "@/services/http/httpClient";
import { ENDPOINTS } from "@/services/api/endpoints";
import { answersPatchToApi, draftFromApi, structureToCategory } from "@/services/api/mappers/assessmentMapper";

// Use-case pengisian kuesioner oleh ortu (publik, tanpa login). Fase API:
// getDraft → bagian dari GET /public/assessments/{code} (respons membawa draft),
// saveProgress → PUT /public/assessments/{code}/draft (patch jawaban + version, simpan otomatis),
// submit → POST /public/assessments/{code}/responses (validasi soal wajib + consent; draft dihapus di transaksi yang sama).
function useAssessmentFillActionsLocal() {
  const { updateClient } = useClients();
  const { getDraft, saveDraft, removeDraft } = useAssessmentDrafts();

  // `answers` = PATCH (nilai null menghapus jawaban). Kode yang belum punya draft otomatis dibuatkan.
  const saveProgress = ({ code, clientId, answers, respondent, respondentProfile, validQuestionIds, lastSectionId, consentAt }) => {
    saveDraft({ code, clientId, answers, respondent, respondentProfile, validQuestionIds, lastSectionId, consentAt });
  };

  // Kirim final (sekali isi). `questions` = daftar soal ter-render (id, itemNo, domain, question, type).
  const submit = ({ client, category, code, questions, answers, respondent = {}, consentAt }) => {
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
        // Snapshot section + template: hasil dipetakan lewat id section, bukan judul
        sectionId: q.sectionId || null,
        template: q.template || null,
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
        {
          code: usedCode,
          categoryId: category.id,
          categoryName: category.categoryName,
          submittedAt,
          consentAt: consentAt || submittedAt,
          // Data Pengisi (hanya key sesuai profil kategori); hasil lama tanpa kunci ini tampil "—"
          respondent: cleanRespondent(respondentProfileOf(category), respondent),
          answers: formattedAnswers,
        },
      ],
      // Status pipeline TIDAK berubah: client tetap "Asesmen Terjadwal" sampai sesi asesmen selesai (atau diubah manual).
    });
    removeDraft(usedCode); // draft bukan hasil: hilang bersama submit sukses
    return { ok: true, submittedAt };
  };

  return { getDraft, saveProgress, submit };
}

// Mode API (publik, tanpa login): kode adalah satu-satunya kunci.
// open   → GET /public/assessments/{code}: struktur (beku sejak draft pertama) + draft + rekening cabang; galat domain dilempar
//          sebagai ApiError (404, 409 already_submitted, 410 expired, 403 proof_required + invoice/bank_accounts di `body`).
// saveProgress → PUT …/draft (patch jawaban + respondent + version). Konflik versi (dua perangkat, 409): versi terbaru diambil lalu
//          patch dicoba sekali lagi (patch bersifat tambahan, aman diterapkan di atas draft terbaru).
// submit → POST …/responses (jawaban lengkap + respondent + consent); 422 incomplete memuat missing_question_ids /
//          missing_respondent_fields di `body`.
function useAssessmentFillActionsApi() {
  const versions = useRef(null); // versi draft server terakhir (kunci optimistic lock)

  const open = async (code) => {
    const data = await api.get(ENDPOINTS.publicAssessment.byCode(code));
    const category = structureToCategory(data.structure);
    // PDF section yang diunggah admin dilayani endpoint publik berkunci kode (render lewat pdf.js)
    category.sections = category.sections.map((s) =>
      s.hasDocumentFile ? { ...s, documentUrl: `${ENV.API_BASE_URL}${ENDPOINTS.publicAssessment.sectionDocument(code, s.sectionId)}`, documentIsPdf: true } : s
    );
    const draft = draftFromApi(data.draft, category);
    versions.current = draft?.version ?? null;
    return {
      category,
      client: { id: String(data.client.id), clientName: data.client.childName },
      draft,
      bankAccounts: data.bankAccounts || [],
      frozen: Boolean(data.frozen),
    };
  };

  const putDraft = (code, body) => api.put(ENDPOINTS.publicAssessment.draft(code), body);

  const saveProgress = async ({ code, answers, respondent, lastSectionId, consentAt }) => {
    const body = {
      answers: answersPatchToApi(answers),
      ...(respondent && Object.keys(respondent).length > 0 ? { respondent } : {}),
      ...(lastSectionId ? { lastSectionId: Number(lastSectionId) } : {}),
      consent: Boolean(consentAt),
    };
    try {
      const saved = await putDraft(code, { ...body, version: versions.current ?? undefined });
      versions.current = saved.version;
    } catch (err) {
      if (err?.status !== 409 || err?.code !== "version_conflict") throw err;
      const fresh = await api.get(ENDPOINTS.publicAssessment.byCode(code));
      versions.current = fresh.draft?.version ?? null;
      const saved = await putDraft(code, { ...body, version: versions.current ?? undefined });
      versions.current = saved.version;
    }
  };

  const submit = async ({ code, answers, respondent, consentAt }) => {
    const filled = Object.fromEntries(Object.entries(answers).filter(([, v]) => isAnswerFilled(v)));
    return api.post(ENDPOINTS.publicAssessment.submit(code), {
      answers: answersPatchToApi(filled),
      respondent: respondent || {},
      consent: Boolean(consentAt),
    });
  };

  // Bukti transfer invoice asesmen (JPG/PNG/PDF ≤ 5 MB). `processed` = hasil `processProofFile` (dataUrl) → diubah jadi file biner.
  const uploadProof = async (code, processed) => {
    const blob = await (await fetch(processed.dataUrl)).blob();
    const body = new FormData();
    body.append("file", new File([blob], processed.fileName, { type: processed.fileType || blob.type }));
    return api.upload(ENDPOINTS.publicAssessment.proof(code), body);
  };

  return { open, saveProgress, submit, uploadProof };
}

export const useAssessmentFillActions = isApiMode() ? useAssessmentFillActionsApi : useAssessmentFillActionsLocal;
