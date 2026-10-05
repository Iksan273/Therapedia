import { useAuth } from "@/stores/authStore";
import { useTherapists } from "@/stores/therapistsStore";
import { usePersistentState } from "@/shared/hooks/usePersistentState";

// Terapis yang datanya ditampilkan modul terapis. Login sebagai terapis = dirinya sendiri. Role lain yang diberi akses
// modul terapis (Master / role RBAC) = mode simulasi "lihat sebagai terapis": pilih terapis lewat ViewAsTherapistBar
// (cabang aktif ikut menyaring). Pilihan disimpan di key `viewAsTherapistId`.
export function useActingTherapist() {
  const { auth, activeBranch } = useAuth();
  const { therapists } = useTherapists();
  const [pickedId, setPickedId] = usePersistentState("viewAsTherapistId", () => "");

  const isViewAs = !auth?.therapistId;
  const pool = therapists.filter((t) => activeBranch === "all" || !activeBranch || t.branchId === activeBranch);
  const options = pool.length ? pool : therapists;
  const picked = options.find((t) => t.id === pickedId);
  const therapistId = auth?.therapistId || picked?.id || options[0]?.id || null;

  return { therapistId, isViewAs, options, setViewAs: setPickedId };
}
