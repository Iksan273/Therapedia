import React, { useState, useMemo, useEffect } from "react";
import { useConfirm } from "@/shared/components/ConfirmDialog";
import { toast } from "sonner";
import { useAssessments, useCategoryTree } from "@/stores/assessmentsStore";
import { useClients } from "@/stores/clientsStore";
import { useCredits } from "@/stores/creditsStore";
import { apiErrorText } from "@/domain/auth";
import { isApiMode } from "@/config/env";
import { DetailSkeleton } from "@/shared/components/LoadingSkeletons";
import { CODE_VALIDITY_OPTIONS, buildQuestionnaireLink, countCategoryQuestions, countCategorySections, isQuestionRequired, moveId, moveIdTo, suggestCopyName, suggestCopyTypeCode, isTypeCodeTaken, isValidDocumentUrl, normalizeTypeCode } from "@/domain/assessment";
import { normalizeTemplate } from "@/domain/assessmentTemplate";
import { useQuestionnaireCodeActions } from "@/features/inquiry";

import { DEFAULT_QUESTION_OPTIONS, isOptionBasedType, makeQuestionDialog, makeSectionDialog, normalizeQuestionType } from "@/features/assessment/components/masterData/assessmentConfig";
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

const apiMode = isApiMode();
const NO_CLIENTS = [];

export default function AssessmentMasterData() {
  const { confirm, confirmDialog } = useConfirm();
  const { categories, isLoading, createCategory, duplicateCategory, updateCategory, deleteCategory, createSection, updateSection, deleteSection, reorderSections, uploadSectionDocument, deleteSectionDocument, fetchSectionDocument, createQuestion, updateQuestion, deleteQuestion } = useAssessments();
  // Penerbitan kode dari halaman ini hanya di mode demo; mode API menerbitkan dari detail client (daftar client tidak dibaca di sini)
  const clientsStore = useClients();
  const clients = apiMode ? NO_CLIENTS : clientsStore.clients;
  const codeActions = useQuestionnaireCodeActions();
  const creditsStore = useCredits();
  const masterPackages = apiMode ? [] : creditsStore.getActiveMasterPackages();

  // Active category selection tab (kosong / tak valid = kategori pertama)
  const [pickedCatId, setSelectedCatId] = useState("");
  const selectedCatId = categories.some((c) => c.id === pickedCatId) ? pickedCatId : categories[0]?.id || "";

  // Filtering & Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("ALL");
  const [selectedDomainId, setSelectedDomainId] = useState("ALL");

  // Collapsed / Expanded sections tracker (default: all collapsed)
  const [expandedSections, setExpandedSections] = useState({});

  // Dialog states
  const [catDialog, setCatDialog] = useState({ open: false, editingId: null, name: "", domain: "", typeCode: "", respondentProfile: "parent" });
  const [qDialog, setQDialog] = useState(() => makeQuestionDialog());
  const [secDialog, setSecDialog] = useState(() => makeSectionDialog());

  const [genDialog, setGenDialog] = useState({
    open: false,
    selectedClientId: "",
    selectedCategoryId: "",
    generatedCode: "",
    validity: "none",
    servicePackageId: "",
    withInvoice: true,
  });

  // Calculate active category
  // Mode API: ringkasan dari daftar + pohon (section/soal) hanya untuk kategori yang dibuka
  const tree = useCategoryTree(selectedCatId);
  const treeLoading = tree.isLoading;
  const activeCategory = useMemo(() => {
    const item = categories.find((c) => c.id === selectedCatId) || categories[0] || null;
    return item ? { ...item, ...(tree.category || {}) } : null;
  }, [categories, selectedCatId, tree.category]);

  // Overall statistics across all categories
  const totalQuestionsOverall = useMemo(() => {
    return categories.reduce((acc, cat) => acc + countCategoryQuestions(cat), 0);
  }, [categories]);

  const totalDomainsOverall = useMemo(() => {
    return categories.reduce((acc, cat) => acc + countCategorySections(cat), 0);
  }, [categories]);

  const activeCategoryTotalQuestions = useMemo(() => {
    return countCategoryQuestions(activeCategory);
  }, [activeCategory]);

  // Filtered sections and questions in active category
  const filteredSections = useMemo(() => {
    if (!activeCategory || treeLoading) return [];
    const query = searchQuery.trim().toLowerCase();

    const processQuestions = (questions) => {
      return (questions || []).filter((q) => {
        // Query search
        if (query) {
          const matchText = (q.question || "").toLowerCase().includes(query);
          const matchItem = String(q.itemNo || "").includes(query);
          if (!matchText && !matchItem) return false;
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
        description: "",
        filteredQuestions: matched,
        totalOriginalCount: activeCategory.questions?.length || 0,
      },
    ];
  }, [activeCategory, treeLoading, searchQuery, selectedType, selectedDomainId]);

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
    const catId = preferredCatId || activeCategory?.id || categories[0]?.id || "";
    const cat = categories.find((c) => c.id === catId);
    setGenDialog({
      open: true,
      selectedClientId: clients[0]?.id || "",
      selectedCategoryId: catId,
      generatedCode: codeActions.previewCode(cat),
      validity: "none",
      servicePackageId: "",
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

    const servicePackage = masterPackages.find((m) => m.id === genDialog.servicePackageId);
    const withInvoice = genDialog.withInvoice !== false;
    if (withInvoice && !servicePackage) {
      toast.error("Pilih layanan dulu: harganya dipakai untuk invoice assessment.");
      return;
    }
    const option = CODE_VALIDITY_OPTIONS.find((o) => o.value === genDialog.validity);
    codeActions.issueCode(targetClient, targetCat, {
      servicePackage,
      withInvoice,
      code: genDialog.generatedCode,
      validityDays: option?.days ?? null,
      targetStatus: "service_selected",
    });

    const link = buildQuestionnaireLink(genDialog.generatedCode, window.location.origin);
    toast.success(`Kode kuesioner ${genDialog.generatedCode} berhasil diterbitkan untuk ${targetClient.clientName}!`, {
      action: { label: "Salin Link", onClick: () => { navigator.clipboard.writeText(link); toast.success("Link kuesioner disalin."); } },
    });
    setGenDialog((prev) => ({ ...prev, open: false }));
  };

  // Aksi tulis memakai kontrak per entity yang sama di mode demo dan API. Mode API melempar ApiError (409 versi usang / in_use,
  // 422 validasi): pesan server ditampilkan, dialog dibiarkan terbuka agar input tidak hilang.
  const fail = (err, fields = []) => toast.error(apiErrorText(err, fields));

  const saveCategory = async () => {
    const name = catDialog.name.trim();
    if (!name) {
      toast.error("Nama kategori asesmen wajib diisi.");
      return;
    }
    const typeCode = normalizeTypeCode(catDialog.typeCode);
    if (!typeCode) {
      toast.error("Kode jenis asesmen wajib diisi (huruf/angka, mis. SP2).");
      return;
    }
    if (isTypeCodeTaken(categories, typeCode, catDialog.editingId)) {
      toast.error(`Kode jenis "${typeCode}" sudah dipakai template lain.`);
      return;
    }
    try {
      if (catDialog.editingId) {
        await updateCategory(catDialog.editingId, { categoryName: name, domain: catDialog.domain, typeCode, respondentProfile: catDialog.respondentProfile || "none" });
        toast.success("Kategori asesmen diperbarui.");
      } else {
        const created = await createCategory({ typeCode, categoryName: name, domain: catDialog.domain, respondentProfile: catDialog.respondentProfile || "parent" });
        setSelectedCatId(created.id);
        toast.success("Kategori asesmen baru berhasil dibuat.");
      }
      setCatDialog({ open: false, editingId: null, name: "", domain: "", typeCode: "", respondentProfile: "parent" });
    } catch (err) {
      fail(err, ["type_code", "name", "respondent_profile", "version"]);
    }
  };

  // Duplikat: langsung tersimpan (tanpa dialog) dengan nama "(Salinan)" dan kode jenis otomatis; keduanya bisa diubah lewat "Ubah Nama".
  const [duplicating, setDuplicating] = useState(false);
  const handleDuplicateCategory = async (cat) => {
    if (duplicating) return;
    const typeCode = suggestCopyTypeCode(cat.typeCode, categories.map((c) => c.typeCode));
    const name = suggestCopyName(cat.categoryName, categories.map((c) => c.categoryName));
    setDuplicating(true);
    try {
      const created = await duplicateCategory(cat.id, { typeCode, categoryName: name, domain: cat.domain, respondentProfile: cat.respondentProfile || "none" });
      setSelectedCatId(created.id);
      toast.success(`Template "${name}" dibuat dan tersimpan (kode jenis ${typeCode}). Ubah nama/kode lewat "Ubah Nama", lalu hapus soal yang tidak perlu dan tambah yang diperlukan.`);
    } catch (err) {
      fail(err, ["type_code", "name"]);
    } finally {
      setDuplicating(false);
    }
  };

  // Urutan domain/section: tombol naik/turun atau seret; setiap perubahan LANGSUNG tersimpan (tanpa tombol simpan)
  const reorderEnabled = selectedDomainId === "ALL" && !treeLoading && (activeCategory?.sections?.length || 0) > 1;
  const saveSectionOrder = async (ids) => {
    try {
      await reorderSections(activeCategory.id, ids);
      toast.success("Urutan domain disimpan.");
    } catch (err) {
      fail(err, ["ids"]);
    }
  };
  const currentSectionIds = () => (activeCategory?.sections || []).map((s) => s.sectionId);
  const moveSection = (sectionId, delta) => {
    const ids = currentSectionIds();
    const next = moveId(ids, sectionId, delta);
    if (next !== ids) saveSectionOrder(next);
  };
  const dropSection = (fromId, targetId) => {
    const ids = currentSectionIds();
    const next = moveIdTo(ids, fromId, targetId);
    if (next !== ids) saveSectionOrder(next);
  };

  const handleDeleteCategory = async (catId, catName) => {
    if (categories.length <= 1) {
      toast.error("Minimal harus terdapat 1 kategori asesmen master.");
      return;
    }
    // Mode demo: template yang sudah dipakai (ada kode kuesioner terbit/terisi) tidak bisa dihapus. Mode API: server menolak (409 in_use).
    if (!apiMode) {
      const usedBy = (clients || []).reduce((n, c) => n + (c.assessmentCodes || []).filter((code) => code.categoryId === catId).length, 0);
      if (usedBy > 0) {
        toast.error(`Template "${catName}" sudah dipakai di ${usedBy} kode kuesioner. Hapus kodenya dulu atau gunakan template lain.`);
        return;
      }
    }
    const ok = await confirm({
      title: "Hapus template asesmen?",
      description: `Template "${catName}" beserta seluruh bank soal di dalamnya akan dihapus permanen.`,
    });
    if (!ok) return;
    try {
      await deleteCategory(catId);
      const remaining = categories.filter((c) => c.id !== catId);
      setSelectedCatId(remaining[0]?.id || "");
      toast.success(`Template "${catName}" telah dihapus.`);
    } catch (err) {
      fail(err);
    }
  };

  // Open Add Question with defaults
  const openAddQuestion = (catId, secId = null) => {
    setQDialog(makeQuestionDialog({ open: true, categoryId: catId, sectionId: secId }));
  };

  // Open Edit Question pre-populated with saved data
  const openEditQuestion = (catId, secId, q) => {
    const rawType = q.type || "scale_0_5";
    const normalizedType = normalizeQuestionType(rawType);

    let parsedOpts = [];
    if (Array.isArray(q.options) && q.options.length > 0) {
      parsedOpts = [...q.options];
    } else if (typeof q.options === "string" && q.options.trim()) {
      parsedOpts = q.options.split(",").map((o) => o.trim()).filter(Boolean);
    } else {
      parsedOpts = [...DEFAULT_QUESTION_OPTIONS];
    }

    setQDialog(
      makeQuestionDialog({
        open: true,
        categoryId: catId,
        sectionId: secId,
        editingId: q.id,
        text: q.question || "",
        type: normalizedType,
        options: parsedOpts,
        scaleMin: q.scaleMin !== undefined ? q.scaleMin : (normalizedType === "range" ? 1 : 0),
        scaleMax: q.scaleMax !== undefined ? q.scaleMax : 5,
        minLabel: q.minLabel || (normalizedType === "range" ? "Sangat Rendah / Jarang" : "Tidak Berlaku"),
        maxLabel: q.maxLabel || (normalizedType === "range" ? "Sangat Tinggi / Sering" : "Hampir Selalu"),
        required: isQuestionRequired(q),
      })
    );
  };

  const duplicateQuestion = async (catId, secId, q) => {
    const { id: _id, itemNo: _itemNo, ...rest } = q; // eslint-disable-line no-unused-vars
    try {
      await createQuestion(catId, secId, { ...rest, question: `${q.question} (Salinan)` });
      toast.success("Butir pertanyaan berhasil diduplikasi.");
    } catch (err) {
      fail(err, ["question", "options"]);
    }
  };

  const saveQuestion = async () => {
    const text = qDialog.text.trim();
    if (!text) {
      toast.error("Teks pertanyaan tidak boleh kosong.");
      return;
    }
    const category = categories.find((c) => c.id === qDialog.categoryId);
    if (!category) return;

    const isOptionBased = isOptionBasedType(qDialog.type);
    const cleanOptions = (qDialog.options || []).map((o) => o.trim()).filter(Boolean);
    if (isOptionBased && cleanOptions.length === 0) {
      toast.error("Mohon sediakan minimal 1 pilihan opsi jawaban.");
      return;
    }

    const payload = {
      question: text,
      type: qDialog.type || "scale_0_5",
      options: isOptionBased ? cleanOptions : [],
      scaleMin: qDialog.type === "range" ? (parseInt(qDialog.scaleMin, 10) || 1) : 0,
      scaleMax: qDialog.type === "range" ? (parseInt(qDialog.scaleMax, 10) || 5) : 5,
      minLabel: qDialog.type === "range" ? (qDialog.minLabel.trim() || "Min") : "Tidak Berlaku",
      maxLabel: qDialog.type === "range" ? (qDialog.maxLabel.trim() || "Max") : "Hampir Selalu",
      required: qDialog.required !== false,
    };

    try {
      if (qDialog.editingId) {
        await updateQuestion(category.id, qDialog.sectionId, qDialog.editingId, payload);
        toast.success("Pertanyaan berhasil diperbarui.");
      } else {
        await createQuestion(category.id, qDialog.sectionId, payload);
        toast.success("Pertanyaan baru ditambahkan.");
      }
      setQDialog(makeQuestionDialog());
    } catch (err) {
      fail(err, ["question", "options", "range_max"]);
    }
  };

  const removeQuestion = async (categoryId, questionId, sectionId = null) => {
    try {
      await deleteQuestion(categoryId, sectionId, questionId);
      toast.success("Pertanyaan dihapus.");
    } catch (err) {
      fail(err);
    }
  };

  const saveSection = async () => {
    const title = secDialog.title.trim();
    if (!title) {
      toast.error("Nama domain / seksi klinis wajib diisi.");
      return;
    }
    const documentUrl = secDialog.documentUrl.trim();
    if (documentUrl && !isValidDocumentUrl(documentUrl)) {
      toast.error("Link dokumen harus dari Google Docs / Google Drive (https) atau PDF di aplikasi (/documents/nama.pdf).");
      return;
    }
    const category = categories.find((c) => c.id === secDialog.categoryId);
    if (!category) return;

    const fields = { title, description: secDialog.description.trim(), documentUrl, template: normalizeTemplate(secDialog.template) };
    try {
      let sectionId = secDialog.editingSectionId;
      if (sectionId) {
        await updateSection(category.id, sectionId, fields);
      } else {
        const created = await createSection(category.id, fields);
        sectionId = created?.sectionId;
      }
      // File PDF (mode API): unggah menggantikan link; hapus hanya bila tidak digantikan link baru
      let fileFailed = false;
      if (apiMode && sectionId) {
        try {
          if (secDialog.pendingFile) await uploadSectionDocument(category.id, sectionId, secDialog.pendingFile);
          else if (secDialog.removeFile && !documentUrl && secDialog.existingFile) await deleteSectionDocument(category.id, sectionId);
        } catch (err) {
          fileFailed = true;
          fail(err, ["file"]);
        }
      }
      if (fileFailed) {
        // Section sudah tersimpan; dialog beralih ke mode edit agar PDF bisa dicoba lagi tanpa membuat section ganda
        setSecDialog((prev) => ({ ...prev, editingSectionId: sectionId }));
        return;
      }
      toast.success(secDialog.editingSectionId ? `Section "${title}" diperbarui.` : `Section "${title}" berhasil ditambahkan.`);
      setSecDialog(makeSectionDialog());
    } catch (err) {
      fail(err, ["title", "document_url", "result_template"]);
    }
  };

  const removeSection = async (categoryId, sectionId, sectionTitle) => {
    const ok = await confirm({
      title: "Hapus domain?",
      description: `Domain "${sectionTitle}" beserta seluruh butir soal di dalamnya akan dihapus.`,
    });
    if (!ok) return;
    try {
      await deleteSection(categoryId, sectionId);
      toast.success(`Domain "${sectionTitle}" telah dihapus.`);
    } catch (err) {
      fail(err);
    }
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
      <AssessmentHero openGenModal={apiMode ? null : openGenModal} setCatDialog={setCatDialog} />

      {/* Muat pertama (mode API): kerangka shimmer, bukan halaman kosong */}
      {isLoading && <DetailSkeleton sections={3} label="Memuat bank asesmen…" testId="assessment-master-skeleton" />}

      {/* 2. STATS & CLINICAL FRAMEWORK CARDS */}
      <AssessmentStats activeCategory={activeCategory} categories={categories} totalDomainsOverall={totalDomainsOverall} totalQuestionsOverall={totalQuestionsOverall} />

      {/* 3. CATEGORY SWITCHER CARDS (SPACIOUS HORIZONTAL SELECTOR) */}
      <CategorySwitcher categories={categories} selectedCatId={selectedCatId} setSelectedCatId={setSelectedCatId} />

      {/* 4. ACTIVE CATEGORY STUDIO / WORKSPACE (FULL WIDTH & SPACIOUS) */}
      {activeCategory && (
        <div className="space-y-6">
          {/* Active Category Header Card */}
          <CategoryHeaderCard activeCategory={activeCategory} activeCategoryTotalQuestions={activeCategoryTotalQuestions} duplicating={duplicating} onDuplicate={handleDuplicateCategory} handleDeleteCategory={handleDeleteCategory} openGenModal={apiMode ? null : openGenModal} setCatDialog={setCatDialog} setSecDialog={setSecDialog} />

          {treeLoading && <DetailSkeleton sections={3} label="Memuat section dan soal…" testId="assessment-tree-skeleton" />}

          {/* 5. SEARCH, FILTER & SECTION CONTROL TOOLBAR */}
          {!treeLoading && <QuestionToolbar activeCategory={activeCategory} activeCategoryTotalQuestions={activeCategoryTotalQuestions} areAllCollapsed={areAllCollapsed} areAllExpanded={areAllExpanded} collapseAllSections={collapseAllSections} expandAllSections={expandAllSections} searchQuery={searchQuery} selectedDomainId={selectedDomainId} selectedType={selectedType} setSearchQuery={setSearchQuery} setSelectedDomainId={setSelectedDomainId} setSelectedType={setSelectedType} />}

          {/* 6. DOMAIN SECTIONS & QUESTIONS LIST (NO CRAMPED MAX-H-72 SCROLLBOX) */}
          {!treeLoading && <SectionsList activeCategory={activeCategory} duplicateQuestion={duplicateQuestion} expandedSections={expandedSections} filteredSections={filteredSections} onDropSection={dropSection} onMoveSection={moveSection} reorderEnabled={reorderEnabled} openAddQuestion={openAddQuestion} openEditQuestion={openEditQuestion} removeQuestion={removeQuestion} removeSection={removeSection} searchQuery={searchQuery} selectedType={selectedType} setSearchQuery={setSearchQuery} setSecDialog={setSecDialog} setSelectedType={setSelectedType} toggleSectionCollapse={toggleSectionCollapse} />}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: TERBITKAN KODE KUESIONER (MULTI-CODE ENGINE)                       */}
      {/* ========================================================================= */}
      {!apiMode && <GenerateCodeDialog masterPackages={masterPackages} categories={categories} clients={clients} genDialog={genDialog} handleConfirmGenerateCode={handleConfirmGenerateCode} previewCode={codeActions.previewCode} setGenDialog={setGenDialog} />}

      {/* ========================================================================= */}
      {/* MODAL: TAMBAH / EDIT KATEGORI                                             */}
      {/* ========================================================================= */}
      <CategoryDialog catDialog={catDialog} saveCategory={saveCategory} setCatDialog={setCatDialog} />

      {/* ========================================================================= */}
      {/* MODAL: TAMBAH / EDIT BUTIR SOAL                                           */}
      {/* ========================================================================= */}
      <QuestionDialog addOptionToDialog={addOptionToDialog} applyOptionPreset={applyOptionPreset} qDialog={qDialog} removeOptionFromDialog={removeOptionFromDialog} saveQuestion={saveQuestion} setQDialog={setQDialog} updateOptionText={updateOptionText} />

      {/* ========================================================================= */}
      {/* MODAL: TAMBAH / EDIT DOMAIN & SEKSI KLINIS                                */}
      {/* ========================================================================= */}
      <SectionDialog fetchDocument={fetchSectionDocument} saveSection={saveSection} secDialog={secDialog} setSecDialog={setSecDialog} />
    </div>
  );
}
