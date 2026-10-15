// @vitest-environment jsdom
// Kuesioner publik, tahap upload bukti transfer: tujuan transfer = rekening aktif cabang tempat client di-intake.
import { act } from "react";
import { createRoot } from "react-dom/client";
import { AssessmentProofCard } from "@/features/assessment/components/AssessmentProofCard";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const invoice = { invoiceNumber: "INV-001", amount: 500000 };

let root;
let container;
beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

const mount = (props) => act(() => root.render(<AssessmentProofCard invoice={invoice} onSubmit={() => {}} onBack={() => {}} {...props} />));
const byId = (id) => container.querySelector(`[data-testid="${id}"]`);

describe("AssessmentProofCard: info rekening cabang", () => {
  test("menampilkan rekening aktif cabang client sebagai tujuan transfer", () => {
    mount({
      branchName: "East",
      bankAccounts: [
        { id: "b1", bankName: "BCA", accountNumber: "0123456789", accountHolder: "PT Therapedia", isActive: true },
        { id: "b2", bankName: "Mandiri", accountNumber: "1400012345678", accountHolder: "PT Therapedia", isActive: true },
      ],
    });

    expect(byId("branch-bank-account-b1").textContent).toContain("0123456789");
    expect(byId("branch-bank-account-b2").textContent).toContain("Mandiri");
    expect(byId("branch-bank-accounts").textContent).toContain("Therapedia East");
    expect(byId("branch-bank-account-copy-b1")).not.toBeNull();
  });

  test("cabang tanpa rekening aktif: tampil ajakan menghubungi admin cabang", () => {
    mount({ bankAccounts: [] });
    expect(byId("branch-bank-accounts-empty").textContent.toLowerCase()).toContain("hubungi admin cabang");
  });
});
