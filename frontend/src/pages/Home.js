import React, { useState } from "react";
import LandingHeader from "@/components/landing/LandingHeader";
import LandingHero from "@/components/landing/LandingHero";
import LandingWhyUs from "@/components/landing/LandingWhyUs";
import LandingPrograms from "@/components/landing/LandingPrograms";
import LandingTeam from "@/components/landing/LandingTeam";
import LandingBranches from "@/components/landing/LandingBranches";
import LandingKnowledge from "@/components/landing/LandingKnowledge";
import LandingContact from "@/components/landing/LandingContact";
import LandingFooter from "@/components/landing/LandingFooter";

export default function Home() {
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
