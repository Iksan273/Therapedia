import {
  bankAccountToApi,
  branchFromApi,
  branchImpactFromApi,
  branchToApi,
  permissionItem,
  permissionMatrixFromRoles,
  roleFromApi,
  roleToApi,
  staffUserFromApi,
  staffUserToApi,
  therapistFromApi,
} from "@/services/api/mappers/organizationMapper";

// Payload di bawah = bentuk respons backend setelah interceptor httpClient (key camelCase).

test("branchFromApi: id jadi string, null jadi string kosong", () => {
  expect(branchFromApi({ id: 3, code: "WEST", name: "West", city: "Surabaya", address: null, phone: null, isActive: true })).toEqual({
    id: "3", code: "WEST", name: "West", city: "Surabaya", address: "", phone: "", isActive: true, bankAccounts: [],
  });
});

test("branchFromApi: rekening bank dipetakan (id string) dan bankAccountToApi di-trim", () => {
  const branch = branchFromApi({
    id: 1, code: "EAST", name: "East", city: "Surabaya", address: null, phone: null, isActive: true,
    bankAccounts: [{ id: 7, branchId: 1, bankName: "BCA", accountNumber: "123", accountHolder: "PT T", isActive: true, sortOrder: 1 }],
  });
  expect(branch.bankAccounts).toEqual([{ id: "7", bankName: "BCA", accountNumber: "123", accountHolder: "PT T", isActive: true, sortOrder: 1 }]);
  expect(bankAccountToApi({ bankName: " BCA ", accountNumber: " 123 ", accountHolder: " PT T " })).toEqual({ bankName: "BCA", accountNumber: "123", accountHolder: "PT T" });
});

test("branchToApi: kode huruf besar, semua field di-trim", () => {
  expect(branchToApi({ name: "  Gubeng ", code: " gbg ", city: " Surabaya ", address: "", phone: undefined })).toEqual({
    name: "Gubeng", code: "GBG", city: "Surabaya", address: "", phone: "",
  });
});

test("branchImpactFromApi: schedules → sessions (nama field frontend)", () => {
  expect(branchImpactFromApi({ impact: { clients: 2, schedules: 5, invoices: 1, staff: 3, holidays: 0 } })).toEqual({
    clients: 2, sessions: 5, invoices: 1, staff: 3, holidays: 0,
  });
  expect(branchImpactFromApi({})).toEqual({ clients: 0, sessions: 0, invoices: 0, staff: 0, holidays: 0 });
});

test("therapistFromApi: tanpa cabang (semua cabang) tetap null", () => {
  expect(therapistFromApi({ id: 9, name: "Adi", title: "S.Ft", specialty: null, branchId: null, maxSessionsPerMonth: 120 })).toEqual({
    id: "9", name: "Adi", title: "S.Ft", specialty: "", branchId: null, maxSessionsPerMonth: 120,
  });
  expect(therapistFromApi({ id: 1, name: "B", branchId: 2, maxSessionsPerMonth: null }).branchId).toBe("2");
});

test("staffUserFromApi: kode role jadi `role`, id server disimpan, cabang kosong = null", () => {
  const user = staffUserFromApi({
    id: 7, name: "Siti", email: "siti@x.id", phone: null, title: null, specialty: null,
    role: { id: 5, code: "finance", name: "Role Finance", badge: "Billing" },
    branchId: null, branch: null, isActive: true, mustChangePassword: true, lastLoginAt: null,
  });

  expect(user).toMatchObject({ id: "7", role: "finance", roleServerId: "5", branchId: null, isActive: true, mustChangePassword: true });
});

describe("staffUserToApi", () => {
  const roles = [
    { id: "finance", serverId: "5" },
    { id: "master", serverId: "1" },
  ];

  test("kode role → id server (angka), cabang string → angka", () => {
    expect(staffUserToApi({ name: " Siti ", email: " s@x.id ", role: "finance", branchId: "2", title: "", specialty: "" }, roles)).toEqual({
      name: "Siti", email: "s@x.id", roleId: 5, branchId: 2, title: "", specialty: "",
    });
  });

  test('"Semua cabang" (all/kosong) dan role master dikirim sebagai null', () => {
    expect(staffUserToApi({ name: "A", email: "a@x.id", role: "finance", branchId: "all" }, roles).branchId).toBeNull();
    expect(staffUserToApi({ name: "A", email: "a@x.id", role: "finance", branchId: "" }, roles).branchId).toBeNull();
    expect(staffUserToApi({ name: "A", email: "a@x.id", role: "master", branchId: "2" }, roles).branchId).toBeNull();
  });

  test("role tidak dikenal → roleId undefined (tidak dikirim)", () => {
    expect(staffUserToApi({ name: "A", email: "a@x.id", role: "ngawur", branchId: "1" }, roles).roleId).toBeUndefined();
  });
});

test("roleFromApi: kode role jadi id frontend", () => {
  expect(roleFromApi({ id: 5, code: "finance", name: "Role Finance", badge: null, description: null, isSystem: true, usersCount: 2, permissions: ["finance", "holidays"] })).toEqual({
    id: "finance", serverId: "5", label: "Role Finance", badge: "", description: "", isSystem: true, usersCount: 2, permissions: ["finance", "holidays"],
  });
});

test("permissionMatrixFromRoles: daftar kode modul → matriks lengkap; master selalu penuh", () => {
  const roles = [
    { id: "finance", permissions: ["finance"] },
    { id: "master", permissions: [] }, // server selalu mengirim penuh; pemetaan tetap menjamin
  ];

  expect(permissionMatrixFromRoles(roles, ["finance", "rbac"])).toEqual({
    finance: { finance: true, rbac: false },
    master: { finance: true, rbac: true },
  });
});

test("roleToApi: izin awal (peta) dikirim sebagai DAFTAR kode modul; kode kosong tidak dikirim", () => {
  expect(roleToApi({ id: "", label: " Koordinator ", badge: "Koord", description: "", initialPermissions: { finance: true, rbac: false, holidays: true } })).toEqual({
    name: "Koordinator", code: undefined, badge: "Koord", description: "", permissions: ["finance", "holidays"],
  });
  expect(roleToApi({ id: "kode_sendiri", label: "X", initialPermissions: {} }).code).toBe("kode_sendiri");
});

test("permissionItem: array item, bukan kamus berkunci kode modul", () => {
  expect(permissionItem("inquiry_pipeline", 1)).toEqual({ moduleCode: "inquiry_pipeline", allowed: true });
});
