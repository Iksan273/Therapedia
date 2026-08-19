import React, { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, CalendarPlus, CheckCircle2, FileQuestion, KeyRound, Activity, Sparkles, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AddScheduleModal } from "@/components/calendar/AddScheduleModal";
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

  const category = client ? getCategory(client.assessmentCategoryId) : null;

  const handleCodeSubmit = (e) => {
    e.preventDefault();
    const input = codeInput.trim().toUpperCase();
    const found = clients.find((c) => c.assessmentAccessCode && c.assessmentAccessCode.toUpperCase() === input);
    if (!found) {
      setCodeError("No assessment found for that code. Double-check with the clinic. Demo code: ASM-2203");
      return;
    }
    const cat = getCategory(found.assessmentCategoryId);
    if (!cat) {
      setCodeError("This assessment category is not configured yet. Please contact the clinic.");
      return;
    }
    const prefill = {};
    (found.assessmentAnswers || []).forEach((a) => {
      prefill[a.questionId] = a.answer;
    });
    setAnswers(prefill);
    setClient(found);
    setStage("form");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const unanswered = category.questions.filter((q) => !answers[q.id] || !String(answers[q.id]).trim());
    if (unanswered.length > 0) {
      setFormError(`Please complete all questions (${unanswered.length} remaining).`);
      return;
    }
    updateClient(client.id, {
      assessmentAnswers: category.questions.map((q) => ({ questionId: q.id, answer: answers[q.id] })),
    });
    setStage("done");
    toast.success("Assessment submitted successfully. Thank you!");
  };

  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);

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
                  {category.questions.length} Questions
                </span>
              </div>
              <CardDescription className="text-xs text-slate-500">
                Intake Assessment for <strong className="text-slate-800 font-bold">{client.clientName}</strong>
                {client.assessmentAnswers.length > 0 && " · Previously submitted (answers loaded)"}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {category.questions.map((q, idx) => (
                  <div key={q.id} className="space-y-2.5 p-4 rounded-xl bg-slate-50/60 border border-slate-200/70" data-testid={`assessment-question-${q.id}`}>
                    <Label className="text-xs font-bold text-slate-800 leading-snug flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-sky-600 text-white flex items-center justify-center text-[10px] shrink-0 font-bold">
                        {idx + 1}
                      </span>
                      <span>{q.question}</span>
                    </Label>
                    {q.type === "text" && (
                      <Textarea
                        rows={2}
                        className="rounded-xl border-slate-200 bg-white text-xs"
                        value={answers[q.id] || ""}
                        onChange={(e) => {
                          setAnswers({ ...answers, [q.id]: e.target.value });
                          setFormError("");
                        }}
                        placeholder="Type observation / details..."
                        data-testid={`assessment-answer-input-${q.id}`}
                      />
                    )}
                    {q.type === "yes_no" && (
                      <RadioGroup
                        value={answers[q.id] || ""}
                        onValueChange={(v) => {
                          setAnswers({ ...answers, [q.id]: v });
                          setFormError("");
                        }}
                        className="flex gap-4 pt-1"
                      >
                        {["Yes", "No"].map((opt) => (
                          <label key={opt} className={cn("flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-xl border transition-all cursor-pointer", answers[q.id] === opt ? "bg-sky-50 border-sky-300 text-sky-900 shadow-2xs" : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50")}>
                            <RadioGroupItem value={opt} data-testid={`assessment-answer-${q.id}-${opt.toLowerCase()}`} /> {opt}
                          </label>
                        ))}
                      </RadioGroup>
                    )}
                    {q.type === "multiple_choice" && (
                      <RadioGroup
                        value={answers[q.id] || ""}
                        onValueChange={(v) => {
                          setAnswers({ ...answers, [q.id]: v });
                          setFormError("");
                        }}
                        className="space-y-2 pt-1"
                      >
                        {q.options.map((opt) => (
                          <label key={opt} className={cn("flex items-center gap-2.5 text-xs font-semibold px-4 py-2.5 rounded-xl border transition-all cursor-pointer", answers[q.id] === opt ? "bg-sky-50 border-sky-300 text-sky-900 shadow-2xs" : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50")}>
                            <RadioGroupItem value={opt} /> {opt}
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
            <CardContent className="p-8 text-center space-y-5">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-2xs">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1.5">
                <h2 className="text-2xl font-extrabold text-slate-900">Assessment Submitted</h2>
                <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
                  Thank you! Our clinical team will evaluate your responses and prepare the observational roadmap for the upcoming assessment session.
                </p>
              </div>

              {client && (
                <div className="pt-2">
                  <div className="rounded-2xl border border-sky-200 bg-sky-50/70 p-5 text-left space-y-2.5 mb-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-sky-900">Next Step: Schedule Therapy Slot</p>
                    <p className="text-xs text-slate-600 leading-relaxed font-medium">
                      You can select a preferred preliminary schedule slot for <strong className="text-slate-900">{client.clientName}</strong> right now.
                    </p>
                    <Button
                      type="button"
                      className="w-full bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl gap-2 h-10 text-xs shadow-xs mt-1"
                      onClick={() => setScheduleModalOpen(true)}
                      data-testid="plot-schedule-assessment-button"
                    >
                      <CalendarPlus className="w-4 h-4" /> Book Clinical Session Slot
                    </Button>
                  </div>
                </div>
              )}

              <Link to="/">
                <Button variant="outline" className="rounded-xl border-slate-200 text-xs font-semibold h-10">Return to Home</Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {client && (
          <AddScheduleModal
            open={scheduleModalOpen}
            onOpenChange={setScheduleModalOpen}
            defaults={{
              clientId: client.id,
              lockClient: true,
              type: "therapy",
            }}
          />
        )}
      </div>
    </div>
  );
}

