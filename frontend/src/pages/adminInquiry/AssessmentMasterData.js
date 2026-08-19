import React, { useState } from "react";
import { toast } from "sonner";
import { ClipboardList, Pencil, Plus, Trash2, HelpCircle, Sparkles, Layers, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { EmptyState } from "@/components/common/EmptyState";
import { useAssessments } from "@/context/AssessmentsContext";
import { uid } from "@/lib/appUtils";

const TYPE_LABELS = { text: "Free text", multiple_choice: "Multiple choice", yes_no: "Yes / No" };
const TYPE_BADGE_STYLE = {
  text: "bg-sky-50 text-sky-700 border-sky-200/80",
  multiple_choice: "bg-purple-50 text-purple-700 border-purple-200/80",
  yes_no: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
};

export default function AssessmentMasterData() {
  const { categories, addCategory, updateCategory, deleteCategory } = useAssessments();

  const [catDialog, setCatDialog] = useState({ open: false, editingId: null, name: "" });
  const [qDialog, setQDialog] = useState({
    open: false,
    categoryId: null,
    editingId: null,
    text: "",
    type: "text",
    options: "",
  });

  const saveCategory = () => {
    const name = catDialog.name.trim();
    if (!name) {
      toast.error("Category name is required.");
      return;
    }
    if (catDialog.editingId) {
      updateCategory(catDialog.editingId, { categoryName: name });
      toast.success("Category renamed.");
    } else {
      addCategory({ id: uid(), categoryName: name, questions: [] });
      toast.success("Category created.");
    }
    setCatDialog({ open: false, editingId: null, name: "" });
  };

  const saveQuestion = () => {
    const text = qDialog.text.trim();
    if (!text) {
      toast.error("Question text is required.");
      return;
    }
    const category = categories.find((c) => c.id === qDialog.categoryId);
    if (!category) return;
    const options =
      qDialog.type === "multiple_choice"
        ? qDialog.options.split(",").map((o) => o.trim()).filter(Boolean)
        : [];
    if (qDialog.type === "multiple_choice" && options.length < 2) {
      toast.error("Provide at least 2 comma-separated options.");
      return;
    }
    let questions;
    if (qDialog.editingId) {
      questions = category.questions.map((q) =>
        q.id === qDialog.editingId ? { ...q, question: text, type: qDialog.type, options } : q
      );
      toast.success("Question updated.");
    } else {
      questions = [...category.questions, { id: uid(), question: text, type: qDialog.type, options }];
      toast.success("Question added.");
    }
    updateCategory(category.id, { questions });
    setQDialog({ open: false, categoryId: null, editingId: null, text: "", type: "text", options: "" });
  };

  const removeQuestion = (categoryId, questionId) => {
    const category = categories.find((c) => c.id === categoryId);
    if (!category) return;
    updateCategory(categoryId, { questions: category.questions.filter((q) => q.id !== questionId) });
    toast.success("Question removed.");
  };

  return (
    <div className="space-y-6" data-testid="assessment-master-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-100/80 text-sky-800 text-xs font-semibold mb-2">
            <Layers className="w-3.5 h-3.5 text-sky-600" />
            Clinical Questionnaire Banks
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Assessment Master Data
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Configure clinical intake categories and question banks sent to parents before admission.
          </p>
        </div>
        <Button
          className="bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-xl gap-2 shadow-sm shadow-sky-600/20 w-fit"
          onClick={() => setCatDialog({ open: true, editingId: null, name: "" })}
          data-testid="new-category-button"
        >
          <Plus className="w-4 h-4" /> New Category
        </Button>
      </div>

      {categories.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No assessment categories yet"
          subtitle="Create a category to start building question sets for parents."
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {categories.map((cat) => (
            <Card key={cat.id} className="clinical-card rounded-2xl border-slate-200/90 flex flex-col justify-between" data-testid={`category-card-${cat.id}`}>
              <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-start justify-between space-y-0">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center font-bold shrink-0 border border-sky-100">
                    <ListChecks className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold text-slate-900">{cat.categoryName}</CardTitle>
                    <p className="text-xs text-slate-500 mt-0.5 font-medium">{cat.questions.length} questions in bank</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 rounded-lg hover:bg-slate-100 text-slate-500"
                    onClick={() => setCatDialog({ open: true, editingId: cat.id, name: cat.categoryName })}
                    aria-label="Rename category"
                    data-testid={`edit-category-button-${cat.id}`}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600"
                        aria-label="Delete category"
                        data-testid={`delete-category-button-${cat.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="rounded-2xl p-6 border-slate-200">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-lg font-bold text-slate-900">Delete “{cat.categoryName}”?</AlertDialogTitle>
                        <AlertDialogDescription className="text-xs text-slate-600 leading-relaxed">
                          This removes the category and its {cat.questions.length} questions. Existing client assessment records will remain intact.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter className="mt-4 gap-2">
                        <AlertDialogCancel className="rounded-xl border-slate-200">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl"
                          onClick={() => {
                            deleteCategory(cat.id);
                            toast.success("Category deleted.");
                          }}
                          data-testid={`confirm-delete-category-${cat.id}`}
                        >
                          Delete Category
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardHeader>

              <CardContent className="p-5 flex-1 flex flex-col justify-between">
                {cat.questions.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-4 text-center">No questions added yet — click below to add your first question.</p>
                ) : (
                  <Accordion type="single" collapsible className="w-full space-y-1.5">
                    {cat.questions.map((q, idx) => (
                      <AccordionItem key={q.id} value={q.id} className="border border-slate-200/80 rounded-xl px-3 py-0.5 bg-slate-50/50">
                        <AccordionTrigger className="text-xs font-semibold text-slate-800 text-left hover:no-underline py-2.5">
                          <span className="flex-1 pr-2">
                            {idx + 1}. {q.question}
                          </span>
                        </AccordionTrigger>
                        <AccordionContent className="pt-1 pb-2.5">
                          <div className="flex items-center justify-between gap-2 border-t border-slate-200/60 pt-2 mt-1">
                            <div className="text-xs text-slate-600">
                              <span className={`inline-block rounded-md border px-2 py-0.5 text-[10px] font-bold mr-2 ${TYPE_BADGE_STYLE[q.type] || "bg-slate-100 text-slate-700"}`}>
                                {TYPE_LABELS[q.type]}
                              </span>
                              {q.type === "multiple_choice" && (
                                <span className="text-[11px] text-slate-500 font-medium">{q.options.join(" · ")}</span>
                              )}
                            </div>
                            <div className="flex gap-1 shrink-0">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 rounded-lg text-slate-400 hover:text-sky-700"
                                onClick={() =>
                                  setQDialog({
                                    open: true,
                                    categoryId: cat.id,
                                    editingId: q.id,
                                    text: q.question,
                                    type: q.type,
                                    options: q.options.join(", "),
                                  })
                                }
                                aria-label="Edit question"
                                data-testid={`edit-question-button-${q.id}`}
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 rounded-lg text-slate-400 hover:text-rose-600"
                                onClick={() => removeQuestion(cat.id, q.id)}
                                aria-label="Delete question"
                                data-testid={`delete-question-button-${q.id}`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4 gap-1.5 w-full rounded-xl border-slate-200 text-xs font-semibold text-slate-700 hover:bg-sky-50 hover:text-sky-800"
                  onClick={() => setQDialog({ open: true, categoryId: cat.id, editingId: null, text: "", type: "text", options: "" })}
                  data-testid={`add-question-button-${cat.id}`}
                >
                  <Plus className="w-3.5 h-3.5 text-sky-600" /> Add Question to Bank
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Category dialog */}
      <Dialog open={catDialog.open} onOpenChange={(open) => setCatDialog((d) => ({ ...d, open }))}>
        <DialogContent className="max-w-sm rounded-2xl p-6 border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">{catDialog.editingId ? "Rename Category" : "New Assessment Category"}</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">e.g. “Sensory Processing & Motor Development”</DialogDescription>
          </DialogHeader>
          <div className="pt-2">
            <Input
              value={catDialog.name}
              onChange={(e) => setCatDialog((d) => ({ ...d, name: e.target.value }))}
              placeholder="Category name"
              className="rounded-xl border-slate-200 bg-slate-50 focus:bg-white"
              data-testid="category-name-input"
            />
          </div>
          <DialogFooter className="mt-4 gap-2">
            <Button variant="outline" className="rounded-xl border-slate-200" onClick={() => setCatDialog({ open: false, editingId: null, name: "" })}>Cancel</Button>
            <Button className="bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-xl" onClick={saveCategory} data-testid="save-category-button">
              Save Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Question dialog */}
      <Dialog open={qDialog.open} onOpenChange={(open) => setQDialog((d) => ({ ...d, open }))}>
        <DialogContent className="max-w-md rounded-2xl p-6 border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">{qDialog.editingId ? "Edit Question" : "Add Assessment Question"}</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">This question will be presented to parents on the public assessment form.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3.5 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Question Prompt</Label>
              <Textarea
                rows={2}
                value={qDialog.text}
                onChange={(e) => setQDialog((d) => ({ ...d, text: e.target.value }))}
                placeholder="e.g. Does your child react strongly to unexpected sounds or textures?"
                className="rounded-xl border-slate-200 bg-slate-50 focus:bg-white"
                data-testid="question-text-input"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Response Type</Label>
              <Select value={qDialog.type} onValueChange={(v) => setQDialog((d) => ({ ...d, type: v }))}>
                <SelectTrigger className="rounded-xl border-slate-200 bg-slate-50 focus:bg-white" data-testid="question-type-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200">
                  <SelectItem value="text">Free Text Input</SelectItem>
                  <SelectItem value="yes_no">Yes / No Toggle</SelectItem>
                  <SelectItem value="multiple_choice">Multiple Choice (Custom Options)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {qDialog.type === "multiple_choice" && (
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Choice Options (comma-separated)</Label>
                <Input
                  value={qDialog.options}
                  onChange={(e) => setQDialog((d) => ({ ...d, options: e.target.value }))}
                  placeholder="Never, Sometimes, Often, Always"
                  className="rounded-xl border-slate-200 bg-slate-50 focus:bg-white"
                  data-testid="question-options-input"
                />
              </div>
            )}
          </div>
          <DialogFooter className="mt-5 gap-2">
            <Button variant="outline" className="rounded-xl border-slate-200" onClick={() => setQDialog({ open: false, categoryId: null, editingId: null, text: "", type: "text", options: "" })}>
              Cancel
            </Button>
            <Button className="bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-xl" onClick={saveQuestion} data-testid="save-question-button">
              Save Question
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

