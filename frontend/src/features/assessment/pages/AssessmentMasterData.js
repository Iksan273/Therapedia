import React, { useState, useMemo, useEffect } from "react";
import { useConfirm } from "@/shared/components/ConfirmDialog";
import { toast } from "sonner";
import { useAssessments } from "@/stores/assessmentsStore";
import { useClients } from "@/stores/clientsStore";
import { useMasterData } from "@/stores/masterDataStore";
import { uid, genCode } from "@/shared/lib/id";
import { advanceStatus } from "@/domain/client";

import { getQuadrantCounts } from "@/features/assessment/components/masterData/assessmentConfig";
import { AssessmentHero } from "@/features/assessment/components/masterData/AssessmentHero";
import { AssessmentStats } from "@/features/assessment/components/masterData/AssessmentStats";
import { CategorySwitcher } from "@/features/assessment/components/masterData/CategorySwitcher";
import { CategoryHeaderCard } from "@/features/assessment/components/masterData/CategoryHeaderCard";
import { QuestionToolbar } from "@/features/assessment/components/masterData/QuestionToolbar";
import { SectionsList } from "@/features/assessment/components/masterData/SectionsList";
import { GenerateCodeDialog } from "@/features/assessment/components/masterData/GenerateCodeDialog";
import { CategoryDialog } from "@/features/assessment/components/masterData/CategoryDialog";
import { QuestionDialog } from "@/features/assessment/components/masterData/QuestionDialog";
import { SectionDialog } from "@/features/assessment/components/masterData/SectionDialog";

export default function AssessmentMasterData() {
  const { confirm, confirmDialog } = useConfirm();
  const { categories, addCategory, updateCategory, deleteCategory } = useAssessments();
  const { clients, updateClient } = useClients();
  const { quadrants, quadrantMap } = useMasterData();

  // Active category selection tab
  const [selectedCatId, setSelectedCatId] = useState(() => categories[0]?.id || "cat-001");

  // Filtering & Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedQuadrant, setSelectedQuadrant] = useState("ALL");
  const [selectedType, setSelectedType] = useState("ALL");
  const [selectedDomainId, setSelectedDomainId] = useState("ALL");

  // Collapsed / Expanded sections tracker (default: all collapsed)
  const [expandedSections, setExpandedSections] = useState({});

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

  const totalDomainsOverall = useMemo(() => {
    return categories.reduce((acc, cat) => {
      const dCount = cat.sections && cat.sections.length > 0
        ? cat.sections.length
        : (cat.domain ? 1 : (cat.questions?.length ? 1 : 0));
      return acc + dCount;
    }, 0);
  }, [categories]);

  // Calculate quadrant counts for active category
  const activeQuadCounts = useMemo(() => {
    return getQuadrantCounts(activeCategory, quadrants);
  }, [activeCategory, quadrants]);

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

  // Toggle collapse / expand state for a section (default is collapsed)
  const toggleSectionCollapse = (secId) => {
    setExpandedSections((prev) => ({
      ...prev,
      [secId]: !prev[secId],
    }));
  };

  const expandAllSections = () => {
    const allExpanded = {};
    filteredSections.forEach((s) => {
      allExpanded[s.sectionId] = true;
    });
    setExpandedSections(allExpanded);
  };

  const collapseAllSections = () => {
    setExpandedSections({});
  };

  const areAllExpanded = useMemo(() => {
    if (filteredSections.length === 0) return false;
    return filteredSections.every((s) => Boolean(expandedSections[s.sectionId]));
  }, [filteredSections, expandedSections]);

  const areAllCollapsed = useMemo(() => {
    if (filteredSections.length === 0) return true;
    return filteredSections.every((s) => !expandedSections[s.sectionId]);
  }, [filteredSections, expandedSections]);

  // Otomatis tutup semua saat ganti template kategori
  useEffect(() => {
    setExpandedSections({});
  }, [selectedCatId]);

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
      status: advanceStatus(targetClient.status, "service_selected"),
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

  const handleDeleteCategory = async (catId, catName) => {
    if (categories.length <= 1) {
      toast.error("Minimal harus terdapat 1 kategori asesmen master.");
      return;
    }
    const ok = await confirm({
      title: "Hapus template asesmen?",
      description: `Template "${catName}" beserta seluruh bank soal di dalamnya akan dihapus.`,
    });
    if (!ok) return;
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

  const removeSection = async (categoryId, sectionId, sectionTitle) => {
    const ok = await confirm({
      title: "Hapus domain?",
      description: `Domain "${sectionTitle}" beserta seluruh butir soal di dalamnya akan dihapus.`,
    });
    if (!ok) return;
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
      {confirmDialog}
      {/* 1. TOP HERO HEADER & METRICS BAR */}
      <AssessmentHero openGenModal={openGenModal} setCatDialog={setCatDialog} />

      {/* 2. STATS & CLINICAL FRAMEWORK CARDS */}
      <AssessmentStats activeCategory={activeCategory} categories={categories} quadrants={quadrants} totalDomainsOverall={totalDomainsOverall} totalQuestionsOverall={totalQuestionsOverall} />

      {/* 3. CATEGORY SWITCHER CARDS (SPACIOUS HORIZONTAL SELECTOR) */}
      <CategorySwitcher categories={categories} selectedCatId={selectedCatId} setSelectedCatId={setSelectedCatId} />

      {/* 4. ACTIVE CATEGORY STUDIO / WORKSPACE (FULL WIDTH & SPACIOUS) */}
      {activeCategory && (
        <div className="space-y-6">
          {/* Active Category Header Card */}
          <CategoryHeaderCard activeCategory={activeCategory} activeCategoryTotalQuestions={activeCategoryTotalQuestions} activeQuadCounts={activeQuadCounts} handleDeleteCategory={handleDeleteCategory} openGenModal={openGenModal} quadrants={quadrants} setCatDialog={setCatDialog} setSecDialog={setSecDialog} />

          {/* 5. SEARCH, FILTER & SECTION CONTROL TOOLBAR */}
          <QuestionToolbar activeCategory={activeCategory} activeCategoryTotalQuestions={activeCategoryTotalQuestions} areAllCollapsed={areAllCollapsed} areAllExpanded={areAllExpanded} collapseAllSections={collapseAllSections} expandAllSections={expandAllSections} quadrants={quadrants} searchQuery={searchQuery} selectedDomainId={selectedDomainId} selectedQuadrant={selectedQuadrant} selectedType={selectedType} setSearchQuery={setSearchQuery} setSelectedDomainId={setSelectedDomainId} setSelectedQuadrant={setSelectedQuadrant} setSelectedType={setSelectedType} />

          {/* 6. DOMAIN SECTIONS & QUESTIONS LIST (NO CRAMPED MAX-H-72 SCROLLBOX) */}
          <SectionsList activeCategory={activeCategory} duplicateQuestion={duplicateQuestion} expandedSections={expandedSections} filteredSections={filteredSections} openAddQuestion={openAddQuestion} openEditQuestion={openEditQuestion} quadrantMap={quadrantMap} removeQuestion={removeQuestion} removeSection={removeSection} searchQuery={searchQuery} selectedQuadrant={selectedQuadrant} selectedType={selectedType} setSearchQuery={setSearchQuery} setSecDialog={setSecDialog} setSelectedQuadrant={setSelectedQuadrant} setSelectedType={setSelectedType} toggleSectionCollapse={toggleSectionCollapse} />
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: TERBITKAN KODE KUESIONER (MULTI-CODE ENGINE)                       */}
      {/* ========================================================================= */}
      <GenerateCodeDialog categories={categories} clients={clients} genDialog={genDialog} handleConfirmGenerateCode={handleConfirmGenerateCode} setGenDialog={setGenDialog} />

      {/* ========================================================================= */}
      {/* MODAL: TAMBAH / EDIT KATEGORI                                             */}
      {/* ========================================================================= */}
      <CategoryDialog catDialog={catDialog} saveCategory={saveCategory} setCatDialog={setCatDialog} />

      {/* ========================================================================= */}
      {/* MODAL: TAMBAH / EDIT BUTIR SOAL                                           */}
      {/* ========================================================================= */}
      <QuestionDialog addOptionToDialog={addOptionToDialog} applyOptionPreset={applyOptionPreset} qDialog={qDialog} quadrants={quadrants} removeOptionFromDialog={removeOptionFromDialog} saveQuestion={saveQuestion} setQDialog={setQDialog} updateOptionText={updateOptionText} />

      {/* ========================================================================= */}
      {/* MODAL: TAMBAH / EDIT DOMAIN & SEKSI KLINIS                                */}
      {/* ========================================================================= */}
      <SectionDialog saveSection={saveSection} secDialog={secDialog} setSecDialog={setSecDialog} />
    </div>
  );
}
