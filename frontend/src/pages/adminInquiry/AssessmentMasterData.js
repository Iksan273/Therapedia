import React, { useState } from "react";
import { toast } from "sonner";
import { ClipboardList, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <div className="space-y-5" data-testid="assessment-master-page">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Assessment Master Data</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">Manage assessment categories and their question banks.</p>
        </div>
        <Button
          className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] gap-2"
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {categories.map((cat) => (
            <Card key={cat.id} className="rounded-xl border-[var(--color-border)] shadow-sm" data-testid={`category-card-${cat.id}`}>
              <CardHeader className="pb-2 flex flex-row items-start justify-between space-y-0">
                <div>
                  <CardTitle className="text-base">{cat.categoryName}</CardTitle>
                  <p className="text-xs text-[var(--color-text-muted)] mt-1">{cat.questions.length} questions</p>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setCatDialog({ open: true, editingId: cat.id, name: cat.categoryName })}
                    aria-label="Rename category"
                    data-testid={`edit-category-button-${cat.id}`}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="icon" variant="ghost" aria-label="Delete category" data-testid={`delete-category-button-${cat.id}`}>
                        <Trash2 className="w-4 h-4 text-[var(--color-danger)]" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete “{cat.categoryName}”?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This removes the category and its {cat.questions.length} questions. Clients already linked keep their answers.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-[var(--color-danger)] hover:bg-red-600"
                          onClick={() => {
                            deleteCategory(cat.id);
                            toast.success("Category deleted.");
                          }}
                          data-testid={`confirm-delete-category-${cat.id}`}
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardHeader>
              <CardContent>
                {cat.questions.length === 0 ? (
                  <p className="text-xs text-[var(--color-text-muted)] italic py-2">No questions yet — add the first one below.</p>
                ) : (
                  <Accordion type="single" collapsible className="w-full">
                    {cat.questions.map((q, idx) => (
                      <AccordionItem key={q.id} value={q.id}>
                        <AccordionTrigger className="text-sm text-left hover:no-underline py-2.5">
                          <span className="flex-1 pr-2">
                            {idx + 1}. {q.question}
                          </span>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-xs text-[var(--color-text-muted)]">
                              <span className="inline-block rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] px-2 py-0.5 mr-2">
                                {TYPE_LABELS[q.type]}
                              </span>
                              {q.type === "multiple_choice" && q.options.join(" · ")}
                            </div>
                            <div className="flex gap-1 shrink-0">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
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
                                className="h-7 w-7"
                                onClick={() => removeQuestion(cat.id, q.id)}
                                aria-label="Delete question"
                                data-testid={`delete-question-button-${q.id}`}
                              >
                                <Trash2 className="w-3.5 h-3.5 text-[var(--color-danger)]" />
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
                  className="mt-3 gap-1.5"
                  onClick={() => setQDialog({ open: true, categoryId: cat.id, editingId: null, text: "", type: "text", options: "" })}
                  data-testid={`add-question-button-${cat.id}`}
                >
                  <Plus className="w-3.5 h-3.5" /> Add Question
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Category dialog */}
      <Dialog open={catDialog.open} onOpenChange={(open) => setCatDialog((d) => ({ ...d, open }))}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{catDialog.editingId ? "Rename Category" : "New Category"}</DialogTitle>
            <DialogDescription>e.g. “Feeding & Oral Motor Assessment”</DialogDescription>
          </DialogHeader>
          <Input
            value={catDialog.name}
            onChange={(e) => setCatDialog((d) => ({ ...d, name: e.target.value }))}
            placeholder="Category name"
            data-testid="category-name-input"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCatDialog({ open: false, editingId: null, name: "" })}>Cancel</Button>
            <Button className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)]" onClick={saveCategory} data-testid="save-category-button">
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Question dialog */}
      <Dialog open={qDialog.open} onOpenChange={(open) => setQDialog((d) => ({ ...d, open }))}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{qDialog.editingId ? "Edit Question" : "Add Question"}</DialogTitle>
            <DialogDescription>Questions appear on the parent-facing assessment form.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Question</Label>
              <Textarea
                rows={2}
                value={qDialog.text}
                onChange={(e) => setQDialog((d) => ({ ...d, text: e.target.value }))}
                placeholder="e.g. Does your child..."
                data-testid="question-text-input"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Answer Type</Label>
              <Select value={qDialog.type} onValueChange={(v) => setQDialog((d) => ({ ...d, type: v }))}>
                <SelectTrigger data-testid="question-type-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Free text</SelectItem>
                  <SelectItem value="yes_no">Yes / No</SelectItem>
                  <SelectItem value="multiple_choice">Multiple choice</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {qDialog.type === "multiple_choice" && (
              <div className="space-y-1.5">
                <Label>Options (comma separated)</Label>
                <Input
                  value={qDialog.options}
                  onChange={(e) => setQDialog((d) => ({ ...d, options: e.target.value }))}
                  placeholder="Never, Sometimes, Often, Always"
                  data-testid="question-options-input"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQDialog({ open: false, categoryId: null, editingId: null, text: "", type: "text", options: "" })}>
              Cancel
            </Button>
            <Button className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)]" onClick={saveQuestion} data-testid="save-question-button">
              Save Question
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
