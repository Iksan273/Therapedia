import React, { useState, useMemo } from "react";
import { toast } from "sonner";
import {
  ClipboardList,
  Pencil,
  Plus,
  Trash2,
  Sparkles,
  Layers,
  ListChecks,
  KeyRound,
  School,
  CheckCircle2,
  Copy,
  Info,
  Sliders,
  CheckSquare,
  AlignLeft,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  Brain,
  MessageSquare,
  Activity,
  UserCheck,
  Award,
  Eye,
  ChevronsUpDown,
  BookOpen
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/common/EmptyState";
import { useAssessments } from "@/context/AssessmentsContext";
import { useClients } from "@/context/ClientsContext";
import { uid, genCode } from "@/lib/appUtils";
import { cn } from "@/lib/utils";

const QUESTION_TYPES = [
  {
    value: "scale_0_5",
    label: "Skala Skor 0-5 (Winnie Dunn)",
    shortLabel: "Skala 0-5",
    badge: "bg-emerald-50 text-emerald-800 border-emerald-300 font-bold",
    desc: "Skala baku klinis (5: Hampir Selalu s/d 0: Tidak Berlaku)",
  },
  {
    value: "range",
    label: "Range Angka Kustom (misal 1-5, 1-10)",
    shortLabel: "Range Kustom",
    badge: "bg-cyan-50 text-cyan-800 border-cyan-300 font-bold",
    desc: "Rentang angka dengan label nilai minimum dan maksimum",
  },
  {
    value: "multiple_choice",
    label: "Pilihan Ganda (Single Choice)",
    shortLabel: "Pilihan Ganda",
    badge: "bg-purple-50 text-purple-800 border-purple-300 font-bold",
    desc: "Memilih tepat satu dari opsi jawaban yang ditentukan",
  },
  {
    value: "checkbox_multi",
    label: "Pilihan Jamak (Multi-Centang)",
    shortLabel: "Multi-Centang",
    badge: "bg-indigo-50 text-indigo-800 border-indigo-300 font-bold",
    desc: "Dapat mencentang satu atau lebih pilihan opsi",
  },
  {
    value: "free_text",
    label: "Teks Bebas / Esai Deskriptif",
    shortLabel: "Teks Bebas",
    badge: "bg-sky-50 text-sky-800 border-sky-300 font-bold",
    desc: "Uraian teks observasi kualitatif terapis / orang tua",
  },
  {
    value: "yes_no",
    label: "Ya / Tidak (Biner)",
    shortLabel: "Ya / Tidak",
    badge: "bg-amber-50 text-amber-800 border-amber-300 font-bold",
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
    cardBg: "bg-blue-50/70 border-blue-200",
    textClass: "text-blue-950",
    desc: "Sensation Avoiding (Penghindar Sensori)",
  },
  SN: {
    label: "SN",
    title: "Sensitivity",
    badge: "bg-lime-100 text-lime-900 border-lime-300 font-black",
    cardBg: "bg-lime-50/70 border-lime-200",
    textClass: "text-lime-950",
    desc: "Sensory Sensitivity (Sensitivitas Tinggi)",
  },
  RG: {
    label: "RG",
    title: "Registration",
    badge: "bg-pink-100 text-pink-900 border-pink-300 font-black",
    cardBg: "bg-pink-50/70 border-pink-200",
    textClass: "text-pink-950",
    desc: "Low Registration (Pendaftaran Rendah)",
  },
  SK: {
    label: "SK",
    title: "Seeking",
    badge: "bg-amber-100 text-amber-900 border-amber-300 font-black",
    cardBg: "bg-amber-50/70 border-amber-200",
    textClass: "text-amber-950",
    desc: "Sensory Seeking (Pencari Sensori)",
  },
};

const getCategoryIcon = (categoryName = "") => {
  const name = categoryName.toLowerCase();
  if (name.includes("school")) return School;
  if (name.includes("sensory")) return Brain;
  if (name.includes("motor")) return Activity;
  if (name.includes("speech") || name.includes("communication")) return MessageSquare;
  if (name.includes("adl") || name.includes("living")) return UserCheck;
  return ListChecks;
};

const getQuadrantCounts = (cat) => {
  const counts = { AV: 0, SN: 0, RG: 0, SK: 0 };
  if (!cat) return counts;
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

  // Active category selection tab
  const [selectedCatId, setSelectedCatId] = useState(() => categories[0]?.id || "cat-001");

  // Filtering & Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedQuadrant, setSelectedQuadrant] = useState("ALL");
  const [selectedType, setSelectedType] = useState("ALL");
  const [selectedDomainId, setSelectedDomainId] = useState("ALL");

  // Collapsed / Expanded sections tracker
  const [collapsedSections, setCollapsedSections] = useState({});

  // Dialog states
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

  const [secDialog, setSecDialog] = useState({
    open: false,
    categoryId: null,
    editingSectionId: null,
    title: "",
    leadText: "",
  });

  const [genDialog, setGenDialog] = useState({
    open: false,
    selectedClientId: "",
    selectedCategoryId: "",
    generatedCode: "",
  });

  // Calculate active category
  const activeCategory = useMemo(() => {
    return categories.find((c) => c.id === selectedCatId) || categories[0] || null;
  }, [categories, selectedCatId]);

  // Overall statistics across all categories
  const totalQuestionsOverall = useMemo(() => {
    return categories.reduce((acc, cat) => {
      const qCount = cat.sections && cat.sections.length > 0
        ? cat.sections.reduce((sAcc, s) => sAcc + (s.questions?.length || 0), 0)
        : (cat.questions?.length || 0);
      return acc + qCount;
    }, 0);
  }, [categories]);

  // Calculate quadrant counts for active category
  const activeQuadCounts = useMemo(() => {
    return getQuadrantCounts(activeCategory);
  }, [activeCategory]);

  const activeCategoryTotalQuestions = useMemo(() => {
    if (!activeCategory) return 0;
    if (activeCategory.sections && activeCategory.sections.length > 0) {
      return activeCategory.sections.reduce((acc, s) => acc + (s.questions?.length || 0), 0);
    }
    return activeCategory.questions?.length || 0;
  }, [activeCategory]);

  // Filtered sections and questions in active category
  const filteredSections = useMemo(() => {
    if (!activeCategory) return [];
    const query = searchQuery.trim().toLowerCase();

    const processQuestions = (questions) => {
      return (questions || []).filter((q) => {
        // Query search
        if (query) {
          const matchText = (q.question || "").toLowerCase().includes(query);
          const matchItem = String(q.itemNo || "").includes(query);
          if (!matchText && !matchItem) return false;
        }
        // Quadrant filter
        if (selectedQuadrant !== "ALL" && (q.quadrant || "SN") !== selectedQuadrant) {
          return false;
        }
        // Type filter
        if (selectedType !== "ALL" && (q.type || "scale_0_5") !== selectedType) {
          return false;
        }
        return true;
      });
    };

    if (activeCategory.sections && activeCategory.sections.length > 0) {
      return activeCategory.sections
        .filter((sec) => {
          if (selectedDomainId !== "ALL" && sec.sectionId !== selectedDomainId) {
            return false;
          }
          return true;
        })
        .map((sec) => {
          const matched = processQuestions(sec.questions);
          return {
            ...sec,
            filteredQuestions: matched,
            totalOriginalCount: sec.questions?.length || 0,
          };
        });
    }

    // Flat questions
    const matched = processQuestions(activeCategory.questions || []);
    return [
      {
        sectionId: "default-sec",
        title: "Daftar Pertanyaan Observasi",
        leadText: "Anakku ...",
        filteredQuestions: matched,
        totalOriginalCount: activeCategory.questions?.length || 0,
      },
    ];
  }, [activeCategory, searchQuery, selectedQuadrant, selectedType, selectedDomainId]);

  const totalFilteredQuestionsCount = useMemo(() => {
    return filteredSections.reduce((acc, s) => acc + (s.filteredQuestions?.length || 0), 0);
  }, [filteredSections]);

  // Toggle collapse state for a section
  const toggleSectionCollapse = (secId) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [secId]: !prev[secId],
    }));
  };

  const expandAllSections = () => {
    setCollapsedSections({});
  };

  const collapseAllSections = () => {
    const allCollapsed = {};
    filteredSections.forEach((s) => {
      allCollapsed[s.sectionId] = true;
    });
    setCollapsedSections(allCollapsed);
  };

  // Generate Questionnaire Code Modal
  const openGenModal = (preferredCatId = "") => {
    const code = genCode("ASM");
    setGenDialog({
      open: true,
      selectedClientId: clients[0]?.id || "",
      selectedCategoryId: preferredCatId || activeCategory?.id || categories[0]?.id || "cat-001",
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
      const newId = uid();
      addCategory({
        id: newId,
        categoryName: name,
        domain: catDialog.domain || "Clinical Assessment",
        questions: [],
        sections: [
          {
            sectionId: `sec-${uid()}`,
            title: "Bagian Umum",
            leadText: "Anakku ...",
            questions: [],
          },
        ],
      });
      setSelectedCatId(newId);
      toast.success("Kategori asesmen baru berhasil dibuat.");
    }
    setCatDialog({ open: false, editingId: null, name: "", domain: "" });
  };

  const handleDeleteCategory = (catId, catName) => {
    if (categories.length <= 1) {
      toast.error("Minimal harus terdapat 1 kategori asesmen master.");
      return;
    }
    if (!window.confirm(`Hapus template asesmen "${catName}" beserta seluruh bank soal di dalamnya?`)) {
      return;
    }
    deleteCategory(catId);
    const remaining = categories.filter((c) => c.id !== catId);
    setSelectedCatId(remaining[0]?.id || "");
    toast.success(`Template "${catName}" telah dihapus.`);
  };

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

  const duplicateQuestion = (catId, secId, q) => {
    const category = categories.find((c) => c.id === catId);
    if (!category) return;

    if (category.sections && category.sections.length > 0) {
      const updatedSections = category.sections.map((sec) => {
        if (sec.sectionId === secId) {
          const questions = sec.questions || [];
          const duplicated = {
            ...q,
            id: uid(),
            itemNo: questions.length + 1,
            question: `${q.question} (Salinan)`,
          };
          return {
            ...sec,
            questions: [...questions, duplicated],
          };
        }
        return sec;
      });
      updateCategory(catId, { sections: updatedSections });
      toast.success("Butir pertanyaan berhasil diduplikasi.");
    }
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
      toast.success(qDialog.editingId ? "Pertanyaan berhasil diperbarui." : "Pertanyaan baru ditambahkan.");
    } else {
      let questions = category.questions || [];
      if (qDialog.editingId) {
        questions = questions.map((q) =>
          q.id === qDialog.editingId ? { ...q, ...payload } : q
        );
        toast.success("Pertanyaan diperbarui.");
      } else {
        questions = [...questions, { id: uid(), ...payload }];
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
      toast.success("Pertanyaan dihapus.");
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
    }
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

  return (
    <div className="space-y-7 max-w-7xl mx-auto pb-16" data-testid="assessment-master-page">
      {/* 1. TOP HERO HEADER & METRICS BAR */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-xs">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200 shadow-2xs">
            <Layers className="w-4 h-4 text-emerald-600" />
            <span>Bank Data Asesmen & Protokol Klinis Terstandar</span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-slate-900">
            Assessment Master Data
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 leading-relaxed font-medium">
            Kelola instrumen baku asesmen tumbuh kembang anak (Child Sensory Profile 2, School Companion, Fine Motor, Speech Language & ADL). Setiap instrumen dilengkapi <strong className="text-slate-800 font-bold">60++ butir pertanyaan terakreditasi</strong>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            onClick={() => openGenModal()}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl px-5 h-11 gap-2 shadow-xs transition-all cursor-pointer"
          >
            <KeyRound className="w-4 h-4 stroke-[2.2]" /> Terbitkan Kode Kuesioner
          </Button>

          <Button
            variant="outline"
            className="border-slate-200 text-slate-700 hover:bg-slate-50 font-bold rounded-2xl px-4 h-11 gap-2 shadow-2xs cursor-pointer"
            onClick={() => setCatDialog({ open: true, editingId: null, name: "", domain: "" })}
            data-testid="new-category-button"
          >
            <Plus className="w-4 h-4 text-slate-500 stroke-[2.2]" /> Tambah Kategori
          </Button>
        </div>
      </div>

      {/* 2. STATS & CLINICAL FRAMEWORK CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Kategori</span>
            <span className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-black text-xs">
              <Layers className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-900">{categories.length}</p>
          <p className="text-[11px] text-slate-500 font-medium">Template baku aktif</p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Bank Soal</span>
            <span className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black text-xs">
              <ListChecks className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-emerald-700">{totalQuestionsOverall}</p>
          <p className="text-[11px] text-slate-500 font-medium">Butir instrumen klinis (60++ per template)</p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Standar Baku</span>
            <span className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-black text-xs">
              <Award className="w-4 h-4" />
            </span>
          </div>
          <p className="text-base sm:text-lg font-black text-purple-900 mt-1 truncate">Winnie Dunn CSP2</p>
          <p className="text-[11px] text-slate-500 font-medium">Beery VMI, ASHA, WeeFIM</p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Distribusi Kuadran</span>
            <span className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-black text-xs">
              <Sparkles className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-blue-100 text-blue-900">AV</span>
            <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-lime-100 text-lime-900">SN</span>
            <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-pink-100 text-pink-900">RG</span>
            <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-amber-100 text-amber-900">SK</span>
          </div>
          <p className="text-[11px] text-slate-500 font-medium mt-1">Tersinkron dengan lembar asesor</p>
        </div>
      </div>

      {/* 3. CATEGORY SWITCHER CARDS (SPACIOUS HORIZONTAL SELECTOR) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Pilih Template Instrumen Klinis ({categories.length} Kategori):
          </span>
          <span className="text-[11px] text-slate-400 font-medium">
            Klik kategori untuk membuka ruang kerja kelola bank soal
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          {categories.map((cat) => {
            const isSelected = cat.id === selectedCatId;
            const CatIcon = getCategoryIcon(cat.categoryName);
            const qCount = cat.sections && cat.sections.length > 0
              ? cat.sections.reduce((acc, s) => acc + (s.questions?.length || 0), 0)
              : (cat.questions?.length || 0);

            return (
              <div
                key={cat.id}
                onClick={() => setSelectedCatId(cat.id)}
                className={cn(
                  "p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-3 text-left group",
                  isSelected
                    ? "bg-white border-emerald-500 shadow-md ring-2 ring-emerald-500/20"
                    : "bg-white/80 border-slate-200/90 hover:bg-white hover:border-slate-300 shadow-2xs"
                )}
                data-testid={`category-card-${cat.id}`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center font-black transition-colors",
                      isSelected ? "bg-emerald-600 text-white shadow-xs" : "bg-slate-100 text-slate-600 group-hover:bg-slate-200"
                    )}>
                      <CatIcon className="w-5 h-5" />
                    </div>
                    <Badge className={cn(
                      "text-[10px] font-black border font-mono",
                      qCount >= 60 ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-amber-50 text-amber-800 border-amber-200"
                    )}>
                      {qCount} Butir
                    </Badge>
                  </div>

                  <div>
                    <p className={cn(
                      "text-xs font-black line-clamp-2 leading-snug",
                      isSelected ? "text-emerald-950" : "text-slate-800"
                    )}>
                      {cat.categoryName}
                    </p>
                    <p className="text-[10px] text-slate-400 font-medium truncate mt-1">
                      {cat.domain || "Clinical Profile"}
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
                  <span className={cn(
                    "font-bold",
                    isSelected ? "text-emerald-700" : "text-slate-400"
                  )}>
                    {isSelected ? "● Sedang Aktif" : "Buka Template"}
                  </span>
                  <span className="text-slate-400 font-mono">
                    {cat.sections?.length || 1} Domain
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. ACTIVE CATEGORY STUDIO / WORKSPACE (FULL WIDTH & SPACIOUS) */}
      {activeCategory && (
        <div className="space-y-6">
          {/* Active Category Header Card */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-7 space-y-5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-100">
              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black shadow-xs shrink-0 mt-0.5">
                  {React.createElement(getCategoryIcon(activeCategory.categoryName), { className: "w-6 h-6" })}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg sm:text-xl font-black text-slate-900 leading-tight">
                      {activeCategory.categoryName}
                    </h2>
                    <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200 text-xs font-bold">
                      {activeCategoryTotalQuestions} Butir Pertanyaan Terakreditasi
                    </Badge>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
                    Standar Acuan: <strong className="text-slate-700">{activeCategory.author || activeCategory.standardTitle || "Therapedia Developmental Standard"}</strong> • Domain: <span className="text-emerald-700 font-semibold">{activeCategory.domain}</span>
                  </p>
                </div>
              </div>

              {/* Category Quick Actions */}
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-xl text-xs font-bold gap-1.5 text-slate-700 border-slate-200 hover:bg-slate-50 h-9 cursor-pointer"
                  onClick={() => openGenModal(activeCategory.id)}
                >
                  <KeyRound className="w-3.5 h-3.5 text-emerald-600" /> Terbitkan Kode
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-xl text-xs font-bold gap-1.5 text-slate-700 border-slate-200 hover:bg-slate-50 h-9 cursor-pointer"
                  onClick={() =>
                    setSecDialog({
                      open: true,
                      categoryId: activeCategory.id,
                      editingSectionId: null,
                      title: "",
                      leadText: "Anakku ...",
                    })
                  }
                >
                  <Plus className="w-3.5 h-3.5 text-emerald-600" /> Tambah Domain
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  className="rounded-xl text-xs font-bold gap-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 h-9 cursor-pointer"
                  onClick={() =>
                    setCatDialog({
                      open: true,
                      editingId: activeCategory.id,
                      name: activeCategory.categoryName,
                      domain: activeCategory.domain || "",
                    })
                  }
                  data-testid={`edit-category-button-${activeCategory.id}`}
                >
                  <Pencil className="w-3.5 h-3.5" /> Ubah Nama
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  className="rounded-xl text-xs font-bold gap-1 text-rose-600 hover:bg-rose-50 h-9 cursor-pointer"
                  onClick={() => handleDeleteCategory(activeCategory.id, activeCategory.categoryName)}
                >
                  <Trash2 className="w-3.5 h-3.5" /> Hapus
                </Button>
              </div>
            </div>

            {/* Kuadran Sensory / Clinical Distribution */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span className="flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-emerald-600" />
                  Distribusi Kuadran Sensorik Klinis (Winnie Dunn Framework):
                </span>
                <span className="text-[11px] text-slate-400 font-medium">
                  Total {activeCategoryTotalQuestions} Butir dalam Template Ini
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded text-[11px] font-black bg-blue-600 text-white">AV</span>
                    <span className="text-xl font-black text-blue-900">{activeQuadCounts.AV} Soal</span>
                  </div>
                  <p className="text-xs font-bold text-blue-950">Sensation Avoiding</p>
                  <p className="text-[10px] text-blue-800/80 leading-snug">Penghindar Sensori (Perilaku aktif menjauh)</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-lime-50/70 border border-lime-200 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded text-[11px] font-black bg-lime-600 text-white">SN</span>
                    <span className="text-xl font-black text-lime-900">{activeQuadCounts.SN} Soal</span>
                  </div>
                  <p className="text-xs font-bold text-lime-950">Sensory Sensitivity</p>
                  <p className="text-[10px] text-lime-800/80 leading-snug">Sensitivitas Tinggi (Mudah terganggu stimulus)</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-pink-50/70 border border-pink-200 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded text-[11px] font-black bg-pink-600 text-white">RG</span>
                    <span className="text-xl font-black text-pink-900">{activeQuadCounts.RG} Soal</span>
                  </div>
                  <p className="text-xs font-bold text-pink-950">Low Registration</p>
                  <p className="text-[10px] text-pink-800/80 leading-snug">Pendaftaran Rendah (Pasif / Butuh intensitas lebih)</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded text-[11px] font-black bg-amber-600 text-white">SK</span>
                    <span className="text-xl font-black text-amber-900">{activeQuadCounts.SK} Soal</span>
                  </div>
                  <p className="text-xs font-bold text-amber-950">Sensory Seeking</p>
                  <p className="text-[10px] text-amber-800/80 leading-snug">Pencari Sensori (Mendambakan stimulasi ekstra)</p>
                </div>
              </div>
            </div>
          </div>

          {/* 5. SEARCH, FILTER & SECTION CONTROL TOOLBAR */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-4 sm:p-5 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Search input */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Cari butir pertanyaan (misal: telinga, suara, pensil, atau nomor butir)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-10 rounded-xl border-slate-200 bg-slate-50/70 focus:bg-white text-xs font-medium"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-700 font-bold"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Filters & Collapse / Expand */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Quadrant filter */}
                <Select value={selectedQuadrant} onValueChange={setSelectedQuadrant}>
                  <SelectTrigger className="w-36 h-10 rounded-xl border-slate-200 text-xs font-bold bg-white">
                    <SelectValue placeholder="Kuadran" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="ALL" className="text-xs font-bold">Semua Kuadran</SelectItem>
                    <SelectItem value="AV" className="text-xs font-bold text-blue-700">AV - Avoiding</SelectItem>
                    <SelectItem value="SN" className="text-xs font-bold text-lime-700">SN - Sensitivity</SelectItem>
                    <SelectItem value="RG" className="text-xs font-bold text-pink-700">RG - Registration</SelectItem>
                    <SelectItem value="SK" className="text-xs font-bold text-amber-700">SK - Seeking</SelectItem>
                  </SelectContent>
                </Select>

                {/* Type filter */}
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger className="w-36 h-10 rounded-xl border-slate-200 text-xs font-bold bg-white">
                    <SelectValue placeholder="Tipe Soal" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="ALL" className="text-xs font-bold">Semua Tipe</SelectItem>
                    {QUESTION_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value} className="text-xs">
                        {t.shortLabel}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Expand / Collapse All */}
                <Button
                  size="sm"
                  variant="outline"
                  className="h-10 rounded-xl text-xs font-bold text-slate-600 border-slate-200 hover:bg-slate-50 cursor-pointer"
                  onClick={() => {
                    if (Object.keys(collapsedSections).length > 0) {
                      expandAllSections();
                    } else {
                      collapseAllSections();
                    }
                  }}
                >
                  <ChevronsUpDown className="w-3.5 h-3.5 mr-1" />
                  {Object.keys(collapsedSections).length > 0 ? "Buka Semua" : "Tutup Semua"}
                </Button>
              </div>
            </div>

            {/* Domain Pills Filter */}
            {activeCategory.sections && activeCategory.sections.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] shrink-0 mr-1">
                  Filter Domain:
                </span>
                <button
                  onClick={() => setSelectedDomainId("ALL")}
                  className={cn(
                    "px-3 py-1.5 rounded-xl border shrink-0 font-bold text-xs transition-all cursor-pointer",
                    selectedDomainId === "ALL"
                      ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                  )}
                >
                  Semua Domain ({activeCategoryTotalQuestions})
                </button>
                {activeCategory.sections.map((sec, sIdx) => {
                  const isDomainSelected = selectedDomainId === sec.sectionId;
                  return (
                    <button
                      key={sec.sectionId}
                      onClick={() => setSelectedDomainId(sec.sectionId)}
                      className={cn(
                        "px-3 py-1.5 rounded-xl border shrink-0 font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5",
                        isDomainSelected
                          ? "bg-emerald-700 text-white border-emerald-700 shadow-xs"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                      )}
                    >
                      <span>{sIdx + 1}. {sec.title.split("(")[0].trim()}</span>
                      <span className={cn(
                        "text-[10px] px-1.5 py-0.2 rounded-full font-mono font-black",
                        isDomainSelected ? "bg-emerald-900 text-white" : "bg-slate-100 text-slate-600"
                      )}>
                        {sec.questions?.length || 0}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 6. DOMAIN SECTIONS & QUESTIONS LIST (NO CRAMPED MAX-H-72 SCROLLBOX) */}
          <div className="space-y-6">
            {filteredSections.map((sec, sIdx) => {
              const isCollapsed = Boolean(collapsedSections[sec.sectionId]);
              const visibleQuestions = sec.filteredQuestions || [];

              return (
                <div
                  key={sec.sectionId || `sec-${sIdx}`}
                  className="rounded-3xl border border-slate-200/90 shadow-sm bg-white overflow-hidden transition-all"
                >
                  {/* Section Banner Header */}
                  <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-50/70 via-white to-slate-50/60 border-b border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4">
                    {/* Left: Collapsible Toggle, Number Badge & Title */}
                    <div
                      className="flex items-start gap-3 cursor-pointer select-none flex-1 min-w-0"
                      onClick={() => toggleSectionCollapse(sec.sectionId)}
                    >
                      <button
                        type="button"
                        className="w-8 h-8 rounded-xl bg-white border border-slate-200 text-slate-600 flex items-center justify-center hover:bg-slate-100 transition-colors shrink-0 mt-0.5 shadow-2xs cursor-pointer"
                        aria-label={isCollapsed ? "Buka seksi" : "Tutup seksi"}
                      >
                        {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                      </button>

                      <div className="flex items-start gap-2.5 flex-1 min-w-0">
                        <span className="w-6 h-6 rounded-full bg-emerald-700 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                          {sIdx + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm sm:text-base font-black text-slate-900 leading-snug break-words">
                            {sec.title}
                          </h3>
                          <p className="text-xs text-slate-500 font-medium italic mt-1 leading-normal break-words">
                            "{sec.leadText || "Anakku ..."}"
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Right: Badge & Actions Toolbar (Always visible, shrink-0, clean spacing) */}
                    <div
                      className="flex items-center gap-2 shrink-0 self-start md:self-center pl-11 md:pl-0 flex-wrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 font-mono shrink-0">
                        {visibleQuestions.length} Soal
                        {visibleQuestions.length !== sec.totalOriginalCount && ` / ${sec.totalOriginalCount}`}
                      </span>

                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-xl text-xs font-bold text-slate-700 border-slate-200 hover:bg-slate-100 h-8 px-2.5 gap-1 shrink-0 cursor-pointer whitespace-nowrap"
                        onClick={() => openAddQuestion(activeCategory.id, sec.sectionId)}
                        title="Tambah butir pertanyaan baru ke domain ini"
                      >
                        <Plus className="w-3.5 h-3.5 text-emerald-600" /> Tambah Soal
                      </Button>

                      {sec.sectionId !== "default-sec" && (
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer shrink-0"
                            onClick={() =>
                              setSecDialog({
                                open: true,
                                categoryId: activeCategory.id,
                                editingSectionId: sec.sectionId,
                                title: sec.title,
                                leadText: sec.leadText || "",
                              })
                            }
                            title="Edit judul domain & lead text"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>

                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer shrink-0"
                            onClick={() => removeSection(activeCategory.id, sec.sectionId, sec.title)}
                            title="Hapus domain ini"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Section Questions Body */}
                  {!isCollapsed && (
                    <div className="p-4 sm:p-6 space-y-3.5">
                      {visibleQuestions.length === 0 ? (
                        <div className="p-8 text-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 space-y-2">
                          <p className="text-xs text-slate-500 font-medium">
                            {searchQuery || selectedQuadrant !== "ALL" || selectedType !== "ALL"
                              ? "Tidak ada butir pertanyaan yang sesuai dengan kriteria pencarian/filter di atas."
                              : "Belum ada pertanyaan pada domain ini. Klik tombol '+ Tambah Soal' untuk menambahkan butir pertama."}
                          </p>
                          {(searchQuery || selectedQuadrant !== "ALL" || selectedType !== "ALL") && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="rounded-xl text-xs font-bold"
                              onClick={() => {
                                setSearchQuery("");
                                setSelectedQuadrant("ALL");
                                setSelectedType("ALL");
                              }}
                            >
                              Reset Filter
                            </Button>
                          )}
                        </div>
                      ) : (
                        visibleQuestions.map((q, qIdx) => {
                          const quad = q.quadrant || "SN";
                          const qConfig = QUADRANT_CONFIG[quad] || QUADRANT_CONFIG.SN;
                          const typeInfo = getQuestionTypeInfo(q.type);

                          return (
                            <div
                              key={q.id || `q-${qIdx}`}
                              className="p-4 rounded-2xl border border-slate-200/90 bg-white hover:border-slate-300 hover:shadow-2xs transition-all space-y-3"
                            >
                              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                                <div className="flex items-start gap-3 flex-1 min-w-0">
                                  {/* Item Number Badge */}
                                  <span className="w-8 h-8 rounded-xl bg-slate-100 text-slate-800 font-mono font-black text-xs flex items-center justify-center shrink-0 border border-slate-200 mt-0.5">
                                    #{q.itemNo || qIdx + 1}
                                  </span>

                                  <div className="space-y-1.5 flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      <span
                                        className={cn("px-2 py-0.5 rounded-md text-[10px] border shadow-2xs", qConfig.badge)}
                                        title={qConfig.desc}
                                      >
                                        {quad} • {qConfig.title}
                                      </span>
                                      <span
                                        className={cn("px-2 py-0.5 rounded-md text-[10px] border", typeInfo.badge)}
                                        title={typeInfo.desc}
                                      >
                                        {typeInfo.shortLabel}
                                      </span>
                                    </div>

                                    {/* Question Text with break-words */}
                                    <p className="text-sm font-semibold text-slate-900 leading-relaxed break-words">
                                      {q.question}
                                    </p>
                                  </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex items-center gap-1 shrink-0 self-end sm:self-start">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 px-2 rounded-xl text-xs font-bold text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 gap-1 cursor-pointer shrink-0"
                                    onClick={() => openEditQuestion(activeCategory.id, sec.sectionId, q)}
                                    title="Edit pertanyaan dan tipe jawaban"
                                  >
                                    <Pencil className="w-3.5 h-3.5" /> Edit
                                  </Button>

                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8 rounded-xl text-slate-400 hover:text-sky-700 hover:bg-sky-50 cursor-pointer shrink-0"
                                    onClick={() => duplicateQuestion(activeCategory.id, sec.sectionId, q)}
                                    title="Duplikasi butir pertanyaan ini"
                                  >
                                    <Copy className="w-3.5 h-3.5" />
                                  </Button>

                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer shrink-0"
                                    onClick={() => removeQuestion(activeCategory.id, q.id)}
                                    title="Hapus butir pertanyaan"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                              </div>

                              {/* Interactive Live Option Preview */}
                              {(q.type === "scale_0_5" || !q.type) && (
                                <div className="pl-0 sm:pl-11 pt-1">
                                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 flex flex-wrap items-center gap-2 text-xs">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1 shrink-0">
                                      Skala Respon:
                                    </span>
                                    {[
                                      { val: 5, label: "Hampir Selalu (90%+)" },
                                      { val: 4, label: "Sering (75%)" },
                                      { val: 3, label: "Kadang (50%)" },
                                      { val: 2, label: "Jarang (25%)" },
                                      { val: 1, label: "Hampir Tdk Pernah (10%)" },
                                      { val: 0, label: "Tdk Berlaku (0%)" },
                                    ].map((opt) => (
                                      <span
                                        key={opt.val}
                                        className="px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-[11px] font-medium text-slate-700 shadow-2xs shrink-0"
                                        title={opt.label}
                                      >
                                        <strong className="font-black text-slate-900">{opt.val}</strong> - {opt.label.split("(")[0]}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {(q.type === "multiple_choice" || q.type === "checkbox_multi") && (q.options || []).length > 0 && (
                                <div className="pl-0 sm:pl-11 pt-1 flex items-center gap-1.5 flex-wrap">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1 shrink-0">
                                    Opsi Pilihan ({q.options.length}):
                                  </span>
                                  {q.options.map((opt, oIdx) => (
                                    <span
                                      key={oIdx}
                                      className="px-2.5 py-0.5 rounded-lg bg-purple-50 text-purple-900 border border-purple-200 text-xs font-medium shadow-2xs break-words"
                                    >
                                      {opt}
                                    </span>
                                  ))}
                                </div>
                              )}

                              {q.type === "range" && (
                                <div className="pl-0 sm:pl-11 pt-1 text-xs text-cyan-950 font-medium">
                                  <div className="p-2.5 rounded-xl bg-cyan-50/60 border border-cyan-200 flex items-center justify-between gap-2">
                                    <span>Rentang: <strong>{q.scaleMin ?? 1} ({q.minLabel || "Min"})</strong></span>
                                    <span>s/d</span>
                                    <span><strong>{q.scaleMax ?? 5} ({q.maxLabel || "Max"})</strong></span>
                                  </div>
                                </div>
                              )}

                              {q.type === "yes_no" && (
                                <div className="pl-0 sm:pl-11 pt-1 flex items-center gap-2">
                                  <span className="px-3 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold">
                                    ✓ Ya
                                  </span>
                                  <span className="px-3 py-0.5 rounded-lg bg-rose-50 text-rose-800 border border-rose-200 text-xs font-bold">
                                    ✕ Tidak
                                  </span>
                                </div>
                              )}

                              {q.type === "free_text" && (
                                <div className="pl-0 sm:pl-11 pt-1">
                                  <span className="text-xs text-sky-700 italic">
                                    [Kotak Teks Deskripsi Bebas / Esai Terbuka]
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: TERBITKAN KODE KUESIONER (MULTI-CODE ENGINE)                       */}
      {/* ========================================================================= */}
      <Dialog open={genDialog.open} onOpenChange={(open) => setGenDialog((prev) => ({ ...prev, open }))}>
        <DialogContent className="max-w-md rounded-3xl p-6 sm:p-7 border-slate-200 shadow-xl">
          <DialogHeader className="space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center justify-center">
              <KeyRound className="w-6 h-6 stroke-[2.2]" />
            </div>
            <DialogTitle className="text-xl font-black text-slate-900">
              Terbitkan Kode Kuesioner Asesmen
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 leading-relaxed font-medium">
              Terbitkan kode akses unik (format ASM-XXXX) agar orang tua atau pihak sekolah dapat mengisi kuesioner asesmen online tanpa perlu login.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Pilih Klien Tujuan</Label>
              <Select
                value={genDialog.selectedClientId}
                onValueChange={(val) => setGenDialog((prev) => ({ ...prev, selectedClientId: val }))}
              >
                <SelectTrigger className="rounded-xl border-slate-200 text-xs font-semibold h-10">
                  <SelectValue placeholder="Pilih Klien..." />
                </SelectTrigger>
                <SelectContent className="max-h-56 rounded-xl">
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="text-xs font-medium">
                      {c.clientName} ({c.clientAccessCode}) • {c.branchId === "branch-citraland" ? "Citraland" : c.branchId === "branch-sby-barat" ? "Sby Barat" : "Sby Timur"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Pilih Template Asesmen</Label>
              <Select
                value={genDialog.selectedCategoryId}
                onValueChange={(val) => setGenDialog((prev) => ({ ...prev, selectedCategoryId: val }))}
              >
                <SelectTrigger className="rounded-xl border-slate-200 text-xs font-semibold h-10">
                  <SelectValue placeholder="Pilih Kategori..." />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id} className="text-xs font-medium">
                      {cat.categoryName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Kode Akses Dihasilkan</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={genDialog.generatedCode}
                  onChange={(e) => setGenDialog((prev) => ({ ...prev, generatedCode: e.target.value.toUpperCase() }))}
                  className="rounded-xl border-slate-200 font-mono font-black text-sm text-emerald-800 uppercase tracking-widest bg-emerald-50/50 h-10"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl text-xs font-bold shrink-0 h-10 cursor-pointer"
                  onClick={() => setGenDialog((prev) => ({ ...prev, generatedCode: genCode("ASM") }))}
                >
                  Acak Ulang
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4 gap-2">
            <Button
              variant="outline"
              className="rounded-xl border-slate-200 font-bold"
              onClick={() => setGenDialog((prev) => ({ ...prev, open: false }))}
            >
              Batal
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl gap-2 shadow-xs cursor-pointer"
              onClick={handleConfirmGenerateCode}
            >
              <CheckCircle2 className="w-4 h-4" /> Simpan & Terbitkan Kode
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL: TAMBAH / EDIT KATEGORI                                             */}
      {/* ========================================================================= */}
      <Dialog open={catDialog.open} onOpenChange={(open) => setCatDialog((prev) => ({ ...prev, open }))}>
        <DialogContent className="max-w-md rounded-3xl p-6 sm:p-7 border-slate-200 shadow-xl">
          <DialogHeader className="space-y-1.5">
            <DialogTitle className="text-xl font-black text-slate-900">
              {catDialog.editingId ? "Edit Kategori Asesmen" : "Kategori Asesmen Baru"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 font-medium">
              Buat template baku instrumen observasi baru untuk disimpan dalam bank data master klinik.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Nama Template Asesmen</Label>
              <Input
                placeholder="misal: Pediatric Occupational Therapy Profile"
                value={catDialog.name}
                onChange={(e) => setCatDialog((prev) => ({ ...prev, name: e.target.value }))}
                className="rounded-xl border-slate-200 text-xs font-medium h-10"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Domain / Spesialisasi Klinis</Label>
              <Input
                placeholder="misal: Sensory & Motor Functional Development"
                value={catDialog.domain}
                onChange={(e) => setCatDialog((prev) => ({ ...prev, domain: e.target.value }))}
                className="rounded-xl border-slate-200 text-xs font-medium h-10"
              />
            </div>
          </div>

          <DialogFooter className="mt-4 gap-2">
            <Button
              variant="outline"
              className="rounded-xl border-slate-200 font-bold"
              onClick={() => setCatDialog({ open: false, editingId: null, name: "", domain: "" })}
            >
              Batal
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs cursor-pointer"
              onClick={saveCategory}
            >
              Simpan Kategori
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL: TAMBAH / EDIT BUTIR SOAL                                           */}
      {/* ========================================================================= */}
      <Dialog open={qDialog.open} onOpenChange={(open) => setQDialog((prev) => ({ ...prev, open }))}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl p-6 sm:p-7 border-slate-200 shadow-xl">
          <DialogHeader className="space-y-1.5">
            <DialogTitle className="text-xl font-black text-slate-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-600" />
              {qDialog.editingId ? "Edit Butir Pertanyaan Klinis" : "Tambah Butir Pertanyaan Baru"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 font-medium">
              Konfigurasikan tipe respons (skala baku Winnie Dunn, range kustom 1–5 / 1–10, pilihan ganda, multi-centang, esai), kuadran sensori, serta opsi jawaban.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* ROW 1: TIPE SOAL & KUADRAN */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Tipe Input Jawaban</Label>
                <Select
                  value={qDialog.type}
                  onValueChange={(val) => setQDialog((prev) => ({ ...prev, type: val }))}
                >
                  <SelectTrigger className="rounded-xl border-slate-200 text-xs font-semibold h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200">
                    {QUESTION_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value} className="text-xs font-medium">
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Kuadran Sensorik</Label>
                <Select
                  value={qDialog.quadrant}
                  onValueChange={(val) => setQDialog((prev) => ({ ...prev, quadrant: val }))}
                >
                  <SelectTrigger className="rounded-xl border-slate-200 text-xs font-semibold h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200">
                    <SelectItem value="AV" className="text-xs font-bold text-blue-800">
                      AV - Sensation Avoiding (Penghindar Sensori)
                    </SelectItem>
                    <SelectItem value="SN" className="text-xs font-bold text-lime-800">
                      SN - Sensory Sensitivity (Sensitivitas Sensori)
                    </SelectItem>
                    <SelectItem value="RG" className="text-xs font-bold text-pink-800">
                      RG - Low Registration (Pendaftaran Rendah)
                    </SelectItem>
                    <SelectItem value="SK" className="text-xs font-bold text-amber-800">
                      SK - Sensory Seeking (Pencari Sensori)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* ROW 2: TEKS PERNYATAAN */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Teks Pernyataan / Indikator Klinis</Label>
              <Textarea
                placeholder="misal: Menutup telinga untuk melindunginya dari suara-suara bising atau respon berlebih..."
                value={qDialog.text}
                onChange={(e) => setQDialog((prev) => ({ ...prev, text: e.target.value }))}
                className="rounded-xl border-slate-200 text-xs min-h-[90px] leading-relaxed font-medium"
              />
            </div>

            {/* TIPE 1: SKALA 0-5 STANDAR WINNIE DUNN */}
            {qDialog.type === "scale_0_5" && (
              <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/60 space-y-2.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-950">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Format Skala Baku Skor 0–5 (Standar Winnie Dunn Sensory Profile)
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-emerald-900 font-medium">
                  <div className="p-2 rounded-xl bg-white border border-emerald-200"><strong>5:</strong> Hampir Selalu (90%+)</div>
                  <div className="p-2 rounded-xl bg-white border border-emerald-200"><strong>4:</strong> Sering (75%)</div>
                  <div className="p-2 rounded-xl bg-white border border-emerald-200"><strong>3:</strong> Kadang (50%)</div>
                  <div className="p-2 rounded-xl bg-white border border-emerald-200"><strong>2:</strong> Jarang (25%)</div>
                  <div className="p-2 rounded-xl bg-white border border-emerald-200"><strong>1:</strong> Hampir Tdk Pernah (10%)</div>
                  <div className="p-2 rounded-xl bg-white border border-emerald-200"><strong>0:</strong> Tidak Berlaku</div>
                </div>
              </div>
            )}

            {/* TIPE 2: RANGE ANGKA KUSTOM */}
            {qDialog.type === "range" && (
              <div className="p-4 rounded-2xl border border-cyan-200 bg-cyan-50/60 space-y-3">
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
                      className="rounded-xl border-slate-200 bg-white text-xs h-9 font-medium"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-slate-700">Nilai Maksimum (Max)</Label>
                    <Input
                      type="number"
                      value={qDialog.scaleMax}
                      onChange={(e) => setQDialog((prev) => ({ ...prev, scaleMax: e.target.value }))}
                      className="rounded-xl border-slate-200 bg-white text-xs h-9 font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-slate-700">Label Ujung Kiri (Nilai Min)</Label>
                    <Input
                      placeholder="misal: Sangat Rendah"
                      value={qDialog.minLabel}
                      onChange={(e) => setQDialog((prev) => ({ ...prev, minLabel: e.target.value }))}
                      className="rounded-xl border-slate-200 bg-white text-xs h-9 font-medium"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-slate-700">Label Ujung Kanan (Nilai Max)</Label>
                    <Input
                      placeholder="misal: Sangat Tinggi"
                      value={qDialog.maxLabel}
                      onChange={(e) => setQDialog((prev) => ({ ...prev, maxLabel: e.target.value }))}
                      className="rounded-xl border-slate-200 bg-white text-xs h-9 font-medium"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TIPE 3: PILIHAN GANDA ATAU MULTI-CENTANG */}
            {(qDialog.type === "multiple_choice" || qDialog.type === "checkbox_multi") && (
              <div className="p-4 rounded-2xl border border-purple-200 bg-purple-50/60 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-950">
                    Daftar Pilihan Opsi ({qDialog.options.length} Opsi):
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 px-2.5 text-[11px] font-bold border-purple-200 text-purple-800 hover:bg-purple-100 rounded-lg cursor-pointer"
                      onClick={() => applyOptionPreset("independence")}
                    >
                      Preset Mandiri
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 px-2.5 text-[11px] font-bold border-purple-200 text-purple-800 hover:bg-purple-100 rounded-lg cursor-pointer"
                      onClick={() => applyOptionPreset("frequency")}
                    >
                      Preset Frekuensi
                    </Button>
                  </div>
                </div>

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
                    className="rounded-xl border-slate-200 bg-white text-xs h-9 flex-1 font-medium"
                  />
                  <Button
                    type="button"
                    size="sm"
                    className="h-9 px-3.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs cursor-pointer"
                    onClick={addOptionToDialog}
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Tambah
                  </Button>
                </div>

                {qDialog.options.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-2 text-center">
                    Belum ada opsi jawaban. Silakan ketik di atas atau pilih tombol preset.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {qDialog.options.map((opt, oIdx) => (
                      <div
                        key={oIdx}
                        className="p-2 px-3 rounded-xl border border-purple-200/80 bg-white flex items-center justify-between gap-2 text-xs"
                      >
                        <span className="font-black text-purple-900 w-5 shrink-0 text-center">
                          {oIdx + 1}.
                        </span>
                        <Input
                          value={opt}
                          onChange={(e) => updateOptionText(oIdx, e.target.value)}
                          className="h-8 text-xs border-0 focus-visible:ring-1 focus-visible:ring-purple-400 px-1 font-medium text-slate-800"
                        />
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 rounded-lg text-slate-400 hover:text-rose-600 shrink-0 cursor-pointer"
                          onClick={() => removeOptionFromDialog(oIdx)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TIPE 4: TEKS BEBAS */}
            {qDialog.type === "free_text" && (
              <div className="p-4 rounded-2xl border border-sky-200 bg-sky-50/60 text-xs text-sky-900 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <AlignLeft className="w-4 h-4 text-sky-600" /> Format Esai / Teks Bebas
                </p>
                <p className="text-[11px] text-sky-700 leading-relaxed font-medium">
                  Responden akan diberikan kotak teks (textarea) terbuka untuk menuliskan uraian deskriptif atau catatan observasi kualitatif.
                </p>
              </div>
            )}

            {/* TIPE 5: YA / TIDAK */}
            {qDialog.type === "yes_no" && (
              <div className="p-4 rounded-2xl border border-amber-200 bg-amber-50/60 text-xs text-amber-900 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <CheckSquare className="w-4 h-4 text-amber-600" /> Format Pilihan Biner (Ya / Tidak)
                </p>
                <p className="text-[11px] text-amber-700 leading-relaxed font-medium">
                  Responden akan memilih salah satu tombol: <strong>Ya</strong> atau <strong>Tidak</strong>.
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="mt-4 gap-2">
            <Button
              variant="outline"
              className="rounded-xl text-xs font-bold"
              onClick={() => setQDialog((prev) => ({ ...prev, open: false }))}
            >
              Batal
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs gap-1.5 shadow-xs cursor-pointer"
              onClick={saveQuestion}
            >
              <CheckCircle2 className="w-4 h-4" /> Simpan Pertanyaan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL: TAMBAH / EDIT DOMAIN & SEKSI KLINIS                                */}
      {/* ========================================================================= */}
      <Dialog open={secDialog.open} onOpenChange={(open) => setSecDialog((prev) => ({ ...prev, open }))}>
        <DialogContent className="max-w-md rounded-3xl p-6 sm:p-7 border-slate-200 shadow-xl">
          <DialogHeader className="space-y-1.5">
            <DialogTitle className="text-xl font-black text-slate-900">
              {secDialog.editingSectionId ? "Edit Domain Klinis" : "Tambah Domain Klinis Baru"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 font-medium">
              Domain adalah payung kelompok aspek observasi klinis (misal: Classroom Attention, Peer Socialization, dsb.) yang menaungi butir pernyataan.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Nama Judul Domain</Label>
              <Input
                placeholder="misal: Pemrosesan Auditori atau Classroom Attention"
                value={secDialog.title}
                onChange={(e) => setSecDialog((prev) => ({ ...prev, title: e.target.value }))}
                className="rounded-xl border-slate-200 text-xs font-medium h-10"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Kalimat Pengantar (Lead Text)</Label>
              <Input
                placeholder="misal: Anakku ... atau Di kelas, siswa ..."
                value={secDialog.leadText}
                onChange={(e) => setSecDialog((prev) => ({ ...prev, leadText: e.target.value }))}
                className="rounded-xl border-slate-200 text-xs font-medium h-10"
              />
            </div>
          </div>

          <DialogFooter className="mt-4 gap-2">
            <Button
              variant="outline"
              className="rounded-xl font-bold"
              onClick={() => setSecDialog({ open: false, categoryId: null, editingSectionId: null, title: "", leadText: "" })}
            >
              Batal
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs cursor-pointer"
              onClick={saveSection}
            >
              Simpan Domain
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
