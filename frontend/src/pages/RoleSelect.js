import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import {
  ClipboardList,
  HeartHandshake,
  KeyRound,
  Stethoscope,
  UserCog,
  Users,
  ChevronRight,
  ShieldCheck,
  Sparkles,
  CalendarDays,
  FileCheck2,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { useClients } from "@/context/ClientsContext";
import { useTherapists } from "@/context/TherapistsContext";
import { cn } from "@/lib/utils";

const HERO_IMG =
  "https://images.unsplash.com/photo-1637665759389-41818b867562?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjY2NjV8MHwxfHNlYXJjaHwxfHxwZWRpYXRyaWMlMjBvY2N1cGF0aW9uYWwlMjB0aGVyYXB5JTIwY2xpbmljJTIwd2FpdGluZyUyMHJvb20lMjBicmlnaHQlMjBuYXR1cmFsJTIwbGlnaHR8ZW58MHx8fGJsdWV8MTc4NzA1OTg4OXww&ixlib=rb-4.1.0&q=85";

const RoleCard = ({ icon: Icon, title, description, badge, onClick, active, testid }) => (
  <Card
    className={cn(
      "clinical-card rounded-2xl cursor-pointer transition-all duration-200 group border",
      active
        ? "border-sky-500 bg-sky-50/40 shadow-md ring-2 ring-sky-400/30"
        : "border-slate-200/90 hover:border-sky-300 hover:shadow-md hover:bg-white active:scale-[0.99]"
    )}
    onClick={onClick}
    data-testid={testid}
  >
    <CardContent className="p-4 sm:p-4.5 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3.5 min-w-0">
        <div
          className={cn(
            "w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105 shadow-xs",
            active
              ? "bg-sky-600 text-white shadow-sky-600/20"
              : "bg-sky-50 text-sky-700 border border-sky-100 group-hover:bg-sky-600 group-hover:text-white"
          )}
        >
          <Icon className="w-5 h-5 stroke-[2.2]" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-sm sm:text-base text-slate-900 leading-snug">{title}</p>
            {badge && (
              <span className="text-[10px] font-semibold uppercase tracking-wider bg-sky-100 text-sky-800 px-2 py-0.5 rounded-full">
                {badge}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed truncate sm:whitespace-normal">{description}</p>
        </div>
      </div>
      <div
        className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors",
          active ? "bg-sky-100 text-sky-700" : "text-slate-400 group-hover:text-sky-600 group-hover:bg-sky-50"
        )}
      >
        <ChevronRight className="w-4 h-4" />
      </div>
    </CardContent>
  </Card>
);

export default function RoleSelect() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { clients } = useClients();
  const { therapists } = useTherapists();
  const [expanded, setExpanded] = useState(null); // 'therapist' | 'client' | null
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState("");

  const enterAdmin = (role, path) => {
    login({ role });
    navigate(path);
  };

  const enterTherapist = (therapistId) => {
    login({ role: "therapist", therapistId });
    navigate("/therapist");
  };

  const handleClientLogin = (e) => {
    e.preventDefault();
    const input = code.trim().toUpperCase();
    const client = clients.find((c) => c.clientAccessCode && c.clientAccessCode.toUpperCase() === input);
    if (!client) {
      setCodeError("No client found with that access code. Try TDC-1009 for the demo.");
      return;
    }
    login({ role: "client", clientId: client.id });
    toast.success(`Welcome back, ${client.parentName}!`);
    navigate("/client");
  };

  const fillDemoCode = () => {
    setCode("TDC-1009");
    setCodeError("");
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">
      {/* Left: role selection */}
      <div className="flex-1 flex flex-col justify-between px-6 sm:px-12 lg:px-16 py-8 sm:py-12 max-w-2xl mx-auto lg:mx-0 w-full">
        <div>
          {/* Header branding */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-sky-600 to-sky-400 flex items-center justify-center text-white font-bold text-xl shadow-md shadow-sky-500/20">
              T
            </div>
            <div>
              <p className="font-bold text-lg leading-tight text-slate-900 tracking-tight">Therapedia</p>
              <p className="text-xs font-medium text-slate-500">Developmental Center</p>
            </div>
          </div>

          <div className="mb-8">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-100/80 border border-sky-200/80 text-sky-800 text-xs font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5 text-sky-600" />
              Pediatric Clinic Operations Platform
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
              Welcome to Therapedia
            </h1>
            <p className="text-sm text-slate-600 mt-2 max-w-lg leading-relaxed">
              Select your simulated role below to explore the clinical workflow, scheduling engine, assessment pipelines, and client portal.
            </p>
          </div>

          {/* Role Cards */}
          <div className="space-y-3.5">
            <RoleCard
              icon={ClipboardList}
              title="Admin — Inquiry"
              description="Pipeline tracking, parent assessments, invoices & admissions"
              badge="Intake & Billing"
              onClick={() => enterAdmin("admin_inquiry", "/admin-inquiry")}
              testid="role-select-admin-inquiry-button"
            />
            <RoleCard
              icon={UserCog}
              title="Admin — Schedule"
              description="Active client roster, weekly calendar, credits & discharge"
              badge="Scheduling"
              onClick={() => enterAdmin("admin_schedule", "/admin-schedule")}
              testid="role-select-admin-schedule-button"
            />
            <RoleCard
              icon={Stethoscope}
              title="Therapist Portal"
              description="View your assigned sessions and write clinical progress notes"
              badge="Clinical"
              onClick={() => setExpanded(expanded === "therapist" ? null : "therapist")}
              active={expanded === "therapist"}
              testid="role-select-therapist-button"
            />
            {expanded === "therapist" && (
              <div
                className="grid gap-2.5 p-3 rounded-2xl bg-white border border-sky-200 shadow-sm ml-2 sm:ml-4 animate-in fade-in slide-in-from-top-2 duration-200"
                data-testid="therapist-picker"
              >
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-1">
                  Choose a Therapist Profile:
                </p>
                {therapists.map((t) => (
                  <Button
                    key={t.id}
                    variant="outline"
                    className="justify-between h-12 bg-slate-50 hover:bg-sky-50 hover:text-sky-900 hover:border-sky-300 border-slate-200 rounded-xl px-3.5 transition-all text-left"
                    onClick={() => enterTherapist(t.id)}
                    data-testid={`therapist-picker-${t.id}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-sky-100 text-sky-700 font-bold text-xs flex items-center justify-center shrink-0">
                        {t.name.split(" ")[0][0]}
                      </div>
                      <span className="font-semibold text-sm text-slate-800 truncate">{t.name}</span>
                    </div>
                    <span className="text-xs font-medium text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-full shrink-0">
                      {t.specialty}
                    </span>
                  </Button>
                ))}
              </div>
            )}

            <RoleCard
              icon={HeartHandshake}
              title="Client (Parent) Portal"
              description="Log in with your family access code to view credits and history"
              badge="Family Care"
              onClick={() => setExpanded(expanded === "client" ? null : "client")}
              active={expanded === "client"}
              testid="role-select-client-login-button"
            />
            {expanded === "client" && (
              <form
                onSubmit={handleClientLogin}
                className="p-4 rounded-2xl bg-white border border-sky-200 shadow-sm ml-2 sm:ml-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200"
                data-testid="client-login-form"
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-600">Enter Access Code</p>
                  <button
                    type="button"
                    onClick={fillDemoCode}
                    className="text-xs font-semibold text-sky-600 hover:text-sky-700 hover:underline"
                  >
                    Use demo: TDC-1009
                  </button>
                </div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <KeyRound className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                      className="pl-9 font-mono uppercase tracking-wider bg-slate-50 border-slate-200 focus:bg-white rounded-xl"
                      placeholder="e.g. TDC-1009"
                      value={code}
                      onChange={(e) => {
                        setCode(e.target.value);
                        setCodeError("");
                      }}
                      data-testid="client-access-code-input"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-xl px-5 shadow-sm shadow-sky-600/20"
                    data-testid="client-login-submit-button"
                  >
                    Log In
                  </Button>
                </div>
                {codeError && (
                  <p className="text-xs font-medium text-rose-600" data-testid="client-login-error">
                    {codeError}
                  </p>
                )}
              </form>
            )}
          </div>
        </div>

        {/* Bottom links */}
        <div className="mt-10 pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs sm:text-sm">
          <Link
            to="/inquiry"
            className="inline-flex items-center gap-1.5 text-sky-700 font-semibold hover:text-sky-800 group"
            data-testid="landing-public-inquiry-link"
          >
            Submit Public Inquiry Form
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <Link
            to="/assessment"
            className="inline-flex items-center gap-1.5 text-sky-700 font-semibold hover:text-sky-800 group"
            data-testid="landing-assessment-fill-link"
          >
            Fill Parent Assessment Form
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>

      {/* Right: hero presentation */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden bg-slate-900">
        <img
          src={HERO_IMG}
          alt="Therapedia pediatric therapy clinic"
          className="absolute inset-0 w-full h-full object-cover opacity-60 scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-900/40 to-slate-950/30" />

        <div className="relative z-10 flex flex-col justify-between p-12 text-white h-full">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-medium w-fit">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            HIPAA-Ready Architecture & Local State Sandbox
          </div>

          <div className="space-y-6 max-w-lg">
            <h2 className="text-3xl sm:text-4xl font-extrabold leading-tight tracking-tight">
              Helping every child flourish through structured developmental care.
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Empowering occupational therapists, intake specialists, and families with transparent progress tracking, attendance reliability, and coordinated therapy sessions.
            </p>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15">
                <CalendarDays className="w-5 h-5 text-sky-400 mb-1.5" />
                <p className="font-semibold text-sm">Weekly Scheduler</p>
                <p className="text-xs text-slate-300 mt-0.5">Automated conflict checks & recurring 12w blocks</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15">
                <FileCheck2 className="w-5 h-5 text-emerald-400 mb-1.5" />
                <p className="font-semibold text-sm">Credit Management</p>
                <p className="text-xs text-slate-300 mt-0.5">Zero-credit alerts, renewals & leave quotas</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

