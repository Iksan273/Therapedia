import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { isApiMode } from "@/config/env";
import { isStaffSession } from "@/domain/auth";
import { api } from "@/services/http/httpClient";
import { ENDPOINTS } from "@/services/api/endpoints";
import { codeFromApi, resultFromApi } from "@/services/api/mappers/assessmentMapper";
import { useAuth } from "@/stores/authStore";

// Kode & hasil kuesioner satu client. Mode demo: sudah ada di objek client (assessmentCodes / assessmentAnswers), jadi hook ini
// tidak aktif. Mode API: dua query terpisah yang hanya berjalan di halaman yang menampilkannya (aturan 22b):
//   codes   → GET /clients/{id}/assessment-codes   (daftar kode + progres draft)
//   results → GET /clients/{id}/assessment-responses (jawaban + struktur beku; hanya bila `results: true`)
export const CLIENT_QUESTIONNAIRES_KEY = ["client-questionnaires"];

const INACTIVE = { active: false, codes: [], results: [], isLoading: false, isFetching: false, refresh: () => {} };

function useClientQuestionnairesApi(clientId, { results = true } = {}) {
  const { auth } = useAuth();
  const queryClient = useQueryClient();
  const enabled = isStaffSession(auth) && Boolean(clientId);

  const codesQuery = useQuery({
    queryKey: [...CLIENT_QUESTIONNAIRES_KEY, clientId, "codes"],
    queryFn: ({ signal }) => api.get(ENDPOINTS.clients.assessmentCodes(clientId), undefined, { signal }).then((rows) => rows.map(codeFromApi)),
    enabled,
  });
  const resultsQuery = useQuery({
    queryKey: [...CLIENT_QUESTIONNAIRES_KEY, clientId, "results"],
    queryFn: ({ signal }) => api.get(ENDPOINTS.clients.assessmentResponses(clientId), undefined, { signal }).then((rows) => rows.map(resultFromApi)),
    enabled: enabled && results,
  });

  return useMemo(
    () => ({
      active: true,
      codes: codesQuery.data ?? [],
      results: resultsQuery.data ?? [],
      isLoading: codesQuery.isLoading || (results && resultsQuery.isLoading),
      isFetching: codesQuery.isFetching || resultsQuery.isFetching,
      refresh: () => queryClient.invalidateQueries({ queryKey: [...CLIENT_QUESTIONNAIRES_KEY, clientId] }),
    }),
    [codesQuery.data, resultsQuery.data, codesQuery.isLoading, resultsQuery.isLoading, codesQuery.isFetching, resultsQuery.isFetching, results, queryClient, clientId]
  );
}

export const useClientQuestionnaires = isApiMode() ? useClientQuestionnairesApi : () => INACTIVE;

// Pasang kode & hasil dari server ke objek client (bentuk yang dibaca kartu/halaman lama); mode demo: client apa adanya.
export function useClientWithQuestionnaires(client, q) {
  return useMemo(() => (client && q.active ? { ...client, assessmentCodes: q.codes, assessmentAnswers: q.results } : client), [client, q]);
}
