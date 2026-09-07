import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Globe, Menu, X, Sparkles, ShieldCheck } from "lucide-react";

export default function LandingHeader({ onBookClick }) {
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("home");

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 40) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }

      // ScrollSpy detection
      const sections = ["home", "about", "programs", "team", "branches", "knowledge", "contact"];
      const scrollPos = window.scrollY + 160;
      for (const s of sections) {
        const el = document.getElementById(s);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPos >= top && scrollPos < top + height) {
            setActiveSection(s);
            break;
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navItems = [
    { label: "Why Us", href: "#about", id: "about" },
    { label: "Programs", href: "#programs", id: "programs" },
    { label: "Our Teams", href: "#team", id: "team" },
    { label: "Branches", href: "#branches", id: "branches" },
    { label: "Knowledge", href: "#knowledge", id: "knowledge" },
    { label: "Contact", href: "#contact", id: "contact" }
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-[#040e1e]/90 backdrop-blur-md border-b border-white/10 py-3.5 shadow-xl shadow-black/20"
          : "bg-transparent py-5"
      }`}
    >
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Brand Logo (Therapedia) */}
        <a href="#home" className="flex items-center gap-3 group focus:outline-none">
          <div className="w-10 h-10 flex items-center justify-center transition-transform duration-200 group-hover:scale-105 shrink-0">
            <img
              src="/images/therapedia_logo.png"
              alt="Therapedia Logo"
              className="w-full h-full object-contain drop-shadow-[0_4px_12px_rgba(0,122,255,0.35)]"
            />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-lg tracking-tight text-white">Therapedia</span>
              <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-400/20">
                Center
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-medium tracking-wide hidden sm:block">
              Pediatric Occupational Therapy
            </span>
          </div>
        </a>

        {/* Desktop Nav Items (Denta dot-separated minimalist navigation) */}
        <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
          {navItems.map((item) => (
            <a
              key={item.id}
              href={item.href}
              className={`px-3 py-1.5 rounded-full text-xs xl:text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                activeSection === item.id
                  ? "text-white bg-white/10 font-semibold"
                  : "text-slate-300 hover:text-white hover:bg-white/5"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  activeSection === item.id ? "bg-[#007aff]" : "bg-slate-500/60"
                }`}
              />
              <span>{item.label}</span>
            </a>
          ))}
        </nav>

        {/* Right CTA Actions (Open Apps / Consultation) */}
        <div className="hidden sm:flex items-center gap-3">
          {/* Internal Prototype / Portal Switcher */}
          <button
            onClick={() => navigate("/roles")}
            className="px-4 py-2 rounded-full border border-white/20 hover:border-cyan-400/60 bg-white/5 hover:bg-white/10 text-white text-xs font-semibold tracking-wide transition-all duration-200 flex items-center gap-2 group cursor-pointer shadow-xs"
            title="Akses Prototype Sistem Operasional Internal"
            data-testid="header-open-apps-button"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Open Apps</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-cyan-300" />
          </button>

          {/* Consultation / Booking Button */}
          <button
            onClick={onBookClick}
            className="px-4 py-2 rounded-full bg-gradient-to-r from-[#007aff] to-[#0051a8] hover:from-[#1a87ff] hover:to-[#0062cc] text-white text-xs font-bold tracking-wide transition-all duration-200 border border-white/20 shadow-md shadow-[#007aff]/30 hover:scale-[1.02] cursor-pointer"
            data-testid="header-book-button"
          >
            Konsultasi Klinis
          </button>
        </div>

        {/* Mobile Menu Toggle Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="lg:hidden p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 focus:outline-none"
          aria-label="Toggle Navigation"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-[#040e1e]/95 backdrop-blur-xl border-b border-white/10 px-4 pt-3 pb-6 mt-3 space-y-2 animate-in slide-in-from-top-3">
          <div className="grid grid-cols-2 gap-2 pb-3 border-b border-white/10">
            {navItems.map((item) => (
              <a
                key={item.id}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2 ${
                  activeSection === item.id
                    ? "bg-[#007aff]/20 text-cyan-300 font-bold"
                    : "text-slate-300 hover:bg-white/5"
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                {item.label}
              </a>
            ))}
          </div>

          <div className="pt-2 flex flex-col gap-2">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                navigate("/roles");
              }}
              className="w-full py-2.5 rounded-xl border border-white/20 bg-white/5 text-white text-xs font-bold flex items-center justify-center gap-2"
            >
              <span>Open Apps (Internal Portal)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                if (onBookClick) onBookClick();
              }}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#007aff] to-[#0051a8] text-white text-xs font-bold text-center"
            >
              Konsultasi Intake
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
