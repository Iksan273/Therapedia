import React from "react";


export function DocumentHeader({ activeAssessment, ageDetail, branch, client, isSchoolCompanion, masterCategory, testDate }) {
  return (
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
              <div className="bg-emerald-100/90 text-emerald-950 font-bold text-center py-0.5 text-[11px] border-b border-emerald-700">
                Kalkulasi Usia Anak
              </div>
              <table className="w-full text-center text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-300 font-bold text-[11px] text-slate-600">
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
  );
}
