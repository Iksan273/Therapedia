import React from "react";
import { useMasterData } from "@/context/MasterDataContext";
import { getClientServiceIds } from "@/lib/appUtils";
import { cn } from "@/lib/utils";

// Semua layanan klien sebagai chip (bukan hanya layanan pertama)
export const ServiceChips = ({ client, className, chipClassName }) => {
  const { getService } = useMasterData();
  const ids = getClientServiceIds(client);
  if (ids.length === 0) return <span className="text-slate-400">—</span>;
  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
      {ids.map((id) => (
        <span
          key={id}
          className={cn(
            "text-xs font-semibold text-purple-800 bg-purple-50 px-2 py-0.5 rounded border border-purple-200",
            chipClassName
          )}
        >
          {getService(id)?.shortLabel || id}
        </span>
      ))}
    </div>
  );
};
