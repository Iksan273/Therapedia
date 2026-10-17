import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { nowIso } from "@/shared/lib/id";
import { cn } from "@/shared/lib/utils";
import { useClients } from "@/stores/clientsStore";
import { useAssessments } from "@/stores/assessmentsStore";
import { useCredits } from "@/stores/creditsStore";
import { isApiMode } from "@/config/env";
import { keysToCamel } from "@/shared/lib/caseConverter";
import { BRANCHES, activeBankAccounts } from "@/domain/branch";
import { AssessmentProofCard } from "@/features/assessment/components/AssessmentProofCard";
import { CodeEntryCard } from "@/features/assessment/components/fill/CodeEntryCard";
import { DoneCard } from "@/features/assessment/components/fill/DoneCard";
import { ProgressHeader } from "@/features/assessment/components/fill/ProgressHeader";
import { SectionBlock } from "@/features/assessment/components/fill/SectionBlock";
import { RespondentCard } from "@/features/assessment/components/fill/RespondentCard";
import { SubmitBar } from "@/features/assessment/components/fill/SubmitBar";
import { buildSections, questionsOf, sectionIndex } from "@/features/assessment/components/fill/fillSections";
import { useAssessmentFillActions } from "@/features/assessment/hooks/useAssessmentFillActions";
import { useDraftAutosave } from "@/features/assessment/hooks/useDraftAutosave";
import {
  checkQuestionnaireAccess,
  cleanRespondent,
  isAnswerFilled,
  missingRespondentFields,
  requiredProgress,
  respondentFormatErrors,
  respondentProfileOf,
  unansweredRequired,
} from "@/domain/assessment";

// Pesan penolakan akses kuesioner (aturan klien: sekali isi, masa berlaku opsional dicek saat dibuka, bukti transfer invoice assessment wajib diunggah sebelum mengisi).
const ACCESS_ERRORS = {
  submitted: "Kuesioner dengan kode ini sudah diisi dan tidak dapat diisi ulang. Hubungi Admin Therapedia bila perlu bantuan.",
  expired: "Kode kuesioner sudah kedaluwarsa. Hubungi Admin Therapedia untuk meminta kode baru.",
};

const normCode = (v) => String(v || "").trim().toUpperCase();
const apiMode = isApiMode();
const NO_CLIENTS = [];

// Galat API → pesan di kartu kode
const apiCodeError = (err) => {
  if (err?.code === "already_submitted") return ACCESS_ERRORS.submitted;
  if (err?.status === 410) return ACCESS_ERRORS.expired;
  if (err?.status === 404) return "Kode kuesioner tidak ditemukan. Silakan periksa kembali kode yang diberikan klinik.";
  if (err?.status === 429) return "Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.";
  return err?.message || "Kuesioner belum bisa dibuka. Coba lagi.";
};

export default function AssessmentFill() {
  // Mode API: kuesioner publik memakai satu request ke server; tidak membaca daftar client / kategori sama sekali.
  const clientsStore = useClients();
  const clients = apiMode ? NO_CLIENTS : clientsStore.clients;
  const { getCategory } = useAssessments();
  const { getInvoicesForClient, uploadPaymentProof } = useCredits();
  const fill = useAssessmentFillActions();

  const [stage, setStage] = useState("code"); // code | proof | form | done
  const [proofTarget, setProofTarget] = useState(null); // { client, category, invoice, code } menunggu unggah bukti
  // Tujuan transfer = rekening aktif cabang tempat client di-intake
  const proofBranch = proofTarget ? BRANCHES.find((b) => b.id === proofTarget.client?.branchId) : null;
  const proofBranchAccounts = activeBankAccounts(proofBranch);
  const [searchParams] = useSearchParams();
  const [codeInput, setCodeInput] = useState((searchParams.get("code") || "").toUpperCase()); // dari tautan portal ortu
  const [codeError, setCodeError] = useState("");
  const [client, setClient] = useState(null);
  const [category, setCategory] = useState(null);
  const [activeCode, setActiveCode] = useState("");
  const [answers, setAnswers] = useState({});
  const [lookupBusy, setLookupBusy] = useState(false); // mode API: menunggu server saat membuka kode
  const [submitting, setSubmitting] = useState(false);
  const [respondent, setRespondent] = useState({}); // Data Pengisi (langkah bawaan sesuai profil kategori)
  const [showRespondentErrors, setShowRespondentErrors] = useState(false);
  const [formError, setFormError] = useState("");
  const [consentAt, setConsentAt] = useState(null); // waktu persetujuan; boleh dicentang di awal (tersimpan di draft) atau saat kirim
  const [lastSectionId, setLastSectionId] = useState(null);
  const [resume, setResume] = useState(null); // { answered, total } bila form dilanjutkan dari draft
  const [filterMode, setFilterMode] = useState("all"); // "all" | "unanswered"
  const resumeSectionRef = useRef(null);

  const categorizedSections = useMemo(() => buildSections(category), [category]);
  const allCategoryQuestions = useMemo(() => questionsOf(categorizedSections), [categorizedSections]);
  const sectionOfQuestion = useMemo(() => sectionIndex(categorizedSections), [categorizedSections]);
  const validQuestionIds = useMemo(() => allCategoryQuestions.map((q) => q.id), [allCategoryQuestions]);
  const respondentProfile = respondentProfileOf(category);

  const autosave = useDraftAutosave({
    enabled: stage === "form" && Boolean(client && category),
    save: (payload) => fill.saveProgress({ code: activeCode, clientId: client.id, validQuestionIds, respondentProfile, ...payload }),
    answers,
    respondent,
    consentAt,
    lastSectionId,
  });

  const handleCodeSubmit = (e) => {
    e.preventDefault();
    lookupCode(codeInput);
  };

  // Cari kode (dari form atau tautan `?code=`), cek akses, lalu buka unggah bukti / kuesioner
  const lookupCode = (rawCode) => (apiMode ? lookupCodeApi(rawCode) : lookupCodeLocal(rawCode));

  // Mode API: GET /public/assessments/{code}. Struktur dari server (beku sejak draft pertama), draft ikut dimuat.
  const lookupCodeApi = async (rawCode) => {
    const input = normCode(rawCode);
    if (!input) return;
    setLookupBusy(true);
    setCodeError("");
    try {
      const opened = await fill.open(input);
      openForm(opened.client, opened.category, input, opened);
    } catch (err) {
      if (err?.code === "proof_required") {
        const body = keysToCamel(err.body || {});
        setProofTarget({ client: { id: "" }, invoice: body.invoice || {}, code: input, bankAccounts: body.bankAccounts || [] });
        setStage("proof");
      } else {
        setCodeError(apiCodeError(err));
      }
    } finally {
      setLookupBusy(false);
    }
  };

  const lookupCodeLocal = (rawCode) => {
    const input = normCode(rawCode);
    let foundClient = null;
    let foundCat = null;
    let foundItem = null;

    for (const c of clients) {
      if (c.assessmentCodes && Array.isArray(c.assessmentCodes)) {
        const matching = c.assessmentCodes.find((item) => item.code && item.code.toUpperCase() === input);
        if (matching) {
          foundClient = c;
          foundItem = matching;
          foundCat = getCategory(matching.categoryId);
          break;
        }
      }
      if (c.assessmentAccessCode && c.assessmentAccessCode.toUpperCase() === input) {
        foundClient = c;
        foundItem = { code: input, categoryId: c.assessmentCategoryId };
        foundCat = getCategory(c.assessmentCategoryId);
        break;
      }
    }

    if (!foundClient) {
      setCodeError("Kode kuesioner tidak ditemukan. Silakan periksa kembali atau gunakan demo: ASM-2016 atau ASM-2017.");
      return;
    }

    const access = checkQuestionnaireAccess({ client: foundClient, codeItem: foundItem, invoices: getInvoicesForClient(foundClient.id), draft: fill.getDraft(input) });
    if (!foundCat) {
      // Fallback to first category if not found
      foundCat = getCategory("cat-001");
    }
    if (!access.ok && access.reason === "proof_required") {
      setCodeError("");
      setProofTarget({ client: foundClient, category: foundCat, invoice: access.invoice, code: input });
      setStage("proof");
      return;
    }
    if (!access.ok) {
      setCodeError(ACCESS_ERRORS[access.reason]);
      return;
    }

    openForm(foundClient, foundCat, input);
  };

  // Buka form; bila kode ini sudah punya draft, jawaban dipulihkan dan ortu melanjutkan dari titik terakhir.
  const openForm = (foundClient, foundCat, code, opened = null) => {
    const sections = buildSections(foundCat);
    const ids = new Set(questionsOf(sections).map((q) => q.id));
    const draft = opened ? opened.draft : fill.getDraft(code);
    const restored = draft ? Object.fromEntries(Object.entries(draft.answers || {}).filter(([id]) => ids.has(id))) : {};
    const restoredConsent = draft?.consentAt || null;
    const restoredSection = draft?.lastSectionId || null;
    const restoredRespondent = cleanRespondent(respondentProfileOf(foundCat), draft?.respondent || {});

    autosave.reset({ answers: restored, respondent: restoredRespondent, consentAt: restoredConsent, lastSectionId: restoredSection });
    setAnswers(restored);
    setRespondent(restoredRespondent);
    setShowRespondentErrors(false);
    setConsentAt(restoredConsent);
    setLastSectionId(restoredSection);
    setResume(Object.keys(restored).length > 0 ? { answered: Object.keys(restored).length, total: ids.size } : null);
    resumeSectionRef.current = Object.keys(restored).length > 0 ? restoredSection : null;
    setFormError("");
    setActiveCode(code);
    setCategory(foundCat);
    setClient(foundClient);
    setStage("form");
  };

  // Simpan bukti transfer ke invoice assessment, lalu buka kuesioner
  const handleProofSubmit = (file) => {
    uploadPaymentProof({
      invoiceId: proofTarget.invoice.id,
      proofUrl: file.dataUrl,
      fileName: file.fileName,
      fileType: file.fileType,
      fileSize: file.fileSize,
    });
    toast.success("Bukti transfer terkirim. Silakan lanjut mengisi kuesioner.");
    openForm(proofTarget.client, proofTarget.category, proofTarget.code);
    setProofTarget(null);
  };

  // Tautan dari admin (`/assessment?code=XXX`): kode terisi dan langsung diproses, ortu tidak perlu mengetik
  const autoOpened = useRef(false);
  useEffect(() => {
    if (autoOpened.current || !searchParams.get("code") || (!apiMode && clients.length === 0)) return;
    autoOpened.current = true;
    lookupCode(searchParams.get("code"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clients.length]); // mode API: langsung (clients selalu kosong)

  // Dilanjutkan dari draft: gulir ke section terakhir yang dikerjakan
  useEffect(() => {
    if (stage !== "form" || !resumeSectionRef.current) return undefined;
    const target = resumeSectionRef.current;
    resumeSectionRef.current = null;
    const t = setTimeout(() => document.getElementById(target)?.scrollIntoView?.({ behavior: "smooth", block: "start" }), 150);
    return () => clearTimeout(t);
  }, [stage]);

  // Perubahan satu jawaban (stabil agar QuestionCard ter-memo tidak merender ulang semuanya)
  const handleAnswer = useCallback(
    (questionId, value) => {
      setAnswers((prev) => ({ ...prev, [questionId]: value }));
      setFormError("");
      if (sectionOfQuestion[questionId]) setLastSectionId(sectionOfQuestion[questionId]);
    },
    [sectionOfQuestion]
  );

  const answeredCount = useMemo(() => allCategoryQuestions.filter((q) => isAnswerFilled(answers[q.id])).length, [allCategoryQuestions, answers]);

  // Hanya soal WAJIB yang menentukan progres & izin kirim; soal opsional boleh dikosongkan.
  const progress = useMemo(() => requiredProgress(allCategoryQuestions, answers), [allCategoryQuestions, answers]);
  const requiredLeft = progress.total - progress.answered;

  const handleRespondent = useCallback((key, value) => {
    setRespondent((prev) => ({ ...prev, [key]: value }));
    setFormError("");
  }, []);

  const scrollToSection = (secId) => {
    document.getElementById(secId)?.scrollIntoView?.({ behavior: "smooth", block: "start" });
  };

  const jumpToFirstUnanswered = () => {
    if (missingRespondentFields(respondentProfile, respondent).length > 0) {
      document.getElementById("respondent-card")?.scrollIntoView?.({ behavior: "smooth", block: "start" });
      return;
    }
    const firstUnanswered = unansweredRequired(allCategoryQuestions, answers)[0];
    if (firstUnanswered) {
      const el = document.getElementById(`q-card-${firstUnanswered.id}`);
      if (el) {
        el.scrollIntoView?.({ behavior: "smooth", block: "center" });
        el.classList.add("ring-2", "ring-rose-400");
        setTimeout(() => el.classList.remove("ring-2", "ring-rose-400"), 2000);
      }
    }
  };

  // "Simpan & lanjutkan nanti": simpan sekarang, ortu boleh menutup halaman dan kembali dengan kode/tautan yang sama.
  const handleSaveForLater = async () => {
    const result = await Promise.resolve(autosave.flush()); // mode API: menunggu server membalas
    if (result === "error") {
      toast.error("Jawaban belum tersimpan. Periksa koneksi lalu coba lagi.");
      return;
    }
    if (result === "clean" && answeredCount === 0 && !consentAt) {
      toast.info("Belum ada jawaban untuk disimpan.");
      return;
    }
    toast.success("Jawaban tersimpan. Buka kembali tautan atau kode yang sama untuk melanjutkan kapan saja.");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!category || submitting) return;
    // Data Pengisi lebih dulu (ada di bagian paling atas form)
    if (missingRespondentFields(respondentProfile, respondent).length > 0 || Object.keys(respondentFormatErrors(respondentProfile, respondent)).length > 0) {
      setShowRespondentErrors(true);
      setFormError("Mohon lengkapi Data Pengisi di bagian atas formulir.");
      document.getElementById("respondent-card")?.scrollIntoView?.({ behavior: "smooth", block: "start" });
      return;
    }
    const unanswered = unansweredRequired(allCategoryQuestions, answers);
    if (unanswered.length > 0) {
      setFormError(`Mohon lengkapi seluruh pertanyaan wajib (${unanswered.length} belum diisi).`);
      return;
    }
    if (!consentAt) {
      setFormError("Mohon centang persetujuan penggunaan data anak sebelum mengirim jawaban.");
      return;
    }
    autosave.cancel(); // tidak ada simpan draft yang menyusul setelah kirim final
    if (apiMode) {
      setSubmitting(true);
      try {
        await fill.submit({ code: activeCode, answers, respondent: cleanRespondent(respondentProfile, respondent), consentAt });
        setStage("done");
        toast.success("Kuesioner asesmen berhasil dikirimkan. Terima kasih!");
      } catch (err) {
        const body = keysToCamel(err?.body || {});
        if (err?.code === "incomplete" && body.missingRespondentFields?.length) {
          setShowRespondentErrors(true);
          setFormError("Mohon lengkapi Data Pengisi di bagian atas formulir.");
          document.getElementById("respondent-card")?.scrollIntoView?.({ behavior: "smooth", block: "start" });
        } else if (err?.code === "incomplete") {
          setFormError(`Mohon lengkapi seluruh pertanyaan wajib (${body.missingQuestionIds?.length ?? "beberapa"} belum diisi).`);
        } else if (err?.code === "already_submitted") {
          setFormError(ACCESS_ERRORS.submitted);
        } else {
          setFormError(err?.fieldErrors?.consent || err?.message || "Jawaban belum terkirim. Periksa koneksi lalu coba lagi.");
        }
      } finally {
        setSubmitting(false);
      }
      return;
    }
    fill.submit({ client, category, code: activeCode, questions: allCategoryQuestions, answers, respondent, consentAt });
    setStage("done");
    toast.success("Kuesioner asesmen berhasil dikirimkan. Terima kasih!");
  };

  return (
    <div className="no-input-zoom min-h-dvh bg-slate-50/80 py-4 sm:py-8 px-3 sm:px-6">
      <div className={cn("mx-auto space-y-4 sm:space-y-6 transition-all", stage === "form" ? "max-w-4xl" : "max-w-xl")}>
        <Link to="/login" className="inline-flex items-center gap-2 min-h-10 text-xs font-bold text-slate-500 hover:text-[#007AFF] transition-colors" data-testid="assessment-back-link">
          <ArrowLeft className="w-4 h-4" /> Kembali ke halaman masuk
        </Link>

        {/* Brand Header */}
        <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
          <div className="w-12 h-12 flex items-center justify-center shrink-0">
            <img
              src="/images/therapedia_logo.png"
              alt="Therapedia Mascot Logo"
              className="w-full h-full object-contain drop-shadow-[0_2px_8px_rgba(0,122,255,0.25)]"
            />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-extrabold text-base text-slate-900 leading-tight truncate">Therapedia Developmental Center</p>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#007AFF] bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                Clinical
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Parent Assessment & Developmental Profiling System</p>
          </div>
        </div>

        {stage === "code" && (
          <CodeEntryCard
            value={codeInput}
            error={codeError}
            busy={lookupBusy}
            showDemoHint={!apiMode}
            onChange={(v) => {
              setCodeInput(v);
              setCodeError("");
            }}
            onSubmit={handleCodeSubmit}
          />
        )}

        {stage === "proof" && proofTarget && apiMode && (
          <AssessmentProofCard
            invoice={proofTarget.invoice}
            bankAccounts={proofTarget.bankAccounts}
            onSubmit={async (file) => {
              await fill.uploadProof(proofTarget.code, file); // galat (422 format/ukuran, batas 4x) tampil di kartu
              toast.success("Bukti transfer terkirim. Silakan lanjut mengisi kuesioner.");
              setProofTarget(null);
              await lookupCodeApi(proofTarget.code);
            }}
            onBack={() => { setProofTarget(null); setStage("code"); }}
          />
        )}

        {stage === "proof" && proofTarget && !apiMode && (
          <AssessmentProofCard invoice={proofTarget.invoice} bankAccounts={proofBranchAccounts} branchName={proofBranch?.name} onSubmit={handleProofSubmit} onBack={() => { setProofTarget(null); setStage("code"); }} />
        )}

        {stage === "form" && client && category && (
          <div className="space-y-4 sm:space-y-6" data-testid="assessment-question-form">
            {resume && (
              <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-sky-50 border border-sky-200 text-xs text-sky-900" data-testid="assessment-resume-banner">
                <CheckCircle2 className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  <strong>Dilanjutkan dari jawaban tersimpan</strong> ({resume.answered} dari {resume.total} soal sudah terisi). Anda bisa langsung melanjutkan dari bagian terakhir.
                </p>
              </div>
            )}

            <ProgressHeader
              category={category}
              client={client}
              code={activeCode}
              sections={categorizedSections}
              answers={answers}
              totalQuestions={allCategoryQuestions.length}
              progress={progress}
              saveState={autosave.state}
              filterMode={filterMode}
              onFilterChange={setFilterMode}
              onJump={scrollToSection}
            />

            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
              <RespondentCard profile={respondentProfile} values={respondent} onChange={handleRespondent} showErrors={showRespondentErrors} />
              {categorizedSections.map((sec, sIdx) => (
                <SectionBlock key={sec.id} section={sec} index={sIdx} answers={answers} filterMode={filterMode} onAnswer={handleAnswer} />
              ))}

              <SubmitBar
                submitting={submitting}
                consented={Boolean(consentAt)}
                onConsentChange={(checked) => {
                  setConsentAt(checked ? consentAt || nowIso() : null);
                  setFormError("");
                }}
                formError={formError}
                onJumpToUnanswered={jumpToFirstUnanswered}
                requiredLeft={requiredLeft}
                progress={progress}
                onSaveLater={handleSaveForLater}
              />
            </form>
          </div>
        )}

        {stage === "done" && <DoneCard client={client} />}
      </div>
    </div>
  );
}
