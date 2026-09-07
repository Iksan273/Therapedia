import React, { useState } from "react";
import { Send, MapPin, Mail, Phone, MessageSquare, CheckCircle2, Sparkles, Building } from "lucide-react";
import { CLINIC_INFO, CLINICAL_BRANCHES } from "@/data/landingData";
import { toast } from "sonner";

export default function LandingContact() {
  const [formData, setFormData] = useState({
    parentName: "",
    whatsapp: "",
    email: "",
    childName: "",
    childAge: "",
    branch: CLINICAL_BRANCHES[0].shortName,
    concern: ""
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    setTimeout(() => {
      setIsSubmitting(false);
      setIsSubmitted(true);
      toast.success("Permintaan konsultasi berhasil dikirim! Tim intake kami akan segera menghubungi Anda.");
    }, 700);
  };

  const handleOpenWhatsApp = () => {
    const message = encodeURIComponent(
      `Halo Therapedia Center, saya ${formData.parentName || "Orang Tua"} ingin berkonsultasi mengenai anak saya ${
        formData.childName ? `(${formData.childName}, ${formData.childAge || ""})` : ""
      } untuk cabang ${formData.branch}. Keluhan: ${formData.concern || "Konsultasi tumbuh kembang"}`
    );
    window.open(`https://wa.me/${CLINIC_INFO.whatsappNumber}?text=${message}`, "_blank");
  };

  return (
    <section id="contact" className="py-20 sm:py-28 bg-[#fafbfc] relative overflow-hidden">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#007aff]/10 border border-[#007aff]/20 text-[#007aff] text-xs font-bold uppercase tracking-wider mb-4">
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Connect with Therapedia</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-tight mb-4">
            Book a Consultation or{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#007aff] to-cyan-600">
              Get in Touch
            </span>
          </h2>

          <p className="text-slate-600 text-base sm:text-lg leading-relaxed">
            Contact Therapedia easily through WhatsApp or visit our nearest branch for more information and
            clinical consultation.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* Left: Branch Directory & Info */}
          <div className="lg:col-span-5 space-y-6">
            <div className="rounded-3xl bg-white border border-slate-200/90 p-6 sm:p-8 shadow-sm space-y-6">
              <h3 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <Building className="w-5 h-5 text-[#007aff]" />
                <span>Pusat Layanan Terpadu Surabaya</span>
              </h3>

              <div className="space-y-5 text-xs sm:text-sm text-slate-600">
                {CLINICAL_BRANCHES.map((b) => (
                  <div key={b.id} className="pb-4 border-b border-slate-100 last:border-0 last:pb-0">
                    <p className="font-extrabold text-slate-900 tracking-wide text-xs uppercase text-[#007aff] mb-1">
                      {b.name}
                    </p>
                    <p className="text-slate-600 leading-relaxed mb-2">{b.address}</p>
                    <a
                      href={b.mapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[#007aff] font-bold text-xs hover:underline"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      <span>Lihat Google Maps</span>
                    </a>
                  </div>
                ))}
              </div>

              {/* Direct Channels */}
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <div className="flex items-center gap-3 text-xs sm:text-sm text-slate-700">
                  <Mail className="w-4 h-4 text-[#007aff] shrink-0" />
                  <span>
                    Email:{" "}
                    <a href={`mailto:${CLINIC_INFO.email}`} className="font-bold text-[#007aff] hover:underline">
                      {CLINIC_INFO.email}
                    </a>
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs sm:text-sm text-slate-700">
                  <Phone className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    WhatsApp Intake:{" "}
                    <button
                      onClick={handleOpenWhatsApp}
                      className="font-bold text-emerald-600 hover:underline cursor-pointer"
                    >
                      Chat Admin (+62 812-3456-7890)
                    </button>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Intake Booking Form */}
          <div className="lg:col-span-7">
            <div className="rounded-3xl bg-white border border-slate-200/90 p-6 sm:p-8 lg:p-10 shadow-xl">
              <div className="mb-6">
                <span className="text-xs font-bold text-[#007aff] uppercase tracking-wider">
                  Formulir Konsultasi
                </span>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
                  Jadwalkan Konsultasi Klinis Anak
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Isi informasi di bawah ini untuk mendiskusikan kebutuhan tumbuh kembang buah hati Anda dengan tim terapis kami.
                </p>
              </div>

              {isSubmitted ? (
                <div className="p-8 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-4 animate-in fade-in duration-300">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <h4 className="text-lg font-bold text-emerald-900">Permintaan Konsultasi Diterima!</h4>
                  <p className="text-xs sm:text-sm text-emerald-700 max-w-md mx-auto leading-relaxed">
                    Terima kasih, Bapak/Ibu {formData.parentName}. Tim intake Therapedia cabang {formData.branch} akan
                    menghubungi WhatsApp Anda dalam kurun waktu 1x24 jam kerja.
                  </p>
                  <div className="pt-2 flex justify-center gap-3">
                    <button
                      onClick={handleOpenWhatsApp}
                      className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md cursor-pointer"
                    >
                      Hubungi Langsung via WhatsApp
                    </button>
                    <button
                      onClick={() => setIsSubmitted(false)}
                      className="px-4 py-2.5 rounded-xl bg-white text-emerald-800 text-xs font-semibold border border-emerald-200 cursor-pointer"
                    >
                      Kirim Lagi
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Nama Lengkap Orang Tua <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="parentName"
                        value={formData.parentName}
                        onChange={handleChange}
                        required
                        placeholder="Contoh: Ibu Sarah"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-[#007aff] focus:ring-2 focus:ring-[#007aff]/20 text-xs sm:text-sm outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Nomor WhatsApp Aktif <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        name="whatsapp"
                        value={formData.whatsapp}
                        onChange={handleChange}
                        required
                        placeholder="0812xxxxxxxx"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-[#007aff] focus:ring-2 focus:ring-[#007aff]/20 text-xs sm:text-sm outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Nama Panggilan Anak
                      </label>
                      <input
                        type="text"
                        name="childName"
                        value={formData.childName}
                        onChange={handleChange}
                        placeholder="Nama anak"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-[#007aff] focus:ring-2 focus:ring-[#007aff]/20 text-xs sm:text-sm outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Usia Anak Saat Ini
                      </label>
                      <input
                        type="text"
                        name="childAge"
                        value={formData.childAge}
                        onChange={handleChange}
                        placeholder="Contoh: 3 tahun 6 bulan"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-[#007aff] focus:ring-2 focus:ring-[#007aff]/20 text-xs sm:text-sm outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Pilihan Cabang Terdekat <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="branch"
                        value={formData.branch}
                        onChange={handleChange}
                        className="w-full px-3 py-3 rounded-xl border border-slate-200 focus:border-[#007aff] focus:ring-2 focus:ring-[#007aff]/20 text-xs sm:text-sm outline-none transition-all bg-white"
                      >
                        {CLINICAL_BRANCHES.map((b) => (
                          <option key={b.id} value={b.shortName}>
                            {b.shortName}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Catatan / Keluhan Tumbuh Kembang yang Diamati <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      name="concern"
                      rows="4"
                      value={formData.concern}
                      onChange={handleChange}
                      required
                      placeholder="Ceritakan kendala anak (misal: belum bisa fokus, jalan jinjit, sensitif terhadap suara, terlambat bicara, dll.)"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-[#007aff] focus:ring-2 focus:ring-[#007aff]/20 text-xs sm:text-sm outline-none transition-all resize-none"
                    />
                  </div>

                  <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-[#007aff] hover:bg-[#0051a8] text-white font-bold text-xs sm:text-sm tracking-wide shadow-lg shadow-[#007aff]/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <Send className="w-4 h-4" />
                      <span>{isSubmitting ? "Mengirim Permintaan..." : "Kirim Permintaan Konsultasi"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleOpenWhatsApp}
                      className="w-full sm:w-auto px-6 py-3.5 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs sm:text-sm tracking-wide shadow-md shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>Chat WhatsApp Sekarang</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
