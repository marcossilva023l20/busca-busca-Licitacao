"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bookmark,
  Check,
  Heart,
  Radio,
  Satellite,
  Search,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import { PORTAIS } from "@/lib/constants";
import { EMPTY_FILTERS, type Facets, type FilterState, type Licitacao, type SearchResult } from "@/lib/types";
import { fmtDate } from "@/lib/format";
import { FilterDock } from "./filter-dock";
import { ResultHeader, ResultList } from "./result-list";
import { DetailDrawer } from "./detail-drawer";
import { Spinner } from "./ui-primitives";

interface SavedSearchRow {
  id: string;
  name: string;
  filters: Record<string, unknown>;
}

interface FavoriteRow {
  numeroControlePncp: string;
  titulo: string;
  orgao: string | null;
  uf: string | null;
  municipio: string | null;
  modalidadeNome: string | null;
  portalNome: string | null;
  dataEncerramento: string | null;
}

export function RadarApp() {
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [showAll, setShowAll] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [facets, setFacets] = useState<Facets>({ ufs: [], modalidades: [], portais: [] });
  const [favorites, setFavorites] = useState<FavoriteRow[]>([]);
  const [savedSearches, setSavedSearches] = useState<SavedSearchRow[]>([]);
  const [selected, setSelected] = useState<Licitacao | null>(null);
  const [showFavorites, setShowFavorites] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const firstRun = useRef(true);

  /* ---------- dados auxiliares ---------- */
  useEffect(() => {
    fetch("/api/meta").then((r) => r.json()).then(setFacets).catch(() => {});
    fetch("/api/favorites").then((r) => r.json()).then((d) => setFavorites(d.favorites ?? [])).catch(() => {});
    fetch("/api/saved-searches").then((r) => r.json()).then((d) => setSavedSearches(d.savedSearches ?? [])).catch(() => {});
  }, []);

  /* ---------- busca ---------- */
  const runSearch = useCallback(async (f: FilterState, p: number, all: boolean) => {
    setLoading(true);
    setError(null);
    const sp = new URLSearchParams();
    if (f.q) sp.set("q", f.q);
    if (f.uf) sp.set("uf", f.uf);
    if (f.municipio) sp.set("municipio", f.municipio);
    if (f.modalidades.length) sp.set("modalidades", f.modalidades.join(","));
    if (f.portais.length) sp.set("portais", f.portais.join(","));
    if (f.encerramentoDe) sp.set("encerramentoDe", `${f.encerramentoDe}T00:00:00-03:00`);
    if (f.encerramentoAte) sp.set("encerramentoAte", `${f.encerramentoAte}T23:59:59-03:00`);
    if (f.valorMin) sp.set("valorMin", f.valorMin);
    if (f.valorMax) sp.set("valorMax", f.valorMax);
    sp.set("sort", f.sort);
    sp.set("page", String(p));
    if (all) sp.set("all", "true");

    try {
      const res = await fetch(`/api/licitacoes?${sp}`);
      if (!res.ok) throw new Error();
      const data = (await res.json()) as SearchResult;
      setResult(all ? { ...data, totalPages: 1, page: 1, pageSize: data.items.length } : data);
    } catch {
      setError("Não foi possível consultar a fonte de dados agora. Tente novamente em instantes.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const delay = firstRun.current ? 0 : 450;
    firstRun.current = false;
    debounceRef.current = setTimeout(() => runSearch(filters, page, showAll), delay);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [filters, page, showAll, runSearch]);

  const changeFilters = (f: FilterState) => {
    setFilters(f);
    setShowAll(false);
    setPage(1);
  };

  const handleShowAll = () => {
    setFilters(EMPTY_FILTERS);
    setShowAll(true);
    setPage(1);
  };

  const goPage = (p: number) => {
    setPage(p);
    resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  /* ---------- favoritos ---------- */
  const favIds = useMemo(() => new Set(favorites.map((f) => f.numeroControlePncp)), [favorites]);

  const toggleFavorite = async (l: Licitacao) => {
    if (favIds.has(l.id)) {
      setFavorites((prev) => prev.filter((f) => f.numeroControlePncp !== l.id));
      await fetch(`/api/favorites?id=${encodeURIComponent(l.id)}`, { method: "DELETE" }).catch(() => {});
    } else {
      setFavorites((prev) => [
        {
          numeroControlePncp: l.id,
          titulo: l.titulo,
          orgao: l.orgao,
          uf: l.uf,
          municipio: l.municipio,
          modalidadeNome: l.modalidadeNome,
          portalNome: l.portalNome,
          dataEncerramento: l.dataEncerramento,
        },
        ...prev,
      ]);
      await fetch("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(l),
      }).catch(() => {});
    }
  };

  /* ---------- buscas salvas ---------- */
  const saveSearch = async () => {
    if (!saveName.trim()) return;
    const res = await fetch("/api/saved-searches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: saveName.trim(), filters }),
    }).catch(() => null);
    if (res?.ok) {
      const d = await res.json();
      setSavedSearches((prev) => [d.savedSearch, ...prev]);
    }
    setSaveOpen(false);
    setSaveName("");
  };

  const removeSavedSearch = async (id: string) => {
    setSavedSearches((prev) => prev.filter((s) => s.id !== id));
    await fetch(`/api/saved-searches?id=${id}`, { method: "DELETE" }).catch(() => {});
  };

  /* ---------- exportar CSV ---------- */
  const exportCsv = () => {
    if (!result) return;
    const header = ["Controle PNCP", "Objeto", "Órgão", "UF", "Município", "Modalidade", "Sistema fonte", "Encerramento", "Valor estimado", "Link PNCP", "Link origem"];
    const rows = result.items.map((l) => [
      l.id,
      l.titulo.replace(/"/g, '""'),
      l.orgao?.replace(/"/g, '""') ?? "",
      l.uf ?? "",
      l.municipio ?? "",
      l.modalidadeNome ?? "",
      l.portalNome ?? "",
      l.dataEncerramento ?? "",
      l.valorEstimado != null ? String(l.valorEstimado) : "",
      l.linkPncp ?? "",
      l.linkSistemaOrigem ?? "",
    ]);
    const csv = [header, ...rows].map((r) => r.map((c) => `"${c}"`).join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `licitacoes-pagina-${result.page}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="min-h-screen">
      <Nav favoritesCount={favorites.length} onOpenFavorites={() => setShowFavorites(true)} />
      <Hero total={result?.total ?? null} facetsCount={{ ufs: facets.ufs.length, portais: PORTAIS.length }} />
      <PortalTicker />

      <main className="mx-auto max-w-7xl px-4 pb-24 sm:px-6">
        {/* buscas salvas */}
        <AnimatePresence>
          {savedSearches.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 flex flex-wrap items-center gap-2 overflow-hidden"
            >
              <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-fog">
                <Bookmark className="h-3.5 w-3.5 text-signal/80" />
                Buscas salvas
              </span>
              {savedSearches.map((s) => (
                <span key={s.id} className="group flex items-center gap-1 rounded-full border border-line bg-panel-2/70 py-1 pl-3 pr-1.5 text-[12px] text-mist">
                  <button
                    type="button"
                    className="transition-colors hover:text-lime-200"
                    onClick={() => changeFilters({ ...EMPTY_FILTERS, ...(s.filters as Partial<FilterState>) })}
                  >
                    {s.name}
                  </button>
                  <button
                    type="button"
                    aria-label={`Excluir busca ${s.name}`}
                    onClick={() => removeSavedSearch(s.id)}
                    className="rounded-full p-1 text-fog/60 transition-colors hover:text-danger"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="sticky top-[68px] z-30">
          <FilterDock
            filters={filters}
            facets={facets}
            onChange={changeFilters}
            onReset={() => changeFilters(EMPTY_FILTERS)}
            onShowAll={handleShowAll}
            onSaveSearch={() => setSaveOpen(true)}
          />
        </div>

        <div ref={resultsRef} className="mt-8 scroll-mt-56">
          <ResultHeader result={result} loading={loading} onExport={exportCsv} />
          <ResultList
            result={result}
            loading={loading}
            error={error}
            favorites={favIds}
            onToggleFavorite={toggleFavorite}
            onSelect={setSelected}
            onPage={goPage}
          />
        </div>
      </main>

      <Footer />

      <DetailDrawer
        licitacao={selected}
        onClose={() => setSelected(null)}
        isFavorite={selected ? favIds.has(selected.id) : false}
        onToggleFavorite={toggleFavorite}
      />

      {/* modal favoritos */}
      <FavoritesModal
        open={showFavorites}
        onClose={() => setShowFavorites(false)}
        favorites={favorites}
        onRemove={async (id) => {
          setFavorites((prev) => prev.filter((f) => f.numeroControlePncp !== id));
          await fetch(`/api/favorites?id=${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => {});
        }}
        onOpen={(fav) => {
          setShowFavorites(false);
          setSelected({
            id: fav.numeroControlePncp,
            titulo: fav.titulo,
            resumo: null,
            orgao: fav.orgao,
            uf: fav.uf,
            municipio: fav.municipio,
            modalidadeId: null,
            modalidadeNome: fav.modalidadeNome,
            modoDisputa: null,
            portalKey: null,
            portalNome: fav.portalNome,
            status: null,
            srp: false,
            orcamentoSigiloso: false,
            valorEstimado: null,
            dataAbertura: null,
            dataPublicacao: null,
            dataEncerramento: fav.dataEncerramento,
            linkPncp: null,
            linkSistemaOrigem: null,
            slug: null,
            esfera: null,
            quantidadeItens: null,
          });
        }}
      />

      {/* modal salvar busca */}
      <AnimatePresence>
        {saveOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm"
              onClick={() => setSaveOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              className="glass fixed left-1/2 top-1/2 z-[90] w-[min(420px,92vw)] -translate-x-1/2 -translate-y-1/2 rounded-2xl p-6"
            >
              <h3 className="font-display flex items-center gap-2 text-lg font-semibold text-white">
                <Bookmark className="h-5 w-5 text-signal" />
                Salvar busca
              </h3>
              <p className="mt-1.5 text-[13px] text-fog">
                Dê um nome para esta combinação de filtros e acesse-a depois com um clique.
              </p>
              <input
                autoFocus
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && saveSearch()}
                placeholder='Ex.: "Pregões de TI em SP — 7 dias"'
                className="mt-4 h-11 w-full rounded-lg border border-line bg-ink-2/80 px-3 text-sm text-white placeholder:text-fog/50"
              />
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => setSaveOpen(false)}
                  className="h-10 flex-1 rounded-lg border border-line text-sm text-fog transition-colors hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={saveSearch}
                  disabled={!saveName.trim()}
                  className="flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-signal font-display text-sm font-bold text-ink transition-opacity hover:opacity-85 disabled:opacity-40"
                >
                  <Check className="h-4 w-4" />
                  Salvar
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ================= NAV ================= */
function Nav({ favoritesCount, onOpenFavorites }: { favoritesCount: number; onOpenFavorites: () => void }) {
  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-ink/80 backdrop-blur-xl">
      <div className="mx-auto flex h-[68px] max-w-7xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-signal shadow-[0_0_24px_rgba(163,230,53,0.35)]">
            <Radio className="h-5 w-5 text-ink" strokeWidth={2.4} />
          </span>
          <div className="leading-tight">
            <p className="font-display text-[15px] font-bold tracking-tight text-white">
              RADAR<span className="text-signal">·</span>LICITAÇÕES
            </p>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-fog">
              varredura nacional em tempo real
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onOpenFavorites}
          className="flex items-center gap-2 rounded-lg border border-line bg-panel-2/60 px-3.5 py-2 text-[13px] font-medium text-mist transition-colors hover:border-red-400/40 hover:text-red-300"
        >
          <Heart className="h-4 w-4" />
          Favoritos
          <span className="font-mono rounded-md bg-white/8 px-1.5 py-0.5 text-[11px] text-white">{favoritesCount}</span>
        </button>
      </div>
    </header>
  );
}

/* ================= HERO ================= */
function Hero({ total, facetsCount }: { total: number | null; facetsCount: { ufs: number; portais: number } }) {
  return (
    <section className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-8 px-4 pb-10 pt-12 sm:px-6 lg:grid-cols-[1.25fr_1fr] lg:pt-16">
      <div>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-signal"
        >
          <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-signal" />
          Monitorando propostas abertas · PNCP
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.06 }}
          className="font-display mt-4 text-[clamp(2.1rem,5.2vw,4rem)] font-bold leading-[1.02] tracking-tight text-white"
        >
          Encontre a licitação certa{" "}
          <span className="text-outline">antes</span>
          <br className="hidden sm:block" /> do <span className="text-signal">encerramento</span>.
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="mt-5 max-w-xl text-[15px] leading-relaxed text-fog"
        >
          Vasculhe pregões, dispensas e concorrências de todo o Brasil com filtros por{" "}
          <strong className="font-medium text-mist">fim do recebimento de propostas</strong>, UF, município,
          modalidade e <strong className="font-medium text-mist">sistema fonte</strong> — ComprasNet,
          BLL Compras, BNC, Licitanet e mais.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
          className="mt-7 flex flex-wrap gap-6"
        >
          <Stat
            value={total != null ? total.toLocaleString("pt-BR") : null}
            label="licitações abertas agora"
          />
          <Stat value={String(facetsCount.ufs || 27)} label="UFs cobertas" />
          <Stat value={String(facetsCount.portais)} label="sistemas fonte" />
        </motion.div>
      </div>

      {/* radar visual */}
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.15, duration: 0.6 }}
        className="relative mx-auto hidden aspect-square w-full max-w-[380px] lg:block"
        aria-hidden
      >
        <RadarVisual />
        <div className="glass absolute -left-4 top-8 rounded-xl px-3.5 py-2.5">
          <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-fog">
            <Zap className="h-3 w-3 text-signal" /> Varredura ativa
          </p>
          <p className="font-mono mt-0.5 text-[13px] text-lime-200">comprasnet · bll · bnc</p>
        </div>
        <div className="glass absolute -right-2 bottom-10 rounded-xl px-3.5 py-2.5">
          <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-fog">
            <Satellite className="h-3 w-3 text-sky-300" /> Fonte de dados
          </p>
          <p className="font-mono mt-0.5 text-[13px] text-sky-200">PNCP · API pública</p>
        </div>
      </motion.div>
    </section>
  );
}

function Stat({ value, label }: { value: string | null; label: string }) {
  return (
    <div>
      <p className="font-display text-3xl font-bold text-white">
        {value ?? <span className="skeleton inline-block h-8 w-20 rounded" />}
      </p>
      <p className="mt-0.5 text-[11px] font-medium uppercase tracking-[0.14em] text-fog">{label}</p>
    </div>
  );
}

function RadarVisual() {
  return (
    <svg viewBox="0 0 200 200" className="h-full w-full">
      <defs>
        <radialGradient id="rg" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(163,230,53,0.08)" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
        <linearGradient id="beam" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="rgba(163,230,53,0.5)" />
          <stop offset="100%" stopColor="transparent" />
        </linearGradient>
      </defs>
      <circle cx="100" cy="100" r="98" fill="url(#rg)" />
      {[98, 74, 50, 26].map((r) => (
        <circle key={r} cx="100" cy="100" r={r} fill="none" stroke="rgba(139,152,169,0.22)" strokeWidth="0.6" />
      ))}
      <line x1="2" y1="100" x2="198" y2="100" stroke="rgba(139,152,169,0.16)" strokeWidth="0.6" />
      <line x1="100" y1="2" x2="100" y2="198" stroke="rgba(139,152,169,0.16)" strokeWidth="0.6" />
      <g className="radar-sweep">
        <path d="M100 100 L100 2 A98 98 0 0 1 160 20 Z" fill="url(#beam)" opacity="0.6" />
        <line x1="100" y1="100" x2="100" y2="2" stroke="rgba(163,230,53,0.9)" strokeWidth="1.2" />
      </g>
      {[
        [140, 60, 4, 0],
        [66, 120, 3, 0.9],
        [120, 142, 3.4, 1.7],
        [58, 62, 2.6, 2.4],
        [150, 118, 2.6, 3.1],
      ].map(([cx, cy, r, d], i) => (
        <circle key={i} cx={cx} cy={cy} r={r} fill="#a3e635" opacity="0.9">
          <animate attributeName="opacity" values="0.9;0.15;0.9" dur="2.6s" begin={`${d}s`} repeatCount="indefinite" />
        </circle>
      ))}
      <circle cx="100" cy="100" r="3" fill="#a3e635" />
    </svg>
  );
}

/* ================= TICKER ================= */
function PortalTicker() {
  const items = [...PORTAIS, ...PORTAIS];
  return (
    <div className="relative overflow-hidden border-y border-line/70 bg-ink-2/60 py-3">
      <div className="animate-ticker flex w-max items-center gap-10 whitespace-nowrap">
        {items.map((p, i) => (
          <span key={i} className="flex items-center gap-2.5 text-[12px] font-medium uppercase tracking-[0.18em] text-fog">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: p.cor }} />
            {p.nome}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ================= FOOTER ================= */
function Footer() {
  return (
    <footer className="border-t border-line/70 bg-ink-2/50">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-3">
        <div>
          <p className="font-display flex items-center gap-2 text-sm font-bold text-white">
            <Radio className="h-4 w-4 text-signal" /> RADAR·LICITAÇÕES
          </p>
          <p className="mt-2 text-[12.5px] leading-relaxed text-fog">
            Ferramenta de inteligência de mercado para fornecedores do setor público. Prazo é dinheiro:
            monitore o fim do recebimento de propostas e chegue antes.
          </p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-mist">Fonte de dados</p>
          <p className="mt-2 text-[12.5px] leading-relaxed text-fog">
            Dados públicos do <span className="text-mist">Portal Nacional de Contratações Públicas (PNCP)</span>,
            agregados pela base aberta do Atlas Licitações (Supabase público) — a mesma que alimenta
            atlaslicitacoes.com/plataforma/oportunidades — com fallback direto na API oficial do PNCP.
          </p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-mist">Filtros disponíveis</p>
          <ul className="mt-2 space-y-1 text-[12.5px] text-fog">
            <li>— Fim do recebimento de propostas (período + atalhos)</li>
            <li>— UF e município (com autocompletar)</li>
            <li>— Modalidade da licitação (Lei 14.133/2021)</li>
            <li>— Sistema fonte: ComprasNet, BLL Compras, BNC…</li>
            <li>— Faixa de valor estimado e ordenação</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line/50 py-4 text-center">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-fog/60">
          construído sobre dados abertos · Lei 14.133/2021
        </p>
      </div>
    </footer>
  );
}

/* ================= MODAL FAVORITOS ================= */
function FavoritesModal({
  open,
  onClose,
  favorites,
  onRemove,
  onOpen,
}: {
  open: boolean;
  onClose: () => void;
  favorites: FavoriteRow[];
  onRemove: (id: string) => void;
  onOpen: (f: FavoriteRow) => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 14 }}
            className="glass fixed left-1/2 top-1/2 z-[90] flex max-h-[80vh] w-[min(640px,94vw)] -translate-x-1/2 -translate-y-1/2 flex-col rounded-2xl"
          >
            <div className="flex items-center justify-between border-b border-line p-5">
              <h3 className="font-display flex items-center gap-2 text-lg font-semibold text-white">
                <Heart className="h-5 w-5 text-red-400" fill="currentColor" />
                Favoritos
                <span className="font-mono text-sm text-fog">({favorites.length})</span>
              </h3>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-line p-2 text-fog hover:text-white"
                aria-label="Fechar favoritos"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {favorites.length === 0 && (
                <div className="py-12 text-center">
                  <Heart className="mx-auto h-8 w-8 text-fog/40" />
                  <p className="mt-3 text-sm text-fog">
                    Nenhum favorito ainda. Toque no coração de uma licitação para acompanhá-la.
                  </p>
                </div>
              )}
              <ul className="space-y-2">
                {favorites.map((f) => (
                  <li
                    key={f.numeroControlePncp}
                    className="flex items-start justify-between gap-3 rounded-xl border border-line bg-panel/70 p-3.5"
                  >
                    <button type="button" onClick={() => onOpen(f)} className="min-w-0 flex-1 text-left">
                      <p className="clamp-2 text-[13.5px] font-medium text-white hover:text-lime-100">{f.titulo}</p>
                      <p className="mt-1 flex flex-wrap items-center gap-x-2 text-[11.5px] text-fog">
                        <span>{f.orgao ?? "—"}</span>
                        <span className="text-line-2">·</span>
                        <span>
                          {f.municipio ?? "—"} {f.uf ? `/ ${f.uf}` : ""}
                        </span>
                        <span className="text-line-2">·</span>
                        <span className="font-mono">encerra {fmtDate(f.dataEncerramento)}</span>
                      </p>
                    </button>
                    <button
                      type="button"
                      aria-label="Remover favorito"
                      onClick={() => onRemove(f.numeroControlePncp)}
                      className="rounded-lg border border-line p-2 text-fog/70 transition-colors hover:border-danger/40 hover:text-danger"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
