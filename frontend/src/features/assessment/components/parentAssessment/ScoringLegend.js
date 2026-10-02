import React from "react";


export function ScoringLegend() {
  return (
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
  );
}
