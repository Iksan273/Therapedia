import React, { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, CalendarPlus, CheckCircle2, FileQuestion, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AddScheduleModal } from "@/components/calendar/AddScheduleModal";
import { useClients } from "@/context/ClientsContext";
import { useAssessments } from "@/context/AssessmentsContext";

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
      setCodeError("This assessment is not configured yet. Please contact the clinic.");
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
      setFormError(`Please answer all questions (${unanswered.length} remaining).`);
      return;
    }
    updateClient(client.id, {
      assessmentAnswers: category.questions.map((q) => ({ questionId: q.id, answer: answers[q.id] })),
    });
    setStage("done");
    toast.success("Assessment submitted. Thank you!");
  };

  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[var(--color-surface)] noise-bg py-10 px-4">
      <div className="max-w-xl mx-auto">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] mb-6" data-testid="assessment-back-link">
          <ArrowLeft className="w-4 h-4" /> Back to home
        </Link>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)] flex items-center justify-center text-white font-semibold text-lg">T</div>
          <div>
            <p className="font-semibold leading-tight">Therapedia Developmental Center</p>
            <p className="text-xs text-[var(--color-text-muted)]">Parent Assessment Form</p>
          </div>
        </div>

        {stage === "code" && (
          <Card className="rounded-xl border-[var(--color-border)] shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileQuestion className="w-5 h-5 text-[var(--color-primary-dark)]" /> Enter your assessment code
              </CardTitle>
              <CardDescription>The clinic sent you a code like ASM-XXXX. Enter it below to open your child's assessment.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCodeSubmit} className="space-y-3" data-testid="assessment-code-form">
                <div className="relative">
                  <KeyRound className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                  <Input
                    className="pl-9 uppercase"
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
                  <p className="text-xs text-[var(--color-danger)]" data-testid="assessment-code-error">{codeError}</p>
                )}
                <Button type="submit" className="w-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)]" data-testid="assessment-code-submit-button">
                  Open Assessment
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {stage === "form" && client && category && (
          <Card className="rounded-xl border-[var(--color-border)] shadow-sm" data-testid="assessment-question-form">
            <CardHeader>
              <CardTitle className="text-lg">{category.categoryName}</CardTitle>
              <CardDescription>
                For <span className="font-medium text-[var(--color-text)]">{client.clientName}</span> · {category.questions.length} questions
                {client.assessmentAnswers.length > 0 && " · Previously submitted — resubmitting will update your answers"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {category.questions.map((q, idx) => (
                  <div key={q.id} className="space-y-2" data-testid={`assessment-question-${q.id}`}>
                    <Label className="text-sm leading-snug">
                      <span className="text-[var(--color-primary-dark)] font-semibold mr-1.5">{idx + 1}.</span>
                      {q.question}
                    </Label>
                    {q.type === "text" && (
                      <Textarea
                        rows={2}
                        value={answers[q.id] || ""}
                        onChange={(e) => {
                          setAnswers({ ...answers, [q.id]: e.target.value });
                          setFormError("");
                        }}
                        placeholder="Type your answer..."
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
                        className="flex gap-4"
                      >
                        {["Yes", "No"].map((opt) => (
                          <label key={opt} className="flex items-center gap-2 text-sm cursor-pointer">
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
                        className="space-y-1.5"
                      >
                        {q.options.map((opt) => (
                          <label key={opt} className="flex items-center gap-2 text-sm cursor-pointer rounded-lg border border-[var(--color-border)] px-3 py-2 hover:bg-[var(--color-surface)]">
                            <RadioGroupItem value={opt} /> {opt}
                          </label>
                        ))}
                      </RadioGroup>
                    )}
                  </div>
                ))}
                {formError && <p className="text-xs text-[var(--color-danger)]" data-testid="assessment-form-error">{formError}</p>}
                <Button type="submit" className="w-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] h-11" data-testid="assessment-submit-button">
                  Submit Assessment
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {stage === "done" && (
          <Card className="rounded-xl border-[var(--color-border)] shadow-sm" data-testid="assessment-success-card">
            <CardContent className="p-8 text-center space-y-4">
              <CheckCircle2 className="w-12 h-12 text-[var(--color-success)] mx-auto" />
              <div>
                <p className="text-lg font-semibold">Assessment submitted</p>
                <p className="text-sm text-[var(--color-text-muted)] mt-1">
                  Thank you! The clinic team will review your answers before the assessment session.
                </p>
              </div>

              {client && (
                <div className="pt-2">
                  <div className="rounded-xl border border-[rgba(47,168,224,0.3)] bg-[var(--color-primary-light)] p-4 text-left space-y-2 mb-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-primary-dark)]">Plot Schedule Terapi</p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      Anda dapat langsung menentukan jadwal terapi / assessment pilihan untuk <span className="font-semibold">{client.clientName}</span>.
                    </p>
                    <Button
                      type="button"
                      className="w-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] gap-2 mt-1"
                      onClick={() => setScheduleModalOpen(true)}
                      data-testid="plot-schedule-assessment-button"
                    >
                      <CalendarPlus className="w-4 h-4" /> Plot Schedule Terapi / Assessment
                    </Button>
                  </div>
                </div>
              )}

              <Link to="/">
                <Button variant="outline">Back to home</Button>
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
