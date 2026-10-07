import React, { useMemo, useState } from "react";
import { usePagination } from "@/shared/components/TablePagination";
import { SearchInput } from "@/shared/components/FilterBar";
import { toast } from "sonner";
import { Receipt, CheckCircle2, Plus, RefreshCw, History, Package, Wallet, ScrollText, Flame, CalendarOff } from "lucide-react";
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
import { ClientLedgerTab } from "@/features/finance/components/ClientLedgerTab";
import { RenewalNeededTab } from "@/features/finance/components/RenewalNeededTab";
import { PackagesTab } from "@/features/finance/components/PackagesTab";
import { LeaveTab } from "@/features/finance/components/leave/LeaveTab";
import { useLeaves } from "@/stores/leavesStore";
import { fmtDate } from "@/shared/lib/format";
import { CreateInvoiceDialog } from "@/features/finance/components/CreateInvoiceDialog";
import { RenewalDialog } from "@/features/finance/components/RenewalDialog";
import { usePackageActivationActions } from "@/features/finance/hooks/usePackageActivationActions";
import { NewPackageDialog } from "@/features/finance/components/NewPackageDialog";
import { isActiveClient } from "@/domain/client";
import { RESERVED_INVOICE_CODES, invoiceType, buildSamePackageRenewal, hasOpenPackageInvoice, needsRenewal, canDeleteInvoice, invoiceTypeCode, replacementCandidates, resolveInvoicePackage, leftoverSummaryByClient, matchesFinanceSearch, packageInvoiceCode } from "@/domain/credit";

export default function FinancePortal() {
  const {
    credits,
    getAllInvoices,
    verifyPaymentProof,
    uploadPaymentProof,
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
  const { leaves } = useLeaves();
  const { approvePackagePayment, renewDirect } = usePackageActivationActions();

  const [activeTab, setActiveTab] = useState("verification"); // verification | renewal | billing | history | ledger | leftover | leave | packages
  const [selectedProofId, setSelectedProofId] = useState(null);
  const selectedProofInvoice = rawInvoices.find((i) => i.id === selectedProofId) || null; // selalu versi terbaru (bukti bisa diganti saat viewer terbuka)
  const setSelectedProofInvoice = (inv) => setSelectedProofId(inv?.id || null);

  // Issue Invoice Modal State
  const [issueOpen, setIssueOpen] = useState(false);
  const [issueForm, setIssueForm] = useState({
    clientId: "",
    type: "package", // package | assessment | leave
    leaveId: "", // invoice cuti: log cuti yang disambungkan (opsional)
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
    resetLeave: false, // isi ulang credit leave ke angka master (hanya berarti untuk paket satuan)
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
    leaveQuota: 0,
    isSatuan: false,
    isAssessment: false,
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

  // Tab Perlu Renewal: client aktif dengan sisa kredit < 3 (sama dengan aturan domain), dicari lewat kotak cari yang sama
  const renewalRows = useMemo(
    () =>
      (credits.records || [])
        .filter(needsRenewal)
        .map((r) => ({ client: clientById.get(r.clientId), record: r }))
        .filter(({ client }) => client && isActiveClient(client) && matchesFinanceSearch({ clientName: client.clientName }, client, search))
        .map(({ client, record }) => ({
          client,
          remaining: (record.packages || []).reduce((acc, p) => acc + (p.status === "voided" ? 0 : p.remainingCredit || 0), 0),
          plan: buildSamePackageRenewal(record, masterPackages),
          hasOpenInvoice: hasOpenPackageInvoice(rawInvoices, client.id),
        }))
        .sort((a, b) => a.remaining - b.remaining || a.client.clientName.localeCompare(b.client.clientName)),
    [credits.records, clientById, search, masterPackages, rawInvoices]
  );
  const renewalPg = usePagination(renewalRows, 10, search);

  // Handle Verify Payment Proof
  const by = auth?.staffName || auth?.role || null;

  const handleApprovePayment = (invoice) => {
    if (invoiceType(invoice) === "leave") {
      verifyPaymentProof({ invoiceId: invoice.id, status: "paid", by });
      toast.success(`Pembayaran ${invoice.invoiceNumber} (Cuti) ditandai lunas.`);
      return;
    }
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

  // Renewal cepat: terbitkan invoice paket yang sama (unpaid) → langsung muncul di Menunggu Pembayaran
  const handleQuickRenew = (client, plan) => {
    if (!plan) {
      toast.error(`${client.clientName} belum punya paket untuk diperpanjang.`);
      return;
    }
    issueInvoice({
      clientId: client.id,
      clientName: client.clientName,
      branchId: client.branchId,
      type: "package",
      isRenewal: true,
      typeCode: plan.typeCode,
      packageId: plan.packageId,
      packageName: plan.packageName,
      credits: plan.credits,
      amount: plan.amount,
      by,
    });
    toast.success(`Invoice renewal ${client.clientName} (${plan.packageName}) diterbitkan. Menunggu pembayaran.`);
    setActiveTab("verification");
  };

  // Finance mengunggah / mengganti bukti manual (mis. bukti mutasi). Tidak mengubah status invoice; tercatat di log invoice.
  const handleUploadProof = (invoice, file) => {
    const replacing = Boolean(invoice.proofOfPaymentUrl || invoice.proofUrl);
    uploadPaymentProof({
      invoiceId: invoice.id,
      proofUrl: file.dataUrl,
      fileName: file.fileName,
      fileType: file.fileType,
      fileSize: file.fileSize,
      byFinance: true,
      by,
    });
    toast.success(`Bukti ${invoice.invoiceNumber} ${replacing ? "diganti" : "diunggah"}.`);
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
    const isLeave = issueForm.type === "leave";
    const isNonPackage = isAssessment || isLeave;
    const linkedLeave = isLeave && issueForm.leaveId ? leaves.find((l) => l.id === issueForm.leaveId) : null;
    const pkg = isNonPackage ? null : masterPackages.find((p) => p.id === issueForm.packageId) || { name: "Paket Terapi" };
    const amount = Number(issueForm.amount) || (isNonPackage ? 0 : pkg.price || 2500000);
    if (isNonPackage && amount <= 0) {
      toast.error(`Nominal invoice ${isLeave ? "cuti" : "assessment"} wajib diisi.`);
      return;
    }

    // Invoice cuti: nominal manual Finance, tanpa paket/kredit; opsional tertaut ke log cuti
    if (isLeave) {
      const label = linkedLeave ? `Cuti ${fmtDate(linkedLeave.startDate)} – ${fmtDate(linkedLeave.endDate)}` : "Cuti";
      issueInvoice({ clientId: c.id, clientName: c.clientName, branchId: c.branchId, type: "leave", typeCode: invoiceTypeCode("leave", null), packageName: label, amount, leaveId: linkedLeave ? linkedLeave.id : null, paidDirect: Boolean(issueForm.paidDirect), note: (issueForm.note || "").trim(), by });
      toast.success(`Invoice cuti ${c.clientName} diterbitkan${linkedLeave ? ` dan dihubungkan ke ${label}` : ""}${issueForm.paidDirect ? ", langsung lunas" : ". Menunggu pembayaran"}.`);
      setIssueForm({ ...issueForm, leaveId: "", amount: "", paidDirect: false, note: "" });
      setIssueOpen(false);
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
        resetLeave: Boolean(renewForm.resetLeave),
        by,
      });
      toast.success(`Invoice renewal ${c.clientName} diterbitkan${replaced ? `, menggantikan ${replaced.invoiceNumber}` : ""}. Menunggu pembayaran, lalu tandai lunas.`);
      setRenewOpen(false);
      setRenewForm({ ...renewForm, replacesInvoiceId: "", resetLeave: false });
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
      resetLeave: Boolean(renewForm.resetLeave),
    });

    toast.success(
      replaced
        ? `Renewal ${c.clientName} langsung lunas, menggantikan ${replaced.invoiceNumber}: paket lama dipakai ulang (kredit tidak bertambah).`
        : `Renewal kredit ${c.clientName} langsung lunas! (+${credits} sesi)${relinked ? ` ${relinked} jadwal mendatang dipindah ke paket aktif.` : ""}`
    );
    setRenewOpen(false);
    setRenewForm({ ...renewForm, reason: "", replacesInvoiceId: "", resetLeave: false });
  };

  const closePackageDialog = () => {
    setNewPkgOpen(false);
    setEditingPkgId(null);
    setNewPkgForm({ name: "", invoiceCode: "", credits: 10, price: 2500000, description: "", leaveQuota: 0, isSatuan: false, isAssessment: false });
  };

  const openEditPackage = (pkg) => {
    setEditingPkgId(pkg.id);
    setNewPkgForm({ name: pkg.name, invoiceCode: packageInvoiceCode(pkg), credits: pkg.credits, price: pkg.price, description: pkg.description || "", leaveQuota: pkg.leaveQuota || 0, isSatuan: Boolean(pkg.isSatuan), isAssessment: Boolean(pkg.isAssessment) });
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
    if (RESERVED_INVOICE_CODES.includes(invoiceCode) || masterPackages.some((m) => m.id !== editingPkgId && packageInvoiceCode(m) === invoiceCode)) {
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
        leaveQuota: Math.max(0, Number(newPkgForm.leaveQuota) || 0),
        isSatuan: Boolean(newPkgForm.isSatuan),
        isAssessment: Boolean(newPkgForm.isAssessment),
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
      leaveQuota: Math.max(0, Number(newPkgForm.leaveQuota) || 0),
      isSatuan: Boolean(newPkgForm.isSatuan),
      isAssessment: Boolean(newPkgForm.isAssessment),
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
          <TabsTrigger value="renewal" className="rounded-xl text-xs font-bold gap-2 h-10 px-4 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-2xs" data-testid="tab-renewal">
            <Flame className="w-4 h-4 text-amber-600" /> Perlu Renewal ({renewalRows.length})
          </TabsTrigger>
          <TabsTrigger value="billing" className="rounded-xl text-xs font-bold gap-2 h-10 px-4 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-2xs">
            <Receipt className="w-4 h-4 text-sky-600" /> Semua Tagihan ({allInvoices.length})
          </TabsTrigger>
          <TabsTrigger value="history" className="rounded-xl text-xs font-bold gap-2 h-10 px-4 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-2xs">
            <History className="w-4 h-4 text-purple-600" /> Log Buku Besar Kredit
          </TabsTrigger>
          <TabsTrigger value="ledger" className="rounded-xl text-xs font-bold gap-2 h-10 px-4 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-2xs" data-testid="tab-ledger">
            <ScrollText className="w-4 h-4 text-sky-600" /> Log Kredit & Saldo
          </TabsTrigger>
          <TabsTrigger value="leftover" className="rounded-xl text-xs font-bold gap-2 h-10 px-4 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-2xs" data-testid="tab-leftover">
            <Wallet className="w-4 h-4 text-amber-600" /> Saldo Lebihan ({leftoverRows.length})
          </TabsTrigger>
          <TabsTrigger value="leave" className="rounded-xl text-xs font-bold gap-2 h-10 px-4 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-2xs" data-testid="tab-leave">
            <CalendarOff className="w-4 h-4 text-violet-600" /> Cuti
          </TabsTrigger>
          <TabsTrigger value="packages" className="rounded-xl text-xs font-bold gap-2 h-10 px-4 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-2xs">
            <Package className="w-4 h-4 text-teal-600" /> Master Data Paket ({masterPackages.length})
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: VERIFIKASI TRANSFER */}
        <VerificationTab handleApprovePayment={handleApprovePayment} pendingInvoices={pendingInvoices} pendingPg={pendingPg} onDeleteInvoice={handleDeleteInvoice} setSelectedProofInvoice={setSelectedProofInvoice} onUploadProof={handleUploadProof} />

        {/* TAB: PERLU RENEWAL (kredit < 3) */}
        <RenewalNeededTab rows={renewalRows} renewalPg={renewalPg} onRenew={handleQuickRenew} />

        {/* TAB 2: SEMUA TAGIHAN */}
        <BillingTab invoicesPg={invoicesPg} setSelectedProofInvoice={setSelectedProofInvoice} onDeleteInvoice={handleDeleteInvoice} onUploadProof={handleUploadProof} />

        {/* TAB 3: LOG BUKU BESAR KREDIT */}
        <HistoryTab allHistoryLogs={allHistoryLogs} historyPg={historyPg} />

        {/* TAB: LOG KREDIT & SALDO PER CLIENT (rupiah) */}
        <ClientLedgerTab clients={clients.filter((c) => matchesFinanceSearch({ clientName: c.clientName }, c, search))} search={search} />

        {/* TAB: SALDO LEBIHAN CLIENT */}
        <LeftoverTab rows={leftoverRows} leftoverPg={leftoverPg} includeZero={includeZeroLeftover} setIncludeZero={setIncludeZeroLeftover} />

        {/* TAB: CUTI CLIENT (jatah 30 hari/tahun; log berdiri sendiri) */}
        <LeaveTab clients={clients} search={search} invoices={rawInvoices} onIssueInvoice={(leave) => { setIssueForm({ ...issueForm, type: "leave", clientId: leave.clientId, leaveId: leave.id, amount: "", paidDirect: false, note: "" }); setIssueOpen(true); }} />

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
        onReplaceProof={handleUploadProof}
        isFinanceView={true}
      />

      {/* Issue Invoice Modal */}
      <CreateInvoiceDialog leaves={leaves} clients={clients} handleIssueSubmit={handleIssueSubmit} issueForm={issueForm} issueOpen={issueOpen} masterPackages={masterPackages} replacementOptions={replacementOptions} setIssueForm={setIssueForm} setIssueOpen={setIssueOpen} />

      {/* Renewal Modal (Exclusively in Role Finance) */}
      <RenewalDialog clients={clients} handleRenewSubmit={handleRenewSubmit} masterPackages={masterPackages} renewForm={renewForm} renewOpen={renewOpen} replacementOptions={renewReplacementOptions} setRenewForm={setRenewForm} setRenewOpen={setRenewOpen} />

      {/* Add Master Package Modal */}
      <NewPackageDialog handleAddMasterPackageSubmit={handleAddMasterPackageSubmit} newPkgForm={newPkgForm} newPkgOpen={newPkgOpen} setNewPkgForm={setNewPkgForm} setNewPkgOpen={(o) => (o ? setNewPkgOpen(true) : closePackageDialog())} isEdit={Boolean(editingPkgId)} />
    </div>
  );
}
