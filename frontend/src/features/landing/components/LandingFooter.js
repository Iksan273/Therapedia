import React from "react";
import { useNavigate } from "react-router-dom";
import { Instagram, Facebook, Globe, ArrowRight } from "lucide-react";
import { useLang } from "@/features/landing/i18n/LanguageContext";
import { CLINIC_INFO } from "@/features/landing/data/landingData";

export default function LandingFooter() {
  const { L } = useLang();
  const navigate = useNavigate();

  return (
    <footer className="bg-[#030914] text-slate-400 border-t border-white/10 pt-16 pb-12 text-xs">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-12 border-b border-white/10">
          {/* Clinic Brand & Mission (5 cols) */}
          <div className="md:col-span-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 flex items-center justify-center shrink-0">
                <img
                  src="/images/therapedia_logo.png"
                  alt="Therapedia Logo"
                  className="w-full h-full object-contain drop-shadow-[0_2px_8px_rgba(0,122,255,0.4)]"
                />
              </div>
              <span className="font-extrabold text-lg text-white tracking-tight">Therapedia Center</span>
            </div>

            <p className="text-slate-400 leading-relaxed max-w-md">
              {L(CLINIC_INFO.heroSubtitle, "Therapedia adalah pusat terapi okupasi pediatrik di Surabaya yang berdedikasi mendukung anak dengan tantangan perkembangan. Kami menyediakan terapi personal berbasis bukti melalui pendekatan seperti Sensory Integration dan Neurodevelopmental Treatment, membantu anak tumbuh, berkembang, dan mencapai potensi terbaiknya.")}
            </p>

            <div className="pt-2">
              <p className="text-white font-semibold mb-2">Follow Therapedia:</p>
              <div className="flex items-center gap-3">
                <a
                  href={CLINIC_INFO.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-[#007aff] text-white flex items-center justify-center transition-colors cursor-pointer"
                  aria-label="Instagram Therapedia"
                >
                  <Instagram className="w-4 h-4" />
                </a>
                <a
                  href={CLINIC_INFO.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-[#007aff] text-white flex items-center justify-center transition-colors cursor-pointer"
                  aria-label="Facebook Therapedia"
                >
                  <Facebook className="w-4 h-4" />
                </a>
                <a
                  href="https://therapedia.center"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-[#007aff] text-white flex items-center justify-center transition-colors cursor-pointer"
                  aria-label="Therapedia Center Website"
                >
                  <Globe className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>

          {/* Quick Menu (3 cols) */}
          <div className="md:col-span-3 space-y-3">
            <h4 className="text-white font-bold text-xs uppercase tracking-wider">{L("Main Pages", "Halaman Utama")}</h4>
            <ul className="space-y-2.5">
              <li>
                <a href="#home" className="hover:text-white transition-colors">
                  {L("Home (Top)", "Beranda (Atas)")}
                </a>
              </li>
              <li>
                <a href="#about" className="hover:text-white transition-colors">
                  {L("Why Choose Us", "Mengapa Memilih Kami")}
                </a>
              </li>
              <li>
                <a href="#programs" className="hover:text-white transition-colors">
                  {L("Clinical Programs", "Program Klinis")}
                </a>
              </li>
              <li>
                <a href="#team" className="hover:text-white transition-colors">
                  {L("Our Teams", "Tim Kami")}
                </a>
              </li>
              <li>
                <a href="#branches" className="hover:text-white transition-colors">
                  {L("3 Branches in Surabaya", "3 Cabang Surabaya")}
                </a>
              </li>
              <li>
                <a href="#knowledge" className="hover:text-white transition-colors">
                  {L("Knowledge Hub", "Pusat Wawasan")}
                </a>
              </li>
              <li>
                <a href="#contact" className="hover:text-white transition-colors">
                  {L("Contact & Booking", "Kontak & Booking")}
                </a>
              </li>
            </ul>
          </div>

          {/* Prototype Internal Applications (4 cols) */}
          <div className="md:col-span-4 space-y-3">
            <h4 className="text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{L("Internal Application Portal", "Portal Aplikasi Internal")}</span>
            </h4>
            <p className="text-slate-400 leading-relaxed text-xs">
              {L("Access the operational modules of the Therapedia clinic management system (multi-role testing & live dashboards):", "Akses modul operasional sistem manajemen klinik Therapedia (multi-role testing & live dashboards):")}
            </p>

            <div className="pt-1 flex flex-col gap-2">
              <button
                onClick={() => navigate("/roles")}
                className="w-full py-2.5 px-4 rounded-xl bg-white/10 hover:bg-[#007aff]/30 border border-white/15 text-white font-bold text-xs transition-all flex items-center justify-between group cursor-pointer"
              >
                <span>{L("Role Switcher (Master, Manager, Therapist, Parent)", "Role Switcher (Master, Manager, Terapis, Orang Tua)")}</span>
                <ArrowRight className="w-3.5 h-3.5 text-cyan-400 transition-transform group-hover:translate-x-1" />
              </button>

              <button
                onClick={() => navigate("/login")}
                className="w-full py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 text-xs font-semibold transition-all flex items-center justify-between cursor-pointer"
              >
                <span>{L("Staff Login Page", "Halaman Login Staf")}</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </button>

              <button
                onClick={() => navigate("/assessment")}
                className="w-full py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-cyan-300 text-xs font-semibold transition-all flex items-center justify-between cursor-pointer"
              >
                <span>{L("Parent Assessment Questionnaire Portal", "Portal Kuesioner Asesmen Orang Tua")}</span>
                <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />
              </button>

              <button
                onClick={() => navigate("/")}
                className="w-full py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-xs font-semibold transition-all flex items-center justify-between cursor-pointer"
              >
                <span>{L("Welcome Gateway Screen", "Layar Gerbang Selamat Datang")}</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>
          </div>
        </div>

        {/* Sub-footer Copyright & Version */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-500">
          <p>© {CLINIC_INFO.copyrightYear} Therapedia Center. {L("All Rights Reserved.", "Seluruh hak cipta dilindungi.")}</p>
          <div className="flex items-center gap-4">
            <span className="text-slate-400 font-medium">{L("Certified SI & NDT Practice", "Praktik SI & NDT Bersertifikat")}</span>
            <span>•</span>
            <span className="font-mono text-slate-500">{CLINIC_INFO.version}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
