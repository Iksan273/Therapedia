// Pemetaan payload API Finance (invoice) ↔ bentuk invoice yang dipakai tab Finance di frontend. Respons sudah camelCase.
// Tahap awal: invoice asesmen (daftar "Menunggu Pembayaran"). Nama field mode demo dipertahankan agar tabel/viewer lama tetap bekerja:
// `type` (= invoiceType), `clientName`, `createdAt` (= issuedAt), `proofUploadCount`; tambahan `hasProof` dari server.

const str = (v) => (v === null || v === undefined ? null : String(v));

export const invoiceFromApi = (i) => ({
  id: String(i.id),
  invoiceNumber: i.invoiceNumber,
  type: i.invoiceType,
  typeCode: i.typeCode,
  status: i.status,
  packageName: i.packageName,
  credits: i.credits ?? 0,
  amount: i.amount,
  grossAmount: i.grossAmount ?? null,
  isRenewal: Boolean(i.isRenewal),
  clientId: str(i.client?.id),
  clientName: i.client?.childName || "—",
  clientCode: i.client?.clientCode || null,
  parentName: i.client?.parentName || "",
  branchId: str(i.branchId),
  assessmentCode: i.assessmentCode || null,
  createdAt: i.issuedAt || null,
  paidAt: i.paidAt || null,
  proofUploadCount: i.proofUploadCount ?? 0,
  hasProof: Boolean(i.hasProof),
  lastProofId: i.lastProofId == null ? null : String(i.lastProofId),
  version: i.version ?? 1,
});

export const proofFromApi = (p) => ({
  id: String(p.id),
  fileName: p.fileName,
  mimeType: p.mimeType,
  fileSize: p.fileSize,
  uploadedByType: p.uploadedByType,
  uploadedAt: p.uploadedAt,
});
