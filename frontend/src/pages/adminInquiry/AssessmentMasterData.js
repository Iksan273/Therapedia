import React, { useState } from "react";
import { toast } from "sonner";
import {
  ClipboardList,
  Pencil,
  Plus,
  Trash2,
  HelpCircle,
  Sparkles,
  Layers,
  ListChecks,
  KeyRound,
  School,
  FileSpreadsheet,
  CheckCircle2,
  Copy,
  ExternalLink,
  MessageSquare,
  Info,
  Sliders,
  CheckSquare,
  List,
  AlignLeft,
  Hash
} from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { useAssessments } from "@/context/AssessmentsContext";
import { useClients } from "@/context/ClientsContext";
import { uid, genCode } from "@/lib/appUtils";

const QUESTION_TYPES = [
  {
    value: "scale_0_5",
    label: "Skala Skor 0-5 (Winnie Dunn)",
    shortLabel: "Skala 0-5",
    badge: "bg-emerald-50 text-emerald-800 border-emerald-200 font-bold",
    desc: "Skala baku klinis (5: Hampir Selalu s/d 0: Tidak Berlaku)",
  },
  {
    value: "range",
    label: "Range Angka Kustom (misal 1-5, 1-10)",
    shortLabel: "Range Kustom",
    badge: "bg-cyan-50 text-cyan-800 border-cyan-200 font-bold",
    desc: "Rentang angka dengan label nilai minimum dan maksimum",
  },
  {
    value: "multiple_choice",
    label: "Pilihan Ganda (Single Choice)",
    shortLabel: "Pilihan Ganda",
    badge: "bg-purple-50 text-purple-800 border-purple-200 font-bold",
    desc: "Memilih tepat satu dari opsi jawaban yang ditentukan",
  },
  {
    value: "checkbox_multi",
    label: "Pilihan Jamak (Multi-Centang)",
    shortLabel: "Multi-Centang",
    badge: "bg-indigo-50 text-indigo-800 border-indigo-200 font-bold",
    desc: "Dapat mencentang satu atau lebih pilihan opsi",
  },
  {
    value: "free_text",
    label: "Teks Bebas / Esai Deskriptif",
    shortLabel: "Teks Bebas",
    badge: "bg-sky-50 text-sky-800 border-sky-200 font-bold",
    desc: "Uraian teks observasi kualitatif terapis / orang tua",
  },
  {
    value: "yes_no",
    label: "Ya / Tidak (Biner)",
    shortLabel: "Ya / Tidak",
    badge: "bg-amber-50 text-amber-800 border-amber-200 font-bold",
    desc: "Pilihan biner langsung Ya atau Tidak",
  },
];

const getQuestionTypeInfo = (type) => {
  const normalized =
    type === "text"
      ? "free_text"
      : type === "multiple_choice"
      ? "multiple_choice"
      : type === "yes_no"
      ? "yes_no"
      : type === "range"
      ? "range"
      : type === "checkbox_multi"
      ? "checkbox_multi"
      : "scale_0_5";
  return QUESTION_TYPES.find((t) => t.value === normalized) || QUESTION_TYPES[0];
};

const QUADRANT_CONFIG = {
  AV: {
    label: "AV",
    title: "Avoiding",
    badge: "bg-blue-100 text-blue-900 border-blue-300 font-black",
    pill: "bg-blue-50 text-blue-800 border-blue-200",
    desc: "Sensation Avoiding (Penghindar Sensori)",
  },
  SN: {
    label: "SN",
    title: "Sensitivity",
    badge: "bg-lime-100 text-lime-900 border-lime-300 font-black",
    pill: "bg-lime-50 text-lime-800 border-lime-200",
    desc: "Sensory Sensitivity (Sensitivitas Tinggi)",
  },
  RG: {
    label: "RG",
    title: "Registration",
    badge: "bg-pink-100 text-pink-900 border-pink-300 font-black",
    pill: "bg-pink-50 text-pink-800 border-pink-200",
    desc: "Low Registration (Pendaftaran Rendah)",
  },
  SK: {
    label: "SK",
    title: "Seeking",
    badge: "bg-amber-100 text-amber-900 border-amber-300 font-black",
    pill: "bg-amber-50 text-amber-800 border-amber-200",
    desc: "Sensory Seeking (Pencari Sensori)",
  },
};

const getQuadrantCounts = (cat) => {
  const counts = { AV: 0, SN: 0, RG: 0, SK: 0 };
  if (cat.sections && cat.sections.length > 0) {
    cat.sections.forEach((sec) => {
      (sec.questions || []).forEach((q) => {
        const quad = q.quadrant || "SN";
        if (counts[quad] !== undefined) counts[quad]++;
        else counts.SN++;
      });
    });
  } else if (cat.questions) {
    cat.questions.forEach((q) => {
      const quad = q.quadrant || "SN";
      if (counts[quad] !== undefined) counts[quad]++;
      else counts.SN++;
    });
  }
  return counts;
};

export default function AssessmentMasterData() {
  const { categories, addCategory, updateCategory, deleteCategory } = useAssessments();
  const { clients, updateClient } = useClients();

  const [catDialog, setCatDialog] = useState({ open: false, editingId: null, name: "", domain: "" });
  const [qDialog, setQDialog] = useState({
    open: false,
    categoryId: null,
    sectionId: null,
    editingId: null,
    text: "",
    quadrant: "AV",
    type: "scale_0_5",
    options: ["Mandiri Penuh", "Mampu dengan Bantuan Minimal", "Membutuhkan Bantuan Bertahap", "Sangat Kesulitan / Menolak"],
    scaleMin: 1,
    scaleMax: 5,
    minLabel: "Sangat Rendah / Jarang",
    maxLabel: "Sangat Tinggi / Sering",
    newOptionInput: "",
  });

  // Domain / Section Management Modal
  const [secDialog, setSecDialog] = useState({
    open: false,
    categoryId: null,
    editingSectionId: null,
    title: "",
    leadText: "",
  });

  // Open Add Question with defaults
  const openAddQuestion = (catId, secId = null) => {
    setQDialog({
      open: true,
      categoryId: catId,
      sectionId: secId,
      editingId: null,
      text: "",
      quadrant: "SN",
      type: "scale_0_5",
      options: ["Mandiri Penuh", "Mampu dengan Bantuan Minimal", "Membutuhkan Bantuan Bertahap", "Sangat Kesulitan / Menolak"],
      scaleMin: 1,
      scaleMax: 5,
      minLabel: "Sangat Rendah / Jarang",
      maxLabel: "Sangat Tinggi / Sering",
      newOptionInput: "",
    });
  };

  // Open Edit Question pre-populated with saved data
  const openEditQuestion = (catId, secId, q) => {
    const rawType = q.type || "scale_0_5";
    const normalizedType =
      rawType === "text"
        ? "free_text"
        : rawType === "multiple_choice"
        ? "multiple_choice"
        : rawType === "yes_no"
        ? "yes_no"
        : rawType === "range"
        ? "range"
        : rawType === "checkbox_multi"
        ? "checkbox_multi"
        : "scale_0_5";

    let parsedOpts = [];
    if (Array.isArray(q.options) && q.options.length > 0) {
      parsedOpts = [...q.options];
    } else if (typeof q.options === "string" && q.options.trim()) {
      parsedOpts = q.options.split(",").map((o) => o.trim()).filter(Boolean);
    } else {
      parsedOpts = ["Mandiri Penuh", "Mampu dengan Bantuan Minimal", "Membutuhkan Bantuan Bertahap", "Sangat Kesulitan / Menolak"];
    }

    setQDialog({
      open: true,
      categoryId: catId,
      sectionId: secId,
      editingId: q.id,
      text: q.question || "",
      quadrant: q.quadrant || "SN",
      type: normalizedType,
      options: parsedOpts,
      scaleMin: q.scaleMin !== undefined ? q.scaleMin : (normalizedType === "range" ? 1 : 0),
      scaleMax: q.scaleMax !== undefined ? q.scaleMax : 5,
      minLabel: q.minLabel || (normalizedType === "range" ? "Sangat Rendah / Jarang" : "Tidak Berlaku"),
      maxLabel: q.maxLabel || (normalizedType === "range" ? "Sangat Tinggi / Sering" : "Hampir Selalu"),
      newOptionInput: "",
    });
  };

  const addOptionToDialog = () => {
    const opt = (qDialog.newOptionInput || "").trim();
    if (!opt) {
      toast.error("Teks pilihan opsi tidak boleh kosong.");
      return;
    }
    setQDialog((prev) => ({
      ...prev,
      options: [...prev.options, opt],
      newOptionInput: "",
    }));
  };

  const removeOptionFromDialog = (index) => {
    setQDialog((prev) => ({
      ...prev,
      options: prev.options.filter((_, idx) => idx !== index),
    }));
  };

  const updateOptionText = (index, value) => {
    setQDialog((prev) => {
      const copy = [...prev.options];
      copy[index] = value;
      return { ...prev, options: copy };
    });
  };

  const applyOptionPreset = (presetKey) => {
    if (presetKey === "independence") {
      setQDialog((prev) => ({
        ...prev,
        options: ["Mandiri Penuh", "Mampu dengan Bantuan Minimal", "Membutuhkan Bantuan Bertahap", "Sangat Kesulitan / Menolak"],
      }));
      toast.success("Preset Tingkat Kemandirian diterapkan.");
    } else if (presetKey === "frequency") {
      setQDialog((prev) => ({
        ...prev,
        options: ["Selalu (Setiap Saat)", "Sering (Sebagian Besar Waktu)", "Kadang-Kadang", "Jarang / Hampir Tidak Pernah"],
      }));
      toast.success("Preset Frekuensi Perilaku diterapkan.");
    } else if (presetKey === "intensity") {
      setQDialog((prev) => ({
        ...prev,
        options: ["Sangat Intens / Mengganggu Aktivitas", "Sedang / Dapat Diarahkan Kembali", "Ringan / Dapat Beradaptasi Sendiri"],
      }));
      toast.success("Preset Derajat Keparahan diterapkan.");
    }
  };

  // Generate Questionnaire Code Modal
  const [genDialog, setGenDialog] = useState({
    open: false,
    selectedClientId: "",
    selectedCategoryId: "",
    generatedCode: "",
  });

  const openGenModal = (preferredCatId = "") => {
    const code = genCode("ASM");
    setGenDialog({
      open: true,
      selectedClientId: clients[0]?.id || "",
      selectedCategoryId: preferredCatId || categories[0]?.id || "cat-001",
      generatedCode: code,
    });
  };

  const handleConfirmGenerateCode = () => {
    if (!genDialog.selectedClientId) {
      toast.error("Pilih klien tujuan terlebih dahulu.");
      return;
    }
    const targetClient = clients.find((c) => c.id === genDialog.selectedClientId);
    const targetCat = categories.find((c) => c.id === genDialog.selectedCategoryId);

    if (!targetClient || !targetCat) {
      toast.error("Data klien atau kategori tidak valid.");
      return;
    }

    const newCodeEntry = {
      code: genDialog.generatedCode,
      categoryId: targetCat.id,
      name: targetCat.categoryName,
      issuedAt: new Date().toISOString(),
    };

    const existingCodes = targetClient.assessmentCodes || [];
    const updatedCodes = [...existingCodes, newCodeEntry];

    updateClient(targetClient.id, {
      assessmentCodes: updatedCodes,
      status: targetClient.status === "inquiry" ? "service_selected" : targetClient.status,
    });

    toast.success(`Kode kuesioner ${genDialog.generatedCode} berhasil diterbitkan untuk ${targetClient.clientName}!`);
    setGenDialog((prev) => ({ ...prev, open: false }));
  };

  const saveCategory = () => {
    const name = catDialog.name.trim();
    if (!name) {
      toast.error("Nama kategori asesmen wajib diisi.");
      return;
    }
    if (catDialog.editingId) {
      updateCategory(catDialog.editingId, { categoryName: name, domain: catDialog.domain });
      toast.success("Kategori asesmen diperbarui.");
    } else {
      addCategory({
        id: uid(),
        categoryName: name,
        domain: catDialog.domain || "Clinical Assessment",
        questions: [],
      });
      toast.success("Kategori asesmen baru berhasil dibuat.");
    }
    setCatDialog({ open: false, editingId: null, name: "", domain: "" });
  };

  const saveQuestion = () => {
    const text = qDialog.text.trim();
    if (!text) {
      toast.error("Teks pertanyaan tidak boleh kosong.");
      return;
    }
    const category = categories.find((c) => c.id === qDialog.categoryId);
    if (!category) return;

    const isOptionBased = qDialog.type === "multiple_choice" || qDialog.type === "checkbox_multi";
    const cleanOptions = (qDialog.options || []).map((o) => o.trim()).filter(Boolean);
    if (isOptionBased && cleanOptions.length === 0) {
      toast.error("Mohon sediakan minimal 1 pilihan opsi jawaban.");
      return;
    }

    const payload = {
      question: text,
      quadrant: qDialog.quadrant || "SN",
      type: qDialog.type || "scale_0_5",
      options: isOptionBased ? cleanOptions : [],
      scaleMin: qDialog.type === "range" ? (parseInt(qDialog.scaleMin, 10) || 1) : 0,
      scaleMax: qDialog.type === "range" ? (parseInt(qDialog.scaleMax, 10) || 5) : 5,
      minLabel: qDialog.type === "range" ? (qDialog.minLabel.trim() || "Min") : "Tidak Berlaku",
      maxLabel: qDialog.type === "range" ? (qDialog.maxLabel.trim() || "Max") : "Hampir Selalu",
    };

    if (category.sections && category.sections.length > 0) {
      // Category uses structured sections
      const targetSecId = qDialog.sectionId || category.sections[0].sectionId;
      const updatedSections = category.sections.map((sec) => {
        if (sec.sectionId === targetSecId) {
          const questions = sec.questions || [];
          if (qDialog.editingId) {
            return {
              ...sec,
              questions: questions.map((q) =>
                q.id === qDialog.editingId
                  ? {
                      ...q,
                      ...payload,
                      itemNo: q.itemNo || 1,
                    }
                  : q
              ),
            };
          } else {
            return {
              ...sec,
              questions: [
                ...questions,
                {
                  id: uid(),
                  itemNo: (questions.length || 0) + 1,
                  ...payload,
                },
              ],
            };
          }
        }
        return sec;
      });
      updateCategory(category.id, { sections: updatedSections });
      toast.success(qDialog.editingId ? "Pertanyaan berhasil diperbarui." : "Pertanyaan baru ditambahkan ke seksi.");
    } else {
      // Flat questions bank
      let questions = category.questions || [];
      if (qDialog.editingId) {
        questions = questions.map((q) =>
          q.id === qDialog.editingId
            ? {
                ...q,
                ...payload,
              }
            : q
        );
        toast.success("Pertanyaan diperbarui.");
      } else {
        questions = [
          ...questions,
          {
            id: uid(),
            ...payload,
          },
        ];
        toast.success("Pertanyaan ditambahkan.");
      }
      updateCategory(category.id, { questions });
    }

    setQDialog({
      open: false,
      categoryId: null,
      sectionId: null,
      editingId: null,
      text: "",
      quadrant: "AV",
      type: "scale_0_5",
      options: [],
      scaleMin: 1,
      scaleMax: 5,
      minLabel: "",
      maxLabel: "",
      newOptionInput: "",
    });
  };

  const removeQuestion = (categoryId, questionId) => {
    const category = categories.find((c) => c.id === categoryId);
    if (!category) return;

    if (category.sections && category.sections.length > 0) {
      const updatedSections = category.sections.map((sec) => ({
        ...sec,
        questions: (sec.questions || []).filter((q) => q.id !== questionId),
      }));
      updateCategory(categoryId, { sections: updatedSections });
      toast.success("Pertanyaan seksi klinis dihapus.");
    } else {
      updateCategory(categoryId, {
        questions: (category.questions || []).filter((q) => q.id !== questionId),
      });
      toast.success("Pertanyaan dihapus.");
    }
  };

  const saveSection = () => {
    const title = secDialog.title.trim();
    if (!title) {
      toast.error("Nama domain / seksi klinis wajib diisi.");
      return;
    }
    const category = categories.find((c) => c.id === secDialog.categoryId);
    if (!category) return;

    let sections = category.sections || [];
    if (secDialog.editingSectionId) {
      sections = sections.map((s) =>
        s.sectionId === secDialog.editingSectionId
          ? { ...s, title, leadText: secDialog.leadText.trim() || "Anakku ..." }
          : s
      );
      toast.success(`Domain "${title}" diperbarui.`);
    } else {
      sections = [
        ...sections,
        {
          sectionId: `sec-${uid()}`,
          title,
          leadText: secDialog.leadText.trim() || "Anakku ...",
          questions: [],
        },
      ];
      toast.success(`Domain "${title}" berhasil ditambahkan.`);
    }

    updateCategory(category.id, { sections });
    setSecDialog({ open: false, categoryId: null, editingSectionId: null, title: "", leadText: "" });
  };

  const removeSection = (categoryId, sectionId, sectionTitle) => {
    if (!window.confirm(`Hapus domain "${sectionTitle}" beserta seluruh butir soal di dalamnya?`)) return;
    const category = categories.find((c) => c.id === categoryId);
    if (!category || !category.sections) return;

    const updatedSections = category.sections.filter((s) => s.sectionId !== sectionId);
    updateCategory(category.id, { sections: updatedSections });
    toast.success(`Domain "${sectionTitle}" telah dihapus.`);
  };

  return (
    <div className="space-y-6" data-testid="assessment-master-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100/80 text-emerald-800 text-xs font-semibold mb-2">
            <Layers className="w-3.5 h-3.5 text-emerald-600" />
            Clinical Questionnaire Banks & Protocols
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Assessment Master Data
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Kelola template baku asesmen klinis (Child Sensory Profile 2 & School Companion Profile) dan terbitkan kode kuesioner multi-asesmen untuk orang tua / sekolah.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            onClick={() => openGenModal()}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl gap-2 shadow-xs"
          >
            <KeyRound className="w-4 h-4" /> Terbitkan Kode Kuesioner (Multi-Code)
          </Button>

          <Button
            variant="outline"
            className="border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold rounded-xl gap-2 shadow-2xs"
            onClick={() => setCatDialog({ open: true, editingId: null, name: "", domain: "" })}
            data-testid="new-category-button"
          >
            <Plus className="w-4 h-4 text-slate-500" /> Tambah Kategori
          </Button>
        </div>
      </div>

      {/* Kuadran Sensory Framework Reference Banner */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="text-xs font-bold text-slate-900">
              Pedoman 4 Kuadran Sensorik Klinis (Winnie Dunn Sensory Profile 2 Framework):
            </span>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">
            Tersinkronisasi dengan Lembar Klinis Asesor & Skoring Jawaban Ortu
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1">
          <div className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-200/80 flex items-start gap-2.5">
            <span className="px-2 py-0.5 rounded text-[11px] font-black bg-blue-600 text-white shrink-0">
              AV
            </span>
            <div className="text-[11px]">
              <p className="font-bold text-blue-950">Sensation Avoiding</p>
              <p className="text-blue-800/80 text-[10px] leading-tight">
                Penghindar Sensori: Aktif menjauhi stimulasi yang dirasa berlebihan
              </p>
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-lime-50/70 border border-lime-200/80 flex items-start gap-2.5">
            <span className="px-2 py-0.5 rounded text-[11px] font-black bg-lime-600 text-white shrink-0">
              SN
            </span>
            <div className="text-[11px]">
              <p className="font-bold text-lime-950">Sensory Sensitivity</p>
              <p className="text-lime-800/80 text-[10px] leading-tight">
                Sensitivitas Sensori: Sangat peka, cepat mendeteksi & terganggu stimulus
              </p>
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-pink-50/70 border border-pink-200/80 flex items-start gap-2.5">
            <span className="px-2 py-0.5 rounded text-[11px] font-black bg-pink-600 text-white shrink-0">
              RG
            </span>
            <div className="text-[11px]">
              <p className="font-bold text-pink-950">Low Registration</p>
              <p className="text-pink-800/80 text-[10px] leading-tight">
                Pendaftaran Rendah: Pasif, memerlukan stimulus lebih intens untuk menyadari
              </p>
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/80 flex items-start gap-2.5">
            <span className="px-2 py-0.5 rounded text-[11px] font-black bg-amber-600 text-white shrink-0">
              SK
            </span>
            <div className="text-[11px]">
              <p className="font-bold text-amber-950">Sensory Seeking</p>
              <p className="text-amber-800/80 text-[10px] leading-tight">
                Pencari Sensori: Aktif bergerak & mendambakan input sensori ekstra
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Categories Cards */}
      {categories.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Belum ada template kategori asesmen"
          subtitle="Tambahkan kategori asesmen baru untuk mulai menyusun bank soal kuesioner ortu."
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {categories.map((cat) => {
            const hasSections = Boolean(cat.sections && cat.sections.length > 0);
            const totalQuestions = hasSections
              ? cat.sections.reduce((acc, s) => acc + (s.questions?.length || 0), 0)
              : (cat.questions?.length || 0);

            const isSchoolComp = (cat.categoryName || "").toLowerCase().includes("school");
            const isSensory = (cat.categoryName || "").toLowerCase().includes("sensory");
            const quadCounts = getQuadrantCounts(cat);

            return (
              <Card
                key={cat.id}
                className="clinical-card rounded-2xl border-slate-200/90 flex flex-col justify-between shadow-xs overflow-hidden"
                data-testid={`category-card-${cat.id}`}
              >
                <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold shrink-0 border ${
                          isSchoolComp
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : isSensory
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-sky-50 text-sky-700 border-sky-100"
                        }`}
                      >
                        {isSchoolComp ? <School className="w-5 h-5" /> : <ListChecks className="w-5 h-5" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-base font-bold text-slate-900 leading-snug">
                            {cat.categoryName}
                          </CardTitle>
                          {isSchoolComp && (
                            <Badge className="bg-amber-100 text-amber-800 text-[10px] font-bold border border-amber-300">
                              School Profile
                            </Badge>
                          )}
                          {isSensory && (
                            <Badge className="bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-300">
                              Standard OT
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-1 font-medium">
                          {cat.author || cat.domain || "Therapedia Standard"} • {totalQuestions} pertanyaan klinis
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 px-2 text-xs font-bold text-emerald-700 hover:bg-emerald-50 rounded-lg gap-1"
                        onClick={() => openGenModal(cat.id)}
                        title="Generate code for this category"
                      >
                        <KeyRound className="w-3.5 h-3.5" /> Generate
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 rounded-lg hover:bg-slate-100 text-slate-500"
                        onClick={() =>
                          setCatDialog({ open: true, editingId: cat.id, name: cat.categoryName, domain: cat.domain || "" })
                        }
                        aria-label="Rename category"
                        data-testid={`edit-category-button-${cat.id}`}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Kuadran Summary Pills for this Category */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-3 border-t border-slate-200/60 mt-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Distribusi Kuadran:
                    </span>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-blue-100 text-blue-900 border border-blue-300">
                      AV: {quadCounts.AV}
                    </span>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-lime-100 text-lime-900 border border-lime-300">
                      SN: {quadCounts.SN}
                    </span>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-pink-100 text-pink-900 border border-pink-300">
                      RG: {quadCounts.RG}
                    </span>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300">
                      SK: {quadCounts.SK}
                    </span>
                  </div>
                </CardHeader>

                <CardContent className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  {/* Category Content: Sections / Domains with Expandable Questions */}
                  {hasSections ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                            Domain & Seksi Klinis ({cat.sections.length} Seksi):
                          </p>
                          <p className="text-[11px] text-slate-400 font-medium">Klik seksi untuk melihat & kelola butir soal</p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2.5 text-[11px] font-bold text-slate-700 hover:bg-slate-100 rounded-lg gap-1 border-slate-200"
                          onClick={() =>
                            setSecDialog({
                              open: true,
                              categoryId: cat.id,
                              editingSectionId: null,
                              title: "",
                              leadText: isSchoolComp ? "Di dalam kelas, siswa ..." : "Anakku ...",
                            })
                          }
                          title="Tambah domain atau aspek observasi baru"
                        >
                          <Plus className="w-3.5 h-3.5 text-emerald-600" /> Tambah Domain
                        </Button>
                      </div>

                      <Accordion type="single" collapsible className="w-full space-y-2 max-h-72 overflow-y-auto pr-1">
                        {cat.sections.map((sec, sIdx) => {
                          const secQuestions = sec.questions || [];
                          return (
                            <AccordionItem
                              key={sec.sectionId || `sec-${sIdx}`}
                              value={sec.sectionId || `sec-${sIdx}`}
                              className="border border-slate-200/90 rounded-xl bg-slate-50/70 overflow-hidden"
                            >
                              <AccordionTrigger className="px-3.5 py-2.5 text-xs font-bold text-slate-800 hover:no-underline">
                                <div className="flex items-center justify-between w-full pr-2">
                                  <div className="text-left">
                                    <p className="font-bold text-slate-900">{sec.title}</p>
                                    <p className="text-[10px] text-slate-500 font-normal">
                                      Lead: "{sec.leadText || "Anakku ..."}" • {secQuestions.length} butir
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0 ml-2" onClick={(e) => e.stopPropagation()}>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-6 w-6 rounded-md text-slate-400 hover:text-slate-700"
                                      onClick={() =>
                                        setSecDialog({
                                          open: true,
                                          categoryId: cat.id,
                                          editingSectionId: sec.sectionId,
                                          title: sec.title,
                                          leadText: sec.leadText || "",
                                        })
                                      }
                                      title="Edit nama domain & lead text"
                                    >
                                      <Pencil className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-6 w-6 rounded-md text-slate-400 hover:text-rose-600"
                                      onClick={() => removeSection(cat.id, sec.sectionId, sec.title)}
                                      title="Hapus domain ini"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </div>
                              </AccordionTrigger>

                              <AccordionContent className="px-3.5 pb-3 pt-1 border-t border-slate-200/60 bg-white space-y-2">
                                <div className="flex items-center justify-between pt-1 pb-1">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase">
                                    Daftar Pertanyaan & Kuadran ({secQuestions.length} Soal):
                                  </span>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 text-[11px] font-bold text-emerald-700 hover:bg-emerald-50 rounded-md px-2 gap-1"
                                    onClick={() => openAddQuestion(cat.id, sec.sectionId)}
                                  >
                                    <Plus className="w-3 h-3" /> Tambah Soal
                                  </Button>
                                </div>

                                {secQuestions.length === 0 ? (
                                  <p className="text-xs text-slate-400 italic py-2">
                                    Belum ada pertanyaan pada seksi ini. Klik "+ Tambah Soal" di atas.
                                  </p>
                                ) : (
                                  <div className="space-y-2">
                                    {secQuestions.map((q, qIdx) => {
                                      const quad = q.quadrant || "SN";
                                      const qStyle = QUADRANT_CONFIG[quad] || QUADRANT_CONFIG.SN;
                                      const typeInfo = getQuestionTypeInfo(q.type);
                                      return (
                                        <div
                                          key={q.id || `q-${qIdx}`}
                                          className="p-2.5 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-slate-300 transition-all space-y-1.5 text-xs shadow-2xs"
                                        >
                                          <div className="flex items-start justify-between gap-2">
                                            <div className="flex items-start gap-1.5 flex-1 min-w-0">
                                              <span
                                                className={`px-1.5 py-0.5 rounded text-[10px] border shrink-0 ${qStyle.badge}`}
                                                title={qStyle.desc}
                                              >
                                                {quad}
                                              </span>
                                              <span
                                                className={`px-2 py-0.5 rounded-md text-[10px] border shrink-0 ${typeInfo.badge}`}
                                                title={typeInfo.desc}
                                              >
                                                {typeInfo.shortLabel}
                                              </span>
                                              <span className="font-semibold text-slate-800 leading-snug">
                                                {q.itemNo ? `${q.itemNo}. ` : `${qIdx + 1}. `}{q.question}
                                              </span>
                                            </div>

                                            <div className="flex items-center gap-1 shrink-0 ml-1">
                                              <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-6 w-6 rounded-md text-slate-400 hover:text-sky-700 hover:bg-sky-50"
                                                onClick={() => openEditQuestion(cat.id, sec.sectionId, q)}
                                                title="Edit pertanyaan & opsi jawaban"
                                              >
                                                <Pencil className="w-3 h-3" />
                                              </Button>
                                              <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-6 w-6 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                                                onClick={() => removeQuestion(cat.id, q.id)}
                                                title="Hapus pertanyaan"
                                              >
                                                <Trash2 className="w-3 h-3" />
                                              </Button>
                                            </div>
                                          </div>

                                          {/* Options preview for multiple choice / checkbox */}
                                          {(q.type === "multiple_choice" || q.type === "checkbox_multi") && (q.options || []).length > 0 && (
                                            <div className="pl-6 flex items-center gap-1.5 flex-wrap pt-0.5">
                                              <span className="text-[10px] font-bold text-slate-400">Opsi ({q.options.length}):</span>
                                              {q.options.map((opt, oIdx) => (
                                                <span key={oIdx} className="px-2 py-0.5 rounded-md bg-white text-slate-700 border border-slate-200 text-[10px] font-medium">
                                                  {opt}
                                                </span>
                                              ))}
                                            </div>
                                          )}

                                          {/* Range preview */}
                                          {q.type === "range" && (
                                            <div className="pl-6 flex items-center gap-1.5 pt-0.5 text-[10px] text-cyan-900 font-medium">
                                              <span className="font-bold text-slate-400">Range:</span>
                                              <span>{q.scaleMin ?? 1} ({q.minLabel || "Min"}) s/d {q.scaleMax ?? 5} ({q.maxLabel || "Max"})</span>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </AccordionContent>
                            </AccordionItem>
                          );
                        })}
                      </Accordion>
                    </div>
                  ) : (cat.questions || []).length === 0 ? (
                    <div className="p-6 rounded-xl border border-dashed border-slate-200 text-center space-y-2">
                      <p className="text-xs text-slate-400 italic">
                        Belum ada pertanyaan pada bank soal ini — klik tombol di bawah untuk menambah pertanyaan.
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-xl text-xs font-bold gap-1 text-emerald-700"
                        onClick={() => openAddQuestion(cat.id, null)}
                      >
                        <Plus className="w-3.5 h-3.5" /> Tambah Pertanyaan Pertama
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                      {(cat.questions || []).map((q, idx) => {
                        const quad = q.quadrant || "SN";
                        const qStyle = QUADRANT_CONFIG[quad] || QUADRANT_CONFIG.SN;
                        const typeInfo = getQuestionTypeInfo(q.type);
                        return (
                          <div
                            key={q.id}
                            className="p-2.5 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-white transition-all space-y-1.5 text-xs shadow-2xs"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-start gap-1.5 flex-1 min-w-0">
                                <span className={`px-1.5 py-0.5 rounded text-[10px] border shrink-0 ${qStyle.badge}`}>
                                  {quad}
                                </span>
                                <span className={`px-2 py-0.5 rounded-md text-[10px] border shrink-0 ${typeInfo.badge}`}>
                                  {typeInfo.shortLabel}
                                </span>
                                <span className="font-semibold text-slate-800 leading-snug">
                                  {idx + 1}. {q.question}
                                </span>
                              </div>

                              <div className="flex items-center gap-1 shrink-0 ml-1">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-6 w-6 rounded-md text-slate-400 hover:text-sky-700 hover:bg-sky-50"
                                  onClick={() => openEditQuestion(cat.id, null, q)}
                                  title="Edit pertanyaan"
                                >
                                  <Pencil className="w-3 h-3" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-6 w-6 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                                  onClick={() => removeQuestion(cat.id, q.id)}
                                  title="Hapus pertanyaan"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Card footer action */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-semibold gap-1.5"
                      onClick={() => openAddQuestion(cat.id, cat.sections?.[0]?.sectionId || null)}
                    >
                      <Plus className="w-3.5 h-3.5" /> Tambah Pertanyaan
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs font-bold text-emerald-700 hover:bg-emerald-50 rounded-xl gap-1.5"
                      onClick={() => openGenModal(cat.id)}
                    >
                      <KeyRound className="w-3.5 h-3.5" /> Terbitkan Kode
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* MODAL: TERBITKAN KODE KUESIONER (MULTI-QUESTIONNAIRE GENERATOR) */}
      <Dialog open={genDialog.open} onOpenChange={(open) => setGenDialog((prev) => ({ ...prev, open }))}>
        <DialogContent className="max-w-md rounded-2xl p-6 border-slate-200">
          <DialogHeader>
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center justify-center mb-2">
              <KeyRound className="w-5 h-5 stroke-[2.2]" />
            </div>
            <DialogTitle className="text-lg font-bold text-slate-900">
              Terbitkan Kode Kuesioner Asesmen
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 leading-relaxed">
              Generate kode unik agar orang tua atau pendamping sekolah dapat mengisi kuesioner secara online. Klien dapat memiliki lebih dari 1 kode untuk kuesioner berbeda.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Pilih Klien Tujuan</Label>
              <Select
                value={genDialog.selectedClientId}
                onValueChange={(val) => setGenDialog((prev) => ({ ...prev, selectedClientId: val }))}
              >
                <SelectTrigger className="rounded-xl border-slate-200 text-xs font-semibold">
                  <SelectValue placeholder="Pilih Klien..." />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="text-xs">
                      {c.clientName} ({c.clientAccessCode}) • {c.branchId === "branch-citraland" ? "Citraland" : c.branchId === "branch-sby-barat" ? "Sby Barat" : "Sby Timur"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Pilih Kategori Asesmen</Label>
              <Select
                value={genDialog.selectedCategoryId}
                onValueChange={(val) => setGenDialog((prev) => ({ ...prev, selectedCategoryId: val }))}
              >
                <SelectTrigger className="rounded-xl border-slate-200 text-xs font-semibold">
                  <SelectValue placeholder="Pilih Kategori..." />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id} className="text-xs">
                      {cat.categoryName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Kode Kuesioner Dihasilkan</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={genDialog.generatedCode}
                  onChange={(e) => setGenDialog((prev) => ({ ...prev, generatedCode: e.target.value.toUpperCase() }))}
                  className="rounded-xl border-slate-200 font-mono font-black text-sm text-emerald-800 uppercase tracking-widest bg-emerald-50/50"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl text-xs font-bold shrink-0"
                  onClick={() => setGenDialog((prev) => ({ ...prev, generatedCode: genCode("ASM") }))}
                >
                  Acak Ulang
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-3 gap-2">
            <Button
              variant="outline"
              className="rounded-xl border-slate-200"
              onClick={() => setGenDialog((prev) => ({ ...prev, open: false }))}
            >
              Batal
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl gap-2 shadow-xs"
              onClick={handleConfirmGenerateCode}
            >
              <CheckCircle2 className="w-4 h-4" /> Simpan & Terbitkan Kode
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: TAMBAH / EDIT KATEGORI */}
      <Dialog open={catDialog.open} onOpenChange={(open) => setCatDialog((prev) => ({ ...prev, open }))}>
        <DialogContent className="max-w-md rounded-2xl p-6 border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">
              {catDialog.editingId ? "Edit Kategori Asesmen" : "Kategori Asesmen Baru"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Nama Template Asesmen</Label>
              <Input
                placeholder="misal: School Companion Profile"
                value={catDialog.name}
                onChange={(e) => setCatDialog((prev) => ({ ...prev, name: e.target.value }))}
                className="rounded-xl border-slate-200 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Domain / Sub-Spesialisasi</Label>
              <Input
                placeholder="misal: Classroom Adaptation & Function"
                value={catDialog.domain}
                onChange={(e) => setCatDialog((prev) => ({ ...prev, domain: e.target.value }))}
                className="rounded-xl border-slate-200 text-xs"
              />
            </div>
          </div>
          <DialogFooter className="mt-3">
            <Button variant="outline" className="rounded-xl" onClick={() => setCatDialog({ open: false, editingId: null, name: "", domain: "" })}>
              Batal
            </Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl" onClick={saveCategory}>
              Simpan Kategori
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: ADVANCED QUESTION ENGINE (TAMBAH / EDIT BUTIR SOAL) */}
      <Dialog open={qDialog.open} onOpenChange={(open) => setQDialog((prev) => ({ ...prev, open }))}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl p-6 border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-600" />
              {qDialog.editingId ? "Edit Butir Pertanyaan Klinis" : "Tambah Butir Pertanyaan Klinis Baru"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Konfigurasikan tipe respons (skala baku Winnie Dunn, range kustom 1–5 / 1–10, pilihan ganda, multi-centang, esai), kuadran sensori, serta opsi jawaban.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* ROW 1: TIPE SOAL & KUADRAN */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Tipe Input Jawaban</Label>
                <Select
                  value={qDialog.type}
                  onValueChange={(val) => setQDialog((prev) => ({ ...prev, type: val }))}
                >
                  <SelectTrigger className="rounded-xl border-slate-200 text-xs font-semibold h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200">
                    {QUESTION_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value} className="text-xs">
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Kuadran Sensorik</Label>
                <Select
                  value={qDialog.quadrant}
                  onValueChange={(val) => setQDialog((prev) => ({ ...prev, quadrant: val }))}
                >
                  <SelectTrigger className="rounded-xl border-slate-200 text-xs font-semibold h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200">
                    <SelectItem value="AV" className="text-xs font-bold text-blue-800">
                      🟦 AV - Sensation Avoiding (Penghindar Sensori)
                    </SelectItem>
                    <SelectItem value="SN" className="text-xs font-bold text-lime-800">
                      🟩 SN - Sensory Sensitivity (Sensitivitas Sensori)
                    </SelectItem>
                    <SelectItem value="RG" className="text-xs font-bold text-pink-800">
                      🟪 RG - Low Registration (Pendaftaran Rendah)
                    </SelectItem>
                    <SelectItem value="SK" className="text-xs font-bold text-amber-800">
                      🟨 SK - Sensory Seeking (Pencari Sensori)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* ROW 2: TEKS PERNYATAAN */}
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Teks Pernyataan / Indikator Klinis</Label>
              <Textarea
                placeholder="misal: Menutup telinga untuk melindunginya dari suara-suara bising atau respon berlebih..."
                value={qDialog.text}
                onChange={(e) => setQDialog((prev) => ({ ...prev, text: e.target.value }))}
                className="rounded-xl border-slate-200 text-xs min-h-[85px] leading-relaxed font-medium"
              />
            </div>

            {/* CONDITIONAL ENGINE DETAIL CONFIG */}

            {/* TIPE 1: SKALA 0-5 STANDAR WINNIE DUNN */}
            {qDialog.type === "scale_0_5" && (
              <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/50 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-950">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Format Skala Baku Skor 0–5 (Standar Winnie Dunn Sensory Profile)
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-[11px] text-emerald-900">
                  <div className="p-1.5 rounded-lg bg-white/80 border border-emerald-200/80"><strong>5:</strong> Hampir Selalu (90%+)</div>
                  <div className="p-1.5 rounded-lg bg-white/80 border border-emerald-200/80"><strong>4:</strong> Sering (75%)</div>
                  <div className="p-1.5 rounded-lg bg-white/80 border border-emerald-200/80"><strong>3:</strong> Kadang (50%)</div>
                  <div className="p-1.5 rounded-lg bg-white/80 border border-emerald-200/80"><strong>2:</strong> Jarang (25%)</div>
                  <div className="p-1.5 rounded-lg bg-white/80 border border-emerald-200/80"><strong>1:</strong> Hampir Tdk Pernah (10%)</div>
                  <div className="p-1.5 rounded-lg bg-white/80 border border-emerald-200/80"><strong>0:</strong> Tidak Berlaku</div>
                </div>
              </div>
            )}

            {/* TIPE 2: RANGE ANGKA KUSTOM */}
            {qDialog.type === "range" && (
              <div className="p-3.5 rounded-xl border border-cyan-200 bg-cyan-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-cyan-950 flex items-center gap-1.5">
                    <Sliders className="w-4 h-4 text-cyan-600" />
                    Konfigurasi Rentang Skala (Range Angka)
                  </span>
                  <span className="text-[11px] text-cyan-800 font-medium">Contoh: 1 s/d 5 atau 1 s/d 10</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-slate-700">Nilai Minimum (Min)</Label>
                    <Input
                      type="number"
                      value={qDialog.scaleMin}
                      onChange={(e) => setQDialog((prev) => ({ ...prev, scaleMin: e.target.value }))}
                      className="rounded-xl border-slate-200 bg-white text-xs h-8"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-slate-700">Nilai Maksimum (Max)</Label>
                    <Input
                      type="number"
                      value={qDialog.scaleMax}
                      onChange={(e) => setQDialog((prev) => ({ ...prev, scaleMax: e.target.value }))}
                      className="rounded-xl border-slate-200 bg-white text-xs h-8"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-slate-700">Label Ujung Kiri (Nilai Min)</Label>
                    <Input
                      placeholder="misal: Sangat Rendah / Tidak Mandiri"
                      value={qDialog.minLabel}
                      onChange={(e) => setQDialog((prev) => ({ ...prev, minLabel: e.target.value }))}
                      className="rounded-xl border-slate-200 bg-white text-xs h-8"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-slate-700">Label Ujung Kanan (Nilai Max)</Label>
                    <Input
                      placeholder="misal: Sangat Tinggi / Mandiri Penuh"
                      value={qDialog.maxLabel}
                      onChange={(e) => setQDialog((prev) => ({ ...prev, maxLabel: e.target.value }))}
                      className="rounded-xl border-slate-200 bg-white text-xs h-8"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TIPE 3: PILIHAN GANDA ATAU MULTI-CENTANG */}
            {(qDialog.type === "multiple_choice" || qDialog.type === "checkbox_multi") && (
              <div className="p-3.5 rounded-xl border border-purple-200 bg-purple-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-950">
                    Daftar Pilihan Opsi ({qDialog.options.length} Opsi):
                  </span>
                  {/* Preset Buttons */}
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-6 px-2 text-[10px] font-bold border-purple-200 text-purple-800 hover:bg-purple-100"
                      onClick={() => applyOptionPreset("independence")}
                    >
                      Preset Mandiri
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-6 px-2 text-[10px] font-bold border-purple-200 text-purple-800 hover:bg-purple-100"
                      onClick={() => applyOptionPreset("frequency")}
                    >
                      Preset Frekuensi
                    </Button>
                  </div>
                </div>

                {/* Input Add New Option */}
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Tuliskan teks opsi jawaban baru..."
                    value={qDialog.newOptionInput}
                    onChange={(e) => setQDialog((prev) => ({ ...prev, newOptionInput: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addOptionToDialog();
                      }
                    }}
                    className="rounded-xl border-slate-200 bg-white text-xs h-8 flex-1"
                  />
                  <Button
                    type="button"
                    size="sm"
                    className="h-8 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs"
                    onClick={addOptionToDialog}
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Tambah
                  </Button>
                </div>

                {/* Current Options List */}
                {qDialog.options.length === 0 ? (
                  <p className="text-[11px] text-slate-400 italic py-2 text-center">
                    Belum ada opsi jawaban. Silakan ketik di atas atau pilih tombol preset.
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {qDialog.options.map((opt, oIdx) => (
                      <div
                        key={oIdx}
                        className="p-1.5 px-2.5 rounded-lg border border-purple-200/80 bg-white flex items-center justify-between gap-2 text-xs"
                      >
                        <span className="font-semibold text-purple-900 w-5 shrink-0 text-center">
                          {oIdx + 1}.
                        </span>
                        <Input
                          value={opt}
                          onChange={(e) => updateOptionText(oIdx, e.target.value)}
                          className="h-7 text-xs border-0 focus-visible:ring-1 focus-visible:ring-purple-400 px-1 font-medium text-slate-800"
                        />
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 rounded-md text-slate-400 hover:text-rose-600 shrink-0"
                          onClick={() => removeOptionFromDialog(oIdx)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TIPE 4: TEKS BEBAS */}
            {qDialog.type === "free_text" && (
              <div className="p-3.5 rounded-xl border border-sky-200 bg-sky-50/60 text-xs text-sky-900 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <AlignLeft className="w-4 h-4 text-sky-600" /> Format Esai / Teks Bebas
                </p>
                <p className="text-[11px] text-sky-700 leading-relaxed">
                  Responden akan diberikan kotak teks (textarea) terbuka untuk menuliskan uraian deskriptif atau catatan kejadian spesifik saat observasi.
                </p>
              </div>
            )}

            {/* TIPE 5: YA / TIDAK */}
            {qDialog.type === "yes_no" && (
              <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/60 text-xs text-amber-900 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <CheckSquare className="w-4 h-4 text-amber-600" /> Format Pilihan Biner (Ya / Tidak)
                </p>
                <p className="text-[11px] text-amber-700 leading-relaxed">
                  Responden akan memilih salah satu tombol: <strong>Ya</strong> atau <strong>Tidak</strong>.
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="mt-3 gap-2">
            <Button
              variant="outline"
              className="rounded-xl text-xs font-semibold"
              onClick={() => setQDialog((prev) => ({ ...prev, open: false }))}
            >
              Batal
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs gap-1.5 shadow-xs"
              onClick={saveQuestion}
            >
              <CheckCircle2 className="w-4 h-4" /> Simpan Pertanyaan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: TAMBAH / EDIT DOMAIN & SEKSI KLINIS */}
      <Dialog open={secDialog.open} onOpenChange={(open) => setSecDialog((prev) => ({ ...prev, open }))}>
        <DialogContent className="max-w-md rounded-2xl p-6 border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">
              {secDialog.editingSectionId ? "Edit Domain / Seksi Klinis" : "Tambah Domain / Seksi Klinis Baru"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Domain adalah payung kelompok aspek observasi klinis (misal: Classroom Attention, Peer Socialization, dsb.) yang menaungi butir pernyataan dan subtotal skor mentah.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Nama Judul Domain</Label>
              <Input
                placeholder="misal: Classroom Attention & Task Engagement"
                value={secDialog.title}
                onChange={(e) => setSecDialog((prev) => ({ ...prev, title: e.target.value }))}
                className="rounded-xl border-slate-200 text-xs font-semibold"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Kalimat Pengantar (Lead Text)</Label>
              <Input
                placeholder="misal: Di dalam kelas, siswa ... atau Anakku ..."
                value={secDialog.leadText}
                onChange={(e) => setSecDialog((prev) => ({ ...prev, leadText: e.target.value }))}
                className="rounded-xl border-slate-200 text-xs"
              />
            </div>
          </div>
          <DialogFooter className="mt-3">
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => setSecDialog({ open: false, categoryId: null, editingSectionId: null, title: "", leadText: "" })}
            >
              Batal
            </Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl" onClick={saveSection}>
              Simpan Domain
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
