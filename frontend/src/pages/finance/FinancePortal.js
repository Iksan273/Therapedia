import React, { useState } from "react";
import { toast } from "sonner";
import {
  Receipt,
  CheckCircle2,
  XCircle,
  Plus,
  RefreshCw,
  History,
  Package,
  Eye,
  Building2,
  DollarSign,
  ShieldCheck,
  Search,
  ArrowUpRight,
  Sparkles,
  Layers
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/common/StatusBadge";
import { EmptyState } from "@/components/common/EmptyState";
import { useCredits } from "@/context/CreditsContext";
import { useClients } from "@/context/ClientsContext";
import { BRANCHES, fmtCurrency, fmtDate } from "@/lib/appUtils";
import { cn } from "@/lib/utils";

export default function FinancePortal() {
  const {
    credits,
    getAllInvoices,
    verifyPaymentProof,
    issueInvoice,
    renewClientCredit,
    addMasterPackage,
    getMasterPackages,
  } = useCredits();
  const { clients } = useClients();

  const [activeTab, setActiveTab] = useState("verification"); // verification | billing | renewal | history | packages
  const [proofPreviewUrl, setProofPreviewUrl] = useState(null);

  // Issue Invoice Modal State
  const [issueOpen, setIssueOpen] = useState(false);
  const [issueForm, setIssueForm] = useState({
    clientId: "",
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
    credits: 10,
    price: 2500000,
    description: "",
  });

  const allInvoices = getAllInvoices();
  const masterPackages = getMasterPackages();

  // Pending verification queue
  const pendingInvoices = allInvoices.filter((inv) => inv.status !== "paid");
  const paidInvoices = allInvoices.filter((inv) => inv.status === "paid");

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

  // Handle Verify Payment Proof
  const handleApprovePayment = (invoice) => {
    const pkg = masterPackages.find((p) => p.id === invoice.packageId) || { credits: 10 };
    verifyPaymentProof({
      invoiceId: invoice.id,
      status: "paid",
      creditsToAdd: pkg.credits || 10,
    });
    toast.success(`Pembayaran ${invoice.invoiceNumber} berhasil diverifikasi! (+${pkg.credits || 10} kredit aktif)`);
  };

  const handleRejectPayment = (invoice) => {
    verifyPaymentProof({
      invoiceId: invoice.id,
      status: "unpaid",
    });
    toast.error(`Pembayaran ${invoice.invoiceNumber} ditandai belum valid.`);
  };

  // Submit Issue Invoice
  const handleIssueSubmit = (e) => {
    e.preventDefault();
    const c = clients.find((client) => client.id === issueForm.clientId);
    if (!c) {
      toast.error("Silakan pilih client terlebih dahulu.");
      return;
    }
    const pkg = masterPackages.find((p) => p.id === issueForm.packageId) || { name: "Paket Terapi" };

    issueInvoice({
      clientId: c.id,
      clientName: c.clientName,
      branchId: c.branchId,
      packageId: issueForm.packageId,
      packageName: pkg.name,
      amount: Number(issueForm.amount) || pkg.price || 2500000,
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
    const pkg = masterPackages.find((p) => p.id === renewForm.packageId) || { name: "Paket Reguler" };

    renewClientCredit({
      clientId: c.id,
      clientName: c.clientName,
      branchId: c.branchId,
      packageId: renewForm.packageId,
      packageName: `${pkg.name} (${renewForm.credits}x)`,
      credits: Number(renewForm.credits) || 10,
      amount: Number(renewForm.amount) || pkg.price || 2500000,
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

    addMasterPackage({
      name: newPkgForm.name.trim(),
      credits: Number(newPkgForm.credits) || 10,
      price: Number(newPkgForm.price) || 2500000,
      description: newPkgForm.description.trim(),
    });

    toast.success(`Paket baru '${newPkgForm.name}' berhasil ditambahkan ke Master Data!`);
    setNewPkgOpen(false);
    setNewPkgForm({ name: "", credits: 10, price: 2500000, description: "" });
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
            Verifikasi transfer orang tua, penerbitan tagihan paket, penambahan kredit renewal, dan audit trail buku besar.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            className="rounded-xl border-slate-200 text-slate-700 font-bold gap-2 text-xs h-10 shadow-2xs hover:bg-slate-100"
            onClick={() => setIssueOpen(true)}
            data-testid="issue-invoice-button"
          >
            <Plus className="w-4 h-4 text-sky-600" /> Buat Tagihan Invoice
          </Button>

          <Button
            className="bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl gap-2 shadow-sm shadow-sky-600/20 text-xs h-10"
            onClick={() => setRenewOpen(true)}
            data-testid="renew-credit-button"
          >
            <RefreshCw className="w-4 h-4" /> Renewal Paket Kredit
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-white border border-slate-200 p-1 rounded-2xl shadow-2xs">
          <TabsTrigger value="verification" className="rounded-xl text-xs font-bold gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Verifikasi Transfer
            {pendingInvoices.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                {pendingInvoices.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="billing" className="rounded-xl text-xs font-bold gap-2">
            <Receipt className="w-4 h-4 text-sky-600" /> Semua Tagihan ({allInvoices.length})
          </TabsTrigger>
          <TabsTrigger value="history" className="rounded-xl text-xs font-bold gap-2">
            <History className="w-4 h-4 text-purple-600" /> Log Buku Besar Kredit
          </TabsTrigger>
          <TabsTrigger value="packages" className="rounded-xl text-xs font-bold gap-2">
            <Package className="w-4 h-4 text-teal-600" /> Master Data Paket ({masterPackages.length})
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: VERIFIKASI TRANSFER */}
        <TabsContent value="verification" className="space-y-4">
          <Card className="rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
            <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
              <CardTitle className="text-sm font-bold text-slate-900">
                Antrean Bukti Transfer Orang Tua ({pendingInvoices.length})
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Periksa slip transfer yang diupload oleh orang tua melalui Parent Portal. Begitu disetujui, paket kredit akan langsung aktif.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {pendingInvoices.length === 0 ? (
                <EmptyState
                  icon={CheckCircle2}
                  title="Seluruh Pembayaran Telah Bersih"
                  subtitle="Tidak ada antrean bukti transfer yang menunggu verifikasi saat ini."
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/70 hover:bg-slate-50/70 border-b border-slate-200">
                      <TableHead className="font-bold text-slate-700 text-xs py-3.5 pl-6">No. Invoice</TableHead>
                      <TableHead className="font-bold text-slate-700 text-xs">Nama Client & Cabang</TableHead>
                      <TableHead className="font-bold text-slate-700 text-xs">Paket & Nominal</TableHead>
                      <TableHead className="font-bold text-slate-700 text-xs">Bukti Transfer</TableHead>
                      <TableHead className="font-bold text-slate-700 text-xs text-right pr-6">Tindakan Verifikasi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingInvoices.map((inv) => {
                      const br = BRANCHES.find((b) => b.id === inv.branchId);
                      return (
                        <TableRow key={inv.id} className="border-b border-slate-100 hover:bg-sky-50/30 transition-colors">
                          <TableCell className="font-mono text-xs font-bold text-slate-900 pl-6">
                            {inv.invoiceNumber}
                          </TableCell>
                          <TableCell className="text-xs">
                            <p className="font-bold text-slate-900">{inv.clientName}</p>
                            <span className="text-[11px] text-slate-500 font-medium">📍 {br ? br.name : "Surabaya"}</span>
                          </TableCell>
                          <TableCell className="text-xs">
                            <p className="font-semibold text-slate-800">{inv.packageName}</p>
                            <p className="font-bold text-slate-900 tabular-nums">{fmtCurrency(inv.amount)}</p>
                          </TableCell>
                          <TableCell className="text-xs">
                            {inv.proofOfPaymentUrl ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 gap-1.5 text-xs text-sky-700 border-sky-200 bg-sky-50/60 rounded-xl"
                                onClick={() => setProofPreviewUrl(inv.proofOfPaymentUrl)}
                              >
                                <Eye className="w-3.5 h-3.5" /> Lihat Struk
                              </Button>
                            ) : (
                              <span className="text-xs text-rose-500 font-medium italic">Belum upload slip</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right pr-6">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 border-rose-200 text-rose-700 hover:bg-rose-50 rounded-xl text-xs font-bold"
                                onClick={() => handleRejectPayment(inv)}
                              >
                                Tolak
                              </Button>
                              <Button
                                size="sm"
                                className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs gap-1"
                                onClick={() => handleApprovePayment(inv)}
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" /> Verifikasi Lunas
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: SEMUA TAGIHAN */}
        <TabsContent value="billing" className="space-y-4">
          <Card className="rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
            <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
              <CardTitle className="text-sm font-bold text-slate-900">Seluruh Arsip Tagihan & Invoice</CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Riwayat invoice awal dan tagihan renewal yang diterbitkan untuk setiap client
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/70 hover:bg-slate-50/70 border-b border-slate-200">
                    <TableHead className="font-bold text-slate-700 text-xs py-3.5 pl-6">No. Invoice</TableHead>
                    <TableHead className="font-bold text-slate-700 text-xs">Client & Cabang</TableHead>
                    <TableHead className="font-bold text-slate-700 text-xs">Paket Layanan</TableHead>
                    <TableHead className="font-bold text-slate-700 text-xs">Nominal</TableHead>
                    <TableHead className="font-bold text-slate-700 text-xs">Tanggal</TableHead>
                    <TableHead className="font-bold text-slate-700 text-xs text-right pr-6">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allInvoices.map((inv) => {
                    const br = BRANCHES.find((b) => b.id === inv.branchId);
                    return (
                      <TableRow key={inv.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                        <TableCell className="font-mono text-xs font-bold text-slate-900 pl-6">
                          {inv.invoiceNumber}
                        </TableCell>
                        <TableCell className="text-xs">
                          <p className="font-bold text-slate-900">{inv.clientName}</p>
                          <span className="text-[11px] text-slate-500 font-medium">📍 {br ? br.name : "Surabaya"}</span>
                        </TableCell>
                        <TableCell className="text-xs font-semibold text-slate-800">{inv.packageName}</TableCell>
                        <TableCell className="text-xs font-bold text-slate-900 tabular-nums">{fmtCurrency(inv.amount)}</TableCell>
                        <TableCell className="text-xs text-slate-500 tabular-nums">{fmtDate(inv.createdAt)}</TableCell>
                        <TableCell className="text-right pr-6">
                          <StatusBadge status={inv.status} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: LOG BUKU BESAR KREDIT */}
        <TabsContent value="history" className="space-y-4">
          <Card className="rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
            <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
              <CardTitle className="text-sm font-bold text-slate-900">Audit Trail Buku Besar Kredit</CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Log real-time pergerakan kredit (pemakaian sesi, penambahan renewal, kuota cancel wajar, dan penalti cancel &gt;3x)
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {allHistoryLogs.length === 0 ? (
                <EmptyState icon={History} title="Belum ada riwayat" subtitle="Belum ada pencatatan kredit." />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/70 hover:bg-slate-50/70 border-b border-slate-200">
                      <TableHead className="font-bold text-slate-700 text-xs py-3.5 pl-6">Tanggal</TableHead>
                      <TableHead className="font-bold text-slate-700 text-xs">Client & Cabang</TableHead>
                      <TableHead className="font-bold text-slate-700 text-xs">Paket Kredit</TableHead>
                      <TableHead className="font-bold text-slate-700 text-xs">Jenis Transaksi</TableHead>
                      <TableHead className="font-bold text-slate-700 text-xs">Perubahan Kredit</TableHead>
                      <TableHead className="font-bold text-slate-700 text-xs pr-6">Keterangan / Alasan</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allHistoryLogs.map((log) => {
                      const br = BRANCHES.find((b) => b.id === log.branchId);
                      return (
                        <TableRow key={log.id} className="border-b border-slate-100 hover:bg-slate-50/50 text-xs">
                          <TableCell className="font-mono text-slate-600 pl-6 tabular-nums">{fmtDate(log.date)}</TableCell>
                          <TableCell>
                            <p className="font-bold text-slate-900">{log.clientName}</p>
                            <span className="text-[11px] text-slate-500 font-medium">📍 {br ? br.name : "Surabaya"}</span>
                          </TableCell>
                          <TableCell className="font-semibold text-slate-700">{log.packageName || "Reguler"}</TableCell>
                          <TableCell>
                            <span
                              className={cn(
                                "px-2.5 py-0.5 rounded-lg text-[11px] font-bold border",
                                log.action === "renewed" && "bg-emerald-50 text-emerald-800 border-emerald-200",
                                log.action === "used" && "bg-sky-50 text-sky-800 border-sky-200",
                                log.action === "cancel_excused" && "bg-slate-100 text-slate-700 border-slate-200",
                                log.action === "cancel_penalty" && "bg-rose-50 text-rose-800 border-rose-200 font-extrabold"
                              )}
                            >
                              {log.action === "renewed" && "Top Up / Renewal"}
                              {log.action === "used" && "Sesi Terpakai"}
                              {log.action === "cancel_excused" && "Cancel (Kredit Utuh)"}
                              {log.action === "cancel_penalty" && "Penalti Cancel (>3x)"}
                            </span>
                          </TableCell>
                          <TableCell className="font-bold tabular-nums">
                            {log.creditChange > 0 ? (
                              <span className="text-emerald-600 font-extrabold">+{log.creditChange}</span>
                            ) : log.creditChange < 0 ? (
                              <span className="text-rose-600 font-extrabold">{log.creditChange}</span>
                            ) : (
                              <span className="text-slate-400">0</span>
                            )}
                          </TableCell>
                          <TableCell className="text-slate-600 pr-6 max-w-xs truncate">{log.note}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 4: MASTER DATA PAKET KREDIT */}
        <TabsContent value="packages" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">
              Master katalog paket kredit yang dapat dipilih saat intake, penjadwalan, atau renewal.
            </p>
            <Button
              className="bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl gap-1.5 text-xs h-9 shadow-xs"
              onClick={() => setNewPkgOpen(true)}
              data-testid="add-new-package-button"
            >
              <Plus className="w-3.5 h-3.5" /> Tambah Paket Baru
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {masterPackages.map((pkg) => (
              <Card key={pkg.id} className="rounded-2xl border border-slate-200/90 bg-white shadow-2xs p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">{pkg.name}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">{pkg.description || "Paket sesi terapi resmi"}</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-xl bg-sky-50 text-sky-700 border border-sky-200 text-xs font-bold shrink-0">
                    {pkg.credits} Sesi
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400">Harga Standar:</span>
                  <span className="text-base font-extrabold text-slate-900 tabular-nums">
                    {fmtCurrency(pkg.price)}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Slip Preview Modal */}
      <Dialog open={Boolean(proofPreviewUrl)} onOpenChange={() => setProofPreviewUrl(null)}>
        <DialogContent className="max-w-md rounded-2xl p-6 border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Eye className="w-4 h-4 text-sky-600" /> Pratinjau Bukti Transfer
            </DialogTitle>
          </DialogHeader>
          <div className="my-2 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 max-h-96 flex items-center justify-center">
            {proofPreviewUrl && (
              <img src={proofPreviewUrl} alt="Bukti Transfer" className="w-full h-auto object-cover max-h-96" />
            )}
          </div>
          <DialogFooter>
            <Button className="rounded-xl w-full text-xs font-bold" onClick={() => setProofPreviewUrl(null)}>
              Tutup Pratinjau
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Issue Invoice Modal */}
      <Dialog open={issueOpen} onOpenChange={setIssueOpen}>
        <DialogContent className="max-w-md rounded-2xl p-6 border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Receipt className="w-5 h-5 text-sky-600" /> Terbitkan Tagihan Invoice
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Pilih client dan paket yang disepakati melalui WhatsApp untuk menerbitkan tagihan.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleIssueSubmit} className="space-y-3.5 pt-2">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Pilih Client *</Label>
              <Select value={issueForm.clientId} onValueChange={(val) => setIssueForm({ ...issueForm, clientId: val })}>
                <SelectTrigger className="rounded-xl border-slate-200 bg-slate-50 text-xs h-10 font-semibold">
                  <SelectValue placeholder="Pilih client..." />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200 max-h-56">
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.clientName} ({c.parentName}) — {c.clientAccessCode}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Pilih Paket Layanan *</Label>
              <Select
                value={issueForm.packageId}
                onValueChange={(val) => {
                  const pkg = masterPackages.find((p) => p.id === val);
                  setIssueForm({
                    ...issueForm,
                    packageId: val,
                    amount: pkg ? pkg.price : issueForm.amount,
                  });
                }}
              >
                <SelectTrigger className="rounded-xl border-slate-200 bg-slate-50 text-xs h-10 font-semibold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200">
                  {masterPackages.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} ({p.credits} sesi) — {fmtCurrency(p.price)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Nominal Tagihan (IDR) *</Label>
              <Input
                type="number"
                className="rounded-xl border-slate-200 bg-slate-50 text-xs h-10 font-bold"
                value={issueForm.amount}
                onChange={(e) => setIssueForm({ ...issueForm, amount: e.target.value })}
              />
            </div>

            <DialogFooter className="mt-4 gap-2">
              <Button type="button" variant="outline" className="rounded-xl border-slate-200 text-xs" onClick={() => setIssueOpen(false)}>
                Batal
              </Button>
              <Button type="submit" className="bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl text-xs">
                Terbitkan Invoice
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Renewal Modal (Exclusively in Role Finance) */}
      <Dialog open={renewOpen} onOpenChange={setRenewOpen}>
        <DialogContent className="max-w-md rounded-2xl p-6 border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-sky-600" /> Renewal Paket Kredit Client
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Penambahan sesi baru (Reguler / VIP) untuk client aktif. Tindakan ini eksklusif bagi Role Finance.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRenewSubmit} className="space-y-3.5 pt-2">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Pilih Client Aktif *</Label>
              <Select value={renewForm.clientId} onValueChange={(val) => setRenewForm({ ...renewForm, clientId: val })}>
                <SelectTrigger className="rounded-xl border-slate-200 bg-slate-50 text-xs h-10 font-semibold">
                  <SelectValue placeholder="Pilih client aktif..." />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200 max-h-56">
                  {clients
                    .filter((c) => c.status === "admitted" || c.status === "active")
                    .map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.clientName} ({c.clientAccessCode})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Pilihan Paket Renewal *</Label>
              <Select
                value={renewForm.packageId}
                onValueChange={(val) => {
                  const pkg = masterPackages.find((p) => p.id === val);
                  setRenewForm({
                    ...renewForm,
                    packageId: val,
                    credits: pkg ? pkg.credits : 10,
                    amount: pkg ? pkg.price : 2500000,
                  });
                }}
              >
                <SelectTrigger className="rounded-xl border-slate-200 bg-slate-50 text-xs h-10 font-semibold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200">
                  {masterPackages.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} ({p.credits} sesi) — {fmtCurrency(p.price)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Jumlah Sesi</Label>
                <Input
                  type="number"
                  className="rounded-xl border-slate-200 bg-slate-50 text-xs h-10 font-bold"
                  value={renewForm.credits}
                  onChange={(e) => setRenewForm({ ...renewForm, credits: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Nominal Bayar (IDR)</Label>
                <Input
                  type="number"
                  className="rounded-xl border-slate-200 bg-slate-50 text-xs h-10 font-bold"
                  value={renewForm.amount}
                  onChange={(e) => setRenewForm({ ...renewForm, amount: e.target.value })}
                />
              </div>
            </div>

            <DialogFooter className="mt-4 gap-2">
              <Button type="button" variant="outline" className="rounded-xl border-slate-200 text-xs" onClick={() => setRenewOpen(false)}>
                Batal
              </Button>
              <Button type="submit" className="bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl text-xs">
                Aktivasi Renewal Sesi
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Master Package Modal */}
      <Dialog open={newPkgOpen} onOpenChange={setNewPkgOpen}>
        <DialogContent className="max-w-md rounded-2xl p-6 border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Package className="w-5 h-5 text-sky-600" /> Tambah Paket Kredit Baru
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Buat definisi paket layanan baru yang dapat dibeli oleh client.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddMasterPackageSubmit} className="space-y-3.5 pt-2">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Nama Paket *</Label>
              <Input
                className="rounded-xl border-slate-200 bg-slate-50 text-xs h-10"
                placeholder="e.g. Paket Intensif Sensori 15x"
                value={newPkgForm.name}
                onChange={(e) => setNewPkgForm({ ...newPkgForm, name: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Jumlah Kredit Sesi *</Label>
                <Input
                  type="number"
                  className="rounded-xl border-slate-200 bg-slate-50 text-xs h-10 font-bold"
                  value={newPkgForm.credits}
                  onChange={(e) => setNewPkgForm({ ...newPkgForm, credits: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Harga Standar (IDR) *</Label>
                <Input
                  type="number"
                  className="rounded-xl border-slate-200 bg-slate-50 text-xs h-10 font-bold"
                  value={newPkgForm.price}
                  onChange={(e) => setNewPkgForm({ ...newPkgForm, price: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Deskripsi Layanan</Label>
              <Input
                className="rounded-xl border-slate-200 bg-slate-50 text-xs h-10"
                placeholder="e.g. Paket khusus kebutuhan intensif 3x seminggu"
                value={newPkgForm.description}
                onChange={(e) => setNewPkgForm({ ...newPkgForm, description: e.target.value })}
              />
            </div>

            <DialogFooter className="mt-4 gap-2">
              <Button type="button" variant="outline" className="rounded-xl border-slate-200 text-xs" onClick={() => setNewPkgOpen(false)}>
                Batal
              </Button>
              <Button type="submit" className="bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl text-xs">
                Simpan Paket Baru
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
