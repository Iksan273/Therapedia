import { clientCreateToApi, clientFromApi, clientUpdateToApi, transitionToApi } from "@/services/api/mappers/clientMapper";

// Payload = bentuk respons backend setelah interceptor httpClient (key camelCase).

test("clientFromApi: id string, nama field FE, layanan & link GDrive, default aman", () => {
  const c = clientFromApi({
    id: 12, clientCode: "KO-00003", childName: "Kenzo", gender: "male", dateOfBirth: "2018-05-17", parentName: "Sari", parentPhone: "0812", branchId: 2,
    status: "admitted", finalOutcome: "admitted", dateOfJoin: "2026-10-01", creditBalance: 4, frozen: false, serviceCodes: ["b_ota", "f_ota"], version: 6,
    gdriveLinks: [{ id: 3, url: "https://drive.google.com/a", label: null }],
  });

  expect(c).toMatchObject({
    id: "12", clientCode: "KO-00003", clientName: "Kenzo", dob: "2018-05-17", parentContact: "0812", branchId: "2", status: "admitted",
    serviceTypes: ["b_ota", "f_ota"], serviceType: "b_ota", gdriveClientLink: "https://drive.google.com/a", creditBalance: 4, frozen: false, version: 6,
    parentEmail: "", intakeNote: null, assessmentCodes: [], invoice: null,
  });
  expect(c.gdriveLinks).toEqual([{ id: "3", url: "https://drive.google.com/a", label: "" }]);
});

test("clientFromApi: tanpa layanan/link = daftar kosong dan string kosong", () => {
  const c = clientFromApi({ id: 1, clientCode: "AE-00001", childName: "A", status: "inquiry", version: 1 });
  expect(c.serviceTypes).toEqual([]);
  expect(c.serviceType).toBe("");
  expect(c.gdriveClientLink).toBe("");
});

test("clientCreateToApi: field dipetakan, di-trim, kosong dibuang, cabang jadi angka", () => {
  expect(
    clientCreateToApi({ clientName: " Aisyah ", gender: "female", dob: "2019-03-10", parentName: " Budi ", parentContact: " 0812 ", parentEmail: "", intakeNote: " ", branchId: "3" })
  ).toEqual({
    branchId: 3, childName: "Aisyah", gender: "female", dateOfBirth: "2019-03-10", parentName: "Budi", parentPhone: "0812", parentEmail: undefined, address: undefined, intakeNote: undefined,
  });
});

test("clientUpdateToApi: membawa version, kosong dikirim null, tanpa cabang/kode", () => {
  const body = clientUpdateToApi({ clientName: "Baru", gender: "male", dob: "2019-01-01", parentName: "P", parentContact: "0811", parentEmail: "", intakeNote: "", branchId: "9" }, 4);
  expect(body).toEqual({ version: 4, childName: "Baru", gender: "male", dateOfBirth: "2019-01-01", parentName: "P", parentPhone: "0811", parentEmail: null, intakeNote: null });
  expect(body).not.toHaveProperty("branchId");
});

test("transitionToApi: alasan/catatan di-trim, kosong tidak dikirim", () => {
  expect(transitionToApi("discharged", 3, { reason: " moving ", note: " " })).toEqual({ toStatus: "discharged", version: 3, reason: "moving", note: undefined });
  expect(transitionToApi("admitted", 1)).toEqual({ toStatus: "admitted", version: 1, reason: undefined, note: undefined });
});
