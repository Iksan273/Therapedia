import React, { createContext, useContext } from "react";
import { usePersistentReducer } from "@/hooks/useLocalStorage";
import { loadCreditsSeed } from "@/data/seedLoader";
import { todayStr } from "@/lib/appUtils";

const CreditsContext = createContext(null);

function creditsReducer(state, action) {
  switch (action.type) {
    case "ADD_RECORD":
      return { ...state, records: [...state.records, action.record] };
    case "USE_CREDIT":
      return {
        ...state,
        records: state.records.map((r) => {
          if (r.clientId !== action.clientId) return r;
          // Guard: never double-charge the same session
          if (r.history.some((h) => h.scheduleId === action.scheduleId && h.action === "used")) return r;
          return {
            ...r,
            remainingCredit: Math.max(0, r.remainingCredit - 1),
            history: [
              ...r.history,
              { date: action.date || todayStr(), scheduleId: action.scheduleId, action: "used", creditChange: -1 },
            ],
          };
        }),
      };
    case "USE_LEAVE":
      return {
        ...state,
        records: state.records.map((r) => {
          if (r.clientId !== action.clientId) return r;
          if (r.history.some((h) => h.scheduleId === action.scheduleId && h.action === "leave")) return r;
          return {
            ...r,
            leaveUsed: r.leaveUsed + 1,
            history: [
              ...r.history,
              { date: action.date || todayStr(), scheduleId: action.scheduleId, action: "leave", creditChange: 0 },
            ],
          };
        }),
      };
    case "ADD_RENEWAL":
      return { ...state, renewals: [...state.renewals, action.renewal] };
    case "MARK_RENEWAL_PAID": {
      const renewal = state.renewals.find((r) => r.id === action.renewalId);
      if (!renewal || renewal.status === "paid") return state;
      return {
        records: state.records.map((r) =>
          r.clientId === renewal.clientId
            ? {
                ...r,
                totalCredit: r.totalCredit + renewal.credits,
                remainingCredit: r.remainingCredit + renewal.credits,
                history: [
                  ...r.history,
                  { date: todayStr(), scheduleId: null, action: "renewed", creditChange: renewal.credits },
                ],
              }
            : r
        ),
        renewals: state.renewals.map((r) =>
          r.id === action.renewalId ? { ...r, status: "paid", paidAt: todayStr() } : r
        ),
      };
    }
    default:
      return state;
  }
}

export const CreditsProvider = ({ children }) => {
  const [credits, dispatch] = usePersistentReducer("credits", creditsReducer, loadCreditsSeed);

  const addRecord = (record) => dispatch({ type: "ADD_RECORD", record });
  const spendCredit = ({ clientId, scheduleId, date }) => dispatch({ type: "USE_CREDIT", clientId, scheduleId, date });
  const recordLeave = ({ clientId, scheduleId, date }) => dispatch({ type: "USE_LEAVE", clientId, scheduleId, date });
  const addRenewal = (renewal) => dispatch({ type: "ADD_RENEWAL", renewal });
  const markRenewalPaid = (renewalId) => dispatch({ type: "MARK_RENEWAL_PAID", renewalId });
  const getRecordForClient = (clientId) => credits.records.find((r) => r.clientId === clientId);
  const getRenewalsForClient = (clientId) => credits.renewals.filter((r) => r.clientId === clientId);

  return (
    <CreditsContext.Provider
      value={{ credits, addRecord, spendCredit, recordLeave, addRenewal, markRenewalPaid, getRecordForClient, getRenewalsForClient }}
    >
      {children}
    </CreditsContext.Provider>
  );
};

export const useCredits = () => useContext(CreditsContext);
