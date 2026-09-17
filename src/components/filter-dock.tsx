"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bookmark,
  Building2,
  CalendarClock,
  CircleDollarSign,
  Eraser,
  Layers,
  MapPin,
  Radar,
  Search,
  SlidersHorizontal,
  ArrowUpDown,
} from "lucide-react";
import { MODALIDADES, PORTAIS, PRESETS_PRAZO, UFS } from "@/lib/constants";
import type { Facets, FilterState } from "@/lib/types";
import { toISODateInput } from "@/lib/format";
import { FieldLabel, MultiSelect } from "./ui-primitives";

interface FilterDockProps {
  filters: FilterState;
  facets: Facets;
  onChange: (f: FilterState) => void;
  onReset: () => void;
  onSaveSearch: () => void;
}

export function FilterDock({ filters, facets, onChange, onReset, onSaveSearch }: FilterDockProps) {
  const set = <K extends keyof FilterState>(key: K, value: FilterState[K]) =>
    onChange({ ...filters, [key]: value });

  const activeCount =
    (filters.q ? 1 : 0) +
    (filters.uf ? 1 : 0) +
    (filters.municipio ? 1 : 0) +
    filters.modalidades.length +
    filters.portais.length +
    (filters.encerramentoDe ? 1 : 0) +
    (filters.encerramentoAte ? 1 : 0) +
    (filters.valorMin ? 1 : 0) +
    (filters.valorMax ? 1 : 0);

  const applyPreset = (dias: number) => {
    const hoje = new Date();
    if (dias === 1) {
      // Opção "Amanhã": propostas com encerramento amanhã
      const amanha = new Date();
      amanha.setDate(amanha.getDate() + 1);
      const dataStr = toISODateInput(amanha);
      onChange({
        ...filters,
        encerramentoDe: dataStr,
        encerramentoAte: dataStr,
      });
      return;
    }
    const fim = new Date();
    fim.setDate(fim.getDate() + dias);
    fim.setHours(23, 59, 59, 0);
    onChange({
      ...filters,
      encerramentoDe: toISODateInput(hoje),
      encerramentoAte: toISODateInput(fim),
    });
  };

  const modalidadeOptions = (facets.modalidades.length ? facets.modalidades : MODALIDADES).map((m) => ({
    value: String(m.id),
    label: m.nome,
  }));

  return (
    <div className="glass rounded-2xl p-4 shadow-2xl shadow-black/40 sm:p-5">
      {/* linha 1 — busca */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-fog" style={{ width: 18, height: 18 }} />
        <input
          value={filters.q}
          onChange={(e) => set("q", e.target.value)}
          placeholder="Buscar por objeto, órgão ou palavra-chave… ex.: uniformes, ambulância, prefeitura"
          className="h-12 w-full rounded-xl border border-line bg-ink-2/70 pl-11 pr-4 text-[15px] text-white placeholder:text-fog/55 transition-colors focus:border-signal/50"
        />
      </div>

      {/* linha 2 — localização + classificação */}
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div>
          <FieldLabel icon={MapPin}>UF</FieldLabel>
          <select
            value={filters.uf}
            onChange={(e) => onChange({ ...filters, uf: e.target.value, municipio: "" })}
            className="h-10 w-full appearance-none rounded-lg border border-line bg-panel-2/80 px-3 text-sm text-mist transition-colors hover:border-line-2 focus:border-signal/50"
          >
            <option value="">Todo o Brasil</option>
            {(facets.ufs.length ? facets.ufs : [...UFS]).map((uf) => (
              <option key={uf} value={uf}>
                {uf}
              </option>
            ))}
          </select>
        </div>

        <div>
          <FieldLabel icon={Building2}>Município</FieldLabel>
          <MunicipioInput
            value={filters.municipio}
            uf={filters.uf}
            onChange={(v) => set("municipio", v)}
          />
        </div>

        <div>
          <FieldLabel icon={Layers}>Modalidade</FieldLabel>
          <MultiSelect
            placeholder="Todas as modalidades"
            options={modalidadeOptions}
            selected={filters.modalidades.map(String)}
            onChange={(next) => set("modalidades", next.map(Number))}
            searchable
          />
        </div>

        <div>
          <FieldLabel icon={Radar}>Sistema fonte</FieldLabel>
          <MultiSelect
            placeholder="Todos os portais"
            options={PORTAIS.map((p) => ({ value: p.key, label: p.nome, color: p.cor }))}
            selected={filters.portais}
            onChange={(next) => set("portais", next)}
            searchable
          />
        </div>
      </div>

      {/* linha 3 — prazo + valor + ordenação */}
      <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <FieldLabel icon={CalendarClock}>Fim do recebimento de propostas</FieldLabel>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={filters.encerramentoDe}
              onChange={(e) => set("encerramentoDe", e.target.value)}
              className="h-10 w-full rounded-lg border border-line bg-panel-2/80 px-2.5 text-[13px] text-mist"
              aria-label="Encerramento a partir de"
            />
            <span className="text-xs text-fog">até</span>
            <input
              type="date"
              value={filters.encerramentoAte}
              onChange={(e) => set("encerramentoAte", e.target.value)}
              className="h-10 w-full rounded-lg border border-line bg-panel-2/80 px-2.5 text-[13px] text-mist"
              aria-label="Encerramento até"
            />
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {PRESETS_PRAZO.map((p) => {
              const targetDate = new Date();
              targetDate.setDate(targetDate.getDate() + p.dias);
              const targetDateStr = toISODateInput(targetDate);
              const active =
                p.dias === 1
                  ? filters.encerramentoDe === targetDateStr && filters.encerramentoAte === targetDateStr
                  : filters.encerramentoAte === targetDateStr;
              return (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => applyPreset(p.dias)}
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                    active
                      ? "border-signal/50 bg-signal/15 text-lime-200"
                      : "border-line bg-panel-2/60 text-fog hover:border-line-2 hover:text-mist"
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-3">
          <FieldLabel icon={CircleDollarSign}>Valor estimado (R$)</FieldLabel>
          <div className="flex items-center gap-2">
            <input
              inputMode="numeric"
              value={filters.valorMin}
              onChange={(e) => set("valorMin", e.target.value.replace(/[^\d]/g, ""))}
              placeholder="Mínimo"
              className="h-10 w-full rounded-lg border border-line bg-panel-2/80 px-3 text-sm text-mist placeholder:text-fog/50"
            />
            <span className="text-xs text-fog">–</span>
            <input
              inputMode="numeric"
              value={filters.valorMax}
              onChange={(e) => set("valorMax", e.target.value.replace(/[^\d]/g, ""))}
              placeholder="Máximo"
              className="h-10 w-full rounded-lg border border-line bg-panel-2/80 px-3 text-sm text-mist placeholder:text-fog/50"
            />
          </div>
        </div>

        <div className="lg:col-span-3">
          <FieldLabel icon={ArrowUpDown}>Ordenar por</FieldLabel>
          <select
            value={filters.sort}
            onChange={(e) => set("sort", e.target.value as FilterState["sort"])}
            className="h-10 w-full appearance-none rounded-lg border border-line bg-panel-2/80 px-3 text-sm text-mist"
          >
            <option value="encerramento_asc">Encerramento mais próximo</option>
            <option value="encerramento_desc">Encerramento mais distante</option>
            <option value="publicacao_desc">Publicação mais recente</option>
            <option value="valor_desc">Maior valor estimado</option>
          </select>
        </div>

        <div className="flex flex-wrap items-end gap-2 lg:col-span-12 xl:col-span-2">
          <button
            type="button"
            onClick={onReset}
            className="flex h-10 w-full items-center justify-center gap-1.5 rounded-lg border border-signal/45 bg-signal/15 text-[12.5px] font-semibold text-lime-200 transition-colors hover:bg-signal/25"
          >
            <Layers className="h-4 w-4" />
            Mostrar todos os resultados
          </button>
          <div className="flex w-full items-center gap-2">
            <button
              type="button"
              onClick={onReset}
              className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg border border-line bg-panel-2/60 text-[13px] font-medium text-fog transition-colors hover:border-danger/40 hover:text-danger"
            >
              <Eraser className="h-4 w-4" />
              Limpar{activeCount > 0 ? ` (${activeCount})` : ""}
            </button>
            <button
              type="button"
              onClick={onSaveSearch}
              title="Salvar esta combinação de filtros"
              className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg border border-signal/40 bg-signal/12 text-[13px] font-semibold text-lime-100 transition-colors hover:bg-signal/20"
            >
              <Bookmark className="h-4 w-4" />
              Salvar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------- autocomplete de município ------- */
function MunicipioInput({
  value,
  uf,
  onChange,
}: {
  value: string;
  uf: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/municipios?q=${encodeURIComponent(value)}${uf ? `&uf=${uf}` : ""}`,
        );
        const data = (await res.json()) as { municipios: string[] };
        setOptions(data.municipios ?? []);
      } catch {
        setOptions([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [value, uf, open]);

  return (
    <div ref={ref} className="relative">
      <input
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={uf ? `Município em ${uf}…` : "Digite o município…"}
        className="h-10 w-full rounded-lg border border-line bg-panel-2/80 px-3 text-sm text-mist placeholder:text-fog/50 transition-colors hover:border-line-2 focus:border-signal/50"
      />
      <AnimatePresence>
        {open && (options.length > 0 || loading) && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.14 }}
            className="glass absolute left-0 top-11 z-40 max-h-56 w-full overflow-y-auto rounded-xl p-1.5 shadow-2xl shadow-black/60"
          >
            {loading && <p className="px-3 py-2 text-xs text-fog">Buscando municípios…</p>}
            {!loading &&
              options.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    onChange(m);
                    setOpen(false);
                  }}
                  className="w-full rounded-lg px-3 py-2 text-left text-[13px] text-mist transition-colors hover:bg-white/5"
                >
                  {m}
                </button>
              ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* Cabeçalho flutuante p/ mobile com indicador de filtros */
export function FilterSummaryBar({ count }: { count: number }) {
  if (!count) return null;
  return (
    <div className="flex items-center gap-2 text-xs text-fog">
      <SlidersHorizontal className="h-3.5 w-3.5 text-signal" />
      {count} filtro{count > 1 ? "s" : ""} ativo{count > 1 ? "s" : ""}
    </div>
  );
}
