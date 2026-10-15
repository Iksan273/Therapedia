import React, { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { fmtCurrency } from "@/shared/lib/format";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { AddScheduleModal } from "@/features/schedule";
import { PaymentProofViewerModal } from "@/shared/components/PaymentProofViewerModal";
import { useSchedules } from "@/stores/schedulesStore";
import { useCredits } from "@/stores/creditsStore";
import { useAssessments } from "@/stores/assessmentsStore";
import { useTherapists } from "@/stores/therapistsStore";
import { useMasterData } from "@/stores/masterDataStore";
import { BRANCHES } from "@/domain/branch";
import { ClientDetailHeader } from "@/features/inquiry/components/clientDetail/ClientDetailHeader";
import { IntakeDataCard } from "@/features/inquiry/components/clientDetail/IntakeDataCard";
import { EditIntakeDialog } from "@/features/inquiry/components/clientDetail/EditIntakeDialog";
import { ServiceSelectionCard } from "@/features/inquiry/components/clientDetail/ServiceSelectionCard";
import { QuestionnaireCodeCard } from "@/features/inquiry/components/clientDetail/QuestionnaireCodeCard";
import { AssessmentScheduleCard } from "@/features/inquiry/components/clientDetail/AssessmentScheduleCard";
import { ParentAnswerCard } from "@/features/inquiry/components/clientDetail/ParentAnswerCard";
import { GDriveLinkCard } from "@/features/inquiry/components/clientDetail/GDriveLinkCard";
import { InvoiceCard } from "@/features/inquiry/components/clientDetail/InvoiceCard";
import { OutcomeCard } from "@/features/inquiry/components/clientDetail/OutcomeCard";
import { DiscontinueDialog } from "@/features/inquiry/components/clientDetail/DiscontinueDialog";
import { DischargeDialog } from "@/features/inquiry/components/clientDetail/DischargeDialog";
import { apiErrorText } from "@/domain/auth";
import { DetailSkeleton } from "@/shared/components/LoadingSkeletons";
import { useClientDetail } from "@/features/inquiry/hooks/useInquiryClients";
import { STATUS_META } from "@/domain/status";
import { CODE_VALIDITY_OPTIONS, buildQuestionnaireLink } from "@/domain/assessment";
import { useClientOutcomeActions } from "@/features/inquiry/hooks/useClientOutcomeActions";
import { useQuestionnaireCodeActions } from "@/features/inquiry/hooks/useQuestionnaireCodeActions";
import { useClientDeleteActions } from "@/features/inquiry/hooks/useClientDeleteActions";
import { DeleteButton } from "@/shared/components/DeleteControls";
import { useConfirm } from "@/shared/components/ConfirmDialog";

const NO_REASONS = [];

export default function ClientDetailInquiry() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { schedules } = useSchedules();
  const { getInvoicesForClient, getRecordForClient, getActiveMasterPackages } = useCredits();
  const masterPackages = getActiveMasterPackages(); // pilihan layanan invoice assessment: hanya paket yang masih dijual
  const outcomeActions = useClientOutcomeActions();
  const codeActions = useQuestionnaireCodeActions();
  const deleteActions = useClientDeleteActions();
  const { confirm, confirmDialog } = useConfirm();
  const { categories } = useAssessments();
  const master = useMasterData();
  const { services, getService } = master; // alasan discharge hanya dibaca saat dialog dibuka (tidak di-fetch sebelum perlu)
  const { getTherapist } = useTherapists();

  // Mode demo: dari store lokal. Mode API: GET /clients/{id}; mutasi async dan melempar ApiError (409 versi usang, 422 validasi).
  const detail = useClientDetail(id);
  const client = detail.client;

  // Modals & local state
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [scheduleModalMounted, setScheduleModalMounted] = useState(false); // modal membaca client/terapis/libur: dipasang baru saat pertama dibuka
  const openScheduleModal = (open) => {
    if (open) setScheduleModalMounted(true);
    setScheduleModalOpen(open);
  };
  const [discontinueOpen, setDiscontinueOpen] = useState(false);
  const [discontinueReason, setDiscontinueReason] = useState("");
  const [dischargeOpen, setDischargeOpen] = useState(false);
  const [dischargeReason, setDischargeReason] = useState("");
  const [dischargeNote, setDischargeNote] = useState("");
  const [newQuestionnaireCategory, setNewQuestionnaireCategory] = useState("cat-001");
  const [newQuestionnaireValidity, setNewQuestionnaireValidity] = useState("none");
  const [newQuestionnaireService, setNewQuestionnaireService] = useState(""); // id master paket (harga invoice assessment)
  const [newQuestionnaireInvoice, setNewQuestionnaireInvoice] = useState(true); // false = kode gratis (tanpa invoice)

  // Invoices & Credits
  const invoices = client ? getInvoicesForClient(client.id) : [];
  const latestInvoice = invoices.length > 0 ? invoices[0] : null;
  const creditRecord = client ? getRecordForClient(client.id) : null;
  const remainingCredit = creditRecord ? creditRecord.remainingCredit : 0;
  const [proofModalOpen, setProofModalOpen] = useState(false);

  // Edit Intake State
  const [editIntakeOpen, setEditIntakeOpen] = useState(false);
  const [editIntakeForm, setEditIntakeForm] = useState({
    clientName: "",
    gender: "male",
    dob: "",
    parentName: "",
    parentContact: "",
    parentEmail: "",
    branchId: "branch-sby-timur",
  });

  const handleOpenEditIntake = () => {
    if (!client) return;
    setEditIntakeForm({
      clientName: client.clientName || "",
      gender: client.gender || "male",
      dob: client.dob || "",
      parentName: client.parentName || "",
      parentContact: client.parentContact || "",
      parentEmail: client.parentEmail || "",
      intakeNote: client.intakeNote || "",
      branchId: client.branchId || "branch-sby-timur",
    });
    setEditIntakeOpen(true);
  };

  const handleSaveEditIntake = async (e) => {
    e.preventDefault();
    if (!editIntakeForm.clientName.trim()) {
      toast.error("Nama anak tidak boleh kosong.");
      return;
    }
    try {
      await detail.updateProfile(editIntakeForm);
      toast.success("Data New Intake berhasil diperbarui!");
      setEditIntakeOpen(false);
    } catch (err) {
      toast.error(apiErrorText(err, ["child_name", "date_of_birth", "parent_name", "parent_phone", "parent_email"]));
    }
  };

  // Schedules associated with this client
  const clientSchedules = useMemo(() => {
    if (!client) return [];
    return schedules.filter((s) => s.clientId === client.id);
  }, [client, schedules]);

  // Multiple assessment sessions support
  const assessmentSessions = useMemo(() => {
    return clientSchedules.filter((s) => s.type === "assessment");
  }, [clientSchedules]);

  // Multiple clinical services support (with backwards compatibility)
  const selectedServices = useMemo(() => {
    if (!client) return [];
    if (Array.isArray(client.serviceTypes) && client.serviceTypes.length > 0) {
      return client.serviceTypes;
    }
    return client.serviceType ? [client.serviceType] : [];
  }, [client]);

  if (detail.isLoading) {
    return <DetailSkeleton sections={5} label="Memuat data client…" testId="client-detail-loading" />;
  }

  if (!client) {
    return (
      <div className="p-8 text-center space-y-3">
        <p className="text-base text-slate-600">Client tidak ditemukan di pipeline inquiry.</p>
        <Button onClick={() => navigate("/admin-inquiry/pipeline")} variant="outline" className="">
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Kembali ke Pipeline
        </Button>
      </div>
    );
  }

  const br = BRANCHES.find((b) => b.id === client.branchId);

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} disalin ke clipboard!`);
  };

  // STEP 2: Handle Multi-Service Selection
  const handleToggleService = async (serviceValue) => {
    const current = selectedServices;
    const next = current.includes(serviceValue)
      ? current.filter((s) => s !== serviceValue)
      : [...current, serviceValue];

    try {
      await detail.saveServices(next);
      toast.success(next.includes(serviceValue) ? "Layanan klinis ditambahkan." : "Layanan klinis dibatalkan.");
    } catch (err) {
      toast.error(apiErrorText(err, ["service_codes"]));
    }
  };

  // STEP 3: Generate Multi-Questionnaire Code
  const handleGenerateQuestionnaireCode = () => {
    const selectedCat = categories.find((c) => c.id === newQuestionnaireCategory) || categories[0];
    const option = CODE_VALIDITY_OPTIONS.find((o) => o.value === newQuestionnaireValidity);
    const servicePackage = masterPackages.find((m) => m.id === newQuestionnaireService);
    if (newQuestionnaireInvoice && !servicePackage) {
      toast.error("Pilih layanan dulu: harganya dipakai untuk invoice assessment.");
      return;
    }
    const item = codeActions.issueCode(client, selectedCat, { validityDays: option?.days ?? null, servicePackage, withInvoice: newQuestionnaireInvoice });

    toast.success(`Kode kuesioner baru '${item.code}' (${selectedCat.categoryName}) berhasil dibuat${item.expiresAt ? ` — berlaku ${option.label}` : ""}! ${newQuestionnaireInvoice ? `Invoice assessment ${fmtCurrency(servicePackage.price)} diterbitkan.` : "Kode gratis: tanpa invoice."}`, {
      action: { label: "Salin Link", onClick: () => copyToClipboard(buildQuestionnaireLink(item.code, window.location.origin), "Link kuesioner") },
    });
  };

  // STEP 3b: Hapus kode kuesioner yang belum diisi ortu (tanpa revert)
  const handleDeleteQuestionnaireCode = async (item) => {
    const ok = await confirm({
      title: "Hapus kode kuesioner?",
      description: `Kode ${item.code} (${item.name || "kuesioner"}) belum diisi ortu. Setelah dihapus, kode tidak bisa dipakai lagi.`,
    });
    if (!ok) return;
    const result = codeActions.deleteCode(client, item);
    if (result.deleted) toast.success(`Kode ${item.code} dihapus.`);
    else if (result.reason === "draft") toast.error("Kode ini sedang diisi ortu (sudah ada jawaban tersimpan) sehingga tidak bisa dihapus.");
    else toast.error("Kode ini sudah diisi ortu sehingga tidak bisa dihapus.");
  };

  // STEP 6: Save GDrive Client Link
  const handleSaveGDriveLink = async (url) => {
    if (url.trim() === (client.gdriveClientLink || "")) return; // tidak berubah (mis. blur tanpa edit)
    try {
      await detail.saveGdriveLink(url);
      toast.success("Link Google Drive client tersimpan.");
    } catch (err) {
      toast.error(apiErrorText(err, ["url"]));
    }
  };

  // STEP 8: Final Decision Outcomes
  // Perubahan status bisa ditolak server (409 versi usang / 422 alasan): tampilkan pesannya, jangan klaim berhasil.
  const runOutcome = async (action, onSuccess) => {
    try {
      await action();
      onSuccess();
      return true;
    } catch (err) {
      toast.error(apiErrorText(err, ["to_status", "reason", "version"]));
      return false;
    }
  };

  // Admit to Active Client (even if credit is 0!)
  const handleOutcomeAdmit = () =>
    runOutcome(() => outcomeActions.admit(client), () =>
      toast.success(`${client.clientName} resmi menjadi Active Client! Sesi terapi sudah dapat dijadwalkan.`));

  const handleOutcomeDoneConsult = () =>
    runOutcome(() => outcomeActions.markDoneConsult(client), () => toast.info("Status client ditandai: Done Consult (Konsultasi Selesai)."));

  const handleOutcomeDoneAssessment = () =>
    runOutcome(() => outcomeActions.markDoneAssessment(client), () => toast.info("Status client ditandai: Done Assessment (Laporan Selesai)."));

  const handleOutcomeDiscontinue = async () => {
    if (!discontinueReason.trim()) {
      toast.error("Mohon tuliskan alasan discontinue.");
      return;
    }
    const ok = await runOutcome(() => outcomeActions.discontinue(client, discontinueReason), () => toast.warning("Status client ditandai: Discontinued."));
    if (ok) setDiscontinueOpen(false);
  };

  // Ubah status manual ke tahap mana pun. Discontinue / discharge membuka dialog alasan masing-masing.
  const handleChangeStatus = async (toStatus) => {
    if (toStatus === "discontinued") return setDiscontinueOpen(true);
    if (toStatus === "discharged") return setDischargeOpen(true);
    const ok = await confirm({
      title: "Ubah status client?",
      description: `${client.clientName}: ${STATUS_META[client.status]?.label || client.status} → ${STATUS_META[toStatus]?.label || toStatus}. Perubahan tercatat di riwayat client.`,
      confirmLabel: "Ubah Status",
    });
    if (!ok) return;
    await runOutcome(() => outcomeActions.changeStatus(client, toStatus), () =>
      toast.success(`Status ${client.clientName} diubah ke ${STATUS_META[toStatus]?.label || toStatus}.`));
  };

  // Hapus client / inquiry (soft delete, hanya role canDelete). Sesi & invoice milik client ikut disembunyikan.
  const handleDeleteClient = async () => {
    try {
      const { sessions, invoices: inv } = await deleteActions.deleteClientCascade(client);
      toast.success(`Client ${client.clientName} dihapus permanen${sessions || inv ? ` (${sessions} sesi, ${inv} invoice ikut terhapus)` : ""}.`);
      navigate("/admin-inquiry/pipeline");
    } catch (err) {
      toast.error(apiErrorText(err));
    }
  };

  const handleOutcomeDischarge = async () => {
    if (!dischargeReason.trim()) {
      toast.error("Mohon pilih atau tulis alasan discharge.");
      return;
    }
    let res;
    try {
      res = await outcomeActions.discharge(client, dischargeReason, dischargeNote);
    } catch (err) {
      toast.error(apiErrorText(err, ["reason", "version"]));
      return;
    }
    setDischargeOpen(false);
    setDischargeReason("");
    setDischargeNote("");
    toast.warning("Status client ditandai: Discharged.", {
      description: `${res.deletedSchedules} jadwal aktif dihapus, ${res.forfeitedCredits} sisa sesi hangus.`,
    });
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto" data-testid="client-detail-inquiry-page">
      {confirmDialog}
      {/* Top Breadcrumb & Actions */}
      <ClientDetailHeader
        br={br}
        client={client}
        navigate={navigate}
        extraActions={
          <DeleteButton
            module="inquiry_pipeline"
            masterOnly
            label="Hapus Client"
            title={`Hapus ${client.clientName}?`}
            description="Client (data intake/inquiry) beserta seluruh sesi, invoice, kredit, dan log cutinya akan DIHAPUS PERMANEN dan tidak bisa dikembalikan. Client juga tidak bisa lagi login ke portal ortu."
            onConfirm={handleDeleteClient}
            testId="delete-client-button"
          />
        }
      />

      {/* 8 NON-SEQUENTIAL PIPELINE STEPS */}
      <div className="space-y-4">
        {/* STEP 1: DATA NEW INTAKE */}
        <IntakeDataCard client={client} handleOpenEditIntake={handleOpenEditIntake} />

        {/* DIALOG EDIT DATA INTAKE */}
        <EditIntakeDialog editIntakeForm={editIntakeForm} editIntakeOpen={editIntakeOpen} handleSaveEditIntake={handleSaveEditIntake} setEditIntakeForm={setEditIntakeForm} setEditIntakeOpen={setEditIntakeOpen} />

        {/* STEP 2: PILIH LAYANAN KLINIS (MULTI-LAYANAN) */}
        <ServiceSelectionCard getService={getService} handleToggleService={handleToggleService} selectedServices={selectedServices} services={services} />

        {/* STEP 3: QUESTIONNAIRE CODE GENERATOR (MULTI-CODE) */}
        <QuestionnaireCodeCard categories={categories} client={client} copyToClipboard={copyToClipboard} handleGenerateQuestionnaireCode={handleGenerateQuestionnaireCode} handleDeleteQuestionnaireCode={handleDeleteQuestionnaireCode} newQuestionnaireCategory={newQuestionnaireCategory} newQuestionnaireValidity={newQuestionnaireValidity} setNewQuestionnaireValidity={setNewQuestionnaireValidity} masterPackages={masterPackages} newQuestionnaireService={newQuestionnaireService} setNewQuestionnaireService={setNewQuestionnaireService} newQuestionnaireInvoice={newQuestionnaireInvoice} setNewQuestionnaireInvoice={setNewQuestionnaireInvoice} setNewQuestionnaireCategory={setNewQuestionnaireCategory} />

        {/* STEP 4: SCHEDULE ASSESSMENT (MENDUKUNG LEBIH DARI 1 SESI ASESMEN) */}
        <AssessmentScheduleCard assessmentSessions={assessmentSessions} getTherapist={getTherapist} setScheduleModalOpen={openScheduleModal} />

        {/* STEP 5: PARENT ASSESSMENT ANSWER (PSYCHOLOGICAL TABLE & PDF) */}
        <ParentAnswerCard client={client} />

        {/* STEP 6: GOOGLE DRIVE CLIENT LINK */}
        <GDriveLinkCard client={client} handleSaveGDriveLink={handleSaveGDriveLink} />

        {/* STEP 7: INVOICE & BUKTI TRANSFER */}
        <InvoiceCard latestInvoice={latestInvoice} setProofModalOpen={setProofModalOpen} />

        {/* STEP 8: FINAL DECISION OUTCOMES */}
        <OutcomeCard client={client} handleOutcomeAdmit={handleOutcomeAdmit} handleOutcomeDoneAssessment={handleOutcomeDoneAssessment} handleOutcomeDoneConsult={handleOutcomeDoneConsult} handleChangeStatus={handleChangeStatus} setDiscontinueOpen={setDiscontinueOpen} setDischargeOpen={setDischargeOpen} />
      </div>

      {/* Discontinue Modal */}
      <DiscontinueDialog discontinueOpen={discontinueOpen} discontinueReason={discontinueReason} handleOutcomeDiscontinue={handleOutcomeDiscontinue} setDiscontinueOpen={setDiscontinueOpen} setDiscontinueReason={setDiscontinueReason} />
      <DischargeDialog open={dischargeOpen} onOpenChange={setDischargeOpen} reasons={dischargeOpen ? master.activeDischargeReasons : NO_REASONS} reason={dischargeReason} setReason={setDischargeReason} note={dischargeNote} setNote={setDischargeNote} onConfirm={handleOutcomeDischarge} />

      {/* Schedule Modal for Assessment */}
      {scheduleModalMounted && (
      <AddScheduleModal
        open={scheduleModalOpen}
        onOpenChange={setScheduleModalOpen}
        defaults={{
          clientId: client.id,
          lockClient: true,
          lockType: true,
          type: "assessment",
        }}
        defaultClientId={client.id}
        defaultType="assessment"
      />
      )}

      {/* Pratinjau Bukti Pembayaran Modal */}
      <PaymentProofViewerModal
        isOpen={proofModalOpen}
        onClose={() => setProofModalOpen(false)}
        invoice={latestInvoice}
        isFinanceView={false}
      />
    </div>
  );
}
