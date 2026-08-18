import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { ClipboardList, HeartHandshake, KeyRound, Stethoscope, UserCog, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { useClients } from "@/context/ClientsContext";
import { useTherapists } from "@/context/TherapistsContext";

const HERO_IMG =
  "https://images.unsplash.com/photo-1637665759389-41818b867562?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjY2NjV8MHwxfHNlYXJjaHwxfHxwZWRpYXRyaWMlMjBvY2N1cGF0aW9uYWwlMjB0aGVyYXB5JTIwY2xpbmljJTIwd2FpdGluZyUyMHJvb20lMjBicmlnaHQlMjBuYXR1cmFsJTIwbGlnaHR8ZW58MHx8fGJsdWV8MTc4NzA1OTg4OXww&ixlib=rb-4.1.0&q=85";

const RoleCard = ({ icon: Icon, title, description, onClick, active, testid }) => (
  <Card
    className={`rounded-xl border cursor-pointer transition-shadow duration-150 hover:shadow-md ${
      active ? "border-[var(--color-primary)] shadow-md" : "border-[var(--color-border)] shadow-sm"
    }`}
    onClick={onClick}
    data-testid={testid}
  >
    <CardContent className="p-4 flex items-center gap-4">
      <div className="w-11 h-11 rounded-xl bg-[var(--color-primary-light)] flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-[var(--color-primary-dark)]" />
      </div>
      <div>
        <p className="font-semibold text-sm">{title}</p>
        <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{description}</p>
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

  return (
    <div className="min-h-screen bg-[var(--color-surface)] flex">
      {/* Left: role selection */}
      <div className="flex-1 flex flex-col justify-center px-6 sm:px-12 lg:px-16 py-10 max-w-2xl mx-auto lg:mx-0">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-11 h-11 rounded-xl bg-[var(--color-primary)] flex items-center justify-center text-white font-semibold text-xl">
            T
          </div>
          <div>
            <p className="font-semibold text-lg leading-tight">Therapedia</p>
            <p className="text-xs text-[var(--color-text-muted)]">Developmental Center</p>
          </div>
        </div>

        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-2">Welcome back</h1>
        <p className="text-sm text-[var(--color-text-muted)] mb-8">
          Select a role to explore the clinic management prototype. All data is simulated and stored in your browser.
        </p>

        <div className="space-y-3">
          <RoleCard
            icon={ClipboardList}
            title="Admin — Inquiry"
            description="Manage the inquiry pipeline, assessments, invoices and admissions"
            onClick={() => enterAdmin("admin_inquiry", "/admin-inquiry")}
            testid="role-select-admin-inquiry-button"
          />
          <RoleCard
            icon={UserCog}
            title="Admin — Schedule"
            description="Active clients, weekly calendar, credits and discharges"
            onClick={() => enterAdmin("admin_schedule", "/admin-schedule")}
            testid="role-select-admin-schedule-button"
          />
          <RoleCard
            icon={Stethoscope}
            title="Therapist"
            description="View my weekly schedule and client details"
            onClick={() => setExpanded(expanded === "therapist" ? null : "therapist")}
            active={expanded === "therapist"}
            testid="role-select-therapist-button"
          />
          {expanded === "therapist" && (
            <div className="grid gap-2 pl-4 border-l-2 border-[var(--color-primary-light)] ml-4" data-testid="therapist-picker">
              {therapists.map((t) => (
                <Button
                  key={t.id}
                  variant="outline"
                  className="justify-start gap-3 h-11"
                  onClick={() => enterTherapist(t.id)}
                  data-testid={`therapist-picker-${t.id}`}
                >
                  <Users className="w-4 h-4 text-[var(--color-primary-dark)]" />
                  <span className="font-medium">{t.name}</span>
                  <span className="text-xs text-[var(--color-text-muted)] ml-auto">{t.specialty}</span>
                </Button>
              ))}
            </div>
          )}
          <RoleCard
            icon={HeartHandshake}
            title="Client (Parent)"
            description="Log in with your access code to view credits and history"
            onClick={() => setExpanded(expanded === "client" ? null : "client")}
            active={expanded === "client"}
            testid="role-select-client-login-button"
          />
          {expanded === "client" && (
            <form
              onSubmit={handleClientLogin}
              className="pl-4 border-l-2 border-[var(--color-primary-light)] ml-4 space-y-2"
              data-testid="client-login-form"
            >
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <KeyRound className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                  <Input
                    className="pl-9 uppercase"
                    placeholder="Access code e.g. TDC-1009"
                    value={code}
                    onChange={(e) => {
                      setCode(e.target.value);
                      setCodeError("");
                    }}
                    data-testid="client-access-code-input"
                  />
                </div>
                <Button type="submit" className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)]" data-testid="client-login-submit-button">
                  Log In
                </Button>
              </div>
              {codeError && (
                <p className="text-xs text-[var(--color-danger)]" data-testid="client-login-error">
                  {codeError}
                </p>
              )}
              <p className="text-[11px] text-[var(--color-text-muted)]">Demo code: TDC-1009 (Oliver Bennett)</p>
            </form>
          )}
        </div>

        <div className="mt-10 pt-6 border-t border-[var(--color-border)] flex flex-wrap gap-4 text-sm">
          <Link to="/inquiry" className="text-[var(--color-primary-dark)] font-medium hover:underline" data-testid="landing-public-inquiry-link">
            Submit a new inquiry →
          </Link>
          <Link to="/assessment" className="text-[var(--color-primary-dark)] font-medium hover:underline" data-testid="landing-assessment-fill-link">
            Fill an assessment form →
          </Link>
        </div>
      </div>

      {/* Right: hero image */}
      <div className="hidden lg:block flex-1 relative">
        <img src={HERO_IMG} alt="Therapedia clinic" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[rgba(28,127,176,0.55)] via-transparent to-transparent" />
        <div className="absolute bottom-10 left-10 right-10 text-white">
          <p className="text-2xl font-semibold leading-snug drop-shadow">Helping every child thrive,</p>
          <p className="text-2xl font-semibold leading-snug drop-shadow">one session at a time.</p>
        </div>
      </div>
    </div>
  );
}
