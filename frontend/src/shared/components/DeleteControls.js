import React from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { useAuth } from "@/stores/authStore";
import { useConfirm } from "@/shared/components/ConfirmDialog";

// Tombol/elemen hapus hanya tampil untuk role dengan flag `canDelete` DAN akses modul (domain/rbac.js `canDeleteIn`).
// Aksi non-hapus mengikuti akses modul saja.
export function IfCanDelete({ module, children }) {
  const { canDelete } = useAuth();
  return canDelete(module) ? <>{children}</> : null;
}

// Tombol hapus + konfirmasi. `onConfirm` dipanggil setelah user menyetujui.
export function DeleteButton({ module, onConfirm, title = "Hapus data?", description, label = "Hapus", confirmLabel = "Hapus", iconOnly = false, className, testId }) {
  const { canDelete } = useAuth();
  const { confirm, confirmDialog } = useConfirm();
  if (!canDelete(module)) return null;

  const handleClick = async () => {
    if (await confirm({ title, description, confirmLabel })) onConfirm();
  };

  return (
    <>
      {confirmDialog}
      <Button
        type="button"
        size={iconOnly ? "icon" : "sm"}
        variant={iconOnly ? "ghost" : "outline"}
        aria-label={label}
        title={label}
        className={className || (iconOnly ? "text-rose-600 hover:bg-rose-50 cursor-pointer" : "border-rose-200 text-rose-700 hover:bg-rose-50 font-bold gap-1.5 cursor-pointer")}
        onClick={handleClick}
        data-testid={testId}
      >
        <Trash2 className="w-3.5 h-3.5" />
        {!iconOnly && label}
      </Button>
    </>
  );
}
