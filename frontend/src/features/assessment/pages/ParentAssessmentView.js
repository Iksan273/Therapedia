import React, { useState, useMemo } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Printer, ArrowLeft, ExternalLink, ClipboardList, Layers, LayoutGrid, CheckSquare, FileSpreadsheet, CheckCircle2, Clock } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { useClientDetail, useClientQuestionnaires, useClientWithQuestionnaires } from "@/features/inquiry";
import { DetailSkeleton } from "@/shared/components/LoadingSkeletons";
import { useAssessments } from "@/stores/assessmentsStore";
import { calcAgeDetailed, fmtDate } from "@/shared/lib/format";
import { listQuestionnaireResults } from "@/domain/assessment";
import { BRANCHES } from "@/domain/branch";
import { cn } from "@/shared/lib/utils";
import { DocumentHeader } from "@/features/assessment/components/parentAssessment/DocumentHeader";
import { ScoringLegend } from "@/features/assessment/components/parentAssessment/ScoringLegend";
import { buildTemplateResult, categoryFromAnswers, getSectionTemplate } from "@/domain/assessmentTemplate";
import { PlainSectionsView } from "@/features/assessment/components/parentAssessment/PlainSectionsView";
import { AssessorSheetView } from "@/features/assessment/components/parentAssessment/AssessorSheetView";
import { ParentMatrixView } from "@/features/assessment/components/parentAssessment/ParentMatrixView";
import { QuickInquiryView } from "@/features/assessment/components/parentAssessment/QuickInquiryView";
import { SignatureBlock } from "@/features/assessment/components/parentAssessment/SignatureBlock";

export default function ParentAssessmentView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { categories } = useAssessments();

  // Kuesioner terpilih (kunci = kode kuesioner). Bisa dibuka langsung lewat ?kode=XXX
  const [searchParams, setSearchParams] = useSearchParams();
  // Assessor view mode: 'clinical' (Image 1 table), 'matrix' (Image 2 parent X-marks), or 'inquiry' (classic summary)
  const [viewMode, setViewMode] = useState("clinical");
  // Active sensory domain filter (for performance when 100++ questions)
  const [domainFilter, setDomainFilter] = useState("all");

  // Mode API: client + kode/hasil dari server (hasil membawa struktur BEKU saat pengisian; tidak berubah oleh edit master)
  const detail = useClientDetail(id);
  const serverQuestionnaires = useClientQuestionnaires(id);
  const client = useClientWithQuestionnaires(detail.client, serverQuestionnaires);

  // Semua kuesioner client (satu opsi per kode, terisi atau belum) — dasar menu "Pilih Kuesioner"
  const questionnaires = useMemo(() => listQuestionnaireResults(client), [client]);
  const filledQuestionnaires = useMemo(() => questionnaires.filter((q) => q.filled), [questionnaires]);
  const latestFilledKey = useMemo(
    () => [...filledQuestionnaires].sort((a, b) => String(b.submittedAt || "").localeCompare(String(a.submittedAt || "")))[0]?.key || null,
    [filledQuestionnaires]
  );
  const requestedKey = searchParams.get("kode");
  const selected =
    filledQuestionnaires.find((q) => q.key === requestedKey || (q.code && q.code === requestedKey)) ||
    filledQuestionnaires.find((q) => q.key === latestFilledKey) ||
    null;
  const activeAssessment = selected?.entry || null;
  const currentTab = selected?.categoryId || "all"; // kategori master data dari kuesioner terpilih

  const selectQuestionnaire = (key) => {
    setSearchParams({ kode: key }, { replace: true });
    setDomainFilter("all");
  };


  const branch = useMemo(() => BRANCHES.find((b) => b.id === client?.branchId), [client]);

  // Age calculations matching Image 1: Tahun, Bulan, Hari
  const testDate = useMemo(() => client?.assessmentDate || new Date(), [client]);
  const ageDetail = useMemo(() => calcAgeDetailed(client?.dob, testDate), [client, testDate]);

  // Check if current active category exists in Assessment Master Data
  const masterCategory = useMemo(() => {
    return categories.find((c) => c.id === currentTab) || null;
  }, [categories, currentTab]);

  // Hasil: section ber-template → tabel skor mentah ; section biasa → daftar pertanyaan–jawaban.
  // Tanpa kategori master (sudah dihapus), bentuk section dipulihkan dari snapshot jawaban.
  // Struktur beku dari server (`structure`) didahulukan: hasil lama tidak ikut berubah bila master diedit.
  const resultCategory = useMemo(
    () => activeAssessment?.structure || (masterCategory?.sections?.length ? masterCategory : categoryFromAnswers(activeAssessment?.answers)),
    [masterCategory, activeAssessment]
  );
  const result = useMemo(
    () => buildTemplateResult(resultCategory, activeAssessment?.answers || []),
    [resultCategory, activeAssessment]
  );

  // Bentuk yang dibaca view tabel: { id, title, items:[{ itemNo, question, score }], rawScoreSum }
  const resolvedSections = useMemo(
    () => result.templateSections.map((sec) => ({ ...sec, id: sec.sectionId, domain: sec.title })),
    [result]
  );
  const activeTemplate = getSectionTemplate(resolvedSections[0]);
  const isSchoolCompanion = resolvedSections.some((s) => s.template === "school_companion");

  // Filter sections by domain filter (if user selects a specific domain, but print displays all)
  const displayedSections = useMemo(() => {
    if (domainFilter === "all") return resolvedSections;
    return resolvedSections.filter((s) => s.id === domainFilter);
  }, [resolvedSections, domainFilter]);

  // Dua hasil terpisah: (1) jawaban form biasa, (2) profil sensori (tabel psikologi). Masing-masing tetap berurutan sesuai
  // urutan section di kuesioner; kartu yang section-nya lebih dulu di kuesioner tampil lebih dulu.
  const firstKind = result.order[0]?.kind || "plain";
  // Section biasa juga ikut filter navigasi (domainFilter = sectionId)
  const displayedPlain = useMemo(
    () => (domainFilter === "all" ? result.plainSections : result.plainSections.filter((p) => p.sectionId === domainFilter)),
    [result, domainFilter]
  );
  const cards = useMemo(() => {
    const list = [];
    if (displayedPlain.length > 0) list.push("plain");
    if (displayedSections.length > 0) list.push("template");
    return list.sort((x, y) => (x === firstKind ? -1 : y === firstKind ? 1 : 0));
  }, [displayedPlain, displayedSections, firstKind]);

  // Daftar navigasi: SEMUA section (biasa + ber-template) sesuai urutan kuesioner
  const navSections = useMemo(() => {
    const plainById = Object.fromEntries(result.plainSections.map((p) => [p.sectionId, p]));
    const tplById = Object.fromEntries(resolvedSections.map((t) => [t.id, t]));
    return result.order.map(({ kind, sectionId }) => {
      const sec = kind === "plain" ? plainById[sectionId] : tplById[sectionId];
      return { id: sectionId, title: sec.title, count: sec.items.length, kind };
    });
  }, [result, resolvedSections]);
  const totalQuestionsCount = useMemo(() => navSections.reduce((acc, s) => acc + s.count, 0), [navSections]);

  if (detail.isLoading || serverQuestionnaires.isLoading) {
    return <DetailSkeleton sections={4} label="Memuat hasil kuesioner…" testId="parent-assessment-skeleton" />;
  }

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
    <div className="space-y-6 max-w-6xl mx-auto min-w-0 print:p-0 print:m-0" data-testid="parent-assessment-view-page">
      {/* Non-print action header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <Button
            variant="outline"
            size="sm"
            className="gap-2 min-h-10 border-slate-200 text-slate-600 hover:bg-slate-100"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="w-4 h-4" /> Kembali
          </Button>
          <Badge variant="outline" className="text-xs font-bold text-slate-700 bg-white border-slate-200 max-w-full whitespace-normal break-words">
            {client.clientName} ({client.clientCode})
          </Badge>
        </div>

        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 min-w-0">
          {/* View mode switcher: 3 kolom penuh di HP, label ringkas */}
          <div className="grid grid-cols-3 sm:inline-flex w-full sm:w-auto rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs font-bold">
            <button
              onClick={() => setViewMode("clinical")}
              className={cn(
                "px-2 sm:px-3 py-1.5 min-h-11 sm:min-h-0 rounded-lg transition-all flex items-center justify-center text-center gap-1.5 min-w-0",
                viewMode === "clinical" ? "bg-white text-emerald-800 shadow-xs font-black" : "text-slate-600 hover:text-slate-900"
              )}
            >
              <FileSpreadsheet className="hidden sm:block w-3.5 h-3.5 text-emerald-600" />
              <span className="sm:hidden">Lembar Klinis</span>
              <span className="hidden sm:inline">Lembar Klinis Assessor (Gambar 1)</span>
            </button>
            <button
              onClick={() => setViewMode("matrix")}
              className={cn(
                "px-2 sm:px-3 py-1.5 min-h-11 sm:min-h-0 rounded-lg transition-all flex items-center justify-center text-center gap-1.5 min-w-0",
                viewMode === "matrix" ? "bg-white text-emerald-800 shadow-xs font-black" : "text-slate-600 hover:text-slate-900"
              )}
            >
              <CheckSquare className="hidden sm:block w-3.5 h-3.5 text-emerald-600" />
              <span className="sm:hidden">Matriks Ortu</span>
              <span className="hidden sm:inline">Matriks Jawaban Ortu (Gambar 2)</span>
            </button>
            <button
              onClick={() => setViewMode("inquiry")}
              className={cn(
                "px-2 sm:px-3 py-1.5 min-h-11 sm:min-h-0 rounded-lg transition-all flex items-center justify-center text-center gap-1.5 min-w-0",
                viewMode === "inquiry" ? "bg-white text-emerald-800 shadow-xs font-black" : "text-slate-600 hover:text-slate-900"
              )}
            >
              <LayoutGrid className="hidden sm:block w-3.5 h-3.5 text-slate-500" />
              <span className="sm:hidden">Tabel Cepat</span>
              <span className="hidden sm:inline">Tabel Inquiry Cepat</span>
            </button>
          </div>

          {client.gdriveClientLink && (
            <a
              href={client.gdriveClientLink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-1.5 w-full sm:w-auto min-h-10 px-3 py-2 rounded-xl text-xs font-bold bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100 transition-colors shadow-2xs"
            >
              <ExternalLink className="w-3.5 h-3.5" /> GDrive Client
            </a>
          )}

          <Button
            onClick={handlePrint}
            className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold gap-2 shadow-xs w-full sm:w-auto min-h-10 whitespace-normal"
          >
            <Printer className="w-4 h-4 shrink-0" /> Cetak / Unduh PDF Hasil Asesmen
          </Button>
        </div>
      </div>

      {/* Pilih Kuesioner: satu kartu per KODE yang diterbitkan (client bisa punya beberapa kode) */}
      {questionnaires.length > 1 && (
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3 min-w-0 print:hidden" data-testid="questionnaire-picker">
          <div>
            <p className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-emerald-700" /> Pilih Kuesioner
            </p>
            <p className="text-xs text-slate-500">
              Client ini punya {questionnaires.length} kode kuesioner. Pilih salah satu untuk melihat hasilnya; kode yang belum diisi ortu belum bisa dibuka.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 min-w-0">
            {questionnaires.map((q) => {
              const isSelected = selected?.key === q.key;
              return (
                <button
                  key={q.key}
                  type="button"
                  disabled={!q.filled}
                  onClick={() => selectQuestionnaire(q.key)}
                  aria-pressed={isSelected}
                  className={cn(
                    "text-left rounded-xl border p-3 min-h-[64px] min-w-0 w-full transition-all flex flex-col gap-1.5",
                    isSelected ? "bg-emerald-50 border-emerald-400 ring-1 ring-emerald-400/40 shadow-xs" : q.filled ? "bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300 cursor-pointer" : "bg-slate-50 border-dashed border-slate-200 opacity-70 cursor-not-allowed"
                  )}
                  data-testid={`questionnaire-option-${q.key}`}
                >
                  <span className="flex flex-col items-start gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-2 min-w-0">
                    <span className="text-xs font-extrabold text-slate-900 break-words sm:truncate min-w-0 max-w-full">{q.categoryName}</span>
                    {q.filled ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 shrink-0"><CheckCircle2 className="w-3.5 h-3.5" /> Sudah diisi</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 shrink-0"><Clock className="w-3.5 h-3.5" /> Belum diisi</span>
                    )}
                  </span>
                  <span className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-500">
                    {q.code && <span className="font-mono font-bold text-slate-700">{q.code}</span>}
                    <span>{q.filled ? `Diisi ${fmtDate(q.submittedAt)}` : q.issuedAt ? `Diterbitkan ${fmtDate(q.issuedAt)}` : ""}</span>
                    {q.filled && <span>{q.entry?.answers?.length || 0} butir</span>}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {!selected && (
        <div className="p-8 text-center rounded-2xl border border-dashed border-slate-300 bg-white text-sm text-slate-500 print:hidden" data-testid="questionnaire-none">
          Orang tua belum mengisi kuesioner apa pun, jadi belum ada hasil untuk ditampilkan.
        </div>
      )}

      {selected && (
      <>
      {/* Filter domain dropdown for fast navigation when items are 100++ (Non-print) */}
      <div className={cn("flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-emerald-50/50 p-3 rounded-2xl border border-emerald-100 print:hidden", navSections.length === 0 && "hidden")}>
        <div className="flex items-center gap-2 text-xs font-bold text-emerald-950">
          <Layers className="w-4 h-4 text-emerald-700" />
          <span>Navigasi Section ({totalQuestionsCount} Pertanyaan):</span>
        </div>
        <div className="flex items-center gap-2 min-w-0">
          <select
            value={domainFilter}
            onChange={(e) => setDomainFilter(e.target.value)}
            className="text-xs font-semibold bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full sm:w-auto max-w-full min-w-0 truncate"
          >
            <option value="all">Tampilkan Semua Section ({totalQuestionsCount} Pertanyaan)</option>
            {navSections.map((sec) => (
              <option key={sec.id} value={sec.id}>
                {sec.title} ({sec.count} {sec.kind === "plain" ? "pertanyaan" : "item"})
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
        <DocumentHeader activeAssessment={activeAssessment} ageDetail={ageDetail} branch={branch} client={client} isSchoolCompanion={isSchoolCompanion} masterCategory={masterCategory} respondent={activeAssessment?.respondent || null} testDate={testDate} />

        {cards.map((card) =>
          card === "plain" ? (
            <section key="plain" className="space-y-3" data-testid="result-form-card">
              <h2 className="text-base font-black text-slate-900 border-b-2 border-emerald-600 pb-1">Hasil Form (Pertanyaan &amp; Jawaban)</h2>
              {/* Section tanpa template, urut sesuai kuesioner */}
              <PlainSectionsView plainSections={displayedPlain} />
            </section>
          ) : (
            <section key="template" className="space-y-4" data-testid="result-profile-card">
              <h2 className="text-base font-black text-slate-900 border-b-2 border-emerald-600 pb-1">
                Hasil Profil{activeTemplate ? ` — ${activeTemplate.label}` : ""}
              </h2>
              <ScoringLegend template={activeTemplate} />
              {/* Tabel psikologi (section ber-template), urut sesuai kuesioner */}
              {viewMode === "clinical" ? (
                <AssessorSheetView displayedSections={displayedSections} />
              ) : viewMode === "matrix" ? (
                <ParentMatrixView displayedSections={displayedSections} />
              ) : (
                <QuickInquiryView displayedSections={displayedSections} />
              )}
            </section>
          )
        )}

        {/* TANDA TANGAN DOKUMEN CETAK (PRINT-READY) */}
        <SignatureBlock client={client} />
      </div>
      </>
      )}
    </div>
  );
}
