"use client";

import { motion } from "framer-motion";
import {
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Database,
  Download,
  FileSearch,
  FileText,
  Heart,
  Landmark,
  MapPin,
  ShieldAlert,
} from "lucide-react";
import { PORTAL_COR } from "@/lib/constants";
import type { Licitacao, SearchResult } from "@/lib/types";
import { TONE_STYLES, deadlineInfo, fmtBRLCompact, fmtDate } from "@/lib/format";
import { SkeletonCard } from "./ui-primitives";

interface ResultListProps {
  result: SearchResult | null;
  loading: boolean;
  error: string | null;
  favorites: Set<string>;
  onToggleFavorite: (l: Licitacao) => void;
  onSelect: (l: Licitacao) => void;
  onPage: (page: number) => void;
}

export function ResultList({ result, loading, error, favorites, onToggleFavorite, onSelect, onPage }: ResultListProps) {
  if (error) {
    return (
      <div className="rounded-2xl border border-danger/30 bg-red-500/5 p-10 text-center">
        <ShieldAlert className="mx-auto h-8 w-8 text-danger" />
        <p className="mt-3 text-sm text-red-200">{error}</p>
      </div>
    );
  }

  if (loading && !result) {
    return (
      <div className="mx-auto max-w-4xl grid grid-cols-1 gap-5">
        {Array.from({ length: 9 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (!result) return null;

  if (result.items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-line-2 bg-panel/50 p-14 text-center">
        <FileSearch className="mx-auto h-10 w-10 text-fog/60" />
        <p className="font-display mt-4 text-lg font-semibold text-mist">Nenhuma licitação encontrada</p>
        <p className="mt-1 text-sm text-fog">
          Ajuste os filtros — amplie o período de encerramento ou remova restrições.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className={`mx-auto max-w-4xl grid grid-cols-1 gap-5 ${loading ? "opacity-50 transition-opacity" : ""}`}>
        {result.items.map((l, i) => (
          <motion.div
            key={l.id || i}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: Math.min(i * 0.03, 0.3) }}
          >
            <LicitacaoCard
              l={l}
              isFavorite={favorites.has(l.id)}
              onToggleFavorite={() => onToggleFavorite(l)}
              onSelect={() => onSelect(l)}
            />
          </motion.div>
        ))}
      </div>
      <Pagination page={result.page} totalPages={result.totalPages} onPage={onPage} />
    </>
  );
}

function LicitacaoCard({
  l,
  isFavorite,
  onToggleFavorite,
  onSelect,
}: {
  l: Licitacao;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onSelect: () => void;
}) {
  const dl = deadlineInfo(l.dataEncerramento);
  const portalCor = l.portalKey ? PORTAL_COR[l.portalKey] ?? "#94a3b8" : "#94a3b8";

  return (
    <article
      onClick={onSelect}
      className="card-hover group relative flex h-full cursor-pointer flex-col rounded-2xl border border-line bg-panel/80 p-5"
    >
      {/* topo: portal + favorito */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold"
            style={{ borderColor: `${portalCor}55`, color: portalCor, background: `${portalCor}14` }}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: portalCor }} />
            {l.portalNome ?? "PNCP"}
          </span>
          {l.modalidadeNome && (
            <span className="rounded-full border border-line-2/80 bg-panel-2/70 px-2.5 py-1 text-[11px] font-medium text-mist">
              {l.modalidadeNome}
            </span>
          )}
        </div>
        <button
          type="button"
          aria-label={isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite();
          }}
          className={`rounded-full border p-1.5 transition-colors ${
            isFavorite
              ? "border-red-400/40 bg-red-400/10 text-red-400"
              : "border-line text-fog hover:border-red-400/40 hover:text-red-400"
          }`}
        >
          <Heart className="h-3.5 w-3.5" fill={isFavorite ? "currentColor" : "none"} />
        </button>
      </div>

      {/* título */}
      <h3 className="font-display mt-3 text-[17px] font-bold leading-snug text-white transition-colors group-hover:text-lime-100">
        {l.titulo}
      </h3>

      {/* Descrição Completa do Objeto */}
      <div className="mt-3 rounded-xl border border-line-2/70 bg-panel-2/80 p-3.5 text-[13.5px] leading-relaxed text-slate-200">
        <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-signal mb-1.5">
          <FileText className="h-3.5 w-3.5 text-signal" />
          Descrição Completa do Objeto
        </p>
        <p className="whitespace-pre-wrap break-words">{l.resumo || l.titulo}</p>
      </div>

      {/* órgão / local */}
      <div className="mt-2.5 space-y-1 text-[12.5px] text-fog">
        <p className="clamp-2 flex items-start gap-1.5">
          <Landmark className="mt-0.5 h-3.5 w-3.5 shrink-0 text-fog/70" />
          <span className="clamp-2">{l.orgao ?? "Órgão não informado"}</span>
        </p>
        <p className="flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-fog/70" />
          {l.municipio ?? "—"} {l.uf ? `· ${l.uf}` : ""}
        </p>
      </div>

      {/* rodapé: prazo + valor */}
      <div className="mt-auto flex items-end justify-between gap-3 pt-4">
        <div>
          <p className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-fog">
            <CalendarClock className="h-3.5 w-3.5" />
            Encerramento
          </p>
          <p className="font-mono mt-1 text-[13px] font-medium text-mist">
            {fmtDate(l.dataEncerramento)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-fog">Valor estimado</p>
          <p className="font-mono mt-1 text-[13px] font-semibold text-lime-200">
            {l.orcamentoSigiloso ? "Sigiloso" : fmtBRLCompact(l.valorEstimado)}
          </p>
        </div>
      </div>

      <div className={`mt-3 flex items-center justify-center rounded-lg border px-3 py-1.5 text-[12px] font-semibold ${TONE_STYLES[dl.tone]}`}>
        {dl.tone === "critical" && <span className="pulse-dot mr-2 h-1.5 w-1.5 rounded-full bg-red-400" />}
        {dl.label}
      </div>
    </article>
  );
}

/* ------- cabeçalho de resultados ------- */
export function ResultHeader({
  result,
  loading,
  onExport,
}: {
  result: SearchResult | null;
  loading: boolean;
  onExport: () => void;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <h2 className="font-display text-lg font-semibold text-white">
          {result ? (
            <>
              <span className="font-mono text-signal">{result.total.toLocaleString("pt-BR")}</span>{" "}
              licitaç{result.total === 1 ? "ão aberta" : "ões abertas"}
            </>
          ) : (
            "Buscando licitações…"
          )}
        </h2>
        {result && (
          <span className="flex items-center gap-1.5 rounded-full border border-line bg-panel-2/70 px-2.5 py-1 text-[11px] text-fog">
            <Database className="h-3 w-3 text-signal" />
            {result.source === "atlas" ? "Base Atlas · PNCP" : "API PNCP (direto)"}
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={onExport}
        disabled={!result || result.items.length === 0 || loading}
        className="flex items-center gap-1.5 rounded-lg border border-line bg-panel-2/60 px-3 py-2 text-[12.5px] font-medium text-mist transition-colors hover:border-signal/40 hover:text-lime-100 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Download className="h-4 w-4" />
        Exportar página (CSV)
      </button>
    </div>
  );
}

/* ------- paginação ------- */
function Pagination({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (p: number) => void }) {
  if (totalPages <= 1) return null;
  const windowPages = pageWindow(page, totalPages);

  return (
    <nav className="mt-8 flex items-center justify-center gap-1.5" aria-label="Paginação">
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-line text-fog transition-colors hover:border-line-2 hover:text-white disabled:opacity-30"
        aria-label="Página anterior"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      {windowPages.map((p, idx) =>
        p === "…" ? (
          <span key={`e${idx}`} className="px-1 text-fog">
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => onPage(p as number)}
            className={`font-mono h-9 min-w-9 rounded-lg border px-2 text-[13px] transition-colors ${
              p === page
                ? "border-signal/60 bg-signal/15 font-semibold text-lime-200"
                : "border-line text-fog hover:border-line-2 hover:text-white"
            }`}
          >
            {p}
          </button>
        ),
      )}
      <button
        type="button"
        disabled={page >= totalPages}
        onClick={() => onPage(page + 1)}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-line text-fog transition-colors hover:border-line-2 hover:text-white disabled:opacity-30"
        aria-label="Próxima página"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </nav>
  );
}

function pageWindow(page: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "…")[] = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(total - 1, page + 1);
  if (start > 2) pages.push("…");
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < total - 1) pages.push("…");
  pages.push(total);
  return pages;
}
