import React, { useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PipelineCard } from "@/pages/adminInquiry/pipeline/PipelineCard";
import { COLUMN_PAGE } from "@/pages/adminInquiry/pipeline/pipelineConfig";

// Daftar kartu satu tahap + tombol "tampilkan lagi" (dibatasi agar papan tetap ringan)
function StageCards({ stage, list, getService, onOpen, emptyText }) {
  const [visible, setVisible] = useState(COLUMN_PAGE);
  if (list.length === 0) return <div className="py-10 text-center text-xs text-slate-400">{emptyText}</div>;
  return (
    <>
      <div className="space-y-3">
        {list.slice(0, visible).map((c) => (
          <PipelineCard key={c.id} client={c} getService={getService} onOpen={onOpen} />
        ))}
      </div>
      {list.length > visible && (
        <Button
          variant="outline"
          size="sm"
          className="w-full mt-3 font-bold cursor-pointer"
          onClick={() => setVisible((v) => v + COLUMN_PAGE)}
          data-testid={`show-more-${stage.status}`}
        >
          Tampilkan lagi ({list.length - visible} tersisa)
        </Button>
      )}
    </>
  );
}

// Papan kanban satu baris yang digeser horizontal di semua ukuran layar.
// Ponsel: satu kolom hampir selebar layar dengan snap; tablet/desktop: kolom tetap + tombol geser.
export function PipelineBoard({ columns, clientsByStage, getService, onOpen, emptyText }) {
  const scroller = useRef(null);

  const scrollByColumns = (dir) => {
    const el = scroller.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(320, el.clientWidth * 0.8), behavior: "smooth" });
  };

  return (
    <div className="space-y-2" data-testid="pipeline-board">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-slate-500 font-medium">
          <span className="sm:hidden">Geser ke samping untuk melihat tahap lain</span>
          <span className="hidden sm:inline">Geser atau gunakan tombol panah untuk melihat seluruh tahap pipeline</span>
        </p>
        <div className="hidden sm:flex items-center gap-1.5">
          <Button
            variant="outline"
            size="icon"
            onClick={() => scrollByColumns(-1)}
            aria-label="Geser papan ke kiri"
            className="cursor-pointer"
            data-testid="pipeline-scroll-left"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => scrollByColumns(1)}
            aria-label="Geser papan ke kanan"
            className="cursor-pointer"
            data-testid="pipeline-scroll-right"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div
        ref={scroller}
        className="overflow-x-auto pb-4 -mx-1 px-1 snap-x snap-mandatory scroll-smooth [scrollbar-width:thin]"
        tabIndex={0}
        role="region"
        aria-label="Papan pipeline inquiry, geser horizontal"
      >
        <div className="flex gap-4 items-start w-max">
          {columns.map((col, i) => {
            const list = clientsByStage[col.status] || [];
            const startsOutcome = col.group === "outcome" && columns[i - 1]?.group !== "outcome";
            return (
              <React.Fragment key={col.status}>
                {startsOutcome && <div className="self-stretch w-px bg-slate-300/70 mx-1 shrink-0" aria-hidden="true" />}
                <section
                  aria-label={col.label}
                  className="snap-start shrink-0 w-[86vw] sm:w-72 lg:w-80 bg-slate-100/70 border border-slate-200/80 rounded-2xl flex flex-col max-h-[calc(100vh-280px)] min-h-[220px]"
                >
                  <div className="p-3.5 border-b border-slate-200 bg-white/70 rounded-t-2xl flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={cn("w-2 h-4 rounded-full shrink-0", col.accent)} />
                      <div className="min-w-0">
                        <h3 className="text-xs font-black text-slate-900 truncate">{col.label}</h3>
                        <p className="text-[11px] text-slate-400 truncate">{col.desc}</p>
                      </div>
                    </div>
                    <span className="min-w-6 h-6 px-1.5 rounded-full bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0">
                      {list.length}
                    </span>
                  </div>
                  <div className="p-3 flex-1 overflow-y-auto">
                    <StageCards stage={col} list={list} getService={getService} onOpen={onOpen} emptyText={emptyText} />
                  </div>
                </section>
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}
