import React, { createContext, useContext } from "react";
import { usePersistentReducer } from "@/shared/hooks/usePersistentState";
import { applyDraftPatch } from "@/domain/assessment";
import { nowIso } from "@/shared/lib/id";

const AssessmentDraftsContext = createContext(null);

const keyOf = (code) => String(code || "").trim().toUpperCase();

function draftsReducer(state, action) {
  switch (action.type) {
    case "SAVE": {
      // Upsert 1 draft per KODE (padanan PUT /public/assessments/{code}/draft). `now` dikirim dari dispatcher agar reducer tetap pure.
      const code = keyOf(action.code);
      const current = state.find((d) => d.code === code) || null;
      const next = applyDraftPatch(current, { ...action.payload, code, clientId: action.clientId }, action.now);
      return current ? state.map((d) => (d.code === code ? next : d)) : [...state, next];
    }
    case "REMOVE": // dihapus saat submit sukses (draft bukan hasil)
      return state.filter((d) => d.code !== keyOf(action.code));
    case "REMOVE_FOR_CLIENT": // hapus client permanen: draft ikut hilang (CASCADE)
      return state.filter((d) => d.clientId !== action.clientId);
    default:
      return state;
  }
}

// Draft jawaban kuesioner (schema.md `assessment_drafts`). Hanya ada selama kuesioner belum dikirim; tidak ada seed.
export const AssessmentDraftsProvider = ({ children }) => {
  const [drafts, dispatch] = usePersistentReducer("assessment_drafts", draftsReducer, () => []);

  const getDraft = (code) => drafts.find((d) => d.code === keyOf(code)) || null;
  const saveDraft = ({ code, clientId, ...payload }) => dispatch({ type: "SAVE", code, clientId, payload, now: nowIso() });
  const removeDraft = (code) => dispatch({ type: "REMOVE", code });
  const removeDraftsOfClient = (clientId) => dispatch({ type: "REMOVE_FOR_CLIENT", clientId });

  return (
    <AssessmentDraftsContext.Provider value={{ drafts, getDraft, saveDraft, removeDraft, removeDraftsOfClient }}>
      {children}
    </AssessmentDraftsContext.Provider>
  );
};

export const useAssessmentDrafts = () => useContext(AssessmentDraftsContext);
