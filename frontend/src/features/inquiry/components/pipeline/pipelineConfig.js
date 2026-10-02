// Tahap pipeline inquiry. `group` memisahkan alur utama dan hasil akhir pada tampilan desktop.
export const STAGE_COLUMNS = [
  { group: "main", status: "inquiry", label: "1. New Intake", accent: "bg-sky-500", desc: "Data awal masuk" },
  { group: "main", status: "service_selected", label: "2. Layanan Dipilih", accent: "bg-purple-500", desc: "BOT-A, FOT-A, Consultation" },
  { group: "main", status: "assessment_scheduled", label: "3. Asesmen Terjadwal", accent: "bg-blue-500", desc: "Kode kuesioner aktif" },
  { group: "main", status: "assessment_done", label: "4. Asesmen Selesai", accent: "bg-teal-500", desc: "GDrive & Tabel Psikologi" },
  { group: "main", status: "admitted", label: "5. Active Client", accent: "bg-emerald-500", desc: "Lanjut sesi terapi" },
  { group: "outcome", status: "done_consult", label: "Done Consult", accent: "bg-amber-500", desc: "Konsultasi selesai" },
  { group: "outcome", status: "done_assessment", label: "Done Assessment", accent: "bg-indigo-500", desc: "Laporan selesai" },
  { group: "outcome", status: "discontinued", label: "Discontinued", accent: "bg-rose-500", desc: "Batal / tidak lanjut" },
];

export const COLUMN_PAGE = 30;
