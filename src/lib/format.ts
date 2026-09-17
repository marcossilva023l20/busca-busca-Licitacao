export function fmtBRL(v: number | null | undefined): string {
  if (v == null || Number.isNaN(v)) return "Sigilo/Não informado";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: v >= 1000 ? 0 : 2,
  }).format(v);
}

export function fmtBRLCompact(v: number | null | undefined): string {
  if (v == null || Number.isNaN(v)) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(v);
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Sao_Paulo" });
}

export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
}

export interface DeadlineInfo {
  label: string;
  tone: "critical" | "urgent" | "open" | "closed";
  days: number;
}

export function deadlineInfo(iso: string | null | undefined): DeadlineInfo {
  if (!iso) return { label: "Sem data", tone: "closed", days: Infinity };
  const end = new Date(iso).getTime();
  if (Number.isNaN(end)) return { label: "Sem data", tone: "closed", days: Infinity };
  const now = Date.now();
  const diffMs = end - now;
  const days = Math.ceil(diffMs / 86400000);
  if (diffMs <= 0) return { label: "Encerrado", tone: "closed", days };
  if (days <= 1) return { label: "Encerra hoje", tone: "critical", days };
  if (days <= 2) return { label: `Em ${days} dias`, tone: "critical", days };
  if (days <= 7) return { label: `Em ${days} dias`, tone: "urgent", days };
  return { label: `Em ${days} dias`, tone: "open", days };
}

export const TONE_STYLES: Record<DeadlineInfo["tone"], string> = {
  critical: "bg-red-500/15 text-red-300 border-red-400/30",
  urgent: "bg-amber-400/12 text-amber-300 border-amber-300/30",
  open: "bg-lime-400/12 text-lime-300 border-lime-300/30",
  closed: "bg-slate-500/12 text-slate-400 border-slate-500/30",
};

export function toISODateInput(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
