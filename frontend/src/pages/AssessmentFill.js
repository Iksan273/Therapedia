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

  const allCategoryQuestions = useMemo(() => {
    if (!category) return [];
    const WINNIE_DUNN_OPTIONS = [
      "5 - Hampir Selalu (90%+)",
      "4 - Sering (75%)",
      "3 - Kadang (50%)",
      "2 - Jarang (25%)",
      "1 - Hampir Tidak Pernah (10%)",
      "0 - Tidak Pernah / Tidak Berlaku",
    ];

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
      return category.sections.flatMap((sec) =>
        (sec.questions || []).map((q, idx) => mapQuestion(q, idx, sec))
      );
    }
    return (category.questions || []).map((q, idx) => mapQuestion(q, idx, null));
  }, [category]);

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
    <div className="min-h-screen bg-slate-50/80 py-12 px-4 sm:px-6">
      <div className="max-w-xl mx-auto space-y-6">
        <Link to="/" className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-sky-700 transition-colors" data-testid="assessment-back-link">
          <ArrowLeft className="w-4 h-4" /> Back to portal select
        </Link>

        {/* Brand Header */}
        <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
          <div className="w-12 h-12 rounded-2xl bg-sky-600 flex items-center justify-center text-white font-extrabold text-xl shadow-xs shadow-sky-600/30">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <p className="font-extrabold text-base text-slate-900 leading-tight">Therapedia Developmental Center</p>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Parent Assessment & Developmental Profiling</p>
          </div>
        </div>

        {stage === "code" && (
          <Card className="rounded-2xl border border-slate-200/90 shadow-sm bg-white overflow-hidden clinical-card">
            <CardHeader className="pb-4 border-b border-slate-100 bg-slate-50/50">
              <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <FileQuestion className="w-5 h-5 text-sky-600" /> Enter Assessment Access Code
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                The clinic provided an assessment code (e.g. ASM-XXXX). Enter it below to open your child's questionnaire.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleCodeSubmit} className="space-y-4" data-testid="assessment-code-form">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Assessment Code</Label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                      className="pl-10 uppercase rounded-xl border-slate-200 bg-slate-50 focus:bg-white font-mono text-sm h-11"
                      placeholder="e.g. ASM-2203"
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
                <Button type="submit" className="w-full bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl h-11 text-xs shadow-xs" data-testid="assessment-code-submit-button">
                  Access Questionnaire
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {stage === "form" && client && category && (
          <Card className="rounded-2xl border border-slate-200/90 shadow-sm bg-white overflow-hidden clinical-card" data-testid="assessment-question-form">
            <CardHeader className="pb-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-lg font-bold text-slate-900">{category.categoryName}</CardTitle>
                <span className="text-[11px] font-bold bg-sky-100 text-sky-800 border border-sky-200 rounded-full px-3 py-1">
                  {allCategoryQuestions.length} Questions
                </span>
              </div>
              <CardDescription className="text-xs text-slate-500">
                Intake Assessment for <strong className="text-slate-800 font-bold">{client.clientName}</strong>
                {client.assessmentAnswers?.length > 0 && " · Previously submitted (answers loaded)"}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {allCategoryQuestions.map((q, idx) => (
                  <div key={q.id} className="space-y-2.5 p-4 rounded-xl bg-slate-50/60 border border-slate-200/70" data-testid={`assessment-question-${q.id}`}>
                    <Label className="text-xs font-bold text-slate-800 leading-snug flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-sky-600 text-white flex items-center justify-center text-[10px] shrink-0 font-bold">
                        {idx + 1}
                      </span>
                      <span>{q.question}</span>
                    </Label>
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
                              "flex items-center gap-2 text-xs font-bold px-4 py-2.5 rounded-xl border transition-all cursor-pointer",
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

                    {/* 5. Multiple Choice & Standard Winnie Dunn Scale 0-5 */}
                    {(q.type === "multiple_choice" || q.type === "scale_0_5" || !q.type) && (
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
                ))}
                {formError && <p className="text-xs font-bold text-rose-600 bg-rose-50 p-3 rounded-xl border border-rose-200" data-testid="assessment-form-error">{formError}</p>}
                <Button type="submit" className="w-full bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl h-11 text-xs shadow-sm shadow-sky-600/20" data-testid="assessment-submit-button">
                  Submit Assessment Responses
                </Button>
              </form>
            </CardContent>
          </Card>
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

