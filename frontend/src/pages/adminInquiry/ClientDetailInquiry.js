import React, { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddScheduleModal } from "@/components/calendar/AddScheduleModal";
import { PaymentProofViewerModal } from "@/components/common/PaymentProofViewerModal";
import { useClients } from "@/context/ClientsContext";
import { useSchedules } from "@/context/SchedulesContext";
import { useCredits } from "@/context/CreditsContext";
import { useAssessments } from "@/context/AssessmentsContext";
import { useTherapists } from "@/context/TherapistsContext";
import { useMasterData } from "@/context/MasterDataContext";
import { BRANCHES, genCode, todayStr } from "@/lib/appUtils";
import { ClientDetailHeader } from "@/pages/adminInquiry/clientDetail/ClientDetailHeader";
import { IntakeDataCard } from "@/pages/adminInquiry/clientDetail/IntakeDataCard";
import { EditIntakeDialog } from "@/pages/adminInquiry/clientDetail/EditIntakeDialog";
import { ServiceSelectionCard } from "@/pages/adminInquiry/clientDetail/ServiceSelectionCard";
import { QuestionnaireCodeCard } from "@/pages/adminInquiry/clientDetail/QuestionnaireCodeCard";
import { AssessmentScheduleCard } from "@/pages/adminInquiry/clientDetail/AssessmentScheduleCard";
import { ParentAnswerCard } from "@/pages/adminInquiry/clientDetail/ParentAnswerCard";
import { GDriveLinkCard } from "@/pages/adminInquiry/clientDetail/GDriveLinkCard";
import { InvoiceCard } from "@/pages/adminInquiry/clientDetail/InvoiceCard";
import { OutcomeCard } from "@/pages/adminInquiry/clientDetail/OutcomeCard";
import { DiscontinueDialog } from "@/pages/adminInquiry/clientDetail/DiscontinueDialog";

export default function ClientDetailInquiry() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { clients, updateClient } = useClients();
  const { schedules } = useSchedules();
  const { getInvoicesForClient, addRecord, getRecordForClient } = useCredits();
  const { categories } = useAssessments();
  const { services, getService } = useMasterData();
  const { getTherapist } = useTherapists();

  const client = clients.find((c) => c.id === id);

  // Modals & local state
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [discontinueOpen, setDiscontinueOpen] = useState(false);
  const [discontinueReason, setDiscontinueReason] = useState("");
  const [newQuestionnaireCategory, setNewQuestionnaireCategory] = useState("cat-001");

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
      branchId: client.branchId || "branch-sby-timur",
    });
    setEditIntakeOpen(true);
  };

  const handleSaveEditIntake = (e) => {
    e.preventDefault();
    if (!editIntakeForm.clientName.trim()) {
      toast.error("Nama anak tidak boleh kosong.");
      return;
    }
    updateClient(client.id, {
      clientName: editIntakeForm.clientName.trim(),
      gender: editIntakeForm.gender,
      dob: editIntakeForm.dob,
      parentName: editIntakeForm.parentName.trim(),
      parentContact: editIntakeForm.parentContact.trim(),
      parentEmail: editIntakeForm.parentEmail.trim(),
      branchId: editIntakeForm.branchId,
      updatedAt: new Date().toISOString(),
    });
    toast.success("Data New Intake berhasil diperbarui!");
    setEditIntakeOpen(false);
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
  const handleToggleService = (serviceValue) => {
    const current = selectedServices;
    const next = current.includes(serviceValue)
      ? current.filter((s) => s !== serviceValue)
      : [...current, serviceValue];

    updateClient(client.id, {
      serviceTypes: next,
      serviceType: next[0] || "",
      status: next.length > 0 && client.status === "inquiry" ? "service_selected" : client.status,
    });
    toast.success(next.includes(serviceValue) ? "Layanan klinis ditambahkan." : "Layanan klinis dibatalkan.");
  };

  // STEP 3: Generate Multi-Questionnaire Code
  const handleGenerateQuestionnaireCode = () => {
    const selectedCat = categories.find((c) => c.id === newQuestionnaireCategory) || categories[0];
    const newCode = genCode("ASM");
    const existingCodes = client.assessmentCodes || [];

    const updatedCodes = [
      ...existingCodes,
      {
        code: newCode,
        categoryId: selectedCat.id,
        name: selectedCat.categoryName,
        createdAt: todayStr(),
      },
    ];

    updateClient(client.id, {
      assessmentCodes: updatedCodes,
      status: ["inquiry", "service_selected"].includes(client.status) ? "assessment_scheduled" : client.status,
    });

    toast.success(`Kode kuesioner baru '${newCode}' (${selectedCat.categoryName}) berhasil dibuat!`);
  };

  // STEP 6: Save GDrive Client Link
  const handleSaveGDriveLink = (url) => {
    updateClient(client.id, {
      gdriveClientLink: url.trim(),
    });
    toast.success("Link Google Drive client tersimpan.");
  };

  // STEP 8: Final Decision Outcomes
  const handleOutcomeAdmit = () => {
    // Admit to Active Client (even if credit is 0!)
    updateClient(client.id, {
      status: "admitted",
      finalOutcome: "admitted",
      dateOfJoin: todayStr(),
    });

    // Ensure credit record exists (even with 0 packages)
    if (!creditRecord) {
      addRecord({
        id: `cr-${client.id}`,
        clientId: client.id,
        branchId: client.branchId,
        packages: [],
        cancelCountTotal: 0,
        history: [],
      });
    }

    toast.success(`${client.clientName} resmi menjadi Active Client! Sesi terapi sudah dapat dijadwalkan.`);
  };

  const handleOutcomeDoneConsult = () => {
    updateClient(client.id, {
      status: "done_consult",
      finalOutcome: "done_consult",
    });
    toast.info("Status client ditandai: Done Consult (Konsultasi Selesai).");
  };

  const handleOutcomeDoneAssessment = () => {
    updateClient(client.id, {
      status: "done_assessment",
      finalOutcome: "done_assessment",
    });
    toast.info("Status client ditandai: Done Assessment (Laporan Selesai).");
  };

  const handleOutcomeDiscontinue = () => {
    if (!discontinueReason.trim()) {
      toast.error("Mohon tuliskan alasan discontinue.");
      return;
    }
    updateClient(client.id, {
      status: "discontinued",
      finalOutcome: "discontinued",
      dischargeReason: "other",
      dischargeNote: discontinueReason.trim(),
    });
    setDiscontinueOpen(false);
    toast.warning("Status client ditandai: Discontinued.");
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto" data-testid="client-detail-inquiry-page">
      {/* Top Breadcrumb & Actions */}
      <ClientDetailHeader br={br} client={client} navigate={navigate} />

      {/* 8 NON-SEQUENTIAL PIPELINE STEPS */}
      <div className="space-y-4">
        {/* STEP 1: DATA NEW INTAKE */}
        <IntakeDataCard client={client} handleOpenEditIntake={handleOpenEditIntake} />

        {/* DIALOG EDIT DATA INTAKE */}
        <EditIntakeDialog editIntakeForm={editIntakeForm} editIntakeOpen={editIntakeOpen} handleSaveEditIntake={handleSaveEditIntake} setEditIntakeForm={setEditIntakeForm} setEditIntakeOpen={setEditIntakeOpen} />

        {/* STEP 2: PILIH LAYANAN KLINIS (MULTI-LAYANAN) */}
        <ServiceSelectionCard getService={getService} handleToggleService={handleToggleService} selectedServices={selectedServices} services={services} />

        {/* STEP 3: QUESTIONNAIRE CODE GENERATOR (MULTI-CODE) */}
        <QuestionnaireCodeCard categories={categories} client={client} copyToClipboard={copyToClipboard} handleGenerateQuestionnaireCode={handleGenerateQuestionnaireCode} newQuestionnaireCategory={newQuestionnaireCategory} setNewQuestionnaireCategory={setNewQuestionnaireCategory} />

        {/* STEP 4: SCHEDULE ASSESSMENT (MENDUKUNG LEBIH DARI 1 SESI ASESMEN) */}
        <AssessmentScheduleCard assessmentSessions={assessmentSessions} getTherapist={getTherapist} setScheduleModalOpen={setScheduleModalOpen} />

        {/* STEP 5: PARENT ASSESSMENT ANSWER (PSYCHOLOGICAL TABLE & PDF) */}
        <ParentAnswerCard client={client} />

        {/* STEP 6: GOOGLE DRIVE CLIENT LINK */}
        <GDriveLinkCard client={client} handleSaveGDriveLink={handleSaveGDriveLink} />

        {/* STEP 7: INVOICE & BUKTI TRANSFER */}
        <InvoiceCard latestInvoice={latestInvoice} setProofModalOpen={setProofModalOpen} />

        {/* STEP 8: FINAL DECISION OUTCOMES */}
        <OutcomeCard client={client} handleOutcomeAdmit={handleOutcomeAdmit} handleOutcomeDoneAssessment={handleOutcomeDoneAssessment} handleOutcomeDoneConsult={handleOutcomeDoneConsult} setDiscontinueOpen={setDiscontinueOpen} />
      </div>

      {/* Discontinue Modal */}
      <DiscontinueDialog discontinueOpen={discontinueOpen} discontinueReason={discontinueReason} handleOutcomeDiscontinue={handleOutcomeDiscontinue} setDiscontinueOpen={setDiscontinueOpen} setDiscontinueReason={setDiscontinueReason} />

      {/* Schedule Modal for Assessment */}
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
