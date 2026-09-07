import { fmtDate, formatDdMmYyyy, parseDdMmYyyy, calcAge, makeInquiryClient, BRANCHES, DEFAULT_MASTER_PACKAGES, formatPackageName } from "../lib/appUtils";

describe("Global Utilities & Date Formatting", () => {
  test("formatPackageName normalizes legacy Reguler and VIP strings", () => {
    expect(formatPackageName("Paket Reguler (10x)")).toBe("Regular Therapist (10x)");
    expect(formatPackageName("Paket VIP (5x)")).toBe("Senior Therapist (5x)");
    expect(formatPackageName("Reguler")).toBe("Regular Therapist");
    expect(formatPackageName("VIP")).toBe("Senior Therapist");
    expect(formatPackageName("Regular Therapist (10x)")).toBe("Regular Therapist (10x)");
  });

  test("BRANCHES has East, Citraland, and West", () => {
    const branchNames = BRANCHES.map((b) => b.name);
    expect(branchNames).toEqual(["East", "Citraland", "West"]);
  });

  test("DEFAULT_MASTER_PACKAGES contains Regular Therapist and Senior Therapist", () => {
    const pkgNames = DEFAULT_MASTER_PACKAGES.map((p) => p.name);
    expect(pkgNames).toContain("Regular Therapist");
    expect(pkgNames).toContain("Senior Therapist");
  });

  test("fmtDate and formatDdMmYyyy formats ISO date strings as dd/MM/yyyy", () => {
    expect(fmtDate("2026-09-07")).toBe("07/09/2026");
    expect(fmtDate("2024-01-15")).toBe("15/01/2024");
    expect(fmtDate("2025-12-31")).toBe("31/12/2025");
    expect(formatDdMmYyyy("2026-09-07")).toBe("07/09/2026");
  });

  test("parseDdMmYyyy parses DD/MM/YYYY and DD-MM-YYYY to ISO YYYY-MM-DD", () => {
    expect(parseDdMmYyyy("07/09/2026")).toBe("2026-09-07");
    expect(parseDdMmYyyy("15-01-2024")).toBe("2024-01-15");
    expect(parseDdMmYyyy("31 12 2025")).toBe("2025-12-31");
    expect(parseDdMmYyyy("invalid")).toBeNull();
    expect(parseDdMmYyyy("")).toBeNull();
  });

  test("fmtDate handles invalid or empty inputs gracefully", () => {
    expect(fmtDate(null)).toBe("—");
    expect(fmtDate(undefined)).toBe("—");
    expect(fmtDate("")).toBe("—");
  });

  test("calcAge calculates age accurately", () => {
    const age = calcAge("2020-01-01");
    expect(age).toBeGreaterThanOrEqual(4);
  });

  test("makeInquiryClient sets default status to inquiry and generates TDC access code", () => {
    const client = makeInquiryClient({
      clientName: "Kenzo Danendra",
      parentName: "Liana Santoso",
      parentContact: "08123456789",
      parentEmail: "liana@example.com",
      dob: "2020-05-12",
      branchId: "branch-sby-timur",
    });

    expect(client.clientName).toBe("Kenzo Danendra");
    expect(client.status).toBe("inquiry");
    expect(client.clientAccessCode).toMatch(/^TDC-[A-Z0-9]{4}$/);
    expect(client.dob).toBe("2020-05-12");
  });
});
