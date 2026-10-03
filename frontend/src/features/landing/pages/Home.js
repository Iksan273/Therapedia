import React, { useState } from "react";
import LandingHeader from "@/features/landing/components/LandingHeader";
import LandingHero from "@/features/landing/components/LandingHero";
import LandingWhyUs from "@/features/landing/components/LandingWhyUs";
import LandingPrograms from "@/features/landing/components/LandingPrograms";
import LandingTeam from "@/features/landing/components/LandingTeam";
import LandingBranches from "@/features/landing/components/LandingBranches";
import LandingKnowledge from "@/features/landing/components/LandingKnowledge";
import LandingContact from "@/features/landing/components/LandingContact";
import LandingFooter from "@/features/landing/components/LandingFooter";
import { LanguageProvider } from "@/features/landing/i18n/LanguageContext";

function HomeContent() {
  const [selectedDoctorFromHero, setSelectedDoctorFromHero] = useState(null);

  const handleScrollToContact = () => {
    const el = document.getElementById("contact");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleSelectDoctor = (doctor) => {
    setSelectedDoctorFromHero(doctor);
    const el = document.getElementById("team");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen bg-[#040e1e] text-slate-900 selection:bg-[#007aff]/30 selection:text-white font-sans">
      {/* 1. Fixed / Sticky Denta-Style Header */}
      <LandingHeader onBookClick={handleScrollToContact} />

      {/* 2. Denta-Style Hero in Therapedia Blue with 3D Centerpiece, Specialist Carousel, & Live Clock */}
      <LandingHero
        onSelectDoctor={handleSelectDoctor}
        onBookClick={handleScrollToContact}
      />

      {/* 3. Why Choose Us (Clinical Pillars & SI vs NDT Deep-Dive) */}
      <LandingWhyUs onBookClick={handleScrollToContact} />

      {/* 4. Therapeutic Programs (Regular OT, Sensory Spark, EIBI) */}
      <LandingPrograms onBookClick={handleScrollToContact} />

      {/* 5. Our Clinical Team & Specialists (Filterable + Profile Dialog) */}
      <LandingTeam
        selectedDoctorFromHero={selectedDoctorFromHero}
        onBookClick={handleScrollToContact}
      />

      {/* 6. Centers & Branches (Rungkut, Lagoon Sungkono, Citraland) */}
      <LandingBranches />

      {/* 7. Knowledge Hub & Articles for Parents */}
      <LandingKnowledge />

      {/* 8. Consultation & Intake Booking Form */}
      <LandingContact />

      {/* 9. Comprehensive Footer with Prototype Portal Access */}
      <LandingFooter />
    </div>
  );
}

// Landing page dua bahasa (Indonesia / Inggris); pilihan bahasa disimpan di browser.
export default function Home() {
  return (
    <LanguageProvider>
      <HomeContent />
    </LanguageProvider>
  );
}
