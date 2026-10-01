import React, { memo } from "react";
import { User, Phone, Mail, ExternalLink } from "lucide-react";
import { BranchTag } from "@/components/common/BranchTag";
import { calcAge, fmtDate, getClientServiceIds } from "@/lib/appUtils";

export const PipelineCard = memo(function PipelineCard({ client: c, getService, onOpen }) {
  const serviceIds = getClientServiceIds(c);
  return (
    <div
      role="button"
      tabIndex={0}
      className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs hover:border-sky-300 hover:shadow-xs transition-all cursor-pointer group space-y-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
      onClick={() => onOpen(c.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(c.id);
        }
      }}
      data-testid={`client-card-${c.id}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h4 className="font-bold text-sm text-slate-900 group-hover:text-sky-700 transition-colors">{c.clientName}</h4>
          <p className="text-[11px] text-slate-500 font-medium">
            {calcAge(c.dob)} th • DOB: {fmtDate(c.dob)}
          </p>
        </div>
        <span className="text-[11px] font-mono font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
          {c.clientAccessCode}
        </span>
      </div>

      <div className="space-y-1 text-xs text-slate-600 pt-1 border-t border-slate-100">
        <div className="flex items-center gap-1.5 truncate">
          <User className="w-3 h-3 text-slate-400 shrink-0" />
          <span className="font-semibold text-slate-800">{c.parentName}</span>
        </div>
        <div className="flex items-center gap-1.5 truncate">
          <Phone className="w-3 h-3 text-slate-400 shrink-0" />
          <span>{c.parentContact}</span>
        </div>
        {c.parentEmail && (
          <div className="flex items-center gap-1.5 truncate text-[11px] text-slate-500">
            <Mail className="w-3 h-3 text-slate-400 shrink-0" />
            <span className="truncate">{c.parentEmail}</span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-slate-100">
        <BranchTag
          branchId={c.branchId}
          className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200"
        />
        {serviceIds.map((st) => (
          <span key={st} className="text-[11px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
            {getService(st)?.shortLabel || st}
          </span>
        ))}
        {c.gdriveClientLink && (
          <span className="text-[11px] font-bold text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded-md border border-sky-200 flex items-center gap-1">
            <ExternalLink className="w-2.5 h-2.5" /> GDrive
          </span>
        )}
      </div>
    </div>
  );
});
