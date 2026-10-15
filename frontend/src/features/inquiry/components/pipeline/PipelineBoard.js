import React, { useRef, useState } from "react";
import { useInfiniteSentinel } from "@/shared/hooks/useInfiniteSentinel";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Skeleton } from "@/shared/ui/skeleton";
import { cn } from "@/shared/lib/utils";
import { PipelineCard } from "@/features/inquiry/components/pipeline/PipelineCard";
import { COLUMN_PAGE } from "@/features/inquiry/components/pipeline/pipelineConfig";

// Kerangka kartu kecil di dasar kolom saat halaman berikutnya dimuat
function MoreSkeleton({ status }) {
  return (
    <div className="space-y-3 mt-3" role="status" aria-busy="true" data-testid={`stage-loading-more-${status}`}>
      <span className="sr-only">Memuat kartu berikutnya…</span>
      {[0, 1].map((n) => (
        <div key={n} className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-2.5">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      ))}
    </div>
  );
}

// Daftar kartu satu tahap + infinite scroll: 10 kartu per halaman; saat kolom di-scroll sampai dasar, halaman berikutnya dimuat.
// Mode API (`onLoadMore` ada): `list` berisi kartu yang sudah diambil dari server, `total` = jumlah asli di server.
// Mode demo: semua data sudah di klien, kartu ditampilkan bertahap per 10.
function StageCards({ stage, list, total, getService, onOpen, emptyText, onLoadMore, loadingMore, failed }) {
  const [visible, setVisible] = useState(COLUMN_PAGE);
  const remote = Boolean(onLoadMore);
  const shown = remote ? list : list.slice(0, visible);
  const hasMore = remote ? list.length < total : list.length > visible;
  const loadMore = remote ? () => onLoadMore(stage.status) : () => setVisible((v) => v + COLUMN_PAGE);
  const autoLoad = hasMore && !loadingMore && !failed;
  const { ref, supported } = useInfiniteSentinel({ enabled: autoLoad, onVisible: loadMore, watch: shown.length });

  if (list.length === 0) return <div className="py-10 text-center text-xs text-slate-400">{emptyText}</div>;
  return (
    <>
      <div className="space-y-3">
        {shown.map((c) => (
          <PipelineCard key={c.id} client={c} getService={getService} onOpen={onOpen} />
        ))}
      </div>
      {loadingMore && <MoreSkeleton status={stage.status} />}
      {failed && (
        <Button variant="outline" size="sm" className="w-full mt-3 font-bold cursor-pointer" onClick={loadMore} data-testid={`retry-more-${stage.status}`}>
          Gagal memuat. Coba lagi
        </Button>
      )}
      {hasMore && !failed && (
        <div ref={ref} className="h-px" aria-hidden="true" data-testid={`stage-sentinel-${stage.status}`} />
      )}
      {hasMore && !failed && !supported && !loadingMore && (
        <Button variant="outline" size="sm" className="w-full mt-3 font-bold cursor-pointer" onClick={loadMore} data-testid={`show-more-${stage.status}`}>
          Muat lebih banyak
        </Button>
      )}
    </>
  );
}

// Papan kanban satu baris yang digeser horizontal di semua ukuran layar.
// Ponsel: satu kolom hampir selebar layar dengan snap; tablet/desktop: kolom tetap + tombol geser.
// `totals` (opsional, mode API): jumlah asli per tahap di server. `onLoadMore(status)` (mode API) memuat halaman berikutnya satu kolom;
// tanpa itu (mode demo) kolom menampilkan bertahap dari `clientsByStage`.
// `loading` (muat pertama kali): tiap kolom menampilkan kerangka kartu dan angka disembunyikan.
// `refreshing` (muat ulang karena pencarian / filter): data lama tetap terlihat tetapi diredupkan + bar progres di atas papan.
export function PipelineBoard({ columns, clientsByStage, totals = null, loading = false, refreshing = false, onLoadMore = null, loadingMore = {}, loadMoreFailed = {}, getService, onOpen, emptyText }) {
  const scroller = useRef(null);

  const scrollByColumns = (dir) => {
    const el = scroller.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(320, el.clientWidth * 0.8), behavior: "smooth" });
  };

  return (
    <div className="space-y-2" data-testid="pipeline-board" aria-busy={loading || refreshing}>
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

      {refreshing && !loading && (
        <div role="status" className="h-1 rounded-full overflow-hidden" data-testid="pipeline-refreshing">
          <span className="sr-only">Memperbarui data pipeline…</span>
          <Skeleton className="h-1 w-full rounded-full bg-sky-200" />
        </div>
      )}

      <div
        ref={scroller}
        className={cn(
          "overflow-x-auto pb-4 -mx-1 px-1 snap-x snap-mandatory scroll-smooth [scrollbar-width:thin] transition-opacity",
          refreshing && !loading && "opacity-50 pointer-events-none"
        )}
        tabIndex={0}
        role="region"
        aria-label="Papan pipeline inquiry, geser horizontal"
      >
        <div className="flex gap-4 items-start w-max">
          {columns.map((col, i) => {
            const list = clientsByStage[col.status] || [];
            const count = totals?.[col.status] ?? list.length;
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
                      {loading ? "…" : count}
                    </span>
                  </div>
                  <div className="p-3 flex-1 overflow-y-auto" data-infinite-root data-testid={`stage-scroll-${col.status}`}>
                    {loading ? (
                      <div className="space-y-3" role="status" aria-busy="true" data-testid={`stage-loading-${col.status}`}>
                        <span className="sr-only">Memuat data tahap {col.label}…</span>
                        {[0, 1].map((n) => (
                          <div key={n} className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-2.5">
                            <Skeleton className="h-4 w-3/4 bg-slate-200/70" />
                            <Skeleton className="h-3 w-1/2 bg-slate-200/70" />
                            <Skeleton className="h-3 w-2/3 bg-slate-200/70" />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <StageCards stage={col} list={list} total={count} getService={getService} onOpen={onOpen} emptyText={emptyText} onLoadMore={onLoadMore} loadingMore={Boolean(loadingMore[col.status])} failed={Boolean(loadMoreFailed[col.status])} />
                    )}
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
