import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { isApiMode } from "@/config/env";
import { isStaffSession } from "@/domain/auth";
import { api } from "@/services/http/httpClient";
import { ENDPOINTS } from "@/services/api/endpoints";
import { invoiceFromApi, proofFromApi } from "@/services/api/mappers/financeMapper";
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";
import { useAuth } from "@/stores/authStore";
import { CLIENT_QUESTIONNAIRES_KEY } from "@/features/inquiry";

// Antrean "Tagihan Menunggu Pembayaran" untuk invoice ASESMEN (mode API): daftar dipaginasi di server (10/halaman) + cari,
// unggah bukti oleh Finance, lihat bukti (file diambil sebagai Blob karena butuh bearer), dan Tandai Lunas.
// Invoice paket / cuti menyusul di modul Finance; mode demo tidak memakai hook ini (`active: false`, tabel membaca store lokal).
// Keluaran: { active, rows, pagination, total, isLoading, isFetching, markPaid, uploadProof, proofView, proofLoading, openProof, closeProof }
export const ASSESSMENT_QUEUE_KEY = ["finance", "assessment-invoices"];

const INACTIVE = {
  active: false,
  rows: [],
  total: 0,
  pagination: null,
  isLoading: false,
  isFetching: false,
  proofView: null,
  proofLoading: false,
  markPaid: async () => {},
  uploadProof: async () => {},
  openProof: async () => {},
  closeProof: () => {},
};

function useAssessmentInvoiceQueueApi({ search = "", enabled = true } = {}) {
  const { auth } = useAuth();
  const queryClient = useQueryClient();
  const q = useDebouncedValue(search.trim(), 300);
  const [page, setPage] = useState(1);
  useEffect(() => setPage(1), [q]);

  const params = { status: ["unpaid"], type: "assessment", q: q || undefined, page, perPage: 10 };
  const active = enabled && isStaffSession(auth);
  const { data, isLoading, isFetching } = useQuery({
    queryKey: [...ASSESSMENT_QUEUE_KEY, params],
    queryFn: ({ signal }) => api.list(ENDPOINTS.invoices.list, params, { signal }).then(({ items, meta }) => ({ rows: items.map(invoiceFromApi), meta })),
    enabled: active,
    placeholderData: keepPreviousData,
  });
  const rows = useMemo(() => data?.rows ?? [], [data]);
  const meta = data?.meta;

  // Pratinjau bukti: file terbaru invoice diambil sebagai Blob → object URL (dilepas saat ditutup / berganti)
  const [proofView, setProofView] = useState(null);
  const [proofLoading, setProofLoading] = useState(false);
  const urlRef = useRef(null);
  const releaseUrl = () => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = null;
  };
  useEffect(() => releaseUrl, []);

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ASSESSMENT_QUEUE_KEY });
    queryClient.invalidateQueries({ queryKey: CLIENT_QUESTIONNAIRES_KEY }); // kartu kode & invoice di detail client
  }, [queryClient]);

  const closeProof = useCallback(() => {
    releaseUrl();
    setProofView(null);
  }, []);

  const openProof = useCallback(async (invoice) => {
    setProofLoading(true);
    try {
      const detail = await api.get(ENDPOINTS.invoices.detail(invoice.id));
      const proofs = (detail.proofs || []).map(proofFromApi);
      const latest = proofs[proofs.length - 1];
      if (!latest) throw new Error("Belum ada bukti transfer untuk invoice ini.");
      const blob = await api.get(ENDPOINTS.invoices.proofFile(invoice.id, latest.id), undefined, { responseType: "blob" });
      releaseUrl();
      urlRef.current = URL.createObjectURL(blob);
      setProofView({
        ...invoice,
        proofUrl: urlRef.current,
        proofFileName: latest.fileName,
        proofFileType: latest.mimeType,
        proofFileSize: latest.fileSize,
        proofUploadedAt: latest.uploadedAt,
        proofCount: proofs.length,
      });
    } finally {
      setProofLoading(false);
    }
  }, []);

  // `processed` = hasil ProofFileButton (dataUrl) → file biner multipart. Tidak mengubah status invoice.
  const uploadProof = useCallback(
    async (invoice, processed) => {
      const blob = await (await fetch(processed.dataUrl)).blob();
      const body = new FormData();
      body.append("file", new File([blob], processed.fileName, { type: processed.fileType || blob.type }));
      await api.upload(ENDPOINTS.invoices.proof(invoice.id), body);
      refresh();
      if (proofView?.id === invoice.id) closeProof(); // viewer terbuka: tutup agar dibuka ulang dengan file terbaru
    },
    [refresh, proofView, closeProof]
  );

  const markPaid = useCallback(
    async (invoice) => {
      await api.post(ENDPOINTS.invoices.verify(invoice.id), { version: invoice.version });
      closeProof();
      refresh();
    },
    [refresh, closeProof]
  );

  return {
    active: true,
    rows,
    total: meta?.total ?? 0,
    pagination: { page, setPage, pageSize: 10, setPageSize: () => {}, totalPages: Math.max(1, meta?.lastPage ?? 1), totalItems: meta?.total ?? 0, pageItems: rows },
    isLoading: isLoading && active,
    isFetching,
    proofView,
    proofLoading,
    openProof,
    closeProof,
    markPaid,
    uploadProof,
  };
}

export const useAssessmentInvoiceQueue = isApiMode() ? useAssessmentInvoiceQueueApi : () => INACTIVE;
