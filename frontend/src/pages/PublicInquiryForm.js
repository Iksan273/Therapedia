import React, { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useClients } from "@/context/ClientsContext";
import { makeInquiryClient } from "@/lib/appUtils";

const EMPTY = { parentName: "", parentContact: "", parentEmail: "", clientName: "", dob: "", parentComplaint: "" };

export default function PublicInquiryForm() {
  const { addClient } = useClients();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [created, setCreated] = useState(null);

  const set = (key) => (e) => {
    setForm({ ...form, [key]: e.target.value });
    setErrors({ ...errors, [key]: undefined });
  };

  const validate = () => {
    const errs = {};
    if (!form.parentName.trim()) errs.parentName = "Parent name is required";
    if (!form.parentContact.trim()) errs.parentContact = "Contact number is required";
    if (!form.parentEmail.trim() || !/^\S+@\S+\.\S+$/.test(form.parentEmail)) errs.parentEmail = "A valid email is required";
    if (!form.clientName.trim()) errs.clientName = "Child name is required";
    if (!form.dob) errs.dob = "Date of birth is required";
    if (!form.parentComplaint.trim()) errs.parentComplaint = "Please describe your concerns so our team can prepare";
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
    toast.success("Inquiry submitted! Our team will reach out shortly.");
  };

  const copyCode = () => {
    navigator.clipboard.writeText(created.clientAccessCode).then(
      () => toast.success("Access code copied."),
      () => toast.error("Could not copy — please note it down manually.")
    );
  };

  return (
    <div className="min-h-screen bg-[var(--color-surface)] noise-bg py-10 px-4">
      <div className="max-w-lg mx-auto">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] mb-6" data-testid="inquiry-back-link">
          <ArrowLeft className="w-4 h-4" /> Back to home
        </Link>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)] flex items-center justify-center text-white font-semibold text-lg">T</div>
          <div>
            <p className="font-semibold leading-tight">Therapedia Developmental Center</p>
            <p className="text-xs text-[var(--color-text-muted)]">New Client Inquiry</p>
          </div>
        </div>

        {created ? (
          <Card className="rounded-xl border-[var(--color-border)] shadow-sm" data-testid="inquiry-success-card">
            <CardContent className="p-8 text-center space-y-4">
              <CheckCircle2 className="w-12 h-12 text-[var(--color-success)] mx-auto" />
              <div>
                <p className="text-lg font-semibold">Thank you, {created.parentName}!</p>
                <p className="text-sm text-[var(--color-text-muted)] mt-1">
                  Your inquiry for <span className="font-medium text-[var(--color-text)]">{created.clientName}</span> has been received.
                  Our admissions team will contact you within 1–2 business days.
                </p>
              </div>
              <div className="rounded-xl bg-[var(--color-primary-light)] p-4">
                <p className="text-xs text-[var(--color-primary-dark)] font-medium mb-1">Your client access code</p>
                <div className="flex items-center justify-center gap-2">
                  <span className="font-mono text-xl font-semibold text-[var(--color-primary-dark)] tracking-wider" data-testid="inquiry-access-code">
                    {created.clientAccessCode}
                  </span>
                  <Button size="icon" variant="ghost" onClick={copyCode} aria-label="Copy access code" data-testid="inquiry-copy-code-button">
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-[11px] text-[var(--color-primary-dark)] opacity-80 mt-1">
                  Keep this code — you'll use it to log in to the client portal once admitted.
                </p>
              </div>
              <div className="flex gap-2 justify-center pt-2">
                <Button variant="outline" onClick={() => { setCreated(null); setForm(EMPTY); }} data-testid="inquiry-submit-another-button">
                  Submit another inquiry
                </Button>
                <Link to="/">
                  <Button className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)]">Back to home</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="rounded-xl border-[var(--color-border)] shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Tell us about your child</CardTitle>
              <CardDescription>
                Fill in the details below and our team will schedule an initial conversation.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4" data-testid="public-inquiry-form">
                <div className="space-y-1.5">
                  <Label>Parent / Guardian Name *</Label>
                  <Input value={form.parentName} onChange={set("parentName")} placeholder="e.g. Jamie Rivera" data-testid="inquiry-parent-name-input" />
                  {errors.parentName && <p className="text-xs text-[var(--color-danger)]">{errors.parentName}</p>}
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Contact Number *</Label>
                    <Input value={form.parentContact} onChange={set("parentContact")} placeholder="+1 555-0100" data-testid="inquiry-parent-contact-input" />
                    {errors.parentContact && <p className="text-xs text-[var(--color-danger)]">{errors.parentContact}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Email *</Label>
                    <Input type="email" value={form.parentEmail} onChange={set("parentEmail")} placeholder="you@example.com" data-testid="inquiry-parent-email-input" />
                    {errors.parentEmail && <p className="text-xs text-[var(--color-danger)]">{errors.parentEmail}</p>}
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Child's Name *</Label>
                    <Input value={form.clientName} onChange={set("clientName")} placeholder="e.g. Sam Rivera" data-testid="inquiry-client-name-input" />
                    {errors.clientName && <p className="text-xs text-[var(--color-danger)]">{errors.clientName}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Child's Date of Birth *</Label>
                    <Input type="date" value={form.dob} onChange={set("dob")} data-testid="inquiry-dob-input" />
                    {errors.dob && <p className="text-xs text-[var(--color-danger)]">{errors.dob}</p>}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Your Concerns about Your Child *</Label>
                  <Textarea
                    rows={3}
                    value={form.parentComplaint}
                    onChange={set("parentComplaint")}
                    placeholder="Tell us what you're worried about — behaviour, motor skills, senses, speech, eating, school..."
                    data-testid="inquiry-complaint-input"
                  />
                  {errors.parentComplaint && <p className="text-xs text-[var(--color-danger)]">{errors.parentComplaint}</p>}
                </div>
                <Button type="submit" className="w-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] h-11" data-testid="inquiry-submit-button">
                  Submit Inquiry
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
