import React, { useCallback, useRef, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/alert-dialog";
import { ShieldAlert } from "lucide-react";

// Pengganti window.confirm. Pemakaian:
//   const { confirm, confirmDialog } = useConfirm();
//   if (!(await confirm({ title, description, confirmLabel }))) return;
//   ... render {confirmDialog} sekali di JSX komponen.
export function useConfirm() {
  const [state, setState] = useState(null);
  const resolver = useRef(null);

  const close = useCallback((result) => {
    resolver.current?.(result);
    resolver.current = null;
    setState(null);
  }, []);

  const confirm = useCallback(
    (options) =>
      new Promise((resolve) => {
        resolver.current = resolve;
        setState(options);
      }),
    []
  );

  const confirmDialog = (
    <AlertDialog open={Boolean(state)} onOpenChange={(open) => !open && close(false)}>
      <AlertDialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md rounded-2xl p-6 border-slate-200">
        <AlertDialogHeader>
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center mb-3">
            <ShieldAlert className="w-6 h-6 stroke-[2]" />
          </div>
          <AlertDialogTitle className="text-lg font-bold text-slate-900">{state?.title || "Konfirmasi"}</AlertDialogTitle>
          {state?.description && (
            <AlertDialogDescription className="text-sm text-slate-600 leading-relaxed">
              {state.description}
            </AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-4 gap-2">
          <AlertDialogCancel className="rounded-xl border-slate-200" onClick={() => close(false)}>
            Batal
          </AlertDialogCancel>
          <AlertDialogAction
            className="bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl"
            onClick={() => close(true)}
            data-testid="confirm-dialog-ok"
          >
            {state?.confirmLabel || "Hapus"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return { confirm, confirmDialog };
}
