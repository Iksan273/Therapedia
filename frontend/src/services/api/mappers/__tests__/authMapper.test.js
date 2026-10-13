import { clientSessionToAuth, permissionsFromList, staffSessionToAuth } from "@/services/api/mappers/authMapper";

const staffUser = {
  id: 7,
  name: "Siti",
  email: "siti@therapedia.id",
  role: { code: "finance", name: "Role Finance", badge: "Billing" },
  branchId: 2,
  branch: { id: 2, code: "CTL", name: "Citraland" },
  mustChangePassword: false,
  // Kontrak: izin = daftar kode modul (nilai), bukan kamus berkunci kode modul
  permissions: ["finance", "inquiry_pipeline", "therapist_utilization"],
};

test("permissionsFromList: kode modul utuh (snake_case) karena berada di nilai, bukan key", () => {
  expect(permissionsFromList(["finance", "inquiry_pipeline"])).toEqual({ finance: true, inquiry_pipeline: true });
  expect(permissionsFromList([])).toEqual({});
  expect(permissionsFromList(undefined)).toEqual({});
});

test("staffSessionToAuth memetakan profil dan izin", () => {
  const auth = staffSessionToAuth(staffUser);
  expect(auth.permissions).toEqual({ finance: true, inquiry_pipeline: true, therapist_utilization: true });
  expect(auth).toMatchObject({ role: "finance", userId: 7, staffName: "Siti", branchId: 2, branchName: "Citraland", mustChangePassword: false, therapistId: null, clientId: null });
});

test("terapis memakai id akun sebagai therapistId; master tanpa cabang", () => {
  expect(staffSessionToAuth({ ...staffUser, role: { code: "therapist" } }).therapistId).toBe("7");
  expect(staffSessionToAuth({ ...staffUser, role: { code: "master" }, branchId: null, branch: null }).branchId).toBeNull();
});

test("password sementara terbawa ke state", () => {
  expect(staffSessionToAuth({ ...staffUser, mustChangePassword: true }).mustChangePassword).toBe(true);
});

test("clientSessionToAuth", () => {
  expect(clientSessionToAuth({ id: 3, clientCode: "AE-00003", childName: "Raka", branchId: 1, branch: { name: "East" } })).toMatchObject({
    role: "client",
    clientId: 3,
    clientCode: "AE-00003",
    childName: "Raka",
    permissions: null,
    mustChangePassword: false,
  });
});
