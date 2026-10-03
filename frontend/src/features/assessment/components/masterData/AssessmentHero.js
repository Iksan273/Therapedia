import React from "react";
import { KeyRound, Layers, Plus } from "lucide-react";
import { Button } from "@/shared/ui/button";

export function AssessmentHero({ openGenModal, setCatDialog }) {
  return (
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
          <Button size="lg"
            onClick={() => openGenModal()}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl px-5 gap-2 shadow-xs transition-all cursor-pointer"
          >
            <KeyRound className="w-4 h-4 stroke-[2.2]" /> Terbitkan Kode Kuesioner
          </Button>

          <Button size="lg"
            variant="outline"
            className="border-slate-200 text-slate-700 hover:bg-slate-50 font-bold rounded-2xl px-4 gap-2 shadow-2xs cursor-pointer"
            onClick={() => setCatDialog({ open: true, editingId: null, name: "", domain: "", typeCode: "" })}
            data-testid="new-category-button"
          >
            <Plus className="w-4 h-4 text-slate-500 stroke-[2.2]" /> Tambah Kategori
          </Button>
        </div>
      </div>
  );
}
