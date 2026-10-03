import React, { useState } from "react";
import { usePagination } from "@/shared/components/TablePagination";
import { toast } from "sonner";
import { Receipt, CheckCircle2, Plus, RefreshCw, History, Package } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { PaymentProofViewerModal } from "@/shared/components/PaymentProofViewerModal";
import { useCredits } from "@/stores/creditsStore";
import { useClients } from "@/stores/clientsStore";
import { useAuth } from "@/stores/authStore";
import { VerificationTab } from "@/features/finance/components/VerificationTab";
import { BillingTab } from "@/features/finance/components/BillingTab";
import { HistoryTab } from "@/features/finance/components/HistoryTab";
import { PackagesTab } from "@/features/finance/components/PackagesTab";
import { CreateInvoiceDialog } from "@/features/finance/components/CreateInvoiceDialog";
import { RenewalDialog } from "@/features/finance/components/RenewalDialog";
import { NewPackageDialog } from "@/features/finance/components/NewPackageDialog";
import { ASSESSMENT_INVOICE_CODE, invoiceTypeCode, packageInvoiceCode } from "@/domain/credit";

export default function FinancePortal() {
  const {
    credits,
    getAllInvoices,
    verifyPaymentProof,
    issueInvoice,
    renewClientCredit,
    addMasterPackage,
    getMasterPackages,
    deleteInvoices,
  } = useCredits();
  const { auth } = useAuth();
  const { clients } = useClients();

  const [activeTab, setActiveTab] = useState("verification"); // verification | billing | renewal | history | packages
  const [selectedProofInvoice, setSelectedProofInvoice] = useState(null);

  // Issue Invoice Modal State
  const [issueOpen, setIssueOpen] = useState(false);
  const [issueForm, setIssueForm] = useState({
    clientId: "",
    type: "package", // package | assessment
    packageId: "pkg-reguler",
    amount: 2500000,
  });

  // Renewal Modal State (Exclusive to Finance)
  const [renewOpen, setRenewOpen] = useState(false);
  const [renewForm, setRenewForm] = useState({
    clientId: "",
    packageId: "pkg-reguler",
    credits: 10,
    amount: 2500000,
  });

  // Add Master Package Modal State
  const [newPkgOpen, setNewPkgOpen] = useState(false);
  const [newPkgForm, setNewPkgForm] = useState({
    name: "",
    invoiceCode: "",
    credits: 10,
    price: 2500000,
    description: "",
  });

  const allInvoices = getAllInvoices();
  const masterPackages = getMasterPackages();

  // Pending verification queue
  const pendingInvoices = allInvoices.filter((inv) => inv.status !== "paid");
  
  // Tab 1 & 2: pagination tagihan
  const pendingPg = usePagination(pendingInvoices, 6);
  const invoicesPg = usePagination(allInvoices, 10);

  // All credit logs
  const allHistoryLogs = (credits.records || []).flatMap((r) => {
    const c = clients.find((client) => client.id === r.clientId);
    return (r.history || []).map((h) => ({
      ...h,
      clientId: r.clientId,
      clientName: c ? c.clientName : "Client",
      branchId: r.branchId || c?.branchId,
    }));
  }).sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  // Tab 3: pagination riwayat kredit
  const historyPg = usePagination(allHistoryLogs, 10);

  // Handle Verify Payment Proof
  const by = auth?.staffName || auth?.role || null;

  const handleApprovePayment = (invoice) => {
    if (invoice.type === "assessment") {
      verifyPaymentProof({ invoiceId: invoice.id, status: "paid", by });
      toast.success(`Pembayaran ${invoice.invoiceNumber} (Assessment) berhasil diverifikasi. Kuesioner ortu kini dapat dibuka.`);
      return;
    }
    // Kredit memakai snapshot invoice; master paket hanya cadangan untuk invoice lama tanpa snapshot.
    const pkg = masterPackages.find((p) => p.id === invoice.packageId) || { credits: 10 };
    const credits = invoice.credits || pkg.credits || 10;
    verifyPaymentProof({
      invoiceId: invoice.id,
      status: "paid",
      creditsToAdd: credits,
      by,
    });
    toast.success(`Pembayaran ${invoice.invoiceNumber} berhasil diverifikasi! (+${credits} kredit aktif)`);
  };

  const handleRejectPayment = (invoice) => {
    verifyPaymentProof({
      invoiceId: invoice.id,
      status: "unpaid",
      by,
    });
    toast.error(`Pembayaran ${invoice.invoiceNumber} ditandai belum valid.`);
  };

  // Hapus invoice (soft delete, hanya role canDelete): pelaku & waktu tercatat di `deletedBy`/`deletedAt` + log invoice
  const handleDeleteInvoice = (invoice) => {
    deleteInvoices([invoice.id], auth?.staffName || auth?.role || null);
    toast.success(`Invoice ${invoice.invoiceNumber} dihapus.`);
  };

  // Submit Issue Invoice
  const handleIssueSubmit = (e) => {
    e.preventDefault();
    const c = clients.find((client) => client.id === issueForm.clientId);
    if (!c) {
      toast.error("Silakan pilih client terlebih dahulu.");
      return;
    }
    const isAssessment = issueForm.type === "assessment";
    const pkg = isAssessment ? null : masterPackages.find((p) => p.id === issueForm.packageId) || { name: "Paket Terapi" };
    const amount = Number(issueForm.amount) || (isAssessment ? 0 : pkg.price || 2500000);
    if (isAssessment && amount <= 0) {
      toast.error("Nominal invoice assessment wajib diisi.");
      return;
    }

    issueInvoice({
      clientId: c.id,
      clientName: c.clientName,
      branchId: c.branchId,
      type: issueForm.type,
      typeCode: invoiceTypeCode(issueForm.type, pkg),
      packageId: isAssessment ? null : issueForm.packageId,
      packageName: isAssessment ? "Assessment" : pkg.name,
      credits: isAssessment ? 0 : pkg.credits,
      amount,
      by,
    });

    toast.success(`Tagihan untuk ${c.clientName} berhasil diterbitkan.`);
    setIssueOpen(false);
  };

  // Submit Renewal (Exclusive to Finance)
  const handleRenewSubmit = (e) => {
    e.preventDefault();
    const c = clients.find((client) => client.id === renewForm.clientId);
    if (!c) {
      toast.error("Silakan pilih client terlebih dahulu.");
      return;
    }
    const pkg = masterPackages.find((p) => p.id === renewForm.packageId) || { name: "Regular Therapist" };

    renewClientCredit({
      clientId: c.id,
      clientName: c.clientName,
      branchId: c.branchId,
      packageId: renewForm.packageId,
      packageName: `${pkg.name} (${renewForm.credits}x)`,
      typeCode: packageInvoiceCode(pkg),
      credits: Number(renewForm.credits) || 10,
      amount: Number(renewForm.amount) || pkg.price || 2500000,
      by,
    });

    toast.success(`Renewal kredit ${c.clientName} berhasil ditambahkan! (+${renewForm.credits} sesi)`);
    setRenewOpen(false);
  };

  // Submit Add Master Package
  const handleAddMasterPackageSubmit = (e) => {
    e.preventDefault();
    if (!newPkgForm.name.trim()) {
      toast.error("Nama paket wajib diisi.");
      return;
    }

    const invoiceCode = newPkgForm.invoiceCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (!invoiceCode) {
      toast.error("Kode paket untuk nomor invoice wajib diisi (mis. REG).");
      return;
    }
    if (invoiceCode === ASSESSMENT_INVOICE_CODE || masterPackages.some((m) => packageInvoiceCode(m) === invoiceCode)) {
      toast.error(`Kode paket "${invoiceCode}" sudah dipakai. Pilih kode lain.`);
      return;
    }

    addMasterPackage({
      name: newPkgForm.name.trim(),
      invoiceCode,
      credits: Number(newPkgForm.credits) || 10,
      price: Number(newPkgForm.price) || 2500000,
      description: newPkgForm.description.trim(),
    });

    toast.success(`Paket baru '${newPkgForm.name}' berhasil ditambahkan ke Master Data!`);
    setNewPkgOpen(false);
    setNewPkgForm({ name: "", invoiceCode: "", credits: 10, price: 2500000, description: "" });
  };

  return (
    <div className="space-y-6" data-testid="finance-portal-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-100/80 text-sky-800 text-xs font-semibold mb-2">
            <Receipt className="w-3.5 h-3.5 text-sky-600" />
            Financial Operations & Credit Settlement
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Role Finance Portal
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Verifikasi transfer orang tua, penerbitan tagihan paket, penambahan kredit renewal, dan buku besar kredit.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            className="border-slate-200 text-slate-700 font-bold gap-2 shadow-2xs hover:bg-slate-100"
            onClick={() => setIssueOpen(true)}
            data-testid="issue-invoice-button"
          >
            <Plus className="w-4 h-4 text-sky-600" /> Buat Tagihan Invoice
          </Button>

          <Button
            className="bg-sky-600 hover:bg-sky-700 text-white font-bold gap-2 shadow-sm shadow-sky-600/20"
            onClick={() => setRenewOpen(true)}
            data-testid="renew-credit-button"
          >
            <RefreshCw className="w-4 h-4" /> Renewal Paket Kredit
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-slate-100/90 border border-slate-200/80 p-1.5 rounded-2xl shadow-2xs gap-1.5 flex flex-wrap h-auto">
          <TabsTrigger value="verification" className="rounded-xl text-xs font-bold gap-2 h-10 px-4 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-2xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Verifikasi Transfer
            {pendingInvoices.length > 0 && (
              <span className="ml-1 px-2 py-0.5 rounded-full bg-amber-500 text-white text-[11px] font-bold">
                {pendingInvoices.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="billing" className="rounded-xl text-xs font-bold gap-2 h-10 px-4 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-2xs">
            <Receipt className="w-4 h-4 text-sky-600" /> Semua Tagihan ({allInvoices.length})
          </TabsTrigger>
          <TabsTrigger value="history" className="rounded-xl text-xs font-bold gap-2 h-10 px-4 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-2xs">
            <History className="w-4 h-4 text-purple-600" /> Log Buku Besar Kredit
          </TabsTrigger>
          <TabsTrigger value="packages" className="rounded-xl text-xs font-bold gap-2 h-10 px-4 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-2xs">
            <Package className="w-4 h-4 text-teal-600" /> Master Data Paket ({masterPackages.length})
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: VERIFIKASI TRANSFER */}
        <VerificationTab handleApprovePayment={handleApprovePayment} handleRejectPayment={handleRejectPayment} pendingInvoices={pendingInvoices} pendingPg={pendingPg} setSelectedProofInvoice={setSelectedProofInvoice} onDeleteInvoice={handleDeleteInvoice} />

        {/* TAB 2: SEMUA TAGIHAN */}
        <BillingTab invoicesPg={invoicesPg} setSelectedProofInvoice={setSelectedProofInvoice} onDeleteInvoice={handleDeleteInvoice} />

        {/* TAB 3: LOG BUKU BESAR KREDIT */}
        <HistoryTab allHistoryLogs={allHistoryLogs} historyPg={historyPg} />

        {/* TAB 4: MASTER DATA PAKET KREDIT */}
        <PackagesTab masterPackages={masterPackages} setNewPkgOpen={setNewPkgOpen} />
      </Tabs>

      {/* Pratinjau Foto & Dokumen Bukti Transfer Modal */}
      <PaymentProofViewerModal
        isOpen={Boolean(selectedProofInvoice)}
        onClose={() => setSelectedProofInvoice(null)}
        invoice={selectedProofInvoice}
        onApprove={handleApprovePayment}
        onReject={handleRejectPayment}
        isFinanceView={true}
      />

      {/* Issue Invoice Modal */}
      <CreateInvoiceDialog clients={clients} handleIssueSubmit={handleIssueSubmit} issueForm={issueForm} issueOpen={issueOpen} masterPackages={masterPackages} setIssueForm={setIssueForm} setIssueOpen={setIssueOpen} />

      {/* Renewal Modal (Exclusively in Role Finance) */}
      <RenewalDialog clients={clients} handleRenewSubmit={handleRenewSubmit} masterPackages={masterPackages} renewForm={renewForm} renewOpen={renewOpen} setRenewForm={setRenewForm} setRenewOpen={setRenewOpen} />

      {/* Add Master Package Modal */}
      <NewPackageDialog handleAddMasterPackageSubmit={handleAddMasterPackageSubmit} newPkgForm={newPkgForm} newPkgOpen={newPkgOpen} setNewPkgForm={setNewPkgForm} setNewPkgOpen={setNewPkgOpen} />
    </div>
  );
}
