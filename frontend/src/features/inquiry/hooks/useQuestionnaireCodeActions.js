import { useClients } from "@/stores/clientsStore";
import { isQuestionnaireCodeFilled, advanceStatus } from "@/domain/client";
import { buildQuestionnaireCode, buildExpiresAt } from "@/domain/assessment";
import { nowIso, todayStr } from "@/shared/lib/id";

// Use-case kode kuesioner. Fase API: issueCode → POST /clients/{id}/assessment-codes (kode = kode jenis asesmen + acak,
// masa berlaku opsional); deleteCode → DELETE /clients/{id}/assessment-codes/{code}
// (hanya kode berstatus `issued`; jejak pelaku di `deleted_by`).
export function useQuestionnaireCodeActions() {
  const { clients, updateClient } = useClients();

  // Semua kode kuesioner yang sudah ada (untuk memastikan kode baru unik).
  const allCodes = () => clients.flatMap((c) => (c.assessmentCodes || []).map((a) => a.code));

  // Buat kode baru (belum disimpan) untuk pratinjau di dialog.
  const previewCode = (category) => buildQuestionnaireCode(category, allCodes());

  // Terbitkan kode kuesioner: `{typeCode kategori}-{acak}`. `validityDays` null = tanpa masa berlaku (opsional per kode).
  // `targetStatus` = tahap minimal client setelah kode terbit (hanya maju).
  const issueCode = (client, category, { validityDays = null, code, targetStatus = "assessment_scheduled" } = {}) => {
    const item = {
      code: code || buildQuestionnaireCode(category, allCodes()),
      categoryId: category.id,
      name: category.categoryName,
      status: "issued",
      createdAt: todayStr(),
      issuedAt: nowIso(),
      expiresAt: buildExpiresAt(validityDays),
    };
    updateClient(client.id, {
      assessmentCodes: [...(client.assessmentCodes || []), item],
      status: advanceStatus(client.status, targetStatus),
    });
    return item;
  };

  // Hapus kode yang belum diisi ortu. Tanpa revert. Status client tidak dimundurkan.
  const deleteCode = (client, codeItem) => {
    if (isQuestionnaireCodeFilled(client, codeItem)) return { deleted: false, reason: "filled" };

    updateClient(client.id, { assessmentCodes: (client.assessmentCodes || []).filter((c) => c.code !== codeItem.code) });
    return { deleted: true };
  };

  return { issueCode, previewCode, deleteCode };
}
