import { useClients } from "@/stores/clientsStore";
import { useCredits } from "@/stores/creditsStore";
import { useAssessmentDrafts } from "@/stores/assessmentDraftsStore";
import { useAuth } from "@/stores/authStore";
import { advanceStatus } from "@/domain/client";
import { buildQuestionnaireCode, buildExpiresAt, canDeleteQuestionnaireCode } from "@/domain/assessment";
import { DEFAULT_ASSESSMENT_FEE, invoiceTypeCode } from "@/domain/credit";
import { nowIso, todayStr } from "@/shared/lib/id";
import { useQueryClient } from "@tanstack/react-query";
import { isApiMode } from "@/config/env";
import { api } from "@/services/http/httpClient";
import { ENDPOINTS } from "@/services/api/endpoints";
import { codeFromApi, codeIssueToApi } from "@/services/api/mappers/assessmentMapper";
import { CLIENTS_QUERY_KEY } from "@/stores/clientsStore";
import { CLIENT_QUESTIONNAIRES_KEY } from "@/features/inquiry/hooks/useClientQuestionnaires";

// Use-case kode kuesioner. Fase API: issueCode → POST /clients/{id}/assessment-codes (kode = kode jenis asesmen + acak,
// masa berlaku opsional); deleteCode → DELETE /clients/{id}/assessment-codes/{code}
// (hanya kode berstatus `issued` yang belum punya draft; jejak pelaku di `deleted_by`). Menerbitkan kode sekaligus membuat invoice assessment
// (type `assessment`, `assessment_code` = kode itu) yang bukti transfernya wajib diunggah ortu sebelum mengisi kuesioner;
// di API keduanya satu transaksi. Menghapus kode ikut menghapus invoice assessment-nya bila belum lunas.
function useQuestionnaireCodeActionsLocal() {
  const clientsStore = useClients();
  const { updateClient } = clientsStore; // daftar client dibaca saat dibutuhkan (allCodes), bukan tiap render
  const { issueInvoice, getInvoicesForClient, deleteInvoices } = useCredits();
  const { getDraft } = useAssessmentDrafts();
  const { auth } = useAuth();
  const by = auth?.staffName || auth?.role || null;

  // Semua kode kuesioner yang sudah ada (untuk memastikan kode baru unik).
  const allCodes = () => clientsStore.clients.flatMap((c) => (c.assessmentCodes || []).map((a) => a.code));

  // Buat kode baru (belum disimpan) untuk pratinjau di dialog.
  const previewCode = (category) => buildQuestionnaireCode(category, allCodes());

  // Terbitkan kode kuesioner: `{typeCode kategori}-{acak}`. `validityDays` null = tanpa masa berlaku (opsional per kode).
  // `servicePackage` = layanan (master paket) yang harganya jadi nominal invoice assessment (cadangan: DEFAULT_ASSESSMENT_FEE).
  // `withInvoice` (default true): false untuk kode GRATIS (mis. School Companion): tidak ada invoice, jadi tidak ada form bayar
  // untuk ortu; kode dicatat `invoiceRequired: false`.
  // `targetStatus` = tahap minimal client setelah kode terbit (hanya maju).
  const issueCode = (client, category, { validityDays = null, code, targetStatus = "assessment_scheduled", servicePackage = null, withInvoice = true } = {}) => {
    const item = {
      code: code || buildQuestionnaireCode(category, allCodes()),
      categoryId: category.id,
      name: category.categoryName,
      status: "issued",
      createdAt: todayStr(),
      issuedAt: nowIso(),
      expiresAt: buildExpiresAt(validityDays),
      invoiceRequired: Boolean(withInvoice),
    };
    updateClient(client.id, {
      assessmentCodes: [...(client.assessmentCodes || []), item],
      status: advanceStatus(client.status, targetStatus),
    });
    if (withInvoice) issueInvoice({
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

  // Hapus kode yang belum diisi ortu DAN belum punya draft (sedang diisi → ditolak, API: 409 `draft_exists`).
  // Tanpa revert. Status client tidak dimundurkan.
  const deleteCode = (client, codeItem) => {
    const guard = canDeleteQuestionnaireCode(client, codeItem, getDraft(codeItem.code));
    if (!guard.ok) return { deleted: false, reason: guard.reason };

    updateClient(client.id, { assessmentCodes: (client.assessmentCodes || []).filter((c) => c.code !== codeItem.code) });
    // Invoice assessment pemicu ikut dihapus (invoice lunas dibiarkan; dikoreksi lewat Void oleh Finance)
    const linked = getInvoicesForClient(client.id).filter((i) => i.type === "assessment" && i.assessmentCode === codeItem.code);
    if (linked.length) deleteInvoices(linked.map((i) => i.id));
    return { deleted: true };
  };

  return { issueCode, previewCode, deleteCode };
}

// Mode API: kode dibuat SERVER (`{kode jenis}-6 karakter`), terbit sekaligus memajukan status client dan (bila `withInvoice`) menerbitkan
// invoice asesmen `unpaid` dari paket asesmen yang dipilih; hapus lewat `DELETE /assessment-codes/{id}` (409 `draft_exists` /
// `already_submitted` bila sudah diisi). Keduanya async dan melempar ApiError. Kode unik dijamin server, jadi tidak ada pratinjau kode.
function useQuestionnaireCodeActionsApi() {
  const queryClient = useQueryClient();

  const refresh = (clientId) => {
    queryClient.invalidateQueries({ queryKey: [...CLIENT_QUESTIONNAIRES_KEY, String(clientId)] });
    queryClient.invalidateQueries({ queryKey: CLIENTS_QUERY_KEY }); // status client berubah
  };

  const issueCode = async (client, category, { validityDays = null, servicePackage = null, withInvoice = true } = {}) => {
    const raw = await api.post(
      ENDPOINTS.clients.assessmentCodes(client.id),
      codeIssueToApi({ categoryId: category.id, validityDays, withInvoice, masterPackageId: servicePackage?.serverId })
    );
    refresh(client.id);
    return codeFromApi(raw);
  };

  const deleteCode = async (client, codeItem) => {
    try {
      await api.delete(ENDPOINTS.assessmentCodes.detail(codeItem.id));
    } catch (err) {
      if (err?.status === 409) return { deleted: false, reason: err.code === "draft_exists" ? "draft" : "filled" };
      throw err;
    }
    refresh(client.id);
    return { deleted: true };
  };

  return { issueCode, previewCode: () => "", deleteCode };
}

export const useQuestionnaireCodeActions = isApiMode() ? useQuestionnaireCodeActionsApi : useQuestionnaireCodeActionsLocal;
