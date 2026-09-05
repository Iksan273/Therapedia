import React, { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  FileText,
  Printer,
  ArrowLeft,
  ExternalLink,
  ClipboardList,
  School,
  CheckCircle2,
  Calendar,
  User,
  Info,
  Layers,
  LayoutGrid,
  CheckSquare,
  FileSpreadsheet,
  Download,
  Share2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useClients } from "@/context/ClientsContext";
import { useAssessments } from "@/context/AssessmentsContext";
import { useTherapists } from "@/context/TherapistsContext";
import { fmtDate, calcAgeDetailed, BRANCHES } from "@/lib/appUtils";
import { cn } from "@/lib/utils";

// Standard Clinical Quadrant Badges
const QUADRANT_STYLES = {
  AV: {
    label: "AV",
    name: "Avoiding (Penghindar Sensori)",
    badge: "bg-blue-600 text-white font-black",
  },
  SN: {
    label: "SN",
    name: "Sensory Sensitivity (Sensitivitas Tinggi)",
    badge: "bg-lime-600 text-white font-black",
  },
  RG: {
    label: "RG",
    name: "Low Registration (Pendaftaran Rendah)",
    badge: "bg-pink-600 text-white font-black",
  },
  SK: {
    label: "SK",
    name: "Sensory Seeking (Pencari Sensori)",
    badge: "bg-amber-500 text-white font-black",
  },
};

// Fallback Default Clinical Profile Sections & Questions if client answer list is flat
const DEFAULT_SENSORY_PROFILE_SECTIONS = [
  {
    id: "sec-auditory",
    domain: "Pemrosesan AUDITORI",
    title: "Pemrosesan AUDITORI",
    leadText: "Anakku ...",
    items: [
      { itemNo: 1, quadrant: "AV", question: "berespon berlebih terhadap suara-suara yang tidak terduga atau suara keras (misal, sirine, gonggongan anjing, pengering rambut (hairdryer))", defaultScore: 3 },
      { itemNo: 2, quadrant: "AV", question: "menutup telinga untuk melindunginya dari suara-suara", defaultScore: 3 },
      { itemNo: 3, quadrant: "SN", question: "sangat kesulitan mengerjakan tugas ketika terdapat musik atau televisi sedang menyala", defaultScore: 5 },
      { itemNo: 4, quadrant: "SN", question: "teralihkan perhatiannya ketika terdapat banyak suara di sekitarnya", defaultScore: 5 },
      { itemNo: 5, quadrant: "AV", question: "kesulitan menyelesaikan tugasnya saat ada suara-suara latar di sekitarnya (misal: suara kipas angin, kulkas, dll)", defaultScore: 2 },
      { itemNo: 6, quadrant: "SN", question: "terlihat tidak memperdulikan saya atau mengabaikan saya", defaultScore: 1 },
      { itemNo: 7, quadrant: "SN", question: "terlihat tidak mendengar ketika saya memanggil namanya (padahal ia dapat mendengar dengan baik)", defaultScore: 1 },
      { itemNo: 8, quadrant: "RG", question: "menikmati suara-suara aneh atau membuat suara-suara gaduh sendiri", defaultScore: 1 },
    ],
  },
  {
    id: "sec-visual",
    domain: "Pemrosesan VISUAL",
    title: "Pemrosesan VISUAL",
    leadText: "Anakku ...",
    items: [
      { itemNo: 9, quadrant: "SN", question: "lebih menyukai bermain atau bekerja di ruangan yang memiliki cahaya redup", defaultScore: 1 },
      { itemNo: 10, quadrant: "SK", question: "lebih menyukai pakaian yang berwarna cerah dan memiliki pola gambar", defaultScore: 4 },
      { itemNo: 11, quadrant: "SK", question: "senang melihat detil-detil pada obyek", defaultScore: 1 },
      { itemNo: 12, quadrant: "RG", question: "membutuhkan bantuan untuk menemukan benda yang terlihat jelas oleh orang lain", defaultScore: 1 },
      { itemNo: 13, quadrant: "SN", question: "lebih terganggu dengan cahaya terang daripada anak lain seusianya", defaultScore: 1 },
      { itemNo: 14, quadrant: "SK", question: "melihat orang-orang yang bergerak di dalam ruangan", defaultScore: 4 },
      { itemNo: 15, quadrant: "AV", question: "merasa terganggu oleh adanya cahaya terang (misal, menutupi mata dari pantulan sinar matahari)", defaultScore: 1 },
    ],
  },
  {
    id: "sec-tactile",
    domain: "Pemrosesan SENTUHAN",
    title: "Pemrosesan SENTUHAN",
    leadText: "Anakku ...",
    items: [
      { itemNo: 16, quadrant: "SN", question: "menunjukkan kegelisahan selama melakukan aktivitas merawat diri (misal, menolak atau menangis saat memotong kuku, membasuh wajah)", defaultScore: 2 },
      { itemNo: 17, quadrant: "AV", question: "menjadi rewel ketika mengenakan sepatu atau kaos kaki tertentu", defaultScore: 3 },
      { itemNo: 18, quadrant: "AV", question: "menolak berjalan tanpa alas kaki di atas rumput, pasir, atau karpet bertekstur", defaultScore: 4 },
      { itemNo: 19, quadrant: "SK", question: "menyentuh orang atau benda secara berlebihan hingga mengganggu orang lain", defaultScore: 4 },
      { itemNo: 20, quadrant: "RG", question: "tidak tampak menyadari adanya kotoran, makanan, atau lendir di wajah atau tangannya", defaultScore: 2 },
    ],
  },
  {
    id: "sec-vestibular",
    domain: "Pemrosesan GERAKAN / VESTIBULAR",
    title: "Pemrosesan GERAKAN / VESTIBULAR",
    leadText: "Anakku ...",
    items: [
      { itemNo: 21, quadrant: "SK", question: "mencari aktivitas bergerak yang terus-menerus (misal, berputar, melompat-lompat, bergoyang di kursi)", defaultScore: 5 },
      { itemNo: 22, quadrant: "AV", question: "menunjukkan kecemasan atau ketakutan berlebih saat kaki tidak menyentuh lantai (misal, saat diayun atau diangkat)", defaultScore: 2 },
      { itemNo: 23, quadrant: "SN", question: "mudah pusing, mual, atau mabuk kendaraan saat bepergian", defaultScore: 1 },
    ],
  },
  {
    id: "sec-proprioception",
    domain: "Pemrosesan PROPRIOSEPTIF & BODY POSITION",
    title: "Pemrosesan PROPRIOSEPTIF & BODY POSITION",
    leadText: "Anakku ...",
    items: [
      { itemNo: 24, quadrant: "RG", question: "sering menjatuhkan barang atau tampak canggung saat memegang pensil atau sendok makan", defaultScore: 3 },
      { itemNo: 25, quadrant: "SK", question: "menabrakkan diri ke orang lain, perabotan rumah, atau dinding dengan sengaja", defaultScore: 4 },
      { itemNo: 26, quadrant: "RG", question: "tampak cepat lelah atau menyandarkan kepala dan badan di meja saat sedang duduk", defaultScore: 4 },
    ],
  },
  {
    id: "sec-behavior",
    domain: "Pemrosesan PERILAKU & REGULASI SOSIAL-EMOSI",
    title: "Pemrosesan PERILAKU & REGULASI SOSIAL-EMOSI",
    leadText: "Anakku ...",
    items: [
      { itemNo: 27, quadrant: "AV", question: "mengalami tantrum hebat ketika terjadi perubahan mendadak pada rutinitas harian yang biasa dilakukan", defaultScore: 4 },
      { itemNo: 28, quadrant: "SN", question: "membutuhkan waktu jauh lebih lama untuk menenangkan diri setelah merasa kecewa atau marah", defaultScore: 4 },
      { itemNo: 29, quadrant: "AV", question: "enggan melakukan kontak mata selama percakapan berlangsung", defaultScore: 2 },
    ],
  },
];

const DEFAULT_SCHOOL_COMPANION_SECTIONS = [
  {
    id: "sec-scp-attention",
    domain: "Pemrosesan & ATENSI KELAS",
    title: "Pemrosesan & ATENSI KELAS (Classroom Attention)",
    leadText: "Di dalam kelas, siswa ...",
    items: [
      { itemNo: 1, quadrant: "SN", question: "mampu mempertahankan posisi duduk dan fokus selama 20-30 menit saat guru menjelaskan instruksi", defaultScore: 4 },
      { itemNo: 2, quadrant: "AV", question: "tampak gelisah dan sering menoleh saat ada siswa lain yang bergerak atau berbicara pelan di dekatnya", defaultScore: 3 },
      { itemNo: 3, quadrant: "SK", question: "meninggalkan tempat duduk tanpa izin atau berkeliling kelas saat proses belajar mengajar berlangsung", defaultScore: 4 },
    ],
  },
  {
    id: "sec-scp-instruction",
    domain: "PENGIKUTAN INSTRUKSI GURU",
    title: "PENGIKUTAN INSTRUKSI GURU (Teacher Instruction Following)",
    leadText: "Ketika guru memberi tugas ...",
    items: [
      { itemNo: 4, quadrant: "SN", question: "mampu mengikuti instruksi 2-3 langkah secara berurutan tanpa perlu didorong secara fisik", defaultScore: 3 },
      { itemNo: 5, quadrant: "RG", question: "membutuhkan guru pembimbing khusus (shadow teacher) untuk memulai setiap langkah pengerjaan tugas", defaultScore: 4 },
    ],
  },
  {
    id: "sec-scp-social",
    domain: "SOSIALISASI TEMAN SEBAYA",
    title: "SOSIALISASI TEMAN SEBAYA & WAKTU ISTIRAHAT (Peer Socialization)",
    leadText: "Selama jam istirahat / bermain ...",
    items: [
      { itemNo: 6, quadrant: "SK", question: "berinteraksi dan berbagi alat permainan secara kooperatif dengan teman sekelas", defaultScore: 2 },
      { itemNo: 7, quadrant: "AV", question: "mudah terpicu marah atau agresif jika gilirannya disela oleh teman bermain", defaultScore: 4 },
      { itemNo: 8, quadrant: "RG", question: "mengisolasi diri dan lebih memilih bermain sendirian di sudut area sekolah", defaultScore: 3 },
    ],
  },
  {
    id: "sec-scp-tools",
    domain: "PENGELOLAAN ALAT BELAJAR",
    title: "PENGELOLAAN ALAT BELAJAR & POSTUR MEJA (Desk Posture & Tool Handling)",
    leadText: "Saat berada di meja belajar ...",
    items: [
      { itemNo: 9, quadrant: "RG", question: "postur duduk membungkuk, menempel di meja, atau menopang kepala saat menulis", defaultScore: 3 },
      { itemNo: 10, quadrant: "SN", question: "pengelolaan alat tulis, buku, dan gunting rapi serta tidak mudah tercecer", defaultScore: 2 },
    ],
  },
  {
    id: "sec-scp-sensory",
    domain: "REGULASI SENSORI SEKOLAH",
    title: "REGULASI SENSORI LINGKUNGAN SEKOLAH (School Sensory Adaptation)",
    leadText: "Menghadapi lingkungan sekolah ...",
    items: [
      { itemNo: 11, quadrant: "AV", question: "menutup telinga atau panik saat mendengar bel sekolah berbunyi keras atau suasana kantin yang riuh", defaultScore: 4 },
      { itemNo: 12, quadrant: "AV", question: "menolak memakai seragam sekolah dengan bahan tertentu atau merasa tercekik oleh kerah seragam", defaultScore: 3 },
    ],
  },
];

export default function ParentAssessmentView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getClient } = useClients();
  const { categories } = useAssessments();
  const { therapists } = useTherapists();

  // Selected questionnaire tab
  const [activeTab, setActiveTab] = useState("all");
  // Assessor view mode: 'clinical' (Image 1 table), 'matrix' (Image 2 parent X-marks), or 'inquiry' (classic summary)
  const [viewMode, setViewMode] = useState("clinical");
  // Active sensory domain filter (for performance when 100++ questions)
  const [domainFilter, setDomainFilter] = useState("all");

  const client = getClient(id);

  const assessmentList = useMemo(() => client?.assessmentAnswers || [], [client]);
  const currentTab = activeTab === "all" && assessmentList.length > 0 ? (assessmentList[0].categoryId || "cat-001") : activeTab;

  const activeAssessment = useMemo(() => {
    return (
      assessmentList.find(
        (a) => (a.categoryId || "") === currentTab || (assessmentList.length === 1 && currentTab === "all")
      ) ||
      assessmentList[0] ||
      null
    );
  }, [assessmentList, currentTab]);

  const isSchoolCompanion =
    currentTab === "cat-002" ||
    Boolean(activeAssessment && (activeAssessment.categoryName || "").toLowerCase().includes("school"));

  const branch = useMemo(() => BRANCHES.find((b) => b.id === client?.branchId), [client]);

  // Age calculations matching Image 1: Tahun, Bulan, Hari
  const testDate = useMemo(() => client?.assessmentDate || new Date(), [client]);
  const ageDetail = useMemo(() => calcAgeDetailed(client?.dob, testDate), [client, testDate]);

  // Check if current active category exists in Assessment Master Data
  const masterCategory = useMemo(() => {
    return categories.find((c) => c.id === currentTab) || null;
  }, [categories, currentTab]);

  // Determine active sections based on active category in Master Data or client's recorded answers
  const activeSections = useMemo(() => {
    // 1. If master data has structured sections for this category, prioritize them!
    if (masterCategory && masterCategory.sections && masterCategory.sections.length > 0) {
      return masterCategory.sections.map((sec, sIdx) => ({
        id: sec.sectionId || `sec-${sIdx}`,
        domain: sec.title || sec.domain || `Domain ${sIdx + 1}`,
        title: sec.title || sec.domain || `Domain ${sIdx + 1}`,
        leadText: sec.leadText || "Anakku ...",
        items: (sec.questions || []).map((q, qIdx) => ({
          itemNo: q.itemNo || qIdx + 1,
          quadrant: q.quadrant || (qIdx % 4 === 0 ? "AV" : qIdx % 4 === 1 ? "SN" : qIdx % 4 === 2 ? "RG" : "SK"),
          question: q.question,
          defaultScore: 3,
        })),
      }));
    }

    // 2. If master data has flat questions, group them into domain sections
    if (masterCategory && masterCategory.questions && masterCategory.questions.length > 0) {
      const groups = {};
      masterCategory.questions.forEach((q, qIdx) => {
        const dom = q.domain || "Umum / Klinis";
        if (!groups[dom]) groups[dom] = [];
        groups[dom].push({
          itemNo: qIdx + 1,
          quadrant: q.quadrant || (qIdx % 4 === 0 ? "AV" : qIdx % 4 === 1 ? "SN" : qIdx % 4 === 2 ? "RG" : "SK"),
          question: q.question,
          defaultScore: 3,
        });
      });
      return Object.entries(groups).map(([dom, items], gIdx) => ({
        id: `sec-dyn-${gIdx}`,
        domain: dom,
        title: dom,
        leadText: "Anakku ...",
        items,
      }));
    }

    // 3. If client's activeAssessment has raw answers, group by answer domain
    if (activeAssessment && activeAssessment.answers && activeAssessment.answers.length > 0) {
      const groups = {};
      activeAssessment.answers.forEach((ans, aIdx) => {
        const dom = ans.domain || "Umum / Klinis";
        if (!groups[dom]) groups[dom] = [];
        groups[dom].push({
          itemNo: aIdx + 1,
          quadrant: ans.quadrant || (aIdx % 4 === 0 ? "AV" : aIdx % 4 === 1 ? "SN" : aIdx % 4 === 2 ? "RG" : "SK"),
          question: ans.question || `Pertanyaan Klinis #${aIdx + 1}`,
          defaultScore: typeof ans.score === "number" ? ans.score : 3,
        });
      });
      return Object.entries(groups).map(([dom, items], gIdx) => ({
        id: `sec-ans-${gIdx}`,
        domain: dom,
        title: dom,
        leadText: "Anakku ...",
        items,
      }));
    }

    // Fallbacks for standard categories
    if (isSchoolCompanion) return DEFAULT_SCHOOL_COMPANION_SECTIONS;
    return DEFAULT_SENSORY_PROFILE_SECTIONS;
  }, [masterCategory, activeAssessment, isSchoolCompanion]);

  // Merge client's answer scores into the standardized clinical items
  const resolvedSections = useMemo(() => {
    const rawAnswers = activeAssessment?.answers || [];
    return activeSections.map((sec) => {
      const items = sec.items.map((it) => {
        // Find if client has recorded an answer
        const match = rawAnswers.find(
          (a) => a.questionId === `q-${it.itemNo}` || a.itemNo === it.itemNo || a.question === it.question
        );
        let score = it.defaultScore;
        if (match) {
          if (typeof match.score === "number") score = match.score;
          else if (match.answer && /^\d+/.test(match.answer)) {
            score = parseInt(match.answer.match(/^\d+/)[0], 10);
          }
        }
        return {
          ...it,
          score: score !== undefined ? score : 0,
        };
      });

      const rawScoreSum = items.reduce((acc, curr) => acc + (Number(curr.score) || 0), 0);

      return {
        ...sec,
        items,
        rawScoreSum,
      };
    });
  }, [activeSections, activeAssessment]);

  // Filter sections by domain filter (if user selects a specific domain, but print displays all)
  const displayedSections = useMemo(() => {
    if (domainFilter === "all") return resolvedSections;
    return resolvedSections.filter((s) => s.id === domainFilter);
  }, [resolvedSections, domainFilter]);

  // Overall Quadrant Totals
  const quadrantTotals = useMemo(() => {
    const totals = { AV: 0, SN: 0, RG: 0, SK: 0 };
    resolvedSections.forEach((sec) => {
      sec.items.forEach((it) => {
        if (totals[it.quadrant] !== undefined) {
          totals[it.quadrant] += Number(it.score) || 0;
        }
      });
    });
    return totals;
  }, [resolvedSections]);

  const totalQuestionsCount = useMemo(() => {
    return resolvedSections.reduce((acc, s) => acc + s.items.length, 0);
  }, [resolvedSections]);

  if (!client) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-base text-slate-500">Data client tidak ditemukan.</p>
        <Button onClick={() => navigate(-1)} variant="outline" className="rounded-xl">
          <ArrowLeft className="w-4 h-4 mr-2" /> Kembali
        </Button>
      </div>
    );
  }

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto print:p-0 print:m-0" data-testid="parent-assessment-view-page">
      {/* Non-print action header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl gap-2 text-xs border-slate-200 text-slate-600 hover:bg-slate-100"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="w-4 h-4" /> Kembali
          </Button>
          <Badge variant="outline" className="text-xs font-bold text-slate-700 bg-white border-slate-200">
            {client.clientName} ({client.clientAccessCode})
          </Badge>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View mode switcher */}
          <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs font-bold">
            <button
              onClick={() => setViewMode("clinical")}
              className={cn(
                "px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5",
                viewMode === "clinical" ? "bg-white text-emerald-800 shadow-xs font-black" : "text-slate-600 hover:text-slate-900"
              )}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              Lembar Klinis Assessor (Gambar 1)
            </button>
            <button
              onClick={() => setViewMode("matrix")}
              className={cn(
                "px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5",
                viewMode === "matrix" ? "bg-white text-emerald-800 shadow-xs font-black" : "text-slate-600 hover:text-slate-900"
              )}
            >
              <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
              Matriks Jawaban Ortu (Gambar 2)
            </button>
            <button
              onClick={() => setViewMode("inquiry")}
              className={cn(
                "px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5",
                viewMode === "inquiry" ? "bg-white text-emerald-800 shadow-xs font-black" : "text-slate-600 hover:text-slate-900"
              )}
            >
              <LayoutGrid className="w-3.5 h-3.5 text-slate-500" />
              Tabel Inquiry Cepat
            </button>
          </div>

          {client.gdriveClientLink && (
            <a
              href={client.gdriveClientLink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100 transition-colors shadow-2xs"
            >
              <ExternalLink className="w-3.5 h-3.5" /> GDrive Client
            </a>
          )}

          <Button
            onClick={handlePrint}
            className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl gap-2 text-xs shadow-xs"
          >
            <Printer className="w-4 h-4" /> Cetak / Unduh PDF Hasil Asesmen
          </Button>
        </div>
      </div>

      {/* Multi-Questionnaire Navigation Tabs (if client has > 1 questionnaires, e.g. Child Sensory Profile + School Companion Profile) */}
      {assessmentList.length > 1 && (
        <div className="bg-white p-2 rounded-2xl border border-slate-200/90 shadow-2xs print:hidden">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <span className="text-xs font-bold text-slate-400 px-3 uppercase tracking-wider">Kuesioner Terdaftar:</span>
            {assessmentList.map((a, idx) => {
              const catId = a.categoryId || `cat-00${idx + 1}`;
              const isSelected = currentTab === catId;
              return (
                <button
                  key={catId}
                  onClick={() => {
                    setActiveTab(catId);
                    setDomainFilter("all");
                  }}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 border",
                    isSelected
                      ? "bg-emerald-50 text-emerald-900 border-emerald-300 shadow-xs ring-1 ring-emerald-400/30"
                      : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                  )}
                >
                  <ClipboardList className={cn("w-3.5 h-3.5", isSelected ? "text-emerald-700" : "text-slate-400")} />
                  <span>{a.categoryName || `Kuesioner #${idx + 1}`}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white border border-slate-200 font-mono">
                    {a.answers?.length || 29} item
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Filter domain dropdown for fast navigation when items are 100++ (Non-print) */}
      <div className="flex items-center justify-between bg-emerald-50/50 p-3 rounded-2xl border border-emerald-100 print:hidden">
        <div className="flex items-center gap-2 text-xs font-bold text-emerald-950">
          <Layers className="w-4 h-4 text-emerald-700" />
          <span>Navigasi Domain Sensorik ({totalQuestionsCount} Pertanyaan):</span>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={domainFilter}
            onChange={(e) => setDomainFilter(e.target.value)}
            className="text-xs font-semibold bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">Tampilkan Semua Domain ({totalQuestionsCount} Item)</option>
            {resolvedSections.map((sec) => (
              <option key={sec.id} value={sec.id}>
                {sec.title} ({sec.items.length} item)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* CLINICAL ASSESSMENT REPORT DOCUMENT (EXACT LAYOUT OF IMAGE 1 & IMAGE 2)   */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 sm:p-8 space-y-6 print:border-none print:shadow-none print:p-0 print:m-0 text-slate-900 font-sans">
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .print-avoid-break { break-inside: avoid !important; page-break-inside: avoid !important; }
            table { break-inside: auto; }
            tr { break-inside: avoid !important; page-break-inside: avoid !important; }
          }
        `}} />
        
        {/* DOCUMENT HEADER / CLINICAL TITLE (Matching Image 1) */}
        <div className="border-b-2 border-emerald-600 pb-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-emerald-700 tracking-tight">
                {activeAssessment?.categoryName || masterCategory?.categoryName || (isSchoolCompanion ? "School Companion Profile" : "Child Sensory Profile 2")}
              </h1>
              <p className="text-sm font-bold text-slate-600 mt-1">
                {masterCategory?.description || (isSchoolCompanion ? "Winnie Dunn Framework & Classroom Adaptation" : "Winnie Dunn, PhD, OTR, FAOTA")}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                Therapedia Developmental Center • Cabang {branch ? branch.name : "Surabaya"}
              </p>
            </div>

            {/* TOP RIGHT: HANYA UNTUK KEPERLUAN KLINIS & KALKULASI USIA ANAK (Matching Image 1) */}
            <div className="border-2 border-emerald-700 rounded-lg overflow-hidden shrink-0 text-xs w-full sm:w-80 shadow-xs">
              <div className="bg-emerald-700 text-white font-black text-center py-1 text-[11px] tracking-wider uppercase">
                Hanya Untuk Keperluan Klinis
              </div>
              <div className="bg-emerald-100/90 text-emerald-950 font-bold text-center py-0.5 text-[10px] border-b border-emerald-700">
                Kalkulasi Usia Anak
              </div>
              <table className="w-full text-center text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-300 font-bold text-[10px] text-slate-600">
                    <th className="py-1 px-2 text-left">Keterangan</th>
                    <th className="py-1 px-2 border-l border-slate-300">Tahun</th>
                    <th className="py-1 px-2 border-l border-slate-300">Bulan</th>
                    <th className="py-1 px-2 border-l border-slate-300">Hari</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-medium text-[11px]">
                  <tr>
                    <td className="py-1 px-2 text-left font-semibold text-slate-700">Tanggal Tes</td>
                    <td className="py-1 px-2 border-l border-slate-200">{new Date(testDate).getFullYear()}</td>
                    <td className="py-1 px-2 border-l border-slate-200">{new Date(testDate).getMonth() + 1}</td>
                    <td className="py-1 px-2 border-l border-slate-200">{new Date(testDate).getDate()}</td>
                  </tr>
                  <tr>
                    <td className="py-1 px-2 text-left font-semibold text-slate-700">Tanggal Lahir</td>
                    <td className="py-1 px-2 border-l border-slate-200">{client.dob ? new Date(client.dob).getFullYear() : "—"}</td>
                    <td className="py-1 px-2 border-l border-slate-200">{client.dob ? new Date(client.dob).getMonth() + 1 : "—"}</td>
                    <td className="py-1 px-2 border-l border-slate-200">{client.dob ? new Date(client.dob).getDate() : "—"}</td>
                  </tr>
                  <tr className="bg-emerald-50/70 font-bold text-emerald-950">
                    <td className="py-1 px-2 text-left">Usia</td>
                    <td className="py-1 px-2 border-l border-slate-300">{ageDetail.years} th</td>
                    <td className="py-1 px-2 border-l border-slate-300">{ageDetail.months} bln</td>
                    <td className="py-1 px-2 border-l border-slate-300">{ageDetail.days} hr</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* TOP LEFT: DEMOGRAFI ANAK & PEMERIKSA (Matching Image 1) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs border border-emerald-600 rounded-lg p-3 bg-emerald-50/40">
            <div className="grid grid-cols-[120px_1fr] items-center gap-1">
              <span className="font-bold text-emerald-950">Nama Anak</span>
              <span className="font-bold text-slate-900">: {client.clientName}</span>
            </div>
            <div className="grid grid-cols-[120px_1fr] items-center gap-1">
              <span className="font-bold text-emerald-950">Jenis Kelamin</span>
              <span className="font-semibold text-slate-800">: {client.gender || "Laki-laki"}</span>
            </div>
            <div className="grid grid-cols-[120px_1fr] items-center gap-1">
              <span className="font-bold text-emerald-950">Nama Orang Tua</span>
              <span className="font-semibold text-slate-800">: {client.parentName} ({client.parentContact})</span>
            </div>
            <div className="grid grid-cols-[120px_1fr] items-center gap-1">
              <span className="font-bold text-emerald-950">Nama OTs / Assessor</span>
              <span className="font-semibold text-slate-800">: Dr. Maya Chen, S.Tr.Kes (Lead OT)</span>
            </div>
          </div>
        </div>

        {/* KETERANGAN DAN SKORING BANNER (Matching Image 1 & Image 2) */}
        <div className="border border-emerald-600 rounded-lg overflow-hidden text-xs">
          <div className="bg-emerald-600 text-white font-black text-center py-1.5 text-xs uppercase tracking-wider">
            Keterangan dan Skoring
          </div>
          <div className="p-3 bg-emerald-50/30 space-y-2 text-slate-800 leading-relaxed text-[11px]">
            <p className="font-medium italic">
              Mohon mengisi pernyataan-pernyataan di bawah ini dengan seobjektif mungkin (sejujur-jujurnya) demi akurasi dalam penanganan terapi okupasi / integrasi sensori. Berikut keterangan untuk pemberian skor:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 font-semibold">
              <div className="flex items-center gap-2 p-1.5 bg-white rounded border border-emerald-200">
                <span className="w-6 h-6 rounded bg-emerald-700 text-white font-black flex items-center justify-center shrink-0">5</span>
                <span>Jika anak berespon <strong>hampir selalu</strong> (90% atau lebih setiap waktu)</span>
              </div>
              <div className="flex items-center gap-2 p-1.5 bg-white rounded border border-emerald-200">
                <span className="w-6 h-6 rounded bg-emerald-700 text-white font-black flex items-center justify-center shrink-0">4</span>
                <span>Jika anak berespon <strong>selalu / sering</strong> (75% setiap waktu)</span>
              </div>
              <div className="flex items-center gap-2 p-1.5 bg-white rounded border border-emerald-200">
                <span className="w-6 h-6 rounded bg-emerald-700 text-white font-black flex items-center justify-center shrink-0">3</span>
                <span>Jika anak berespon <strong>sebagian waktu / kadang</strong> (50% setiap waktu)</span>
              </div>
              <div className="flex items-center gap-2 p-1.5 bg-white rounded border border-emerald-200">
                <span className="w-6 h-6 rounded bg-emerald-700 text-white font-black flex items-center justify-center shrink-0">2</span>
                <span>Jika anak berespon <strong>terkadang / jarang</strong> (25% setiap waktu)</span>
              </div>
              <div className="flex items-center gap-2 p-1.5 bg-white rounded border border-emerald-200">
                <span className="w-6 h-6 rounded bg-emerald-700 text-white font-black flex items-center justify-center shrink-0">1</span>
                <span>Jika anak berespon <strong>hampir tidak pernah</strong> (10% setiap waktu)</span>
              </div>
              <div className="flex items-center gap-2 p-1.5 bg-white rounded border border-emerald-200">
                <span className="w-6 h-6 rounded bg-slate-500 text-white font-black flex items-center justify-center shrink-0">0</span>
                <span>Jika <strong>tidak mengobservasi</strong> atau <strong>tidak meyakini</strong> hal tsb berlaku</span>
              </div>
            </div>
          </div>
        </div>

        {/* SUMMARY KUADRAN SENSORIK CARDS (RESPONSIVE 4-CARD GRID) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700">
            <div className="flex items-center gap-1.5">
              <ClipboardList className="w-4 h-4 text-emerald-600" />
              <span>Rekapitulasi Skor Mentah Kuadran:</span>
            </div>
            <span className="text-[11px] text-slate-500 font-medium">Total: {totalQuestionsCount} Butir Instrumen</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            <div className="p-3 bg-blue-50/80 rounded-xl border border-blue-200 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded text-[10px] bg-blue-600 text-white font-black">AV</span>
                <span className="text-xl font-black text-blue-900">{quadrantTotals.AV}</span>
              </div>
              <p className="text-xs font-bold text-blue-950 mt-1">Avoiding</p>
              <p className="text-[10px] text-blue-700">Penghindar Sensori</p>
            </div>
            <div className="p-3 bg-lime-50/80 rounded-xl border border-lime-200 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded text-[10px] bg-lime-600 text-white font-black">SN</span>
                <span className="text-xl font-black text-lime-900">{quadrantTotals.SN}</span>
              </div>
              <p className="text-xs font-bold text-lime-950 mt-1">Sensitivity</p>
              <p className="text-[10px] text-lime-700">Sensitivitas Sensorik</p>
            </div>
            <div className="p-3 bg-pink-50/80 rounded-xl border border-pink-200 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded text-[10px] bg-pink-600 text-white font-black">RG</span>
                <span className="text-xl font-black text-pink-900">{quadrantTotals.RG}</span>
              </div>
              <p className="text-xs font-bold text-pink-950 mt-1">Registration</p>
              <p className="text-[10px] text-pink-700">Pendaftaran Rendah</p>
            </div>
            <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-200 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500 text-white font-black">SK</span>
                <span className="text-xl font-black text-amber-900">{quadrantTotals.SK}</span>
              </div>
              <p className="text-xs font-bold text-amber-950 mt-1">Seeking</p>
              <p className="text-[10px] text-amber-700">Pencari Sensori</p>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* VIEW 1: LEMBAR EVALUASI KLINIS ASSESSOR (MATCHING EXACT IMAGE 1)          */}
        {/* ========================================================================= */}
        {viewMode === "clinical" && (
          <div className="space-y-6">
            {displayedSections.map((sec) => (
              <div key={sec.id} className="border border-emerald-600 rounded-xl overflow-hidden shadow-2xs print-avoid-break">
                <div className="bg-emerald-700 text-white px-3 sm:px-4 py-2.5 flex items-center justify-between gap-2">
                  <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider min-w-0 flex-1 break-words leading-snug">
                    {sec.title}
                  </h3>
                  <span className="text-[10px] sm:text-[11px] font-bold bg-emerald-800/80 px-2 py-0.5 rounded shrink-0">
                    {sec.items.length} Item
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse min-w-[540px] sm:min-w-0">
                    <thead>
                      <tr className="bg-emerald-100/70 border-b border-emerald-300 font-bold text-slate-800 text-[11px]">
                        <th className="py-2 px-2 sm:px-3 text-center w-14 sm:w-16">Kuadran</th>
                        <th className="py-2 px-1 sm:px-3 text-center w-10 sm:w-12 border-l border-emerald-200">Item</th>
                        <th className="py-2 px-2 sm:px-4 border-l border-emerald-200 min-w-[220px] sm:min-w-0">
                          <span>{sec.leadText || "Anakku ..."}</span>
                        </th>
                        <th className="py-2 px-2 sm:px-4 text-center w-24 sm:w-28 border-l border-emerald-200 bg-emerald-200/50 text-emerald-950 font-black">
                          Penilaian<br /><span className="text-[10px] font-normal">Skor (0 - 5)</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {sec.items.map((it) => {
                        const quad = QUADRANT_STYLES[it.quadrant] || { badge: "bg-slate-600 text-white font-bold" };
                        return (
                          <tr key={it.itemNo} className="hover:bg-slate-50/70 transition-colors print-avoid-break">
                            <td className="py-2 px-2 sm:px-3 text-center">
                              <span className={cn("inline-block px-1.5 sm:px-2 py-0.5 rounded text-[10px]", quad.badge)}>
                                {it.quadrant}
                              </span>
                            </td>
                            <td className="py-2 px-1 sm:px-3 text-center font-bold text-slate-700 border-l border-slate-200">
                              {it.itemNo}
                            </td>
                            <td className="py-2 px-2 sm:px-4 text-slate-800 leading-snug border-l border-slate-200 font-medium">
                              {it.question}
                            </td>
                            <td className="py-2 px-2 sm:px-4 text-center font-black text-blue-600 text-sm sm:text-base border-l border-slate-200 bg-blue-50/20">
                              {it.score}
                            </td>
                          </tr>
                        );
                      })}

                      {/* SUB-TOTAL ROW PER DOMAIN (Matching Image 1: Skor Mentah AUDITORI: 21) */}
                      <tr className="bg-emerald-100/80 font-black border-t-2 border-emerald-600 text-emerald-950">
                        <td colSpan={3} className="py-2 px-3 sm:px-4 text-right uppercase tracking-wider text-xs">
                          Skor Mentah {sec.domain}
                        </td>
                        <td className="py-2 px-2 sm:px-4 text-center text-sm sm:text-base text-blue-800 font-black border-l border-emerald-300 bg-blue-100/50">
                          {sec.rawScoreSum}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 2: MATRIKS JAWABAN ASLI ORANG TUA (MATCHING EXACT IMAGE 2)          */}
        {/* ========================================================================= */}
        {viewMode === "matrix" && (
          <div className="space-y-6">
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 font-semibold flex items-center gap-2">
              <Info className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Berikut adalah format respon kuesioner asli yang diisi orang tua dengan tanda silang (X) pada kolom penilaian skor 5 hingga 0:</span>
            </div>

            {displayedSections.map((sec) => (
              <div key={sec.id} className="border border-emerald-600 rounded-xl overflow-hidden shadow-2xs print-avoid-break">
                <div className="bg-emerald-700 text-white px-3 sm:px-4 py-2.5 font-black text-xs uppercase tracking-wider break-words leading-snug">
                  {sec.title}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse min-w-[520px] sm:min-w-0">
                    <thead>
                      <tr className="bg-emerald-600 text-white font-black text-xs">
                        <th className="py-2 px-2 sm:px-3 text-center w-12 sm:w-14">Item</th>
                        <th className="py-2 px-2 sm:px-4 border-l border-emerald-500 min-w-[200px] sm:min-w-0">{sec.title}</th>
                        <th className="py-2 px-2 text-center w-9 sm:w-12 border-l border-emerald-500">5</th>
                        <th className="py-2 px-2 text-center w-9 sm:w-12 border-l border-emerald-500">4</th>
                        <th className="py-2 px-2 text-center w-9 sm:w-12 border-l border-emerald-500">3</th>
                        <th className="py-2 px-2 text-center w-9 sm:w-12 border-l border-emerald-500">2</th>
                        <th className="py-2 px-2 text-center w-9 sm:w-12 border-l border-emerald-500">1</th>
                        <th className="py-2 px-2 text-center w-9 sm:w-12 border-l border-emerald-500 bg-emerald-800">0</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {sec.items.map((it) => (
                        <tr key={it.itemNo} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-2.5 px-3 text-center font-bold text-slate-700">
                            {it.itemNo}
                          </td>
                          <td className="py-2.5 px-4 text-slate-800 leading-snug border-l border-slate-200 font-medium">
                            {it.question}
                          </td>
                          {[5, 4, 3, 2, 1, 0].map((scoreCol) => {
                            const isSelected = it.score === scoreCol;
                            return (
                              <td
                                key={scoreCol}
                                className={cn(
                                  "py-2.5 px-3 text-center font-black border-l border-slate-200",
                                  scoreCol === 0 ? "bg-slate-100/50" : "",
                                  isSelected ? "bg-emerald-50 text-red-600 text-sm font-black" : "text-slate-300"
                                )}
                              >
                                {isSelected ? "X" : ""}
                              </td>
                            );
                          })}
                        </tr>
                      ))}

                      <tr className="bg-emerald-50 font-black border-t-2 border-emerald-600 text-emerald-950">
                        <td colSpan={2} className="py-2.5 px-4 text-right uppercase tracking-wider text-xs">
                          Total Skor Mentah {sec.domain}:
                        </td>
                        <td colSpan={6} className="py-2.5 px-4 text-center text-sm font-black text-blue-700 bg-blue-50/50">
                          {sec.rawScoreSum} Poin
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 3: TABEL INQUIRY CEPAT                                               */}
        {/* ========================================================================= */}
        {viewMode === "inquiry" && (
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-100 hover:bg-slate-100">
                  <TableHead className="font-bold text-slate-800 text-xs w-12 pl-4">No.</TableHead>
                  <TableHead className="font-bold text-slate-800 text-xs w-20">Kuadran</TableHead>
                  <TableHead className="font-bold text-slate-800 text-xs">Pernyataan Klinis</TableHead>
                  <TableHead className="font-bold text-slate-800 text-xs w-36 text-center">Skor (0-5)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedSections.flatMap((sec) => sec.items).map((it, idx) => {
                  const quad = QUADRANT_STYLES[it.quadrant] || { badge: "bg-slate-500 text-white" };
                  return (
                    <TableRow key={it.itemNo || idx} className="text-xs hover:bg-slate-50">
                      <TableCell className="font-bold pl-4 text-slate-500">{it.itemNo}</TableCell>
                      <TableCell>
                        <span className={cn("px-2 py-0.5 rounded text-[10px]", quad.badge)}>
                          {it.quadrant}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium text-slate-800">{it.question}</TableCell>
                      <TableCell className="text-center font-black text-blue-600 text-sm">
                        {it.score}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {/* TANDA TANGAN DOKUMEN CETAK (PRINT-READY) */}
        <div className="pt-8 grid grid-cols-2 gap-8 text-xs text-center border-t border-slate-200">
          <div className="space-y-16">
            <p className="font-bold text-slate-700">Orang Tua / Wali Murid,</p>
            <p className="border-t border-slate-400 pt-1 font-semibold text-slate-800">
              ( {client.parentName} )
            </p>
          </div>
          <div className="space-y-16">
            <p className="font-bold text-slate-700">Clinical Assessor / Pediatric OT,</p>
            <p className="border-t border-slate-400 pt-1 font-semibold text-slate-800">
              ( Dr. Maya Chen, S.Tr.Kes )
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
