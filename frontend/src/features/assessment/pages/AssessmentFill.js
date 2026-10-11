import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, FileQuestion, KeyRound, MessageCircle, Save } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Checkbox } from "@/shared/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/ui/card";
import { nowIso } from "@/shared/lib/id";
import { cn } from "@/shared/lib/utils";
import { useClients } from "@/stores/clientsStore";
import { useAssessments } from "@/stores/assessmentsStore";
import { useCredits } from "@/stores/creditsStore";
import { AssessmentProofCard } from "@/features/assessment/components/AssessmentProofCard";
import { QuestionCard } from "@/features/assessment/components/fill/QuestionCard";
import { DraftSaveIndicator } from "@/features/assessment/components/fill/DraftSaveIndicator";
import { buildSections, questionsOf, sectionIndex } from "@/features/assessment/components/fill/fillSections";
import { useAssessmentFillActions } from "@/features/assessment/hooks/useAssessmentFillActions";
import { useDraftAutosave } from "@/features/assessment/hooks/useDraftAutosave";
import { checkQuestionnaireAccess, isAnswerFilled } from "@/domain/assessment";

// Pesan penolakan akses kuesioner (aturan klien: sekali isi, masa berlaku opsional dicek saat dibuka, bukti transfer invoice assessment wajib diunggah sebelum mengisi).
const ACCESS_ERRORS = {
  submitted: "Kuesioner dengan kode ini sudah diisi dan tidak dapat diisi ulang. Hubungi Admin Therapedia bila perlu bantuan.",
  expired: "Kode kuesioner sudah kedaluwarsa. Hubungi Admin Therapedia untuk meminta kode baru.",
};

const normCode = (v) => String(v || "").trim().toUpperCase();

export default function AssessmentFill() {
  const { clients } = useClients();
  const { getCategory } = useAssessments();
  const { getInvoicesForClient, uploadPaymentProof } = useCredits();
  const fill = useAssessmentFillActions();

  const [stage, setStage] = useState("code"); // code | proof | form | done
  const [proofTarget, setProofTarget] = useState(null); // { client, category, invoice, code } menunggu unggah bukti
  const [searchParams] = useSearchParams();
  const [codeInput, setCodeInput] = useState((searchParams.get("code") || "").toUpperCase()); // dari tautan portal ortu
  const [codeError, setCodeError] = useState("");
  const [client, setClient] = useState(null);
  const [category, setCategory] = useState(null);
  const [activeCode, setActiveCode] = useState("");
  const [answers, setAnswers] = useState({});
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

  const autosave = useDraftAutosave({
    enabled: stage === "form" && Boolean(client && category),
    save: (payload) => fill.saveProgress({ code: activeCode, clientId: client.id, validQuestionIds, ...payload }),
    answers,
    consentAt,
    lastSectionId,
  });

  const handleCodeSubmit = (e) => {
    e.preventDefault();
    lookupCode(codeInput);
  };

  // Cari kode (dari form atau tautan `?code=`), cek akses, lalu buka unggah bukti / kuesioner
  const lookupCode = (rawCode) => {
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
  const openForm = (foundClient, foundCat, code) => {
    const sections = buildSections(foundCat);
    const ids = new Set(questionsOf(sections).map((q) => q.id));
    const draft = fill.getDraft(code);
    const restored = draft ? Object.fromEntries(Object.entries(draft.answers || {}).filter(([id]) => ids.has(id))) : {};
    const restoredConsent = draft?.consentAt || null;
    const restoredSection = draft?.lastSectionId || null;

    autosave.reset({ answers: restored, consentAt: restoredConsent, lastSectionId: restoredSection });
    setAnswers(restored);
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
    if (autoOpened.current || !searchParams.get("code") || clients.length === 0) return;
    autoOpened.current = true;
    lookupCode(searchParams.get("code"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clients.length]);

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

  const progressPercent = useMemo(() => {
    if (!allCategoryQuestions.length) return 0;
    return Math.round((answeredCount / allCategoryQuestions.length) * 100);
  }, [answeredCount, allCategoryQuestions.length]);

  const scrollToSection = (secId) => {
    document.getElementById(secId)?.scrollIntoView?.({ behavior: "smooth", block: "start" });
  };

  const jumpToFirstUnanswered = () => {
    const firstUnanswered = allCategoryQuestions.find((q) => !isAnswerFilled(answers[q.id]));
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
  const handleSaveForLater = () => {
    const result = autosave.flush();
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

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!category) return;
    const unanswered = allCategoryQuestions.filter((q) => !isAnswerFilled(answers[q.id]));
    if (unanswered.length > 0) {
      setFormError(`Mohon lengkapi seluruh pertanyaan (${unanswered.length} belum diisi).`);
      return;
    }
    if (!consentAt) {
      setFormError("Mohon centang persetujuan penggunaan data anak sebelum mengirim jawaban.");
      return;
    }
    autosave.cancel(); // tidak ada simpan draft yang menyusul setelah kirim final
    fill.submit({ client, category, code: activeCode, questions: allCategoryQuestions, answers, consentAt });
    setStage("done");
    toast.success("Kuesioner asesmen berhasil dikirimkan. Terima kasih!");
  };

  return (
    <div className="min-h-screen bg-slate-50/80 py-8 px-3 sm:px-6">
      <div className={cn("mx-auto space-y-6 transition-all", stage === "form" ? "max-w-4xl" : "max-w-xl")}>
        <Link to="/" className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-[#007AFF] transition-colors" data-testid="assessment-back-link">
          <ArrowLeft className="w-4 h-4" /> Kembali ke pemilihan portal
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
          <Card className="rounded-2xl border border-slate-200/90 shadow-sm bg-white overflow-hidden clinical-card">
            <CardHeader className="pb-4 border-b border-slate-100 bg-slate-50/50">
              <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <FileQuestion className="w-5 h-5 text-[#007AFF]" /> Masukkan Kode Akses Asesmen
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Gunakan kode akses kuesioner yang diberikan klinik (demo: <strong>ASM-2016</strong> atau <strong>ASM-2017</strong>). Kuesioner hanya dapat dikirim satu kali, tetapi Anda boleh berhenti di tengah jalan: jawaban tersimpan otomatis dan dapat dilanjutkan dengan kode yang sama.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleCodeSubmit} className="space-y-4" data-testid="assessment-code-form">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Kode Akses Asesmen</Label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                      className="pl-10 uppercase border-slate-200 bg-slate-50 focus:bg-white font-mono text-sm font-bold"
                      placeholder="e.g. SP2-K7M4QX"
                      value={codeInput}
                      onChange={(e) => {
                        setCodeInput(e.target.value);
                        setCodeError("");
                      }}
                      data-testid="assessment-code-input"
                    />
                  </div>
                  {codeError && (
                    <p className="text-xs font-semibold text-rose-600 mt-1" data-testid="assessment-code-error">{codeError}</p>
                  )}
                </div>
                <Button size="lg" type="submit" className="w-full bg-[#007AFF] hover:bg-[#0062cc] text-white font-bold shadow-md shadow-[#007AFF]/25 cursor-pointer" data-testid="assessment-code-submit-button">
                  Buka Instrumen Kuesioner
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {stage === "proof" && proofTarget && (
          <AssessmentProofCard invoice={proofTarget.invoice} onSubmit={handleProofSubmit} onBack={() => { setProofTarget(null); setStage("code"); }} />
        )}

        {stage === "form" && client && category && (
          <div className="space-y-6" data-testid="assessment-question-form">
            {resume && (
              <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-sky-50 border border-sky-200 text-xs text-sky-900" data-testid="assessment-resume-banner">
                <CheckCircle2 className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  <strong>Dilanjutkan dari jawaban tersimpan</strong> ({resume.answered} dari {resume.total} soal sudah terisi). Anda bisa langsung melanjutkan dari bagian terakhir.
                </p>
              </div>
            )}

            {/* STICKY PROGRESS HEADER (RESPONSIVE) */}
            <div className="sticky top-3 z-30 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/90 shadow-md p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                    {category.categoryName}
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">
                    Kuesioner untuk: <strong className="text-slate-800">{client.clientName}</strong> • Kode: <span className="font-mono text-sky-700 font-bold">{activeCode}</span>
                  </p>
                </div>
                <div className="flex flex-col items-start sm:items-end gap-1 self-start sm:self-auto">
                  <span className={cn(
                    "text-xs font-black px-3 py-1 rounded-full border",
                    answeredCount === allCategoryQuestions.length
                      ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                      : "bg-sky-50 text-sky-800 border-sky-300"
                  )} data-testid="assessment-progress-label">
                    {answeredCount} / {allCategoryQuestions.length} Terisi ({progressPercent}%)
                  </span>
                  <DraftSaveIndicator state={autosave.state} />
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className={cn(
                    "h-full transition-all duration-300 rounded-full",
                    progressPercent === 100 ? "bg-emerald-500" : "bg-[#007AFF]"
                  )}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              {/* Domain Quick Jump & Filter Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-slate-100">
                {/* Filter toggle */}
                <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs font-bold shrink-0">
                  <button
                    type="button"
                    onClick={() => setFilterMode("all")}
                    className={cn(
                      "px-3 py-1 rounded-lg transition-all text-[11px]",
                      filterMode === "all" ? "bg-white text-slate-900 shadow-xs font-black" : "text-slate-600 hover:text-slate-900"
                    )}
                  >
                    Semua ({allCategoryQuestions.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterMode("unanswered")}
                    className={cn(
                      "px-3 py-1 rounded-lg transition-all text-[11px]",
                      filterMode === "unanswered" ? "bg-rose-50 text-rose-800 border border-rose-200 font-black" : "text-slate-600 hover:text-slate-900"
                    )}
                  >
                    Belum Diisi ({allCategoryQuestions.length - answeredCount})
                  </button>
                </div>

                {/* Quick section pills (horizontal scrolling) */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full text-[11px] font-semibold">
                  <span className="text-slate-400 shrink-0 text-[11px] uppercase font-bold">Lompat:</span>
                  {categorizedSections.map((sec, sIdx) => {
                    const secAnswered = sec.questions.filter((q) => isAnswerFilled(answers[q.id])).length;
                    const isDone = secAnswered === sec.questions.length;
                    return (
                      <button
                        key={sec.id}
                        type="button"
                        onClick={() => scrollToSection(sec.id)}
                        className={cn(
                          "px-2.5 py-1 rounded-lg border shrink-0 transition-all text-[11px] font-bold flex items-center gap-1",
                          isDone
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                        )}
                      >
                        <span>{sIdx + 1}. {sec.title.split("(")[0].trim()}</span>
                        <span className={cn("text-[11px] px-1 py-0.2 rounded font-mono", isDone ? "bg-emerald-200 text-emerald-900" : "bg-slate-100 text-slate-600")}>
                          {secAnswered}/{sec.questions.length}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* FORM QUESTIONS BY DOMAIN SECTION */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {categorizedSections.map((sec, sIdx) => {
                const visibleQuestions = filterMode === "unanswered"
                  ? sec.questions.filter((q) => !isAnswerFilled(answers[q.id]))
                  : sec.questions;

                if (filterMode === "unanswered" && visibleQuestions.length === 0) {
                  return null;
                }

                return (
                  <div
                    key={sec.id}
                    id={sec.id}
                    className="scroll-mt-36 rounded-2xl border border-slate-200/90 shadow-2xs bg-white overflow-hidden"
                  >
                    {/* Section Header */}
                    <div className="p-4 sm:p-5 bg-gradient-to-r from-sky-50/80 via-white to-sky-50/50 border-b border-slate-200/80 flex items-start sm:items-center justify-between gap-3">
                      <div className="flex items-start gap-2.5 flex-1 min-w-0">
                        <span className="w-6 h-6 rounded-full bg-sky-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                          {sIdx + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm sm:text-base font-black text-slate-900 leading-snug break-words">
                            {sec.title}
                          </h3>
                          {sec.leadText && (
                            <p className="text-xs text-slate-500 font-medium mt-1 italic leading-normal break-words">
                              "{sec.leadText}"
                            </p>
                          )}
                        </div>
                      </div>
                      <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-sky-100/80 text-sky-800 border border-sky-200 shrink-0 font-mono self-start sm:self-center">
                        {sec.questions.length} Item
                      </span>
                    </div>

                    {/* Questions in section */}
                    <div className="p-4 sm:p-6 space-y-4">
                      {visibleQuestions.map((q) => (
                        <QuestionCard key={q.id} q={q} value={answers[q.id]} onChange={handleAnswer} />
                      ))}
                    </div>
                  </div>
                );
              })}

              {/* Bottom Submit Sticky Card */}
              <div className="sticky bottom-4 z-20 bg-white rounded-2xl border border-slate-200 shadow-lg p-4 space-y-3">
                {formError && (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold" data-testid="assessment-form-error">
                    <span>{formError}</span>
                    <button
                      type="button"
                      onClick={jumpToFirstUnanswered}
                      className="px-2.5 py-1 rounded-lg bg-rose-600 text-white text-[11px] hover:bg-rose-700 transition-colors"
                    >
                      Lihat Pertanyaan
                    </button>
                  </div>
                )}

                <label className="flex items-start gap-2.5 text-xs text-slate-700 leading-relaxed cursor-pointer" data-testid="assessment-consent-label">
                  <Checkbox
                    checked={Boolean(consentAt)}
                    onCheckedChange={(v) => {
                      setConsentAt(v === true ? consentAt || nowIso() : null);
                      setFormError("");
                    }}
                    className="mt-0.5"
                    data-testid="assessment-consent-checkbox"
                  />
                  <span>
                    Saya menyetujui data anak saya dikumpulkan dan digunakan oleh Therapedia untuk keperluan asesmen dan layanan terapi,
                    sesuai ketentuan pelindungan data pribadi. <span className="text-slate-400">(Boleh dicentang sekarang; persetujuan ikut tersimpan.)</span>
                  </span>
                </label>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="text-xs text-slate-600">
                    <p className="font-bold text-slate-800">
                      {answeredCount === allCategoryQuestions.length
                        ? "Seluruh pertanyaan telah lengkap terisi!"
                        : `Masih ada ${allCategoryQuestions.length - answeredCount} butir pertanyaan yang belum diisi.`}
                    </p>
                    <p className="text-[11px] text-slate-400">Pastikan pengisian dilakukan seobjektif mungkin demi akurasi penanganan klinis.</p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleSaveForLater}
                      className="font-bold gap-1.5 border-slate-300 min-h-10 cursor-pointer"
                      data-testid="assessment-save-later-button"
                    >
                      <Save className="w-4 h-4" /> Simpan & Lanjutkan Nanti
                    </Button>
                    <Button size="lg"
                      type="submit"
                      className={cn(
                        "font-bold px-6 shadow-xs cursor-pointer transition-all shrink-0",
                        answeredCount === allCategoryQuestions.length
                          ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30"
                          : "bg-sky-600 hover:bg-sky-700 text-white shadow-sky-600/30"
                      )}
                      data-testid="assessment-submit-button"
                    >
                      Kirim Jawaban Asesmen ({answeredCount}/{allCategoryQuestions.length})
                    </Button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        )}

        {stage === "done" && (
          <Card className="rounded-2xl border border-slate-200/90 shadow-sm bg-white overflow-hidden clinical-card" data-testid="assessment-success-card">
            <CardContent className="p-8 text-center space-y-6">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-2xs">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-black text-slate-900">Kuesioner Berhasil Dikirimkan</h2>
                <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
                  Terima kasih Ayah / Bunda atas pengisian kuesioner observasi perkembangan untuk{" "}
                  <strong className="text-slate-900 font-bold">{client?.clientName || "anak"}</strong>.
                </p>
              </div>

              <div className="p-5 rounded-2xl border border-emerald-200 bg-emerald-50/60 text-left space-y-2.5">
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-950 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  Konfirmasi Proses Selanjutnya
                </p>
                <p className="text-xs text-slate-700 leading-relaxed">
                  Seluruh data jawaban Anda telah tersimpan rapi dan akan dipelajari oleh tim psikolog klinis / terapis okupasi kami sebagai bahan evaluasi tatap muka.
                </p>
                <p className="text-xs text-emerald-900 font-semibold leading-relaxed">
                  Silakan lakukan konfirmasi ke Admin / Customer Care Therapedia untuk penjadwalan sesi asesmen langsung di klinik.
                </p>
              </div>

              {client && (
                <a
                  href={`https://wa.me/6281234567890?text=${encodeURIComponent(
                    `Halo Admin Therapedia, saya orang tua dari ${client.clientName} (Kode Klien: ${client.clientCode || "-"}). Saya sudah selesai mengisi kuesioner asesmen. Mohon bantuan untuk konfirmasi dan proses selanjutnya ya. Terima kasih!`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors"
                >
                  <MessageCircle className="w-4 h-4" /> Konfirmasi ke Admin Therapedia via WhatsApp
                </a>
              )}

              <div className="pt-2">
                <Link to="/">
                  <Button variant="outline" className="border-slate-200 font-semibold w-full sm:w-auto">
                    Kembali ke Beranda
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
