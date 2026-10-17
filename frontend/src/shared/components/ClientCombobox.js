import React, { useEffect, useMemo, useState } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { Command, CommandGroup, CommandInput, CommandItem, CommandList } from "@/shared/ui/command";
import { ListSkeleton } from "@/shared/components/LoadingSkeletons";
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";
import { useInfiniteSentinel } from "@/shared/hooks/useInfiniteSentinel";
import { isApiMode } from "@/config/env";
import { isStaffSession } from "@/domain/auth";
import { matchesClientSearch } from "@/domain/client";
import { api } from "@/services/http/httpClient";
import { ENDPOINTS } from "@/services/api/endpoints";
import { clientFromApi } from "@/services/api/mappers/clientMapper";
import { useAuth } from "@/stores/authStore";
import { CLIENTS_QUERY_KEY } from "@/stores/clientsStore";
import { cn } from "@/shared/lib/utils";

// Pemilih client dengan pencarian (nama anak, nama ortu, atau kode client) + INFINITE SCROLL 10 per halaman. Dipakai seragam di SEMUA modul
// (Finance, Penjadwalan, Portal Terapis, Master Asesmen); aturan: CLAUDE.md 18d.
//
// Dua sumber data (satu komponen, tampilan sama):
// - `source` (mode API): `{ statuses?: [...], branchId? }`: daftar diambil dari server (`GET /clients`, 10 per halaman, cari di server dengan jeda 300 ms),
//   BARU diambil saat popover dibuka (aturan 22b), halaman berikutnya dimuat saat daftar digulir ke dasar. Label pilihan yang belum termuat diambil
//   lewat `GET /clients/{id}`.
// - `clients` (mode demo, atau daftar turunan yang sudah ada di klien, mis. client milik seorang terapis): disaring di klien, ditampilkan 10 per 10
//   saat digulir.
// `onChange(id, client)`: argumen kedua = objek client terpilih (dibutuhkan pemanggil mode API karena client tidak ada di store lokal).
// `allOption` = { value, label } untuk opsi "semua"; `renderMeta(c)` mengganti teks kanan per baris; `selectedClient` = objek untuk label awal.

const PAGE = 10;

function useServerClients({ enabled, source, q }) {
  const { auth } = useAuth();
  const query = useInfiniteQuery({
    queryKey: [...CLIENTS_QUERY_KEY, "picker", source, q],
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      api
        .list(ENDPOINTS.clients.list, { status: source?.statuses, branchId: source?.branchId, q: q || undefined, sort: "child_name", page: pageParam, perPage: PAGE }, { signal })
        .then(({ items, meta }) => ({ items: items.map(clientFromApi), meta })),
    getNextPageParam: (last) => (last.meta && last.meta.page < last.meta.lastPage ? last.meta.page + 1 : undefined),
    enabled: enabled && isStaffSession(auth),
  });
  const items = useMemo(() => (query.data?.pages || []).flatMap((p) => p.items), [query.data]);
  return {
    items,
    loading: query.isLoading,
    loadingMore: query.isFetchingNextPage,
    hasMore: Boolean(query.hasNextPage),
    loadMore: () => query.hasNextPage && !query.isFetchingNextPage && query.fetchNextPage(),
  };
}

function useLocalClients({ enabled, clients, q }) {
  const [shown, setShown] = useState(PAGE);
  useEffect(() => setShown(PAGE), [q, enabled]);
  const filtered = useMemo(() => (enabled ? clients.filter((c) => matchesClientSearch(c, q)) : []), [enabled, clients, q]);
  return {
    items: filtered.slice(0, shown),
    loading: false,
    loadingMore: false,
    hasMore: shown < filtered.length,
    loadMore: () => setShown((n) => n + PAGE),
  };
}

export function ClientCombobox({
  clients = [],
  source = null,
  value,
  onChange,
  selectedClient = null,
  placeholder = "Cari anak, ortu, atau kode client...",
  allOption = null,
  renderMeta,
  className,
  testId = "client-combobox",
  disabled = false,
}) {
  const serverMode = isApiMode() && Boolean(source);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [picked, setPicked] = useState(null); // objek client yang baru dipilih (label tetap benar walau tidak ada di daftar termuat)
  const q = useDebouncedValue(search.trim(), serverMode ? 300 : 0);

  const server = useServerClients({ enabled: serverMode && open, source, q });
  const local = useLocalClients({ enabled: !serverMode && open, clients, q: search });
  const list = serverMode ? server : local;

  // Label pilihan: dari objek yang dipilih / diberikan pemanggil / daftar yang ada; kalau tidak ada (mode API) ambil detailnya satu kali
  const known = useMemo(
    () => (picked?.id === value && picked) || (selectedClient?.id === value && selectedClient) || clients.find((c) => c.id === value) || list.items.find((c) => c.id === value) || null,
    [picked, selectedClient, clients, list.items, value]
  );
  const { auth } = useAuth();
  const detail = useQuery({
    queryKey: [...CLIENTS_QUERY_KEY, "detail", value],
    queryFn: ({ signal }) => api.get(ENDPOINTS.clients.detail(value), undefined, { signal }).then(clientFromApi),
    enabled: serverMode && Boolean(value) && value !== allOption?.value && !known && isStaffSession(auth),
  });
  const selected = known || detail.data || null;

  useEffect(() => {
    if (!open) setSearch("");
  }, [open]);

  const { ref: sentinelRef, supported } = useInfiniteSentinel({ enabled: open && list.hasMore, onVisible: list.loadMore, watch: list.items.length });

  const isAll = Boolean(allOption) && value === allOption.value;
  const triggerLabel = selected ? `${selected.clientName}${selected.parentName ? ` (${selected.parentName})` : ""}` : isAll ? allOption.label : placeholder;
  const pick = (client) => {
    setPicked(client);
    onChange(client.id, client);
    setOpen(false);
  };
  const pickAll = () => {
    setPicked(null);
    onChange(allOption.value, null);
    setOpen(false);
  };

  return (
    <Popover modal open={open} onOpenChange={setOpen}>
      {/* modal: popover punya area scroll sendiri; tanpa ini wheel/touch scroll diblokir oleh Dialog induk */}
      <PopoverTrigger asChild>
        <Button
          type="button"
          size="sm"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn("w-full justify-between font-semibold border-slate-200 bg-slate-50 focus:bg-white min-h-10", !selected && !isAll && "text-slate-500", className)}
          data-testid={testId}
        >
          <span className="truncate">{triggerLabel}</span>
          <ChevronsUpDown className="w-4 h-4 opacity-50 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] min-w-[min(300px,calc(100vw-2rem))] p-0 rounded-2xl border-slate-200 shadow-xl overflow-hidden"
        align="start"
        collisionPadding={16}
      >
        {/* shouldFilter false: pencarian & paginasi ditangani sendiri (server / saringan klien), bukan oleh cmdk */}
        <Command shouldFilter={false}>
          <CommandInput value={search} onValueChange={setSearch} placeholder="Cari nama anak, ortu, atau kode client..." data-testid={`${testId}-search`} />
          <CommandList
            data-infinite-root
            className="max-h-[min(320px,calc(var(--radix-popover-content-available-height)-3.5rem))] overflow-y-auto overscroll-contain"
            data-testid={`${testId}-list`}
          >
            {list.loading ? (
              <ListSkeleton rows={4} label="Memuat client…" testId={`${testId}-skeleton`} className="border-0 shadow-none" />
            ) : (
              <CommandGroup className="p-1.5">
                {allOption && !search.trim() && (
                  <CommandItem value="__semua" onSelect={pickAll} className="cursor-pointer py-2 px-3 rounded-lg" data-testid={`${testId}-option-all`}>
                    <Check className={cn("mr-2 w-4 h-4 text-sky-600", isAll ? "opacity-100" : "opacity-0")} />
                    <span className="font-bold text-xs text-slate-900">{allOption.label}</span>
                  </CommandItem>
                )}
                {list.items.map((c) => (
                  <CommandItem key={c.id} value={String(c.id)} onSelect={() => pick(c)} className="cursor-pointer py-2 px-3 rounded-lg" data-testid={`${testId}-option-${c.id}`}>
                    <Check className={cn("mr-2 w-4 h-4 text-sky-600", value === c.id ? "opacity-100" : "opacity-0")} />
                    <span className="font-bold text-xs text-slate-900 truncate min-w-0">{c.clientName}</span>
                    <span className="ml-auto pl-2 text-[11px] text-slate-400 font-normal truncate max-w-[45%]">
                      {renderMeta ? renderMeta(c) : <>{c.parentName} • <span className="font-mono">{c.clientCode}</span></>}
                    </span>
                  </CommandItem>
                ))}
                {list.items.length === 0 && <p className="p-3 text-xs text-slate-500 text-center" data-testid={`${testId}-empty`}>Client tidak ditemukan.</p>}
                {list.hasMore && (
                  <div ref={sentinelRef} className="py-2 text-center" data-testid={`${testId}-sentinel`}>
                    {list.loadingMore ? (
                      <span className="text-[11px] font-semibold text-slate-500 animate-pulse" data-testid={`${testId}-loading-more`}>Memuat client lainnya…</span>
                    ) : (
                      !supported && (
                        <Button type="button" size="sm" variant="ghost" className="text-xs font-bold text-sky-700" onClick={list.loadMore} data-testid={`${testId}-load-more`}>
                          Muat lebih banyak
                        </Button>
                      )
                    )}
                  </div>
                )}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
