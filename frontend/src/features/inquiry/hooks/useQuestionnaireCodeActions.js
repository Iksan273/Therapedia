import { useClients } from "@/stores/clientsStore";
import { useCredits } from "@/stores/creditsStore";
import { useAuth } from "@/stores/authStore";
import { isQuestionnaireCodeFilled, advanceStatus } from "@/domain/client";
import { buildQuestionnaireCode, buildExpiresAt } from "@/domain/assessment";
import { DEFAULT_ASSESSMENT_FEE, invoiceTypeCode } from "@/domain/credit";
import { nowIso, todayStr } from "@/shared/lib/id";

// Use-case kode kuesioner. Fase API: issueCode → POST /clients/{id}/assessment-codes (kode = kode jenis asesmen + acak,
// masa berlaku opsional); deleteCode → DELETE /clients/{id}/assessment-codes/{code}
// (hanya kode berstatus `issued`; jejak pelaku di `deleted_by`). Menerbitkan kode sekaligus membuat invoice assessment
// (type `assessment`, `assessment_code` = kode itu) yang bukti transfernya wajib diunggah ortu sebelum mengisi kuesioner;
// di API keduanya satu transaksi. Menghapus kode ikut menghapus invoice assessment-nya bila belum lunas.
export function useQuestionnaireCodeActions() {
  const { clients, updateClient } = useClients();
  const { issueInvoice, getInvoicesForClient, deleteInvoices } = useCredits();
  const { auth } = useAuth();
  const by = auth?.staffName || auth?.role || null;

  // Semua kode kuesioner yang sudah ada (untuk memastikan kode baru unik).
  const allCodes = () => clients.flatMap((c) => (c.assessmentCodes || []).map((a) => a.code));

  // Buat kode baru (belum disimpan) untuk pratinjau di dialog.
  const previewCode = (category) => buildQuestionnaireCode(category, allCodes());

  // Terbitkan kode kuesioner: `{typeCode kategori}-{acak}`. `validityDays` null = tanpa masa berlaku (opsional per kode).
  // `servicePackage` = layanan (master paket) yang harganya jadi nominal invoice assessment (cadangan: DEFAULT_ASSESSMENT_FEE).
  // `targetStatus` = tahap minimal client setelah kode terbit (hanya maju).
  const issueCode = (client, category, { validityDays = null, code, targetStatus = "assessment_scheduled", servicePackage = null } = {}) => {
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
    issueInvoice({
      clientId: client.id,
      clientName: client.clientName,
      branchId: client.branchId,
      type: "assessment",
      typeCode: invoiceTypeCode("assessment", null),
      packageName: `Assessment ${category.categoryName}${servicePackage ? ` — ${servicePackage.name}` : ""}`,
      amount: Number(servicePackage?.price) > 0 ? Number(servicePackage.price) : DEFAULT_ASSESSMENT_FEE,
      assessmentCode: item.code,
      by,
    });
    return item;
  };

  // Hapus kode yang belum diisi ortu. Tanpa revert. Status client tidak dimundurkan.
  const deleteCode = (client, codeItem) => {
    if (isQuestionnaireCodeFilled(client, codeItem)) return { deleted: false, reason: "filled" };

    updateClient(client.id, { assessmentCodes: (client.assessmentCodes || []).filter((c) => c.code !== codeItem.code) });
    // Invoice assessment pemicu ikut dihapus (invoice lunas dibiarkan; dikoreksi lewat Void oleh Finance)
    const linked = getInvoicesForClient(client.id).filter((i) => i.type === "assessment" && i.assessmentCode === codeItem.code);
    if (linked.length) deleteInvoices(linked.map((i) => i.id));
    return { deleted: true };
  };

  return { issueCode, previewCode, deleteCode };
}
