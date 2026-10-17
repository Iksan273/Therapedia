import React, { createContext, useContext, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usePersistentReducer } from "@/shared/hooks/usePersistentState";
import { getSeedLoader } from "@/data/seedRegistry";
import { isApiMode } from "@/config/env";
import { isStaffSession } from "@/domain/auth";
import { useDemand } from "@/shared/hooks/useDemand";
import { api } from "@/services/http/httpClient";
import { ENDPOINTS } from "@/services/api/endpoints";
import {
  categoryCreateToApi,
  categoryFromApi,
  categoryUpdateToApi,
  questionFromApi,
  questionToApi,
  sectionFromApi,
  sectionToApi,
} from "@/services/api/mappers/assessmentMapper";
import { uid } from "@/shared/lib/id";
import { useAuth } from "@/stores/authStore";

const AssessmentsContext = createContext(null);

// ---------------------------------------------------------------- Mode demo (localStorage)
// Pohon kategori (kategori → section → soal) disimpan utuh. Aksi per entity di bawah ini adalah kontrak yang SAMA dengan
// mode API (halaman Master Asesmen memakai aksi per entity, bukan menimpa seluruh pohon), supaya kode halaman satu jalur.
const mapSections = (category, fn) => ({ ...category, sections: (category.sections || []).map(fn) });

function categoriesReducer(state, action) {
  switch (action.type) {
    case "ADD":
      return [...state, action.category];
    case "UPDATE":
      return state.map((c) => (c.id === action.id ? { ...c, ...action.patch } : c));
    case "DELETE":
      return state.filter((c) => c.id !== action.id);
    case "SECTION_ADD":
      return state.map((c) => (c.id === action.categoryId ? { ...c, sections: [...(c.sections || []), action.section] } : c));
    case "SECTION_UPDATE":
      return state.map((c) =>
        c.id !== action.categoryId
          ? c
          : mapSections(c, (s) => {
              if (s.sectionId !== action.sectionId) return s;
              const { leadText: legacyLeadText, ...rest } = s; // eslint-disable-line no-unused-vars
              return { ...rest, ...action.fields };
            })
      );
    case "SECTIONS_REORDER": {
      // urutan = posisi id di `ids`; section yang tidak disebut tetap di akhir
      return state.map((c) => {
        if (c.id !== action.categoryId) return c;
        const rank = new Map(action.ids.map((id, i) => [id, i]));
        const sections = [...(c.sections || [])].sort((a, b) => (rank.get(a.sectionId) ?? 1e9) - (rank.get(b.sectionId) ?? 1e9));
        return { ...c, sections };
      });
    }
    case "SECTION_DELETE":
      return state.map((c) => (c.id === action.categoryId ? { ...c, sections: (c.sections || []).filter((s) => s.sectionId !== action.sectionId) } : c));
    case "QUESTION_ADD":
      return state.map((c) => {
        if (c.id !== action.categoryId) return c;
        if (c.sections && c.sections.length > 0) {
          const targetId = action.sectionId || c.sections[0].sectionId;
          return mapSections(c, (s) => (s.sectionId === targetId ? { ...s, questions: [...(s.questions || []), { ...action.question, itemNo: (s.questions || []).length + 1 }] } : s));
        }
        return { ...c, questions: [...(c.questions || []), action.question] };
      });
    case "QUESTION_UPDATE":
      return state.map((c) => {
        if (c.id !== action.categoryId) return c;
        const patch = (q) => (q.id === action.questionId ? { ...q, ...action.fields, itemNo: q.itemNo || 1 } : q);
        if (c.sections && c.sections.length > 0) return mapSections(c, (s) => ({ ...s, questions: (s.questions || []).map(patch) }));
        return { ...c, questions: (c.questions || []).map(patch) };
      });
    case "QUESTION_DELETE":
      return state.map((c) => {
        if (c.id !== action.categoryId) return c;
        const keep = (q) => q.id !== action.questionId;
        if (c.sections && c.sections.length > 0) return mapSections(c, (s) => ({ ...s, questions: (s.questions || []).filter(keep) }));
        return { ...c, questions: (c.questions || []).filter(keep) };
      });
    default:
      return state;
  }
}

const LocalAssessmentsProvider = ({ children }) => {
  const [categories, dispatch] = usePersistentReducer("assessment_categories", categoriesReducer, () => getSeedLoader().loadCategoriesSeed());

  const value = {
    categories,
    isLoading: false,
    getCategory: (id) => categories.find((c) => c.id === id),
    // Aksi lama (tetap tersedia): tambah / ubah / hapus utuh
    addCategory: (category) => dispatch({ type: "ADD", category }),
    updateCategory: async (id, patch) => dispatch({ type: "UPDATE", id, patch }),
    deleteCategory: async (id) => dispatch({ type: "DELETE", id }),
    // Aksi per entity (kontrak sama dengan mode API)
    createCategory: async (form) => {
      const category = {
        id: uid(),
        typeCode: form.typeCode,
        respondentProfile: form.respondentProfile || "parent",
        categoryName: form.categoryName,
        domain: form.domain || "Clinical Assessment",
        questions: [],
        sections: [{ sectionId: `sec-${uid()}`, title: "Bagian Umum", description: "", documentUrl: "", questions: [] }],
      };
      dispatch({ type: "ADD", category });
      return category;
    },
    // Duplikat template: salinan dalam (id section & soal baru) dengan kode jenis & nama baru; asal tidak berubah
    duplicateCategory: async (sourceId, form) => {
      const source = categories.find((c) => c.id === sourceId);
      if (!source) throw new Error("Template asal tidak ditemukan.");
      const copy = {
        ...source,
        id: uid(),
        typeCode: form.typeCode,
        categoryName: form.categoryName,
        domain: form.domain ?? source.domain,
        respondentProfile: form.respondentProfile || source.respondentProfile || "parent",
        sections: (source.sections || []).map((s) => ({ ...s, sectionId: `sec-${uid()}`, questions: (s.questions || []).map((q) => ({ ...q, id: uid(), options: Array.isArray(q.options) ? [...q.options] : q.options })) })),
        questions: (source.questions || []).map((q) => ({ ...q, id: uid(), options: Array.isArray(q.options) ? [...q.options] : q.options })),
      };
      dispatch({ type: "ADD", category: copy });
      return copy;
    },
    createSection: async (categoryId, fields) => dispatch({ type: "SECTION_ADD", categoryId, section: { sectionId: `sec-${uid()}`, ...fields, questions: [] } }),
    updateSection: async (categoryId, sectionId, fields) => dispatch({ type: "SECTION_UPDATE", categoryId, sectionId, fields }),
    deleteSection: async (categoryId, sectionId) => dispatch({ type: "SECTION_DELETE", categoryId, sectionId }),
    reorderSections: async (categoryId, orderedIds) => dispatch({ type: "SECTIONS_REORDER", categoryId, ids: orderedIds }),
    createQuestion: async (categoryId, sectionId, fields) => dispatch({ type: "QUESTION_ADD", categoryId, sectionId, question: { id: uid(), ...fields } }),
    updateQuestion: async (categoryId, _sectionId, questionId, fields) => dispatch({ type: "QUESTION_UPDATE", categoryId, questionId, fields }),
    deleteQuestion: async (categoryId, _sectionId, questionId) => dispatch({ type: "QUESTION_DELETE", categoryId, questionId }),
  };

  return <AssessmentsContext.Provider value={value}>{children}</AssessmentsContext.Provider>;
};

// ---------------------------------------------------------------- Mode API (Laravel M5)
// Daftar kategori (ringkasan jumlah) hanya diambil saat ada komponen yang membacanya; pohon lengkap (section + soal) hanya
// untuk kategori yang dibuka (`useCategoryTree`). Mutasi per entity mengirim `version` kategori; error ApiError dilempar ke pemanggil
// (409 `version_conflict` / `in_use`, 422 validasi).
export const CATEGORIES_QUERY_KEY = ["assessment-categories"];
const treeKey = (id) => [...CATEGORIES_QUERY_KEY, "tree", String(id)];

const ApiAssessmentsProvider = ({ children }) => {
  const { auth } = useAuth();
  const queryClient = useQueryClient();
  const staff = isStaffSession(auth);

  const { demand, isOn, loading } = useDemand(staff);
  const { data, isLoading } = useQuery({
    queryKey: [...CATEGORIES_QUERY_KEY, "list"],
    queryFn: ({ signal }) => api.get(ENDPOINTS.assessmentCategories.list, undefined, { signal }).then((rows) => rows.map(categoryFromApi)),
    enabled: staff && isOn("categories"),
    staleTime: 60_000,
  });
  const categories = useMemo(() => data ?? [], [data]);

  const refresh = (categoryId) => {
    queryClient.invalidateQueries({ queryKey: [...CATEGORIES_QUERY_KEY, "list"] });
    if (categoryId) queryClient.invalidateQueries({ queryKey: treeKey(categoryId) });
  };
  // Versi terbaru kategori (dari pohon yang dibuka, bila ada, kalau tidak dari daftar)
  const versionOf = (id) => queryClient.getQueryData(treeKey(id))?.version ?? categories.find((c) => c.id === String(id))?.version;

  const actions = {
    createCategory: async (form) => {
      const created = categoryFromApi(await api.post(ENDPOINTS.assessmentCategories.list, categoryCreateToApi(form)));
      // Kategori baru langsung punya satu section kosong agar soal bisa ditambahkan (sama dengan mode demo)
      await api.post(ENDPOINTS.assessmentCategories.sections(created.id), { title: "Bagian Umum" });
      refresh(created.id);
      return created;
    },
    duplicateCategory: async (sourceId, form) => {
      const created = categoryFromApi(await api.post(ENDPOINTS.assessmentCategories.duplicate(sourceId), categoryCreateToApi(form)));
      refresh(created.id);
      return created;
    },
    updateCategory: async (id, patch) => {
      const next = categoryFromApi(await api.patch(ENDPOINTS.assessmentCategories.detail(id), categoryUpdateToApi(patch, versionOf(id))));
      refresh(id);
      return next;
    },
    deleteCategory: async (id) => {
      await api.delete(ENDPOINTS.assessmentCategories.detail(id));
      queryClient.removeQueries({ queryKey: treeKey(id) });
      refresh();
    },
    createSection: async (categoryId, fields) => {
      const section = sectionFromApi(await api.post(ENDPOINTS.assessmentCategories.sections(categoryId), sectionToApi(fields)));
      refresh(categoryId);
      return section;
    },
    updateSection: async (categoryId, sectionId, fields) => {
      const section = sectionFromApi(await api.patch(ENDPOINTS.assessmentSections.detail(sectionId), sectionToApi(fields)));
      refresh(categoryId);
      return section;
    },
    deleteSection: async (categoryId, sectionId) => {
      await api.delete(ENDPOINTS.assessmentSections.detail(sectionId));
      refresh(categoryId);
    },
    // Urutan section: tampil langsung (optimistis) lalu disimpan ke server; gagal → urutan kembali seperti semula
    reorderSections: async (categoryId, orderedIds) => {
      const key = treeKey(categoryId);
      const previous = queryClient.getQueryData(key);
      if (previous) {
        const rank = new Map(orderedIds.map((id, i) => [String(id), i]));
        queryClient.setQueryData(key, { ...previous, sections: [...previous.sections].sort((a, b) => (rank.get(a.sectionId) ?? 1e9) - (rank.get(b.sectionId) ?? 1e9)) });
      }
      try {
        await api.put(ENDPOINTS.assessmentCategories.sectionsOrder(categoryId), { ids: orderedIds.map(Number) });
      } catch (err) {
        if (previous) queryClient.setQueryData(key, previous);
        throw err;
      } finally {
        refresh(categoryId);
      }
    },
    // Isi PDF section untuk pratinjau staf: endpoint butuh login (bearer), jadi diambil sebagai Blob lalu ditampilkan lewat object URL
    fetchSectionDocument: (sectionId) => api.get(ENDPOINTS.assessmentSections.document(sectionId), undefined, { responseType: "blob" }),
    // Dokumen PDF section (storage privat, maks 10 MB). Mengunggah menggantikan link; mengisi link menghapus file.
    uploadSectionDocument: async (categoryId, sectionId, file) => {
      const body = new FormData();
      body.append("file", file);
      const section = sectionFromApi(await api.upload(ENDPOINTS.assessmentSections.document(sectionId), body));
      refresh(categoryId);
      return section;
    },
    deleteSectionDocument: async (categoryId, sectionId) => {
      const section = sectionFromApi(await api.delete(ENDPOINTS.assessmentSections.document(sectionId)));
      refresh(categoryId);
      return section;
    },
    createQuestion: async (categoryId, sectionId, fields) => {
      const section = sectionId || queryClient.getQueryData(treeKey(categoryId))?.sections?.[0]?.sectionId;
      const question = questionFromApi(await api.post(ENDPOINTS.assessmentSections.questions(section), questionToApi(fields)));
      refresh(categoryId);
      return question;
    },
    updateQuestion: async (categoryId, _sectionId, questionId, fields) => {
      const question = questionFromApi(await api.patch(ENDPOINTS.assessmentQuestions.detail(questionId), questionToApi(fields)));
      refresh(categoryId);
      return question;
    },
    deleteQuestion: async (categoryId, _sectionId, questionId) => {
      await api.delete(ENDPOINTS.assessmentQuestions.detail(questionId));
      refresh(categoryId);
    },
  };

  const treeCache = (id) => queryClient.getQueryData(treeKey(id));

  return (
    <AssessmentsContext.Provider
      value={{
        get categories() {
          demand("categories");
          return categories;
        },
        get isLoading() {
          return loading("categories", isLoading);
        },
        // Daftar ringkas, dilengkapi pohon bila kategori itu pernah dibuka
        getCategory: (id) => {
          demand("categories");
          const item = categories.find((c) => c.id === String(id));
          return item ? { ...item, ...(treeCache(id) ? { sections: treeCache(id).sections } : {}) } : undefined;
        },
        ...actions,
      }}
    >
      {children}
    </AssessmentsContext.Provider>
  );
};

export const AssessmentsProvider = isApiMode() ? ApiAssessmentsProvider : LocalAssessmentsProvider;

export const useAssessments = () => useContext(AssessmentsContext);

// Pohon lengkap satu kategori (section + soal). Mode demo: dari store lokal. Mode API: GET /assessment-categories/{id}
// hanya untuk kategori yang dibuka; `isLoading` = muat pertama, `isFetching` = muat ulang.
function useCategoryTreeLocal(id) {
  const { getCategory } = useContext(AssessmentsContext);
  return { category: id ? getCategory(id) || null : null, isLoading: false, isFetching: false };
}

function useCategoryTreeApi(id) {
  const { auth } = useAuth();
  const { data, isLoading, isFetching } = useQuery({
    queryKey: treeKey(id),
    queryFn: ({ signal }) => api.get(ENDPOINTS.assessmentCategories.detail(id), undefined, { signal }).then(categoryFromApi),
    enabled: isStaffSession(auth) && Boolean(id),
    staleTime: 30_000,
  });
  return { category: data ?? null, isLoading, isFetching };
}

export const useCategoryTree = isApiMode() ? useCategoryTreeApi : useCategoryTreeLocal;
