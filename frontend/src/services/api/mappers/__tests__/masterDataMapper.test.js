import {
  holidayFromApi,
  holidayToApi,
  packageFromApi,
  packageToApi,
  quadrantFromApi,
  quadrantToApi,
  reasonFromApi,
  reasonToApi,
  serviceFromApi,
  serviceToApi,
} from "@/services/api/mappers/masterDataMapper";

test("layanan: code → value, isActive → active; code hanya dikirim saat tambah", () => {
  const item = serviceFromApi({ code: "ot", label: "OT", category: "Terapi", description: null, isActive: false, sortOrder: 2 });
  expect(item).toEqual({ value: "ot", label: "OT", category: "Terapi", description: "", active: false, sortOrder: 2 });

  expect(serviceToApi(item, { create: true })).toMatchObject({ code: "ot", label: "OT", isActive: false });
  expect(serviceToApi(item)).not.toHaveProperty("code");
  expect(serviceToApi({ label: "OT", category: "Terapi" })).not.toHaveProperty("isActive");
});

test("pemakaian: layanan tidak membawa hitungan (dicek server saat hapus); kuadran hanya jumlah soal untuk badge", () => {
  const service = serviceFromApi({ code: "ot", label: "OT", category: "T", isActive: true, clientCount: 2, scheduleCount: 5 });
  expect(service).not.toHaveProperty("usageCount"); // server tidak mengirim hitungan; field lama pun diabaikan

  expect(quadrantFromApi({ code: "AV", title: "A", questionCount: 12 })).toMatchObject({ questionCount: 12, usageCount: 12 });
  expect(quadrantFromApi({ code: "AV", title: "A" })).not.toHaveProperty("questionCount");
});

test("kuadran: kunci tetap code, fullName jatuh ke title", () => {
  expect(quadrantFromApi({ code: "AV", title: "Avoiding", fullName: null, description: null, color: "blue", sortOrder: 1 })).toMatchObject({
    code: "AV",
    fullName: "Avoiding",
    description: "",
    color: "blue",
  });
  expect(quadrantToApi({ code: "AV", title: "A", fullName: "Aa", description: "d", color: "blue" })).not.toHaveProperty("code");
  expect(quadrantToApi({ code: "AV", title: "A", fullName: "Aa", color: "blue" }, { create: true }).code).toBe("AV");
});

test("alasan: isTherapistOff → therapistOff; penanda hanya dikirim untuk alasan Cancel/Off", () => {
  const item = reasonFromApi({ code: "TO", label: "Therapist Off", isActive: true, isTherapistOff: true, sortOrder: 9 });
  expect(item).toMatchObject({ value: "TO", active: true, therapistOff: true });

  expect(reasonToApi({ value: "TO", label: "X", active: true, therapistOff: true }, { create: true, withTherapistOff: true })).toEqual({
    code: "TO",
    label: "X",
    isActive: true,
    isTherapistOff: true,
  });
  expect(reasonToApi({ value: "S", label: "X", therapistOff: true })).toEqual({ label: "X" }); // discharge: tanpa penanda
  expect(reasonToApi({ active: false })).toEqual({ isActive: false }); // patch parsial (saklar aktif)
});

test("paket: id frontend = code server (cocok dengan packageId di data kredit), id angka di serverId", () => {
  const pkg = packageFromApi({ id: 3, code: "pkg-reguler", invoiceCode: "REG", name: "Reguler", credits: 10, price: 2500000, description: null, leaveQuota: 3, isSatuan: false, isAssessment: false, isActive: true });
  expect(pkg).toMatchObject({ id: "pkg-reguler", serverId: "3", invoiceCode: "REG", leaveQuota: 3, isActive: true, description: "" });

  expect(packageToApi({ name: "Baru", invoiceCode: "NEW", credits: 8, price: 1000, leaveQuota: 2, isSatuan: 0, isAssessment: 1 })).toEqual({
    name: "Baru",
    invoiceCode: "NEW",
    credits: 8,
    price: 1000,
    description: "",
    leaveQuota: 2,
    isSatuan: false,
    isAssessment: true,
  });
});

test("hari libur: respons → bentuk frontend", () => {
  expect(holidayFromApi({ id: 5, holidayDate: "2026-12-25", name: "Natal", branchId: null })).toEqual({ id: "5", date: "2026-12-25", name: "Natal", branchId: null });
  expect(holidayFromApi({ id: 6, holidayDate: "2026-12-26", name: "X", branchId: 2, affectedSessions: 3 })).toMatchObject({ branchId: "2", affectedSessions: 3 });
});

test("hari libur: satu tanggal vs rentang, cabang 'all' = null", () => {
  expect(holidayToApi({ date: "2026-12-25", name: " Natal ", branchId: "all" }, { create: true })).toEqual({ name: "Natal", branchId: null, holidayDate: "2026-12-25" });
  expect(holidayToApi({ date: "2026-12-24", endDate: "2026-12-26", name: "Cuti", branchId: "2" }, { create: true })).toEqual({
    name: "Cuti",
    branchId: 2,
    startDate: "2026-12-24",
    endDate: "2026-12-26",
  });
  // mengubah libur selalu satu tanggal walau endDate ikut terkirim
  expect(holidayToApi({ date: "2026-12-24", endDate: "2026-12-26", name: "Cuti", branchId: null })).toHaveProperty("holidayDate", "2026-12-24");
});
