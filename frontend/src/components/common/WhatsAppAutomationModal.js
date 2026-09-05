import React, { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
import {
  MessageCircle,
  Send,
  Copy,
  Calendar,
  Wallet,
  FileText,
  Cake,
  Clock,
  CalendarPlus,
  User,
  ShieldCheck,
  CheckCircle2,
  Phone
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useClients } from "@/context/ClientsContext";
import { useSchedules } from "@/context/SchedulesContext";
import { useCredits } from "@/context/CreditsContext";
import { useTherapists } from "@/context/TherapistsContext";
import { fmtDate, todayStr, calcAge } from "@/lib/appUtils";
import { cn } from "@/lib/utils";

const TEMPLATE_TYPES = [
  {
    id: "assessment_invite",
    title: "Assessment Appointment & Questionnaire Code",
    shortLabel: "Assessment & Code",
    icon: Calendar,
  },
  {
    id: "session_reminder",
    title: "Therapy Session Reminder (Day Before)",
    shortLabel: "Session Reminder",
    icon: Clock,
  },
  {
    id: "low_credit_renewal",
    title: "Package Balance & Renewal Notice",
    shortLabel: "Package Renewal",
    icon: Wallet,
  },
  {
    id: "report_ready",
    title: "Clinical Evaluation Report Ready",
    shortLabel: "Clinical Report",
    icon: FileText,
  },
  {
    id: "slot_offer",
    title: "Open Therapy Slot Offer (Waiting List)",
    shortLabel: "Waiting List Offer",
    icon: CalendarPlus,
  },
  {
    id: "birthday_greeting",
    title: "Pediatric Birthday Greeting",
    shortLabel: "Birthday Greeting",
    icon: Cake,
  },
];

export function WhatsAppAutomationModal({
  open,
  onOpenChange,
  defaultClientId = null,
  defaultTemplateId = "assessment_invite",
  customSlot = null,
}) {
  const { clients } = useClients();
  const { schedules } = useSchedules();
  const { getRecordForClient } = useCredits();
  const { therapists } = useTherapists();

  const [selectedClientId, setSelectedClientId] = useState(defaultClientId || (clients[0]?.id || ""));
  const [templateType, setTemplateType] = useState(defaultTemplateId);
  const [customMessage, setCustomMessage] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (open) {
      if (defaultClientId) {
        setSelectedClientId(defaultClientId);
      } else if (clients.length > 0 && !selectedClientId) {
        setSelectedClientId(clients[0].id);
      }
      if (defaultTemplateId) {
        setTemplateType(defaultTemplateId);
      }
      setIsEditing(false);
    }
  }, [open, defaultClientId, defaultTemplateId, clients, selectedClientId]);

  const client = clients.find((c) => c.id === selectedClientId) || clients[0];
  const record = client ? getRecordForClient(client.id) : null;

  const nextSession = useMemo(() => {
    if (!client) return null;
    return schedules
      .filter((s) => s.clientId === client.id && s.date >= todayStr() && s.status !== "cancelled")
      .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime))[0];
  }, [schedules, client]);

  const therapist = nextSession ? therapists.find((t) => t.id === nextSession.therapistId) : null;

  const generatedMessage = useMemo(() => {
    if (!client) return "";
    const parent = client.parentName || "Parent/Guardian";
    const child = client.clientName || "Your Child";
    const accessCode = client.assessmentAccessCode || client.clientAccessCode || "TP-100";

    switch (templateType) {
      case "assessment_invite": {
        const dateStr = nextSession ? fmtDate(nextSession.date) : "Confirmed appointment";
        const timeStr = nextSession ? `${nextSession.startTime} - ${nextSession.endTime}` : "Scheduled time";
        const thName = therapist ? therapist.name : "Clinical Specialist Team";
        return `Hello ${parent},

Thank you for partnering with Therapedia Developmental Center for ${child}'s developmental milestones.

The clinical assessment appointment has been confirmed:
📅 *Date:* ${dateStr}
⏰ *Time:* ${timeStr}
👨‍⚕️ *Therapist:* ${thName}
🔑 *Questionnaire Access Code:* *${accessCode}*

Please take 5-10 minutes to complete the intake questionnaire on the Therapedia Assessment Portal prior to your appointment.

Feel free to reply if you have any questions. We look forward to welcoming you! 🙏`;
      }

      case "session_reminder": {
        const dateStr = nextSession ? fmtDate(nextSession.date) : "Tomorrow";
        const timeStr = nextSession ? `${nextSession.startTime} - ${nextSession.endTime}` : "Scheduled slot";
        const thName = therapist ? therapist.name : "Therapist";
        return `Hello ${parent},

Friendly reminder for ${child}'s upcoming therapy session at Therapedia:
📅 *Date:* ${dateStr}
⏰ *Time:* ${timeStr}
👨‍⚕️ *Practitioner:* ${thName}

💡 *Preparation Guidelines:*
- Ensure ${child} is well-rested and has had a light snack at least 45 minutes prior.
- Please bring a change of comfortable clothes if participating in sensory integration therapy.
- Arriving 5-10 minutes early helps with smooth session transitions.

See you tomorrow! 🌟`;
      }

      case "low_credit_renewal": {
        const rem = record ? record.remainingCredit : 1;
        const tot = record ? record.totalCredit : 10;
        return `Hello ${parent},

We hope you and ${child} are having a wonderful week.

This is a gentle update that ${child}'s current therapy package has *${rem} of ${tot} sessions remaining*.

To ensure ongoing continuity of care and retain your preferred recurring slot, you may renew your therapy package (10 / 20 / 30 sessions).

Please let us know your preferred renewal plan and we will prepare the invoice. Thank you! 🙏💳`;
      }

      case "report_ready": {
        return `Hello ${parent},

Great news! The clinical evaluation and developmental progress report for ${child} has been finalized by our therapy team.

📄 The report includes sensory, motor, and functional milestone achievements along with home program recommendations.

You may view and download the summary report via the Client Portal or during your next clinical consultation.

Thank you for your dedicated partnership in ${child}'s therapy journey! 🌈`;
      }

      case "slot_offer": {
        const slotDate = customSlot?.date || "Upcoming Saturday";
        const slotTime = customSlot?.time || "09:00 - 10:00 AM";
        const slotTh = customSlot?.therapistName || "Occupational / Sensory Specialist";
        return `Hello ${parent},

Regarding ${child}'s waiting list request at Therapedia, an *open therapy slot has just become available*:

📅 *Date:* ${slotDate}
⏰ *Time:* ${slotTime}
👨‍⚕️ *Therapist:* ${slotTh}

Given high demand, please confirm within 24 hours if you would like to reserve this slot so we can secure it on the master schedule. Thank you! 🌟`;
      }

      case "birthday_greeting": {
        const nextAge = (calcAge(client.dob) || 0) + 1;
        return `Hello ${parent},

The entire team and clinical therapists at Therapedia wish:
🎉 *A very Happy ${nextAge}th Birthday to dear ${child}!* 🎂🎈

May the coming year bring boundless joy, vibrant health, and wonderful developmental growth. Thank you for being a cherished part of the Therapedia family! 💖`;
      }

      default:
        return "";
    }
  }, [client, templateType, nextSession, therapist, record, customSlot]);

  const messageToSend = isEditing ? customMessage : generatedMessage;

  const handleCopy = () => {
    navigator.clipboard.writeText(messageToSend).then(
      () => toast.success("WhatsApp message copied to clipboard!"),
      () => toast.error("Failed to copy message.")
    );
  };

  const handleSendWA = () => {
    if (!client?.parentContact) {
      toast.error("Parent contact number is missing on client profile.");
      return;
    }
    const cleanPhone = client.parentContact.replace(/[^0-9]/g, "");
    const encoded = encodeURIComponent(messageToSend);
    window.open(`https://wa.me/${cleanPhone}?text=${encoded}`, "_blank");
    toast.success(`Opening WhatsApp for ${client.parentName}...`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[calc(100dvh-2.5rem)] flex flex-col p-0 overflow-hidden rounded-2xl border-slate-200 shadow-2xl" data-testid="whatsapp-automation-modal">
        <DialogHeader className="p-5 sm:p-6 pb-4 border-b border-slate-100 shrink-0 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold shrink-0 shadow-xs">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-extrabold text-slate-900">
                WhatsApp Communication Hub
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 mt-0.5">
                Pre-formatted clinical notification templates ready to dispatch directly to parent WhatsApp.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 text-xs">
          {/* Target Client & Template Selector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Patient / Parent</Label>
              <Select value={selectedClientId} onValueChange={(val) => { setSelectedClientId(val); setIsEditing(false); }}>
                <SelectTrigger className="rounded-xl border-slate-200 bg-slate-50 text-xs h-10 font-semibold">
                  <SelectValue placeholder="Select patient..." />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200 max-h-56">
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.clientName} ({c.parentName})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Message Template</Label>
              <Select value={templateType} onValueChange={(val) => { setTemplateType(val); setIsEditing(false); }}>
                <SelectTrigger className="rounded-xl border-slate-200 bg-slate-50 text-xs h-10 font-semibold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200">
                  {TEMPLATE_TYPES.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Quick Scenario Buttons */}
          <div className="space-y-1.5">
            <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Quick Template Scenarios</Label>
            <div className="flex flex-wrap gap-2">
              {TEMPLATE_TYPES.map((t) => {
                const active = templateType === t.id;
                const IconComp = t.icon;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => { setTemplateType(t.id); setIsEditing(false); }}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer",
                      active
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-2xs"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900"
                    )}
                  >
                    <IconComp className="w-3.5 h-3.5" />
                    {t.shortLabel}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Preview Box */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-slate-700">
                {isEditing ? "Edit Message Text" : "Message Preview"}
              </Label>
              <button
                type="button"
                onClick={() => {
                  if (!isEditing) setCustomMessage(generatedMessage);
                  setIsEditing(!isEditing);
                }}
                className="text-xs text-sky-700 font-bold hover:underline cursor-pointer"
              >
                {isEditing ? "Reset to Template" : "✏️ Customise Message"}
              </button>
            </div>

            {isEditing ? (
              <Textarea
                rows={6}
                className="rounded-xl border-slate-300 bg-white text-xs leading-relaxed font-sans p-3"
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
              />
            ) : (
              <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200/90 text-xs text-slate-800 font-sans whitespace-pre-line leading-relaxed max-h-44 sm:max-h-52 overflow-y-auto shadow-2xs">
                {generatedMessage}
              </div>
            )}
          </div>

          {/* Patient Target Info Badge */}
          {client && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <div className="flex items-center gap-2 truncate">
                <User className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="truncate">Recipient: <strong className="text-slate-900">{client.parentName}</strong> ({client.clientName})</span>
              </div>
              <span className="font-mono font-bold text-emerald-700 shrink-0 ml-2">
                {client.parentContact ? client.parentContact : "⚠️ No Contact"}
              </span>
            </div>
          )}
        </div>

        <DialogFooter className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/70 shrink-0 flex items-center justify-end gap-2.5">
          <Button variant="outline" className="rounded-xl border-slate-200 text-xs font-bold gap-2 h-10 px-4" onClick={handleCopy}>
            <Copy className="w-4 h-4 text-slate-500" /> Copy Message
          </Button>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs gap-2 shadow-xs h-10 px-5"
            onClick={handleSendWA}
            data-testid="confirm-send-whatsapp-button"
          >
            <Send className="w-4 h-4" /> Launch WhatsApp
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
