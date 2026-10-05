import React, { useMemo, useState } from "react";
import { usePagination } from "@/shared/components/TablePagination";
import { SearchInput } from "@/shared/components/FilterBar";
import { toast } from "sonner";
import { Receipt, CheckCircle2, Plus, RefreshCw, History, Package, Wallet } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { PaymentProofViewerModal } from "@/shared/components/PaymentProofViewerModal";
import { useCredits } from "@/stores/creditsStore";
import { useClients } from "@/stores/clientsStore";
import { useAuth } from "@/stores/authStore";
import { VerificationTab } from "@/features/finance/components/VerificationTab";
import { BillingTab } from "@/features/finance/components/BillingTab";
import { HistoryTab } from "@/features/finance/components/HistoryTab";
import { LeftoverTab } from "@/features/finance/components/LeftoverTab";
import { PackagesTab } from "@/features/finance/components/PackagesTab";
import { CreateInvoiceDialog } from "@/features/finance/components/CreateInvoiceDialog";
import { RenewalDialog } from "@/features/finance/components/RenewalDialog";
import { usePackageActivationActions } from "@/features/finance/hooks/usePackageActivationActions";
import { NewPackageDialog } from "@/features/finance/components/NewPackageDialog";
import { ASSESSMENT_INVOICE_CODE, canDeleteInvoice, invoiceTypeCode, replacementCandidates, resolveInvoicePackage, leftoverSummaryByClient, matchesFinanceSearch, packageInvoiceCode } from "@/domain/credit";

export default function FinancePortal() {
  const {
    credits,
    getAllInvoices,
    verifyPaymentProof,
    issueInvoice,
    addMasterPackage,
    updateMasterPackage,
    getMasterPackages,
    deleteInvoices,
    getRawRecord,
  } = useCredits();
  const { auth } = useAuth();
  const { clients } = useClients();
  const rawInvoices = getAllInvoices();
  const { approvePackagePayment, renewDirect } = usePackageActivationActions();

  const [activeTab, setActiveTab] = useState("verification"); // verification | billing | history | leftover | packages
  const [selectedProofInvoice, setSelectedProofInvoice] = useState(null);

  // Issue Invoice Modal State
  const [issueOpen, setIssueOpen] = useState(false);
  const [issueForm, setIssueForm] = useState({
    clientId: "",
    type: "package", // package | assessment
    packageId: "pkg-reguler",
    amount: 2500000,
    replacesInvoiceId: "", // "" belum dipilih | invoice void yang digantikan | "none" pembelian paket baru
    paidDirect: false, // langsung lunas (tanpa bukti bayar ortu)
    note: "",
  });

  // Renewal Modal State (Exclusive to Finance)
  const [renewOpen, setRenewOpen] = useState(false);
  const [renewForm, setRenewForm] = useState({
    clientId: "",
    packageId: "pkg-reguler",
    credits: 10,
    amount: 2500000,
    replacesInvoiceId: "", // "" belum dipilih | id invoice void yang digantikan | "none" paket baru
    mode: "invoice", // invoice | direct (langsung lunas)
    reason: "", // catatan Finance (opsional)
  });

  // Add Master Package Modal State
  const [newPkgOpen, setNewPkgOpen] = useState(false);
  const [editingPkgId, setEditingPkgId] = useState(null); // id paket master yang sedang diubah (null = tambah baru)
  const [newPkgForm, setNewPkgForm] = useState({
    name: "",
    invoiceCode: "",
    credits: 10,
    price: 2500000,
    description: "",
  });

  const [search, setSearch] = useState(""); // cari nama anak / ortu / kode client / no. invoice (semua tab tabel)
  const clientById = useMemo(() => new Map(clients.map((c) => [c.id, c])), [clients]);
  const matchSearch = (row) => matchesFinanceSearch(row, clientById.get(row.clientId), search);

  const allInvoices = rawInvoices.filter(matchSearch);
  const masterPackages = getMasterPackages();

  // Invoice void (kredit dipertahankan) milik client terpilih yang paketnya belum diambil alih invoice pengganti
  const optionsFor = (clientId) =>
      replacementCandidates(rawInvoices, clientId).map((inv) => {
        const pkg = resolveInvoicePackage(getRawRecord(inv.clientId), inv);
        return { id: inv.id, invoiceNumber: inv.invoiceNumber, packageName: pkg?.packageName || inv.packageName, remaining: pkg?.remainingCredit ?? 0, packageId: inv.packageId, totalCredit: pkg?.totalCredit ?? inv.credits };
      });
  const replacementOptions = useMemo(() => optionsFor(issueForm.clientId), [rawInvoices, issueForm.clientId, getRawRecord]); // eslint-disable-line react-hooks/exhaustive-deps
  const renewReplacementOptions = useMemo(() => optionsFor(renewForm.clientId), [rawInvoices, renewForm.clientId, getRawRecord]); // eslint-disable-line react-hooks/exhaustive-deps

  // Pending verification queue
  const pendingInvoices = allInvoices.filter((inv) => inv.status !== "paid" && inv.status !== "void");
  
  // Tab 1 & 2: pagination tagihan
  const pendingPg = usePagination(pendingInvoices, 6, search);
  const invoicesPg = usePagination(allInvoices, 10, search);

  // All credit logs. Client terhapus (soft delete) tidak punya baris di `clients` → riwayat kreditnya ikut tidak tampil.
  const allHistoryLogs = (credits.records || []).flatMap((r) => {
    const c = clientById.get(r.clientId);
    if (!c || !matchesFinanceSearch({ clientName: c.clientName }, c, search)) return [];
    return (r.history || []).map((h) => ({
      ...h,
      clientId: r.clientId,
      clientName: c.clientName,
      branchId: r.branchId || c.branchId,
    }));
  }).sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  // Tab 3: pagination riwayat kredit
  const historyPg = usePagination(allHistoryLogs, 10, search);

  // Tab Saldo Lebihan: client dengan saldo lebihan konversi (default hanya saldo > 0), dicari lewat kotak cari yang sama
  const [includeZeroLeftover, setIncludeZeroLeftover] = useState(false);
  const leftoverRows = useMemo(
    () =>
      leftoverSummaryByClient({ records: credits.records || [], conversions: credits.conversions || [], invoices: rawInvoices })
        .map((r) => ({ ...r, client: clientById.get(r.clientId) }))
        .filter((r) => r.client && (includeZeroLeftover || r.balance > 0) && matchesFinanceSearch({ clientName: r.client.clientName }, r.client, search))
        .sort((a, b) => b.balance - a.balance || a.client.clientName.localeCompare(b.client.clientName)),
    [credits, rawInvoices, clientById, includeZeroLeftover, search]
  );
  const leftoverPg = usePagination(leftoverRows, 10, `${search}|${includeZeroLeftover}`);

  // Handle Verify Payment Proof
  const by = auth?.staffName || auth?.role || null;

  const handleApprovePayment = (invoice) => {
    if (invoice.type === "assessment") {
      verifyPaymentProof({ invoiceId: invoice.id, status: "paid", by });
      toast.success(`Pembayaran ${invoice.invoiceNumber} (Assessment) ditandai lunas. Akses kuesioner ortu terbuka.`);
      return;
    }
    // Kredit memakai snapshot invoice; master paket hanya cadangan untuk invoice lama tanpa snapshot.
    const pkg = masterPackages.find((p) => p.id === invoice.packageId) || { credits: 10 };
    const credits = invoice.credits || pkg.credits || 10;
    const { relinked } = approvePackagePayment(invoice, { creditsToAdd: credits });
    toast.success(`Pembayaran ${invoice.invoiceNumber} ditandai lunas! (+${credits} kredit aktif)${relinked ? ` ${relinked} jadwal mendatang dipindah ke paket aktif.` : ""}`);
  };

  const handleRejectPayment = (invoice) => {
    verifyPaymentProof({
      invoiceId: invoice.id,
      status: "unpaid",
      by,
    });
    toast.error(`Pembayaran ${invoice.invoiceNumber} ditandai belum valid.`);
  };

  // Hapus invoice PERMANEN (hanya role canDelete) dan HANYA yang belum lunas; invoice lunas dikoreksi lewat Void
  const handleDeleteInvoice = (invoice) => {
    if (!canDeleteInvoice(invoice)) {
      toast.error("Invoice yang sudah lunas tidak bisa dihapus. Gunakan Void.");
      return;
    }
    deleteInvoices([invoice.id]);
    toast.success(`Invoice ${invoice.invoiceNumber} dihapus permanen${invoice.balanceApplied > 0 ? "; saldo lebihan yang dipakainya dikembalikan ke client" : ""}.`);
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

    const needsChoice = !isAssessment && replacementOptions.length > 0;
    if (needsChoice && !issueForm.replacesInvoiceId) {
      toast.error("Pilih apakah invoice ini menggantikan invoice void atau pembelian paket baru.");
      return;
    }
    const replaced = needsChoice && issueForm.replacesInvoiceId !== "none" ? rawInvoices.find((i) => i.id === issueForm.replacesInvoiceId) : null;

    const payload = {
      replacesInvoiceId: replaced ? replaced.id : null,
      clientId: c.id,
      clientName: c.clientName,
      branchId: c.branchId,
      typeCode: invoiceTypeCode(issueForm.type, pkg),
      packageId: isAssessment ? null : issueForm.packageId,
      packageName: isAssessment ? "Assessment" : pkg.name,
      credits: isAssessment ? 0 : pkg.credits,
      amount,
      by,
    };
    const note = (issueForm.note || "").trim();

    // Langsung lunas: tanpa bukti bayar ortu. Paket → invoice lunas + paket aktif; assessment → invoice lunas.
    if (issueForm.paidDirect) {
      if (isAssessment) {
        issueInvoice({ ...payload, type: "assessment", paidDirect: true, note });
        toast.success(`Invoice assessment ${c.clientName} diterbitkan dan langsung lunas.`);
      } else {
        const { relinked } = renewDirect({ ...payload, isRenewal: false, reason: note });
        toast.success(
          replaced
            ? `Invoice ${c.clientName} langsung lunas, menggantikan ${replaced.invoiceNumber}: paket lama dipakai ulang (kredit tidak bertambah).`
            : `Invoice ${c.clientName} langsung lunas! (+${pkg.credits} sesi)${relinked ? ` ${relinked} jadwal mendatang dipindah ke paket aktif.` : ""}`
        );
      }
      setIssueForm({ ...issueForm, replacesInvoiceId: "", paidDirect: false, note: "" });
      setIssueOpen(false);
      return;
    }

    issueInvoice({ ...payload, type: issueForm.type });

    toast.success(`Tagihan untuk ${c.clientName} berhasil diterbitkan.${replaced ? ` Menggantikan ${replaced.invoiceNumber}.` : ""}`);
    setIssueForm({ ...issueForm, replacesInvoiceId: "" });
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
    const credits = Number(renewForm.credits) || 10;
    const amount = Number(renewForm.amount) || pkg.price || 2500000;
    // Invoice pengganti (invoice void sebelumnya): pilihan WAJIB bila ada kandidat; paket lama dipakai ulang, kredit tidak dobel
    if (renewReplacementOptions.length > 0 && !renewForm.replacesInvoiceId) {
      toast.error("Pilih apakah renewal ini menggantikan invoice void atau pembelian paket baru.");
      return;
    }
    const replaced = renewForm.replacesInvoiceId && renewForm.replacesInvoiceId !== "none" ? renewReplacementOptions.find((o) => o.id === renewForm.replacesInvoiceId) : null;
    const packageName = replaced ? replaced.packageName : `${pkg.name} (${credits}x)`; // snapshot mengikuti paket lama bila menggantikan
    const snapshotCredits = replaced ? replaced.totalCredit : credits;
    const snapshotPackageId = replaced ? replaced.packageId || renewForm.packageId : renewForm.packageId;

    // Jalur 1: terbitkan invoice renewal baru (unpaid → Finance menandai lunas setelah pembayaran diterima)
    if (renewForm.mode !== "direct") {
      issueInvoice({
        replacesInvoiceId: replaced ? replaced.id : null,
        clientId: c.id,
        clientName: c.clientName,
        branchId: c.branchId,
        type: "package",
        isRenewal: true,
        typeCode: packageInvoiceCode(pkg),
        packageId: snapshotPackageId,
        packageName,
        credits: snapshotCredits,
        amount,
        by,
      });
      toast.success(`Invoice renewal ${c.clientName} diterbitkan${replaced ? `, menggantikan ${replaced.invoiceNumber}` : ""}. Menunggu pembayaran, lalu tandai lunas.`);
      setRenewOpen(false);
      setRenewForm({ ...renewForm, replacesInvoiceId: "" });
      return;
    }

    // Jalur 2: langsung lunas; catatan Finance opsional (tercatat di invoice & log invoice)
    const { relinked } = renewDirect({
      replacesInvoiceId: replaced ? replaced.id : null,
      clientId: c.id,
      clientName: c.clientName,
      branchId: c.branchId,
      packageId: snapshotPackageId,
      packageName,
      typeCode: packageInvoiceCode(pkg),
      credits: snapshotCredits,
      amount,
      isRenewal: true,
      reason: (renewForm.reason || "").trim(),
    });

    toast.success(
      replaced
        ? `Renewal ${c.clientName} langsung lunas, menggantikan ${replaced.invoiceNumber}: paket lama dipakai ulang (kredit tidak bertambah).`
        : `Renewal kredit ${c.clientName} langsung lunas! (+${credits} sesi)${relinked ? ` ${relinked} jadwal mendatang dipindah ke paket aktif.` : ""}`
    );
    setRenewOpen(false);
    setRenewForm({ ...renewForm, reason: "", replacesInvoiceId: "" });
  };

  const closePackageDialog = () => {
    setNewPkgOpen(false);
    setEditingPkgId(null);
    setNewPkgForm({ name: "", invoiceCode: "", credits: 10, price: 2500000, description: "" });
  };

  const openEditPackage = (pkg) => {
    setEditingPkgId(pkg.id);
    setNewPkgForm({ name: pkg.name, invoiceCode: packageInvoiceCode(pkg), credits: pkg.credits, price: pkg.price, description: pkg.description || "" });
    setNewPkgOpen(true);
  };

  // Submit Add/Edit Master Package
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
    if (invoiceCode === ASSESSMENT_INVOICE_CODE || masterPackages.some((m) => m.id !== editingPkgId && packageInvoiceCode(m) === invoiceCode)) {
      toast.error(`Kode paket "${invoiceCode}" sudah dipakai. Pilih kode lain.`);
      return;
    }

    if (editingPkgId) {
      updateMasterPackage(editingPkgId, {
        name: newPkgForm.name.trim(),
        invoiceCode,
        credits: Number(newPkgForm.credits) || 10,
        price: Number(newPkgForm.price) || 2500000,
        description: newPkgForm.description.trim(),
      });
      toast.success(`Paket '${newPkgForm.name}' diperbarui.`);
      closePackageDialog();
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
    closePackageDialog();
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
            Konfirmasi pembayaran orang tua, penerbitan tagihan paket, penambahan kredit renewal, dan buku besar kredit.
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

      <SearchInput
        className="max-w-xl"
        placeholder="Cari nama anak, orang tua, kode client, atau no. invoice..."
        value={search}
        onChange={setSearch}
        data-testid="finance-search"
      />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-slate-100/90 border border-slate-200/80 p-1.5 rounded-2xl shadow-2xs gap-1.5 flex flex-wrap h-auto">
          <TabsTrigger value="verification" className="rounded-xl text-xs font-bold gap-2 h-10 px-4 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-2xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Menunggu Pembayaran
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
          <TabsTrigger value="leftover" className="rounded-xl text-xs font-bold gap-2 h-10 px-4 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-2xs" data-testid="tab-leftover">
            <Wallet className="w-4 h-4 text-amber-600" /> Saldo Lebihan ({leftoverRows.length})
          </TabsTrigger>
          <TabsTrigger value="packages" className="rounded-xl text-xs font-bold gap-2 h-10 px-4 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-2xs">
            <Package className="w-4 h-4 text-teal-600" /> Master Data Paket ({masterPackages.length})
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: VERIFIKASI TRANSFER */}
        <VerificationTab handleApprovePayment={handleApprovePayment} pendingInvoices={pendingInvoices} pendingPg={pendingPg} onDeleteInvoice={handleDeleteInvoice} />

        {/* TAB 2: SEMUA TAGIHAN */}
        <BillingTab invoicesPg={invoicesPg} setSelectedProofInvoice={setSelectedProofInvoice} onDeleteInvoice={handleDeleteInvoice} />

        {/* TAB 3: LOG BUKU BESAR KREDIT */}
        <HistoryTab allHistoryLogs={allHistoryLogs} historyPg={historyPg} />

        {/* TAB: SALDO LEBIHAN CLIENT */}
        <LeftoverTab rows={leftoverRows} leftoverPg={leftoverPg} includeZero={includeZeroLeftover} setIncludeZero={setIncludeZeroLeftover} />

        {/* TAB 4: MASTER DATA PAKET KREDIT */}
        <PackagesTab masterPackages={masterPackages} setNewPkgOpen={(o) => { setEditingPkgId(null); setNewPkgOpen(o); }} onEditPackage={openEditPackage} />
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
      <CreateInvoiceDialog clients={clients} handleIssueSubmit={handleIssueSubmit} issueForm={issueForm} issueOpen={issueOpen} masterPackages={masterPackages} replacementOptions={replacementOptions} setIssueForm={setIssueForm} setIssueOpen={setIssueOpen} />

      {/* Renewal Modal (Exclusively in Role Finance) */}
      <RenewalDialog clients={clients} handleRenewSubmit={handleRenewSubmit} masterPackages={masterPackages} renewForm={renewForm} renewOpen={renewOpen} replacementOptions={renewReplacementOptions} setRenewForm={setRenewForm} setRenewOpen={setRenewOpen} />

      {/* Add Master Package Modal */}
      <NewPackageDialog handleAddMasterPackageSubmit={handleAddMasterPackageSubmit} newPkgForm={newPkgForm} newPkgOpen={newPkgOpen} setNewPkgForm={setNewPkgForm} setNewPkgOpen={(o) => (o ? setNewPkgOpen(true) : closePackageDialog())} isEdit={Boolean(editingPkgId)} />
    </div>
  );
}
