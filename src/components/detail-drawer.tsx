function extractNumeroEditalDrawer(l: Licitacao, detail?: LicitacaoDetail | null): string {
  if (detail?.numeroCompra) {
    const nc = String(detail.numeroCompra).trim();
    if (detail.anoCompra && !nc.includes("/")) {
      return `${nc}/${detail.anoCompra}`;
    }
    return nc;
  }
  if (detail?.numeroProcesso) {
    return String(detail.numeroProcesso).trim();
  }

  const sources = [
    l.titulo,
    l.resumo,
    detail?.licitacao?.resumo,
    ...(detail?.documentos ? detail.documentos.map((d) => `${d.titulo} ${d.url ?? ""}`) : []),
    l.linkSistemaOrigem,
    l.linkPncp,
  ];

  for (const s of sources) {
    if (!s) continue;
    const mNumprp = s.match(/[?&]numprp=(\d{1,6})(\d{4})\b/i);
    if (mNumprp) return `${parseInt(mNumprp[1], 10)}/${mNumprp[2]}`;

    const mCompra = s.match(/[?&]compra=\d{6}\d{2}(\d{5})(\d{4})\b/i);
    if (mCompra) return `${parseInt(mCompra[1], 10)}/${mCompra[2]}`;

    const mExp = s.match(
      /\b(?:edital|pregao|preg[aã]o|concorr[eê]ncia|dispensa|inexigibilidade|aviso(?:\s+de\s+contrata[cç][aã]o(?:\s+direta)?)?|convite|leil[aã]o|processo(?:\s+seletivo)?)\s*(?:eletr[oô]nico|presencial)?\s*(?:n[oº°.]?\s*)?(\d{1,6}\/\d{4})\b/i,
    );
    if (mExp) return mExp[1];

    const mExpSep = s.match(
      /\b(?:edital|pregao|preg[aã]o|concorr[eê]ncia|dispensa|aviso|processo)\s*(?:eletr[oô]nico|presencial)?\s*(?:n[oº°.]?\s*)?(\d{1,6}[-_]\d{4})\b/i,
    );
    if (mExpSep) return mExpSep[1].replace("-", "/").replace("_", "/");

    const mN = s.match(/\b(?:n[º°.]\s*)(\d{1,6}\/\d{4})\b/i);
    if (mN) return mN[1];
  }

  if (l.titulo) {
    const mTitle = l.titulo.match(/\b(\d{1,6}\/\d{4})\b/);
    if (mTitle) return mTitle[1];
  }

  return "";
}

function extractUasg(l: Licitacao, detail?: LicitacaoDetail | null) {
  if (detail?.uasg) return detail.uasg;
  const sources = [
    l.linkSistemaOrigem,
    l.linkPncp,
    l.id,
    l.titulo,
    l.resumo,
    detail?.licitacao?.resumo,
  ];
  for (const s of sources) {
    if (!s) continue;
    const mUrl = s.match(/(?:uasg|codigouasg|co_uasg|unidade_gestora|unidadecompradora|uo)[=/](\d{5,6})/i);
    if (mUrl) return mUrl[1];
    const mTxt = s.match(/\b(?:uasg|ug)[\s:.-]*(\d{5,6})\b/i);
    if (mTxt) return mTxt[1];
    const mPref = s.match(/\b(?:comprasnet|comprasgov|siasg)[-_](\d{5,6})\b/i);
    if (mPref) return mPref[1];
  }
  return "";
}

function formatUnidadeCompradora(orgao?: string | null, id?: string | null, linkPncp?: string | null, linkSistemaOrigem?: string | null) {
  let uasg = "";
  const sources = [linkSistemaOrigem, linkPncp, id];
  for (const s of sources) {
    if (!s) continue;
    const m =
      s.match(/(?:uasg|codigouasg|co_uasg|unidade_gestora|unidadecompradora|uo)[=/](\d{5,6})/i) ||
      s.match(/\b(?:uasg|ug)[\s:.-]*(\d{5,6})\b/i) ||
      s.match(/\b(?:comprasnet|comprasgov|siasg)[-_](\d{5,6})\b/i);
    if (m) {
      uasg = m[1];
      break;
    }
  }

  const nome = (orgao || "").trim();
  if (uasg && nome) {
    if (nome.startsWith(uasg)) return nome;
    return `${uasg} - ${nome}`;
  }
  if (uasg) return uasg;
  return nome || "—";
}

"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarClock,
  Download,
  ExternalLink,
  FileText,
  Gavel,
  Heart,
  Landmark,
  Lock,
  MapPin,
  PackageOpen,
  Radar,
  Receipt,
  X,
} from "lucide-react";
import { PORTAL_COR } from "@/lib/constants";
import type { Licitacao, LicitacaoItem, LicitacaoDocumento, LicitacaoDetail } from "@/lib/types";
import { TONE_STYLES, deadlineInfo, fmtBRL, fmtDateTime } from "@/lib/format";
import { Spinner } from "./ui-primitives";

interface DetailDrawerProps {
  licitacao: Licitacao | null;
  onClose: () => void;
  isFavorite: boolean;
  onToggleFavorite: (l: Licitacao) => void;
}

const ESFERA_LABEL: Record<string, string> = { F: "Federal", E: "Estadual", M: "Municipal" };

export function DetailDrawer({ licitacao, onClose, isFavorite, onToggleFavorite }: DetailDrawerProps) {
  const [detail, setDetail] = useState<LicitacaoDetail | null>(null);
  const [itens, setItens] = useState<LicitacaoItem[]>([]);
  const [documentos, setDocumentos] = useState<LicitacaoDocumento[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!licitacao) return;
    setDetail(null);
    setItens([]);
    setDocumentos([]);
    setLoading(true);
    const ctrl = new AbortController();
    fetch(`/api/licitacoes/${encodeURIComponent(licitacao.id)}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: LicitacaoDetail) => {
        setDetail(d);
        setItens(d.itens ?? []);
        setDocumentos(d.documentos ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => ctrl.abort();
  }, [licitacao]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // mescla dados leves do card com o detalhe completo (que traz o `resumo`)
  const l: Licitacao | null =
    licitacao && detail?.licitacao
      ? { ...licitacao, ...detail.licitacao }
      : licitacao;
  const dl = deadlineInfo(l?.dataEncerramento);
  const portalCor = (l?.portalKey && PORTAL_COR[l.portalKey]) || "#94a3b8";

  return (
    <AnimatePresence>
      {l && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm"
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 260 }}
            className="fixed bottom-0 right-0 top-0 z-[70] flex w-full max-w-xl flex-col border-l border-line bg-ink-2 shadow-2xl"
            role="dialog"
            aria-modal="true"
          >
            {/* header */}
            <div className="flex items-start justify-between gap-4 border-b border-line p-5">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold"
                  style={{ borderColor: `${portalCor}55`, color: portalCor, background: `${portalCor}14` }}
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: portalCor }} />
                  {l.portalNome ?? "PNCP"}
                </span>
                {l.modalidadeNome && (
                  <span className="flex items-center gap-1 rounded-full border border-line-2/80 bg-panel-2/70 px-2.5 py-1 text-[11px] font-medium text-mist">
                    <Gavel className="h-3 w-3" />
                    {l.modalidadeNome}
                  </span>
                )}
                {l.srp && (
                  <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2.5 py-1 text-[11px] font-medium text-cyan-300">
                    Registro de Preços
                  </span>
                )}
                {l.orcamentoSigiloso && (
                  <span className="flex items-center gap-1 rounded-full border border-amber-300/30 bg-amber-400/10 px-2.5 py-1 text-[11px] font-medium text-amber-300">
                    <Lock className="h-3 w-3" />
                    Orçamento sigiloso
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-line p-2 text-fog transition-colors hover:border-line-2 hover:text-white"
                aria-label="Fechar detalhes"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* corpo */}
            <div className="flex-1 overflow-y-auto p-5">
              <h2 className="font-display text-xl font-semibold leading-snug text-white">{l.titulo}</h2>
              <p className="font-mono mt-2 text-[11px] text-fog/80">{l.id}</p>

              {/* bloco prazo */}
              <div className={`mt-4 flex items-center justify-between rounded-xl border px-4 py-3 ${TONE_STYLES[dl.tone]}`}>
                <div>
                  <p className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] opacity-80">
                    <CalendarClock className="h-3.5 w-3.5" />
                    Fim do recebimento de propostas
                  </p>
                  <p className="font-mono mt-1 text-sm font-semibold">{fmtDateTime(l.dataEncerramento)}</p>
                </div>
                <p className="font-display text-2xl font-bold">{dl.label}</p>
              </div>

              {/* grade de infos */}
              <dl className="mt-5 grid grid-cols-2 gap-3">
                <Info label="Unidade compradora" icon={Landmark} full>
                  <span className="font-semibold text-white">
                    {detail?.unidadeCompradora ?? formatUnidadeCompradora(l.orgao, l.id, l.linkPncp, l.linkSistemaOrigem)}
                  </span>
                </Info>
                <Info label="Nº do Edital / Processo" icon={FileText}>
                  <span className="font-mono font-semibold text-white">
                    {extractNumeroEditalDrawer(l, detail) || "—"}
                  </span>
                </Info>
                <Info label="UASG" icon={Receipt}>
                  <span className="font-mono font-semibold text-lime-200">
                    {extractUasg(l, detail) || "—"}
                  </span>
                </Info>
                <Info label="Fonte" icon={Radar}>
                  {l.portalNome ?? "PNCP"}
                </Info>
                <Info label="Localidade" icon={MapPin}>
                  {l.municipio ?? "—"} {l.uf ? `/ ${l.uf}` : ""}
                </Info>
                <Info label="Esfera">{l.esfera ? ESFERA_LABEL[l.esfera] ?? l.esfera : "—"}</Info>
                <Info label="Valor estimado" icon={Receipt}>
                  <span className="font-mono text-lime-200">
                    {l.orcamentoSigiloso ? "Sigiloso" : fmtBRL(l.valorEstimado)}
                  </span>
                </Info>
                <Info label="Modo de disputa">{l.modoDisputa ?? "—"}</Info>
                <Info label="Publicação">{fmtDateTime(l.dataPublicacao)}</Info>
                <Info label="Abertura">{fmtDateTime(l.dataAbertura)}</Info>
              </dl>

              {/* resumo / objeto */}
              {l.resumo && l.resumo !== l.titulo && (
                <div className="mt-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-fog">Objeto</p>
                  <p className="mt-1.5 text-[13.5px] leading-relaxed text-mist">{l.resumo}</p>
                </div>
              )}

              {/* documentos e anexos */}
              <div className="mt-6">
                <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-fog">
                  <FileText className="h-4 w-4 text-signal/80" />
                  Documentos e Anexos {loading ? "" : documentos.length ? `(${documentos.length})` : ""}
                </p>
                {loading && (
                  <div className="mt-3 flex items-center gap-2 text-sm text-fog">
                    <Spinner /> Carregando documentos…
                  </div>
                )}
                {!loading && documentos.length === 0 && (
                  <p className="mt-2 text-[13px] text-fog/70">Nenhum documento disponível no momento.</p>
                )}
                {!loading && documentos.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {documentos.map((doc, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between gap-3 rounded-xl border border-line bg-panel/60 p-3 transition-colors hover:border-line-2"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-medium text-white">{doc.titulo}</p>
                          <div className="mt-0.5 flex items-center gap-2 text-[11px] text-fog">
                            {doc.tipoNome && <span>{doc.tipoNome}</span>}
                            {doc.dataPublicacao && (
                              <>
                                <span>•</span>
                                <span>{fmtDateTime(doc.dataPublicacao)}</span>
                              </>
                            )}
                          </div>
                        </div>
                        {doc.url && (
                          <a
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 rounded-lg border border-line bg-panel-2 px-3 py-1.5 text-xs font-semibold text-lime-200 transition-colors hover:border-signal/50 hover:bg-signal/15"
                          >
                            <Download className="h-3.5 w-3.5" />
                            Acessar
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            

              {/* itens */}
              <div className="mt-6">
                <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-fog">
                  <PackageOpen className="h-4 w-4 text-signal/80" />
                  Itens da Licitação {loading ? "" : itens.length ? `(${itens.length})` : ""}
                </p>
                {loading && (
                  <div className="mt-3 flex items-center gap-2 text-sm text-fog">
                    <Spinner /> Carregando itens…
                  </div>
                )}
                {!loading && itens.length === 0 && (
                  <p className="mt-2 text-[13px] text-fog/70">Itens não disponíveis na base pública.</p>
                )}
                {!loading && itens.length > 0 && (
                  <div className="mt-3 overflow-hidden rounded-xl border border-line">
                    <table className="w-full text-left text-[12.5px]">
                      <thead>
                        <tr className="border-b border-line bg-panel-2/60 text-[10.5px] uppercase tracking-wider text-fog">
                          <th className="px-3 py-2 font-semibold">#</th>
                          <th className="px-3 py-2 font-semibold">Item / Descrição</th>
                          <th className="px-3 py-2 text-right font-semibold">Qtd.</th>
                          <th className="px-3 py-2 text-right font-semibold">V. Unitário</th>
                          <th className="px-3 py-2 text-right font-semibold">Vlr. total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {itens.slice(0, 60).map((it, idx) => (
                          <tr key={idx} className="border-b border-line/50 last:border-0 hover:bg-white/[0.03]">
                            <td className="font-mono px-3 py-2 text-fog">{it.numeroItem ?? idx + 1}</td>
                            <td className="px-3 py-2 text-mist">
                              <p className="line-clamp-2 font-medium text-white">
                                {it.descricao ?? it.titulo ?? l.resumo ?? l.titulo ?? "—"}
                              </p>
                              {it.titulo && it.descricao && it.titulo !== it.descricao && (
                                <p className="line-clamp-1 mt-0.5 text-[11px] text-fog">{it.titulo}</p>
                              )}
                            </td>
                            <td className="font-mono px-3 py-2 text-right text-fog">
                              {it.quantidade != null ? `${it.quantidade} ${it.unidade ?? ""}` : "—"}
                            </td>
                            <td className="font-mono px-3 py-2 text-right text-lime-200/80">
                              {it.valorUnitario != null ? fmtBRL(it.valorUnitario) : "—"}
                            </td>
                            <td className="font-mono px-3 py-2 text-right text-lime-200/90">
                              {it.valorTotal != null ? fmtBRL(it.valorTotal) : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {itens.length > 60 && (
                      <p className="border-t border-line px-3 py-2 text-center text-[11px] text-fog">
                        + {itens.length - 60} itens — veja todos no sistema de origem
                      </p>
                    )}
                  </div>
                )}
              </div>
</div>

            {/* ações */}
            <div className="flex flex-wrap items-center gap-2 border-t border-line p-4">
              {l.linkPncp && (
                <a
                  href={l.linkPncp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-signal font-display text-[13px] font-bold uppercase tracking-wide text-ink transition-opacity hover:opacity-85"
                >
                  <ExternalLink className="h-4 w-4" />
                  Abrir no PNCP
                </a>
              )}
              {l.linkSistemaOrigem && (
                <a
                  href={l.linkSistemaOrigem}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-11 flex-1 items-center justify-center gap-2 rounded-lg border text-[13px] font-semibold transition-colors"
                  style={{ borderColor: `${portalCor}55`, color: portalCor, background: `${portalCor}12` }}
                >
                  <ExternalLink className="h-4 w-4" />
                  {l.portalNome ? `Ir ao ${l.portalNome}` : "Sistema de origem"}
                </a>
              )}
              <button
                type="button"
                onClick={() => onToggleFavorite(l)}
                className={`flex h-11 items-center justify-center gap-2 rounded-lg border px-4 text-[13px] font-semibold transition-colors ${
                  isFavorite
                    ? "border-red-400/40 bg-red-400/10 text-red-400"
                    : "border-line text-fog hover:border-red-400/40 hover:text-red-400"
                }`}
              >
                <Heart className="h-4 w-4" fill={isFavorite ? "currentColor" : "none"} />
                {isFavorite ? "Salvo" : "Favoritar"}
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function Info({
  label,
  icon: Icon,
  children,
  full,
}: {
  label: string;
  icon?: typeof MapPin;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <div className={`rounded-xl border border-line bg-panel/60 p-3 ${full ? "col-span-2" : ""}`}>
      <dt className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-fog">
        {Icon && <Icon className="h-3 w-3" />}
        {label}
      </dt>
      <dd className="mt-1 text-[13px] leading-snug text-mist">{children}</dd>
    </div>
  );
}
