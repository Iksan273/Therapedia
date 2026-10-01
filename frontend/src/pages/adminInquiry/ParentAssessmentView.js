import React, { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Printer, ArrowLeft, ExternalLink, ClipboardList, Layers, LayoutGrid, CheckSquare, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useClients } from "@/context/ClientsContext";
import { useAssessments } from "@/context/AssessmentsContext";
import { useMasterData, getQuadrantColor } from "@/context/MasterDataContext";
import { useTherapists } from "@/context/TherapistsContext";
import { calcAgeDetailed, BRANCHES } from "@/lib/appUtils";
import { cn } from "@/lib/utils";
import { DocumentHeader } from "@/pages/adminInquiry/parentAssessment/DocumentHeader";
import { ScoringLegend } from "@/pages/adminInquiry/parentAssessment/ScoringLegend";
import { QuadrantSummary } from "@/pages/adminInquiry/parentAssessment/QuadrantSummary";
import { AssessorSheetView } from "@/pages/adminInquiry/parentAssessment/AssessorSheetView";
import { ParentMatrixView } from "@/pages/adminInquiry/parentAssessment/ParentMatrixView";
import { QuickInquiryView } from "@/pages/adminInquiry/parentAssessment/QuickInquiryView";
import { SignatureBlock } from "@/pages/adminInquiry/parentAssessment/SignatureBlock";

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
  const { quadrantMap, quadrants } = useMasterData();

  // Gaya badge kuadran mengikuti master data; kode yang sudah tidak ada memakai abu-abu
  const quadStyle = (code, fallback = "bg-slate-600 text-white font-bold") => {
    const q = quadrantMap[code];
    return { badge: q ? getQuadrantColor(q.color).solid : fallback };
  };
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
    const totals = Object.fromEntries(quadrants.map((q) => [q.code, 0]));
    resolvedSections.forEach((sec) => {
      sec.items.forEach((it) => {
        if (totals[it.quadrant] !== undefined) {
          totals[it.quadrant] += Number(it.score) || 0;
        }
      });
    });
    return totals;
  }, [resolvedSections, quadrants]);

  const totalQuestionsCount = useMemo(() => {
    return resolvedSections.reduce((acc, s) => acc + s.items.length, 0);
  }, [resolvedSections]);

  if (!client) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-base text-slate-500">Data client tidak ditemukan.</p>
        <Button onClick={() => navigate(-1)} variant="outline" className="">
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
            className="gap-2 border-slate-200 text-slate-600 hover:bg-slate-100"
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
            className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold gap-2 shadow-xs"
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
                  <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-white border border-slate-200 font-mono">
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
        <DocumentHeader activeAssessment={activeAssessment} ageDetail={ageDetail} branch={branch} client={client} isSchoolCompanion={isSchoolCompanion} masterCategory={masterCategory} testDate={testDate} />

        {/* KETERANGAN DAN SKORING BANNER (Matching Image 1 & Image 2) */}
        <ScoringLegend />

        {/* SUMMARY KUADRAN SENSORIK CARDS (RESPONSIVE 4-CARD GRID) */}
        <QuadrantSummary quadrants={quadrants} quadrantTotals={quadrantTotals} totalQuestionsCount={totalQuestionsCount} />

        {/* ========================================================================= */}
        {/* VIEW 1: LEMBAR EVALUASI KLINIS ASSESSOR (MATCHING EXACT IMAGE 1)          */}
        {/* ========================================================================= */}
        {viewMode === "clinical" && (
          <AssessorSheetView displayedSections={displayedSections} quadStyle={quadStyle} />
        )}

        {/* ========================================================================= */}
        {/* VIEW 2: MATRIKS JAWABAN ASLI ORANG TUA (MATCHING EXACT IMAGE 2)          */}
        {/* ========================================================================= */}
        {viewMode === "matrix" && (
          <ParentMatrixView displayedSections={displayedSections} />
        )}

        {/* ========================================================================= */}
        {/* VIEW 3: TABEL INQUIRY CEPAT                                               */}
        {/* ========================================================================= */}
        {viewMode === "inquiry" && (
          <QuickInquiryView displayedSections={displayedSections} quadStyle={quadStyle} />
        )}

        {/* TANDA TANGAN DOKUMEN CETAK (PRINT-READY) */}
        <SignatureBlock client={client} />
      </div>
    </div>
  );
}
