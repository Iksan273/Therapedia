import React from "react";
import { MapPin } from "lucide-react";
import { branchName } from "@/domain/branch";
import { cn } from "@/shared/lib/utils";

export const BranchTag = ({ branchId, className }) => (
  <span className={cn("inline-flex items-center gap-1 whitespace-nowrap", className)}>
    <MapPin className="w-3 h-3 shrink-0 text-slate-400" aria-hidden="true" />
    {branchName(branchId)}
  </span>
);
