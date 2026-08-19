import React, { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft,
  CheckCircle2,
  Copy,
  Sparkles,
  HeartHandshake,
  ShieldCheck,
  Activity,
  Layers,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useClients } from "@/context/ClientsContext";
import { makeInquiryClient, CONCERN_TAGS, SESSION_TYPES } from "@/lib/appUtils";
import { cn } from "@/lib/utils";

const EMPTY = {
  parentName: "",
  parentContact: "",
  parentEmail: "",
  clientName: "",
  dob: "",
  parentComplaint: "",
  concernTags: ["sensory"],
  serviceTypes: ["assessment", "therapy"],
  timePreference: "sat_morning",
};

export default function PublicInquiryForm() {
  const { addClient } = useClients();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [created, setCreated] = useState(null);

  const set = (key) => (e) => {
    setForm({ ...form, [key]: e.target.value });
    setErrors({ ...errors, [key]: undefined });
  };

  const toggleServiceType = (val) => {
    setForm((prev) => {
      const cur = prev.serviceTypes || [];
      if (cur.includes(val)) {
        if (cur.length === 1) return prev;
        return { ...prev, serviceTypes: cur.filter((v) => v !== val) };
      } else {
        return { ...prev, serviceTypes: [...cur, val] };
      }
    });
  };

  const toggleConcernTag = (val) => {
    setForm((prev) => {
      const cur = prev.concernTags || [];
      return {
        ...prev,
        concernTags: cur.includes(val) ? cur.filter((v) => v !== val) : [...cur, val],
      };
    });
  };

  const validate = () => {
    const errs = {};
    if (!form.parentName.trim()) errs.parentName = "Parent / Guardian name is required";
    if (!form.parentContact.trim()) errs.parentContact = "Contact number is required";
    if (!form.parentEmail.trim() || !/^\S+@\S+\.\S+$/.test(form.parentEmail)) errs.parentEmail = "A valid email address is required";
    if (!form.clientName.trim()) errs.clientName = "Child name is required";
    if (!form.dob) errs.dob = "Date of birth is required";
    if (!form.parentComplaint.trim()) errs.parentComplaint = "Please describe your concerns so our clinical team can prepare";
    return errs;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    const client = makeInquiryClient(form);
    addClient(client);
    setCreated(client);
    toast.success("Inquiry registered! Our clinical admissions team will reach out shortly.");
  };

  const copyCode = () => {
    navigator.clipboard.writeText(created.clientAccessCode).then(
      () => toast.success("Access code copied to clipboard."),
      () => toast.error("Could not copy — please write it down manually.")
    );
  };

  return (
    <div className="min-h-screen bg-slate-50/80 py-12 px-4 sm:px-6">
      <div className="max-w-xl mx-auto space-y-6">
        <Link to="/" className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-sky-700 transition-colors" data-testid="inquiry-back-link">
          <ArrowLeft className="w-4 h-4" /> Back to portal select
        </Link>

        {/* Brand Header */}
        <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
          <div className="w-12 h-12 rounded-2xl bg-sky-600 flex items-center justify-center text-white font-extrabold text-xl shadow-xs shadow-sky-600/30">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <p className="font-extrabold text-base text-slate-900 leading-tight">Therapedia Developmental Center</p>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Pediatric Therapy & Clinical Developmental Intake</p>
          </div>
        </div>

        {created ? (
          <Card className="rounded-2xl border border-slate-200/90 shadow-sm bg-white overflow-hidden clinical-card" data-testid="inquiry-success-card">
            <CardContent className="p-8 text-center space-y-5">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-2xs">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1.5">
                <h2 className="text-2xl font-extrabold text-slate-900">Thank you, {created.parentName}!</h2>
                <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
                  Your inquiry for <strong className="text-slate-900 font-bold">{created.clientName}</strong> has been received by our clinic.
                  Our admissions specialist will review your note and contact you within 1 business day.
                </p>
              </div>

              <div className="rounded-2xl bg-sky-50 border border-sky-200 p-5 space-y-2">
                <p className="text-[11px] uppercase tracking-wider font-bold text-sky-800">Your Permanent Access Code</p>
                <div className="flex items-center justify-center gap-3">
                  <span className="font-mono text-2xl font-black text-sky-950 tracking-wider bg-white px-4 py-1.5 rounded-xl border border-sky-200 shadow-2xs" data-testid="inquiry-access-code">
                    {created.clientAccessCode}
                  </span>
                  <Button size="icon" variant="outline" className="rounded-xl border-sky-200 bg-white hover:bg-sky-100 h-10 w-10" onClick={copyCode} aria-label="Copy access code" data-testid="inquiry-copy-code-button">
                    <Copy className="w-4 h-4 text-sky-700" />
                  </Button>
                </div>
                <p className="text-[11px] text-sky-700 font-medium">
                  Please save this code — you will use it to log in to the Parent Portal once admitted.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5 justify-center pt-2">
                <Button variant="outline" className="rounded-xl border-slate-200 text-xs font-semibold h-10" onClick={() => { setCreated(null); setForm(EMPTY); }} data-testid="inquiry-submit-another-button">
                  Submit another child inquiry
                </Button>
                <Link to="/">
                  <Button className="w-full sm:w-auto bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl text-xs h-10 shadow-xs">Return to Home</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="rounded-2xl border border-slate-200/90 shadow-sm bg-white overflow-hidden clinical-card">
            <CardHeader className="pb-4 border-b border-slate-100 bg-slate-50/50">
              <CardTitle className="text-lg font-bold text-slate-900">Child & Family Intake Form</CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Please provide details below so our therapy coordinators can understand your child's needs.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleSubmit} className="space-y-4" data-testid="public-inquiry-form">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Parent / Guardian Full Name *</Label>
                  <Input
                    className="rounded-xl border-slate-200 bg-slate-50 focus:bg-white text-xs h-10"
                    value={form.parentName}
                    onChange={set("parentName")}
                    placeholder="e.g. Jamie Rivera"
                    data-testid="inquiry-parent-name-input"
                  />
                  {errors.parentName && <p className="text-[11px] font-semibold text-rose-600">{errors.parentName}</p>}
                </div>

                <div className="grid sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">WhatsApp / Phone Number *</Label>
                    <Input
                      className="rounded-xl border-slate-200 bg-slate-50 focus:bg-white text-xs h-10"
                      value={form.parentContact}
                      onChange={set("parentContact")}
                      placeholder="+62 812-3456-7890"
                      data-testid="inquiry-parent-contact-input"
                    />
                    {errors.parentContact && <p className="text-[11px] font-semibold text-rose-600">{errors.parentContact}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Email Address *</Label>
                    <Input
                      type="email"
                      className="rounded-xl border-slate-200 bg-slate-50 focus:bg-white text-xs h-10"
                      value={form.parentEmail}
                      onChange={set("parentEmail")}
                      placeholder="parent@example.com"
                      data-testid="inquiry-parent-email-input"
                    />
                    {errors.parentEmail && <p className="text-[11px] font-semibold text-rose-600">{errors.parentEmail}</p>}
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Child's Name *</Label>
                    <Input
                      className="rounded-xl border-slate-200 bg-slate-50 focus:bg-white text-xs h-10"
                      value={form.clientName}
                      onChange={set("clientName")}
                      placeholder="e.g. Sam Rivera"
                      data-testid="inquiry-client-name-input"
                    />
                    {errors.clientName && <p className="text-[11px] font-semibold text-rose-600">{errors.clientName}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Child's Date of Birth *</Label>
                    <Input
                      type="date"
                      className="rounded-xl border-slate-200 bg-slate-50 focus:bg-white text-xs h-10"
                      value={form.dob}
                      onChange={set("dob")}
                      data-testid="inquiry-dob-input"
                    />
                    {errors.dob && <p className="text-[11px] font-semibold text-rose-600">{errors.dob}</p>}
                  </div>
                </div>

                {/* MULTI-SERVICE DISCIPLINE SELECTION */}
                <div className="space-y-2 p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                  <Label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-sky-600" />
                    Desired Clinical Disciplines & Services <span className="text-slate-400 font-normal">(Select all that apply)</span>
                  </Label>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {SESSION_TYPES.map((srv) => {
                      const active = (form.serviceTypes || []).includes(srv.value);
                      return (
                        <button
                          key={srv.value}
                          type="button"
                          onClick={() => toggleServiceType(srv.value)}
                          className={cn(
                            "px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer",
                            active
                              ? "bg-sky-600 border-sky-600 text-white shadow-2xs"
                              : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                          )}
                        >
                          {srv.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Primary Concerns & Current Challenges *</Label>
                  <Textarea
                    rows={3}
                    className="rounded-xl border-slate-200 bg-slate-50 focus:bg-white text-xs"
                    value={form.parentComplaint}
                    onChange={set("parentComplaint")}
                    placeholder="Tell us what you're noticing — speech delays, motor coordination, sensory sensitivities, social interaction, feeding..."
                    data-testid="inquiry-complaint-input"
                  />
                  {errors.parentComplaint && <p className="text-[11px] font-semibold text-rose-600">{errors.parentComplaint}</p>}
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-700">
                    Clinical Focus Categories <span className="text-slate-400 font-normal">(Tap all that apply)</span>
                  </Label>
                  <div className="flex flex-wrap gap-2" data-testid="inquiry-concern-tags">
                    {CONCERN_TAGS.map((t) => {
                      const active = form.concernTags.includes(t.value);
                      return (
                        <button
                          key={t.value}
                          type="button"
                          onClick={() => toggleConcernTag(t.value)}
                          className={cn(
                            "rounded-full px-3 py-1.5 text-xs font-bold border transition-all cursor-pointer",
                            active
                              ? "bg-purple-600 border-purple-600 text-white shadow-2xs"
                              : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                          )}
                          data-testid={`inquiry-tag-${t.value}`}
                        >
                          {t.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <Button type="submit" className="w-full bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl h-11 text-sm shadow-sm shadow-sky-600/20 mt-2" data-testid="inquiry-submit-button">
                  Submit Pediatric Intake
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
