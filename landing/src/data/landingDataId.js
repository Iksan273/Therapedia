// Terjemahan Bahasa Indonesia untuk konten landing (kunci = id item di landingData.js).
// Data asli (Inggris) tetap menjadi sumber logika (filter, kunci); tabel ini hanya menimpa teks tampilan.

export const PILLARS_ID = {
  "experienced-team": {
    title: "Tim Berpengalaman",
    desc: "Terapis okupasi pediatrik bersertifikat kami menggunakan pendekatan berbasis bukti seperti Sensory Integration dan Neurodevelopmental Treatment.",
    badge: "OT & SI Bersertifikat",
  },
  "commitment-growth": {
    title: "Komitmen pada Tumbuh Kembang",
    desc: "Kami percaya pada potensi setiap anak dan berkomitmen mendukung kemajuan yang bermakna selangkah demi selangkah melalui tonggak capaian yang terukur.",
    badge: "Selangkah Demi Selangkah",
  },
  "family-centered": {
    title: "Pendekatan Berpusat pada Keluarga",
    desc: "Kami melibatkan orang tua dan pengasuh secara aktif agar kemajuan berlanjut di rumah dan dalam rutinitas keluarga sehari-hari melalui bimbingan berkala.",
    badge: "Latihan di Rumah",
  },
  "personalized-therapy": {
    title: "Terapi yang Dipersonalisasi",
    desc: "Setiap anak mendapat rencana terapi individual berdasarkan asesmen klinis menyeluruh serta kebutuhan sensori dan perkembangan yang unik.",
    badge: "Rencana Khusus",
  },
};

export const PROGRAMS_ID = {
  "regular-ot": {
    title: "Intervensi Terapi Okupasi Reguler",
    shortTitle: "Terapi Okupasi Reguler",
    ageGroup: "18 Bulan – 14 Tahun",
    category: "Intervensi Klinis Inti",
    desc: "Kami menyediakan terapi okupasi reguler untuk anak usia 18 bulan hingga 14 tahun, mendukung tonggak perkembangan mereka di setiap tahap pertumbuhan.",
    fullDesc:
      "Intervensi Terapi Okupasi Reguler kami menargetkan koordinasi motorik kasar, ketangkasan motorik halus, integrasi bilateral, rentang perhatian, dan regulasi emosi. Dengan ruang sensori khusus berisi ayunan gantung, permukaan bertekstur, dan lintasan rintangan terapeutik, anak mengembangkan keterampilan hidup mandiri (berpakaian, menulis, makan, bermain sosial) di bawah pengawasan langsung terapis okupasi berlisensi.",
    benefits: [
      "Modulasi integrasi sensori (menenangkan sistem vestibular/proprioseptif)",
      "Presisi motorik halus & kesiapan genggaman pensil",
      "Fungsi eksekutif, fokus & keterampilan transisi tugas",
      "Kemandirian perawatan diri (ADL - Activities of Daily Living)",
      "Konsultasi perkembangan aktif dengan orang tua & program latihan di rumah",
    ],
  },
  "sensory-spark": {
    title: "Sensory Spark: Pencegahan Dini",
    shortTitle: "Sensory Spark (Stimulasi Dini)",
    ageGroup: "9 – 24 Bulan",
    category: "Perawatan Perkembangan Preventif",
    desc: "Sensory Spark adalah program preventif untuk bayi dan balita usia 9–24 bulan, bertujuan menstimulasi jalur sensori dini dan mencegah keterlambatan perkembangan.",
    fullDesc:
      "1.000 hari pertama sangat penting bagi plastisitas saraf. Sensory Spark memakai stimulasi sensori lembut berbasis bermain untuk bayi dan balita. Orang tua ikut aktif di setiap sesi untuk belajar mengenali isyarat sensori, memfasilitasi tummy time, mendorong merangkak dan berjalan berpegangan, serta membangun ikatan emosional kuat yang menunjang perkembangan otak seumur hidup.",
    benefits: [
      "Deteksi dini defensif sensori atau hipotonia",
      "Eksplorasi vestibular & proprioseptif di lingkungan aman bagi bayi",
      "Responsivitas sosial-emosional & ikatan orang tua-bayi",
      "Pemantauan tonggak guling, duduk, merangkak, dan berjalan",
      "Pelatihan praktis bagi orang tua tentang bermain sensori di rumah",
    ],
  },
  "eibi-developmental": {
    title: "Intervensi Perilaku Intensif Dini (EIBI)",
    shortTitle: "EIBI & Dukungan Perilaku",
    ageGroup: "2 – 7 Tahun",
    category: "Dukungan Perilaku Khusus",
    desc: "Disupervisi psikolog dan analis perilaku bersertifikat, memberikan intervensi 1-lawan-1 terstruktur untuk komunikasi, perhatian bersama, dan kesiapan kelas.",
    fullDesc:
      "Dirancang untuk anak usia dini dengan spektrum autisme atau tantangan komunikasi sosial perkembangan. EIBI memecah perilaku kompleks menjadi unit belajar yang mudah dikelola dengan penguatan positif, membantu anak membangun imitasi, komunikasi fungsional, bermain timbal balik, dan regulasi diri.",
    benefits: [
      "Disupervisi langsung oleh spesialis klinis Magister Psikologi",
      "Pengajaran perilaku individual: discrete trial dan naturalistik",
      "Pelatihan komunikasi fungsional (FCT) & berkurangnya meltdown",
      "Kesiapan akademik awal dan inklusi prasekolah",
      "Laporan perkembangan bulanan yang komprehensif",
    ],
  },
};

export const TEAM_ID = {
  "aditya-agus": {
    role: "Pendiri & Direktur Klinis",
    department: "Direksi Eksekutif & Klinis",
    branchLabel: "Semua Cabang",
    bio: "Terapis okupasi pediatrik bersertifikat dengan pengalaman luas dalam Sensory Integration dan Neurodevelopmental Treatment. Memimpin standar klinis Therapedia, mentoring terapis, dan metodologi terapi di seluruh pusat.",
    specialties: ["Sensory Integration (SI)", "Direksi Klinis", "Pendekatan NDT", "Asesmen OT Pediatrik"],
  },
  "tiara-shinta": {
    role: "Direktur Operasional",
    department: "Operasional & Manajemen Pusat",
    branchLabel: "Semua Cabang",
    bio: "Memimpin operasional organisasi, penjaminan mutu layanan, koordinasi multi-cabang, dan kemitraan dengan orang tua agar setiap keluarga mendapat layanan terbaik.",
    specialties: ["Operasional Layanan Kesehatan", "Penjaminan Mutu Layanan", "Hubungan Keluarga"],
  },
  "mikhael-ivan": {
    role: "Terapis Sensory Integration",
    department: "Terapi Klinis",
    bio: "Berfokus pada evaluasi pemrosesan sensori dan intervensi bermain terapeutik untuk anak dengan kesulitan modulasi sensori, ADHD, dan tantangan regulasi emosi.",
    specialties: ["Pemrosesan Sensori", "Regulasi Perilaku", "Bermain Terapeutik"],
  },
  "sahwa-zulfa": {
    role: "Koordinator Klinis",
    department: "Kepemimpinan Klinis",
    bio: "Koordinator klinis yang memastikan fidelitas tinggi sesi terapi, penyampaian program individual, dan pengukuran capaian klinis di cabang West.",
    specialties: ["Supervisi Klinis", "Terapi Okupasi", "Rehabilitasi Pediatrik"],
  },
  "hana-mufidah": {
    role: "Koordinator Klinis",
    department: "Kepemimpinan Klinis",
    bio: "Memimpin konferensi kasus klinis, asesmen intake anak, dan kolaborasi terapis di pusat Citraland.",
    specialties: ["Neurodevelopmental Treatment", "Koordinasi Klinis", "Tonggak Motorik Awal"],
  },
  "ivonne-rebecca": {
    role: "Supervisor Program EIBI",
    department: "Psikologi & Ilmu Perilaku",
    branchLabel: "Semua Cabang",
    bio: "Psikolog Anak berlisensi yang mensupervisi program Early Intensive Behavioral Intervention (EIBI), asesmen kognitif, dan strategi adaptasi perilaku.",
    specialties: ["Psikologi Anak", "Supervisi EIBI", "Modifikasi Perilaku", "Diagnostik Perkembangan"],
  },
  "aliefia-khairah": {
    role: "Terapis Okupasi",
    department: "Terapi Klinis",
    bio: "Terapis okupasi pediatrik yang berdedikasi pada koordinasi motorik halus, kesiapan sekolah, dan modulasi sensori.",
    specialties: ["Perkembangan Motorik Halus", "Kesiapan Menulis", "Sensory Integration"],
  },
  "zia-daturrifah": {
    role: "Terapis Okupasi",
    department: "Terapi Klinis",
    bio: "Berpengalaman dalam perencanaan motorik (praksis), rancangan sensory diet, dan pelatihan keterampilan hidup sehari-hari adaptif untuk klien pediatrik.",
    specialties: ["Perencanaan Motorik & Praksis", "Sensory Diet", "Aktivitas Kehidupan Sehari-hari"],
  },
  "nur-rahmah": {
    role: "Terapis Sensory Integration",
    department: "Terapi Klinis",
    bio: "Menerapkan teknik sensory integration berbasis psikologi untuk meningkatkan toleransi frustrasi, rentang perhatian, dan bermain interaktif.",
    specialties: ["Stimulasi Sensori", "Regulasi Emosi", "Motivasi Anak"],
  },
  "al-haviz": {
    role: "Terapis Sensory Integration",
    department: "Terapi Klinis",
    bio: "Ahli stimulasi vestibular-proprioseptif, bermain sensori-motorik yang energik, dan keterlibatan perilaku untuk anak dengan hiperaktivitas.",
    specialties: ["Terapi Vestibular", "Bermain Sensori-Motorik", "Pelatihan Atensi"],
  },
  "dian-swanti": {
    role: "Koordinator Operasional & Terapis SI",
    department: "Terapi Klinis & Operasional",
    bio: "Memadukan koordinasi operasional dengan terapi sensory integration langsung untuk menjaga standar klinis dan kepuasan orang tua yang tinggi.",
    specialties: ["Terapi SI", "Konseling Keluarga", "Alur Klinis Cabang"],
  },
  "glory-ketshia": {
    role: "Terapis Sensory Integration",
    department: "Terapi Klinis",
    bio: "Berfokus pada sensory integration, terapi bermain kooperatif, dan keterampilan regulasi diri emosional di ruang sensori Citraland.",
    specialties: ["Komunikasi Sosial", "Sensory Integration", "Bermain Bersama Teman"],
  },
};

export const BRANCHES_ID = {
  rungkut: { name: "CABANG EAST", facilities: ["Ruang Sensory Gym", "Area Motorik Kasar", "Ruang Asesmen Individual", "Lounge Orang Tua"] },
  sungkono: { name: "CABANG WEST", facilities: ["Akses Terintegrasi Mal", "Ruang Bayi Sensory Spark", "Sensory Gym Dinamis", "Area Tunggu Luas"] },
  citraland: { name: "CABANG CITRALAND", facilities: ["Lingkungan Hunian yang Tenang", "Aula Terapi Multi-Sensori", "Unit EIBI Perilaku", "Ruang Konsultasi Privat"] },
};

export const ARTICLES_ID = {
  "when-is-tiptoeing-normal": {
    title: "Kapan Berjinjit Itu Normal?",
    category: "Kasus",
    date: "6 Agu 2025",
    excerpt:
      "Sebagai orang tua, melihat anak tumbuh dan mencapai tonggak perkembangan adalah pengalaman yang membahagiakan. Namun terkadang Anda melihat sesuatu yang tidak biasa — misalnya anak sering berjalan berjinjit...",
    content:
      "Berjalan berjinjit (toe walking) cukup umum pada balita yang baru belajar berjalan pada usia 10–18 bulan karena mereka bereksperimen dengan keseimbangan. Namun bila berjinjit menetap setelah usia 2–3 tahun, atau anak tidak dapat menapakkan tumit rata di lantai, perlu dilakukan asesmen klinis. Dalam terapi okupasi pediatrik, berjinjit yang menetap dapat berkaitan dengan perbedaan pemrosesan sensori (sensitivitas taktil pada telapak kaki, mencari input vestibular yang intens) atau ketegangan muskuloskeletal seperti tendon Achilles yang memendek. Evaluasi terapi okupasi membedakan antara kebiasaan mencari sensori dan ketegangan motorik untuk memberikan intervensi yang lembut dan menyenangkan.",
  },
  "sensory-processing-disorder": {
    title: "Gangguan Pemrosesan Sensori (SPD)",
    category: "Diagnosis",
    date: "5 Agu 2025",
    excerpt:
      "Sebagai orang tua, kita sering menyadari ketika ada yang 'berbeda' pada cara anak bereaksi terhadap suara, tekstur, gerakan, atau rutinitas tertentu. Sebagian anak menutup telinga atau menolak memakai pakaian tertentu...",
    content:
      "Gangguan Pemrosesan Sensori terjadi ketika otak kesulitan menerima dan merespons informasi dari delapan indra: penglihatan, pendengaran, peraba, penciuman, pengecap, vestibular (keseimbangan), proprioseptif (posisi tubuh), dan interoseptif (sensasi internal tubuh). Anak bisa hipersensitif (over-responsif) sehingga mengalami meltdown di tempat ramai, atau hiposensitif (under-responsif) yang tampak sebagai gerak terus-menerus, menabrak perabot, atau rendahnya kesadaran terhadap nyeri. Terapi okupasi memakai Sensory Integration (SI) untuk membantu memodulasi sinyal sensori, membangun regulasi dan kenyamanan di lingkungan sehari-hari.",
  },
  "understanding-sensory-integration": {
    title: "Memahami Sensory Integration: Panduan untuk Orang Tua",
    category: "Sensory Integration",
    date: "4 Agu 2025",
    excerpt:
      "Sebagai orang tua, kita sering mendengar istilah pemrosesan sensori atau sensory integration, terutama bila anak menghadapi tantangan perkembangan. Tetapi apa sebenarnya artinya, dan bagaimana manfaatnya?",
    content:
      "Sensory Integration dipelopori oleh Dr. A. Jean Ayres, seorang terapis okupasi dan ahli saraf. Istilah ini merujuk pada proses neurologis yang mengorganisasi sensasi dari tubuh sendiri dan lingkungan sehingga tubuh dapat digunakan secara efektif di lingkungannya. Di Therapedia, terapis bersertifikat memberikan tantangan yang 'pas' menggunakan peralatan gantung khusus (hammock, bolster, ayunan Lycra) yang menstimulasi telinga dalam dan sendi. Ini memperkuat koneksi otak-tubuh anak, menghasilkan fokus, koordinasi, dan ketahanan emosi yang lebih baik.",
  },
  "what-is-occupational-therapy": {
    title: "Apa Itu Terapi Okupasi Pediatrik?",
    category: "Terapi Okupasi",
    date: "3 Agu 2025",
    excerpt:
      "Terapi okupasi adalah profesi kesehatan yang membantu individu segala usia berpartisipasi dalam aktivitas sehari-hari yang bermakna. Bagi anak, 'okupasi' utamanya adalah bermain, belajar, dan merawat diri...",
    content:
      "Jika orang dewasa bekerja, okupasi anak adalah bermain, interaksi sosial, belajar di sekolah, makan, berpakaian, dan tidur. Ketika keterlambatan perkembangan, autisme, masalah sensori, atau tantangan koordinasi motorik mengganggu aktivitas sehari-hari tersebut, terapis okupasi pediatrik mengevaluasi kekuatan dan kesulitan anak. Terapi berbasis bermain dan memberdayakan, membangun genggaman motorik halus untuk memegang pensil, perencanaan motorik untuk bermain di taman bermain, dan kemandirian dalam perawatan diri sehari-hari.",
  },
};

// Jam layanan di data asli berbahasa Indonesia (Senin – Sabtu). Untuk tampilan Inggris diterjemahkan.
export const hoursForLang = (hours, lang) =>
  lang === "en" ? String(hours || "").replace(/Senin/g, "Monday").replace(/Sabtu/g, "Saturday").replace(/Minggu/g, "Sunday") : hours;
