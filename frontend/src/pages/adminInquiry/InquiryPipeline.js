import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, Plus, Inbox } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/common/StatusBadge";
import { useClients } from "@/context/ClientsContext";
import { PIPELINE_STATUSES, STATUS_META, calcAge, fmtDate } from "@/lib/appUtils";

export default function InquiryPipeline() {
  const navigate = useNavigate();
  const { clients } = useClients();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter(
      (c) => c.clientName.toLowerCase().includes(q) || c.parentName.toLowerCase().includes(q)
    );
  }, [clients, search]);

  const grouped = useMemo(() => {
    const map = {};
    PIPELINE_STATUSES.forEach((s) => {
      map[s] = filtered
        .filter((c) => c.status === s)
        .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
    });
    return map;
  }, [filtered]);

  return (
    <div className="space-y-5" data-testid="inquiry-pipeline-page">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Inquiry Pipeline</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">Track every family from first contact to admission.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
            <Input
              className="pl-9 w-56"
              placeholder="Search client or parent..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-testid="pipeline-search-input"
            />
          </div>
          <Link to="/inquiry">
            <Button className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] gap-2" data-testid="pipeline-new-inquiry-button">
              <Plus className="w-4 h-4" /> New Inquiry
            </Button>
          </Link>
        </div>
      </div>

      <p className="md:hidden text-[11px] text-[var(--color-text-muted)]">Swipe sideways to browse pipeline stages →</p>

      <div className="overflow-x-auto pb-4 kanban-scroll snap-x snap-mandatory md:snap-none scroll-px-4">
        <div className="flex gap-3 md:gap-4 min-w-max">
          {PIPELINE_STATUSES.map((status) => (
            <div
              key={status}
              className="w-[82vw] max-w-[300px] sm:w-[264px] sm:max-w-none shrink-0 snap-start rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]"
              data-testid={`kanban-column-${status}`}
            >
              <div className="px-3 py-2.5 flex items-center justify-between border-b border-[var(--color-border)]">
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                  {STATUS_META[status].label}
                </span>
                <span
                  className="text-xs font-semibold bg-white border border-[var(--color-border)] rounded-full px-2 py-0.5 tabular-nums"
                  data-testid={`kanban-column-${status}-count`}
                >
                  {grouped[status].length}
                </span>
              </div>
              <div className="p-2 space-y-2 min-h-[120px] max-h-[62vh] overflow-y-auto">
                {grouped[status].length === 0 && (
                  <div className="flex flex-col items-center py-6 text-[var(--color-text-muted)]">
                    <Inbox className="w-5 h-5 opacity-40 mb-1" />
                    <span className="text-[11px]">No clients</span>
                  </div>
                )}
                {grouped[status].map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => navigate(`/admin-inquiry/clients/${c.id}`)}
                    className="w-full text-left rounded-xl bg-white border border-[var(--color-border)] p-3 shadow-sm hover:shadow-md hover:-translate-y-[1px] transition-all duration-150"
                    data-testid={`kanban-card-${c.id}`}
                  >
                    <p className="text-sm font-semibold">{c.clientName}</p>
                    <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                      {c.parentName} · age {calcAge(c.dob) != null ? calcAge(c.dob) : "—"}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      {c.serviceType ? (
                        <StatusBadge status={c.serviceType} />
                      ) : (
                        <span className="text-[11px] text-[var(--color-text-muted)] italic">No service yet</span>
                      )}
                      <span className="text-[10px] text-[var(--color-text-muted)]">{fmtDate(c.createdAt)}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
