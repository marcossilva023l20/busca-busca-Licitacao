"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, type LucideIcon } from "lucide-react";

export function FieldLabel({ icon: Icon, children }: { icon?: LucideIcon; children: React.ReactNode }) {
  return (
    <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-fog">
      {Icon ? <Icon className="h-3.5 w-3.5 text-signal/80" strokeWidth={2.2} /> : null}
      {children}
    </span>
  );
}

export interface MultiOption {
  value: string;
  label: string;
  color?: string;
}

interface MultiSelectProps {
  placeholder: string;
  options: MultiOption[];
  selected: string[];
  onChange: (next: string[]) => void;
  searchable?: boolean;
}

export function MultiSelect({ placeholder, options, selected, onChange, searchable }: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const visible = query
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  const toggle = (v: string) => {
    onChange(selected.includes(v) ? selected.filter((s) => s !== v) : [...selected, v]);
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex h-10 w-full items-center justify-between gap-2 rounded-lg border px-3 text-sm transition-colors ${
          selected.length
            ? "border-signal/45 bg-signal/10 text-lime-100"
            : "border-line bg-panel-2/80 text-mist hover:border-line-2"
        }`}
      >
        <span className="truncate">
          {selected.length ? `${selected.length} selecionada${selected.length > 1 ? "s" : ""}` : placeholder}
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            className="glass absolute left-0 top-11 z-40 w-72 max-w-[80vw] rounded-xl p-2 shadow-2xl shadow-black/60"
          >
            {searchable && (
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filtrar…"
                className="mb-2 h-9 w-full rounded-lg border border-line bg-ink-2/80 px-3 text-sm text-white placeholder:text-fog/60"
              />
            )}
            <div className="max-h-64 overflow-y-auto pr-1">
              {visible.length === 0 && (
                <p className="px-3 py-2 text-xs text-fog">Nenhuma opção encontrada.</p>
              )}
              {visible.map((o) => {
                const active = selected.includes(o.value);
                return (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => toggle(o.value)}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] transition-colors ${
                      active ? "bg-signal/12 text-lime-100" : "text-mist hover:bg-white/5"
                    }`}
                  >
                    <span
                      className={`flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded border ${
                        active ? "border-signal bg-signal/90" : "border-line-2"
                      }`}
                      style={{ width: 18, height: 18 }}
                    >
                      {active && <Check className="h-3 w-3 text-ink" strokeWidth={3.2} />}
                    </span>
                    {o.color && <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: o.color }} />}
                    <span className="truncate">{o.label}</span>
                  </button>
                );
              })}
            </div>
            {selected.length > 0 && (
              <button
                type="button"
                onClick={() => onChange([])}
                className="mt-2 w-full rounded-lg border border-line py-1.5 text-xs text-fog transition-colors hover:border-danger/40 hover:text-danger"
              >
                Limpar seleção
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Spinner({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={`${className} animate-spin`} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-line bg-panel/70 p-5">
      <div className="skeleton h-3 w-32 rounded" />
      <div className="skeleton mt-3 h-4 w-full rounded" />
      <div className="skeleton mt-2 h-4 w-3/4 rounded" />
      <div className="skeleton mt-4 h-3 w-1/2 rounded" />
      <div className="mt-5 flex items-center justify-between">
        <div className="skeleton h-6 w-24 rounded-full" />
        <div className="skeleton h-6 w-20 rounded-full" />
      </div>
    </div>
  );
}
