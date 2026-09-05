import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, FileQuestion, KeyRound, Activity, Sparkles, HelpCircle, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useClients } from "@/context/ClientsContext";
import { useAssessments } from "@/context/AssessmentsContext";
import { cn } from "@/lib/utils";

export default function AssessmentFill() {
  const { clients, updateClient } = useClients();
  const { getCategory } = useAssessments();

  const [stage, setStage] = useState("code"); // code | form | done
  const [codeInput, setCodeInput] = useState("");
  const [codeError, setCodeError] = useState("");
  const [client, setClient] = useState(null);
  const [answers, setAnswers] = useState({});
  const [formError, setFormError] = useState("");

  const [category, setCategory] = useState(null);

  const handleCodeSubmit = (e) => {
    e.preventDefault();
    const input = codeInput.trim().toUpperCase();
    let foundClient = null;
    let foundCat = null;

    for (const c of clients) {
      if (c.assessmentCodes && Array.isArray(c.assessmentCodes)) {
        const matching = c.assessmentCodes.find((item) => item.code && item.code.toUpperCase() === input);
        if (matching) {
          foundClient = c;
          foundCat = getCategory(matching.categoryId);
          break;
        }
      }
      if (c.assessmentAccessCode && c.assessmentAccessCode.toUpperCase() === input) {
        foundClient = c;
        foundCat = getCategory(c.assessmentCategoryId);
        break;
      }
    }

    if (!foundClient) {
      setCodeError("Kode kuesioner tidak ditemukan. Silakan periksa kembali atau gunakan demo: ASM-2011 atau ASM-2012.");
      return;
    }
    if (!foundCat) {
      // Fallback to first category if not found
      foundCat = getCategory("cat-001");
    }

    const prefill = {};
    const existingGroup = (foundClient.assessmentAnswers || []).find((a) => a.categoryId === foundCat.id);
    if (existingGroup && existingGroup.answers) {
      existingGroup.answers.forEach((ans) => {
        prefill[ans.questionId] = ans.answer;
      });
    }

    setAnswers(prefill);
    setCategory(foundCat);
    setClient(foundClient);
    setStage("form");
  };

  const [filterMode, setFilterMode] = useState("all"); // "all" | "unanswered"

  const WINNIE_DUNN_OPTIONS = useMemo(() => [
    "5 - Hampir Selalu (90%+)",
    "4 - Sering (75%)",
    "3 - Kadang (50%)",
    "2 - Jarang (25%)",
    "1 - Hampir Tidak Pernah (10%)",
    "0 - Tidak Pernah / Tidak Berlaku",
  ], []);

  const categorizedSections = useMemo(() => {
    if (!category) return [];

    const mapQuestion = (q, idx, sec) => {
      const qType = q.type || "scale_0_5";
      let opts = [];
      if (Array.isArray(q.options) && q.options.length > 0) {
        opts = q.options;
      } else if (qType === "scale_0_5") {
        opts = WINNIE_DUNN_OPTIONS;
      } else {
        opts = ["Opsi 1", "Opsi 2", "Opsi 3"];
      }

      return {
        ...q,
        id: q.id || `q-${sec ? sec.sectionId : "cat"}-${q.itemNo || idx + 1}`,
        itemNo: q.itemNo || idx + 1,
        domain: sec?.title || sec?.domain || q.domain || "Umum",
        type: qType,
        options: opts,
        scaleMin: q.scaleMin !== undefined ? q.scaleMin : (qType === "range" ? 1 : 0),
        scaleMax: q.scaleMax !== undefined ? q.scaleMax : 5,
        minLabel: q.minLabel || (qType === "range" ? "Sangat Rendah" : "Tidak Berlaku"),
        maxLabel: q.maxLabel || (qType === "range" ? "Sangat Tinggi" : "Hampir Selalu"),
      };
    };

    if (category.sections && category.sections.length > 0) {
      return category.sections.map((sec, sIdx) => ({
        id: sec.sectionId || `sec-${sIdx}`,
        title: sec.title || `Bagian ${sIdx + 1}`,
        leadText: sec.leadText || "Anakku ...",
        questions: (sec.questions || []).map((q, idx) => mapQuestion(q, idx, sec)),
      }));
    }
    return [
      {
        id: "sec-default",
        title: "Daftar Pertanyaan Observasi",
        leadText: "Anakku ...",
        questions: (category.questions || []).map((q, idx) => mapQuestion(q, idx, null)),
      },
    ];
  }, [category, WINNIE_DUNN_OPTIONS]);

  const allCategoryQuestions = useMemo(() => {
    return categorizedSections.flatMap((s) => s.questions);
  }, [categorizedSections]);

  const answeredCount = useMemo(() => {
    return allCategoryQuestions.filter((q) => {
      const val = answers[q.id];
      if (val === undefined || val === null) return false;
      if (Array.isArray(val)) return val.length > 0;
      return String(val).trim().length > 0;
    }).length;
  }, [allCategoryQuestions, answers]);

  const progressPercent = useMemo(() => {
    if (!allCategoryQuestions.length) return 0;
    return Math.round((answeredCount / allCategoryQuestions.length) * 100);
  }, [answeredCount, allCategoryQuestions.length]);

  const scrollToSection = (secId) => {
    const el = document.getElementById(secId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const jumpToFirstUnanswered = () => {
    const firstUnanswered = allCategoryQuestions.find((q) => {
      const val = answers[q.id];
      if (val === undefined || val === null) return true;
      if (Array.isArray(val)) return val.length === 0;
      return !String(val).trim();
    });
    if (firstUnanswered) {
      const el = document.getElementById(`q-card-${firstUnanswered.id}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("ring-2", "ring-rose-400");
        setTimeout(() => el.classList.remove("ring-2", "ring-rose-400"), 2000);
      }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!category) return;
    const unanswered = allCategoryQuestions.filter((q) => {
      const val = answers[q.id];
      if (val === undefined || val === null) return true;
      if (Array.isArray(val)) return val.length === 0;
      return !String(val).trim();
    });
    if (unanswered.length > 0) {
      setFormError(`Mohon lengkapi seluruh pertanyaan (${unanswered.length} belum diisi).`);
      return;
    }

    const formattedAnswers = allCategoryQuestions.map((q) => {
      const val = answers[q.id];
      let score = null;
      if (typeof val === "number") score = val;
      else if (typeof val === "string" && /^\d+/.test(val)) {
        score = parseInt(val.match(/^\d+/)[0], 10);
      }
      return {
        questionId: q.id,
        itemNo: q.itemNo,
        quadrant: q.quadrant,
        domain: q.domain || "Umum",
        question: q.question,
        answer: Array.isArray(val) ? val.join(", ") : String(val),
        score,
      };
    });

    const existingAnswers = client.assessmentAnswers || [];
    const filteredExisting = existingAnswers.filter((a) => a.categoryId !== category.id);
    const updatedAnswers = [
      ...filteredExisting,
      {
        categoryId: category.id,
        categoryName: category.categoryName,
        answers: formattedAnswers,
      },
    ];

    updateClient(client.id, {
      assessmentAnswers: updatedAnswers,
      status: ["inquiry", "service_selected", "assessment_scheduled"].includes(client.status) ? "assessment_done" : client.status,
    });
    setStage("done");
    toast.success("Kuesioner asesmen berhasil dikirimkan. Terima kasih!");
  };

  return (
    <div className="min-h-screen bg-slate-50/80 py-8 px-3 sm:px-6">
      <div className={cn("mx-auto space-y-6 transition-all", stage === "form" ? "max-w-4xl" : "max-w-xl")}>
        <Link to="/" className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-sky-700 transition-colors" data-testid="assessment-back-link">
          <ArrowLeft className="w-4 h-4" /> Kembali ke pemilihan portal
        </Link>

        {/* Brand Header */}
        <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
          <div className="w-12 h-12 rounded-2xl bg-sky-600 flex items-center justify-center text-white font-extrabold text-xl shadow-xs shadow-sky-600/30 shrink-0">
            <Activity className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <p className="font-extrabold text-base text-slate-900 leading-tight truncate">Therapedia Developmental Center</p>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Parent Assessment & Developmental Profiling System</p>
          </div>
        </div>

        {stage === "code" && (
          <Card className="rounded-2xl border border-slate-200/90 shadow-sm bg-white overflow-hidden clinical-card">
            <CardHeader className="pb-4 border-b border-slate-100 bg-slate-50/50">
              <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <FileQuestion className="w-5 h-5 text-sky-600" /> Masukkan Kode Akses Asesmen
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Gunakan kode akses kuesioner yang diberikan klinik (misal: <strong>ASM-2011</strong>, <strong>ASM-2012</strong>, atau <strong>ASM-2014</strong>).
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleCodeSubmit} className="space-y-4" data-testid="assessment-code-form">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Kode Akses Asesmen</Label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                      className="pl-10 uppercase rounded-xl border-slate-200 bg-slate-50 focus:bg-white font-mono text-sm h-11 font-bold"
                      placeholder="e.g. ASM-2011"
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
                <Button type="submit" className="w-full bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl h-11 text-xs shadow-xs cursor-pointer" data-testid="assessment-code-submit-button">
                  Buka Instrumen Kuesioner
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {stage === "form" && client && category && (
          <div className="space-y-6" data-testid="assessment-question-form">
            {/* STICKY PROGRESS HEADER (RESPONSIVE) */}
            <div className="sticky top-3 z-30 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/90 shadow-md p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                    {category.categoryName}
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">
                    Kuesioner untuk Ananda: <strong className="text-slate-800">{client.clientName}</strong> • Kode: <span className="font-mono text-sky-700 font-bold">{codeInput || client.assessmentAccessCode}</span>
                  </p>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <span className={cn(
                    "text-xs font-black px-3 py-1 rounded-full border",
                    answeredCount === allCategoryQuestions.length
                      ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                      : "bg-sky-50 text-sky-800 border-sky-300"
                  )}>
                    {answeredCount} / {allCategoryQuestions.length} Terisi ({progressPercent}%)
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className={cn(
                    "h-full transition-all duration-300 rounded-full",
                    progressPercent === 100 ? "bg-emerald-500" : "bg-sky-600"
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
                  <span className="text-slate-400 shrink-0 text-[10px] uppercase font-bold">Lompat:</span>
                  {categorizedSections.map((sec, sIdx) => {
                    const secAnswered = sec.questions.filter((q) => {
                      const val = answers[q.id];
                      return val !== undefined && val !== null && String(val).trim().length > 0;
                    }).length;
                    const isDone = secAnswered === sec.questions.length;
                    return (
                      <button
                        key={sec.id}
                        type="button"
                        onClick={() => scrollToSection(sec.id)}
                        className={cn(
                          "px-2.5 py-1 rounded-lg border shrink-0 transition-all text-[10px] font-bold flex items-center gap-1",
                          isDone
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                        )}
                      >
                        <span>{sIdx + 1}. {sec.title.split("(")[0].trim()}</span>
                        <span className={cn("text-[9px] px-1 py-0.2 rounded font-mono", isDone ? "bg-emerald-200 text-emerald-900" : "bg-slate-100 text-slate-600")}>
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
                  ? sec.questions.filter((q) => !answers[q.id] || !String(answers[q.id]).trim())
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
                          <p className="text-xs text-slate-500 font-medium mt-1 italic leading-normal break-words">
                            "{sec.leadText || "Anakku ..."}"
                          </p>
                        </div>
                      </div>
                      <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-sky-100/80 text-sky-800 border border-sky-200 shrink-0 font-mono self-start sm:self-center">
                        {sec.questions.length} Item
                      </span>
                    </div>

                    {/* Questions in section */}
                    <div className="p-4 sm:p-6 space-y-4">
                      {visibleQuestions.map((q) => {
                        const isAnswered = answers[q.id] !== undefined && answers[q.id] !== null && String(answers[q.id]).trim().length > 0;
                        return (
                          <div
                            key={q.id}
                            id={`q-card-${q.id}`}
                            className={cn(
                              "p-4 rounded-xl border transition-all space-y-3",
                              isAnswered
                                ? "bg-slate-50/40 border-slate-200"
                                : "bg-white border-amber-200/80 shadow-2xs ring-1 ring-amber-200/40"
                            )}
                            data-testid={`assessment-question-${q.id}`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <Label className="text-xs sm:text-sm font-bold text-slate-800 leading-snug flex items-start gap-2.5 flex-1 min-w-0 break-words">
                                <span className={cn(
                                  "w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0 font-black mt-0.5",
                                  isAnswered ? "bg-emerald-600 text-white" : "bg-slate-300 text-slate-700"
                                )}>
                                  {q.itemNo}
                                </span>
                                <span className="flex-1 min-w-0 break-words">{q.question}</span>
                              </Label>
                              {q.quadrant && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
                                  {q.quadrant}
                                </span>
                              )}
                            </div>

                            {/* 1. Teks Bebas / Esai */}
                            {(q.type === "free_text" || q.type === "text") && (
                              <Textarea
                                rows={3}
                                className="rounded-xl border-slate-200 bg-white text-xs"
                                value={answers[q.id] || ""}
                                onChange={(e) => {
                                  setAnswers({ ...answers, [q.id]: e.target.value });
                                  setFormError("");
                                }}
                                placeholder="Tuliskan catatan observasi / respon anak..."
                                data-testid={`assessment-answer-input-${q.id}`}
                              />
                            )}

                            {/* 2. Ya / Tidak */}
                            {q.type === "yes_no" && (
                              <RadioGroup
                                value={answers[q.id] || ""}
                                onValueChange={(v) => {
                                  setAnswers({ ...answers, [q.id]: v });
                                  setFormError("");
                                }}
                                className="flex gap-3 pt-1"
                              >
                                {["Ya", "Tidak"].map((opt) => (
                                  <label
                                    key={opt}
                                    className={cn(
                                      "flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-xl border transition-all cursor-pointer",
                                      answers[q.id] === opt
                                        ? "bg-sky-50 border-sky-300 text-sky-900 shadow-2xs ring-1 ring-sky-300"
                                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                                    )}
                                  >
                                    <RadioGroupItem value={opt} data-testid={`assessment-answer-${q.id}-${opt.toLowerCase()}`} />
                                    {opt}
                                  </label>
                                ))}
                              </RadioGroup>
                            )}

                            {/* 3. Range Angka Kustom (misal 1-5, 1-10) */}
                            {q.type === "range" && (
                              <div className="space-y-2 pt-1">
                                <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium px-1">
                                  <span>{q.scaleMin} — {q.minLabel}</span>
                                  <span>{q.scaleMax} — {q.maxLabel}</span>
                                </div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  {Array.from({ length: (q.scaleMax - q.scaleMin + 1) }, (_, i) => q.scaleMin + i).map((num) => {
                                    const isSelected = String(answers[q.id]) === String(num);
                                    return (
                                      <button
                                        key={num}
                                        type="button"
                                        onClick={() => {
                                          setAnswers({ ...answers, [q.id]: num });
                                          setFormError("");
                                        }}
                                        className={cn(
                                          "w-10 h-10 rounded-xl border text-xs font-black transition-all cursor-pointer",
                                          isSelected
                                            ? "bg-cyan-600 text-white border-cyan-600 shadow-sm scale-105"
                                            : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                                        )}
                                      >
                                        {num}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* 4. Multi-Centang (Checkbox Multi) */}
                            {q.type === "checkbox_multi" && (
                              <div className="space-y-2 pt-1">
                                {q.options.map((opt) => {
                                  const currentArr = Array.isArray(answers[q.id]) ? answers[q.id] : [];
                                  const isChecked = currentArr.includes(opt);
                                  return (
                                    <label
                                      key={opt}
                                      className={cn(
                                        "flex items-center gap-2.5 text-xs font-semibold px-4 py-2.5 rounded-xl border transition-all cursor-pointer",
                                        isChecked
                                          ? "bg-indigo-50 border-indigo-300 text-indigo-950 shadow-2xs ring-1 ring-indigo-300"
                                          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                                      )}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={(e) => {
                                          const nextArr = e.target.checked
                                            ? [...currentArr, opt]
                                            : currentArr.filter((item) => item !== opt);
                                          setAnswers({ ...answers, [q.id]: nextArr });
                                          setFormError("");
                                        }}
                                        className="w-4 h-4 rounded text-indigo-600 accent-indigo-600 cursor-pointer"
                                      />
                                      <span>{opt}</span>
                                    </label>
                                  );
                                })}
                              </div>
                            )}

                            {/* 5. Winnie Dunn Standard Scale 0-5 with Fast-Touch Number Badges */}
                            {q.type === "scale_0_5" && (
                              <div className="space-y-2.5 pt-1">
                                {/* Quick Touch Number Buttons */}
                                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                                  {[
                                    { val: 5, label: "Hampir Selalu (90%+)", color: "hover:bg-emerald-50 active:bg-emerald-600" },
                                    { val: 4, label: "Sering (75%)", color: "hover:bg-teal-50 active:bg-teal-600" },
                                    { val: 3, label: "Kadang (50%)", color: "hover:bg-blue-50 active:bg-blue-600" },
                                    { val: 2, label: "Jarang (25%)", color: "hover:bg-amber-50 active:bg-amber-600" },
                                    { val: 1, label: "Hampir Tidak Pernah (10%)", color: "hover:bg-rose-50 active:bg-rose-600" },
                                    { val: 0, label: "Tidak Pernah / Tidak Berlaku", color: "hover:bg-slate-100 active:bg-slate-600" },
                                  ].map((scoreItem) => {
                                    const matchingOpt = q.options.find((opt) => opt.startsWith(String(scoreItem.val))) || `${scoreItem.val} - ${scoreItem.label}`;
                                    const isSelected = String(answers[q.id]).startsWith(String(scoreItem.val));
                                    return (
                                      <button
                                        key={scoreItem.val}
                                        type="button"
                                        onClick={() => {
                                          setAnswers({ ...answers, [q.id]: matchingOpt });
                                          setFormError("");
                                        }}
                                        title={scoreItem.label}
                                        className={cn(
                                          "flex-1 min-w-[42px] sm:min-w-[48px] h-10 sm:h-11 rounded-xl border text-xs sm:text-sm font-black transition-all cursor-pointer flex flex-col items-center justify-center select-none",
                                          isSelected
                                            ? "bg-sky-600 text-white border-sky-600 shadow-xs scale-105 ring-2 ring-sky-300"
                                            : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-white hover:border-slate-300"
                                        )}
                                      >
                                        <span>{scoreItem.val}</span>
                                      </button>
                                    );
                                  })}
                                </div>

                                {/* Active answer descriptor label */}
                                {answers[q.id] && (
                                  <div className="p-2 rounded-lg bg-sky-50/70 border border-sky-200/80 text-[11px] font-bold text-sky-900 flex items-center justify-between">
                                    <span>Pilihan: <strong>{answers[q.id]}</strong></span>
                                    <span className="text-[10px] text-sky-600">Tersimpan ✓</span>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* 6. Standard Multiple Choice (if not scale_0_5) */}
                            {q.type === "multiple_choice" && (
                              <RadioGroup
                                value={answers[q.id] !== undefined ? String(answers[q.id]) : ""}
                                onValueChange={(v) => {
                                  setAnswers({ ...answers, [q.id]: v });
                                  setFormError("");
                                }}
                                className="space-y-2 pt-1"
                              >
                                {q.options.map((opt) => (
                                  <label
                                    key={opt}
                                    className={cn(
                                      "flex items-center gap-2.5 text-xs font-semibold px-4 py-2.5 rounded-xl border transition-all cursor-pointer",
                                      String(answers[q.id]) === opt
                                        ? "bg-sky-50 border-sky-300 text-sky-900 shadow-2xs ring-1 ring-sky-300"
                                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                                    )}
                                  >
                                    <RadioGroupItem value={opt} />
                                    <span>{opt}</span>
                                  </label>
                                ))}
                              </RadioGroup>
                            )}
                          </div>
                        );
                      })}
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

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="text-xs text-slate-600">
                    <p className="font-bold text-slate-800">
                      {answeredCount === allCategoryQuestions.length
                        ? "🎉 Seluruh pertanyaan telah lengkap terisi!"
                        : `Masih ada ${allCategoryQuestions.length - answeredCount} butir pertanyaan yang belum diisi.`}
                    </p>
                    <p className="text-[11px] text-slate-400">Pastikan pengisian dilakukan seobjektif mungkin demi akurasi penanganan klinis.</p>
                  </div>

                  <Button
                    type="submit"
                    className={cn(
                      "font-bold rounded-xl h-11 text-xs px-6 shadow-xs cursor-pointer transition-all shrink-0",
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
                  Terima kasih Ayah / Bunda atas pengisian kuesioner observasi perkembangan untuk ananda{" "}
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
                    `Halo Admin Therapedia, saya orang tua dari ananda ${client.clientName} (Kode Klien: ${client.clientAccessCode || "TDC"}). Saya sudah selesai mengisi kuesioner asesmen. Mohon bantuan untuk konfirmasi dan proses selanjutnya ya. Terima kasih!`
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
                  <Button variant="outline" className="rounded-xl border-slate-200 text-xs font-semibold h-10 w-full sm:w-auto">
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

