import React from "react";
import { Button } from "@/shared/ui/button";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { StatusBadge } from "@/shared/components/StatusBadge";

export function ClientDetailHeader({ br, client, navigate, extraActions = null }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            className="border-slate-200 text-slate-600 hover:bg-slate-100"
            onClick={() => navigate("/admin-inquiry/pipeline")}
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Pipeline
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900">{client.clientName}</h1>
              <StatusBadge status={client.status} />
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Kode Akses Portal: <strong className="font-mono text-slate-800">{client.clientCode}</strong> • Cabang: {br ? br.name : "—"}
            </p>
          </div>
        </div>

        {/* Quick jump actions */}
        <div className="flex flex-wrap items-center gap-2">
          {client.gdriveClientLink && (
            <a
              href={client.gdriveClientLink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100 transition-colors shadow-2xs"
            >
              <ExternalLink className="w-3.5 h-3.5" /> GDrive Client
            </a>
          )}
          {extraActions}

          
        </div>
      </div>
  );
}
