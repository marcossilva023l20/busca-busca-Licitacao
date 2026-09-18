/**
 * Fonte de dados de licitações.
 *
 * Engenharia reversa realizada sobre https://atlaslicitacoes.com/plataforma/oportunidades:
 *
 *  1. O front-end (SPA React/Vite) chama Supabase Edge Functions:
 *       POST {SUPABASE_URL}/functions/v1/public-opportunities-list
 *       POST {SUPABASE_URL}/functions/v1/public-opportunity-detail   {slug}
 *  2. Os dados vivem na tabela pública `pncp_licitacoes` (PostgREST),
 *     legível com a anon key publicada no próprio bundle JS do site.
 *  3. A origem última é a API pública oficial do PNCP
 *       https://pncp.gov.br/api/search?tipos_documento=edital&status=recebendo_proposta
 *     (sem autenticação, CORS aberto) — usada aqui como fallback.
 *
 * As credenciais abaixo são a "anon key" pública do projeto Supabase do Atlas,
 * extraída do bundle JavaScript servido a qualquer visitante anônimo. Não é um
 * segredo: é exatamente a credencial que o navegador de qualquer usuário do
 * site deles usa. Mesmo assim, lidas via process.env conforme boas práticas.
 */

const SUPABASE_URL =
  process.env.ATLAS_SUPABASE_URL ?? "https://kkudnnbuzljloenwcjsa.supabase.co";
const SUPABASE_ANON_KEY =
  process.env.ATLAS_SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtrdWRubmJ1emxqbG9lbndjanNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2MTU2NjQsImV4cCI6MjA4NzE5MTY2NH0.ETcqBjr_9_WAludecUC4IBVjlAjIJZogTpXt-hG0koY";

import type { Facets, Licitacao, LicitacaoItem, LicitacaoDocumento, LicitacaoDetail, SearchResult } from "@/lib/types";

export type { Licitacao, LicitacaoItem, LicitacaoDocumento, LicitacaoDetail, Facets, SearchResult };

const REST = `${SUPABASE_URL}/rest/v1`;

export interface SearchParams {
  q?: string;
  uf?: string;
  municipio?: string;
  modalidades?: number[];
  portais?: string[];
  encerramentoDe?: string; // ISO date
  encerramentoAte?: string; // ISO date
  apenasAbertas?: boolean;
  valorMin?: number;
  valorMax?: number;
  page: number;
  pageSize: number;
  sort: "encerramento_asc" | "encerramento_desc" | "valor_desc" | "publicacao_desc";
}

/** Colunas "leves" para LISTAGEM (sem `resumo`, que deixa a ordenação da
 *  página lenta e pode estourar o statement timeout do PostgREST em
 *  consultas abrangentes). O `resumo` chega via getLicitacaoDetail. */
const SELECT_COLS_LIST = [
  "numero_controle_pncp",
  "titulo",
  "orgao_entidade",
  "uf",
  "municipio",
  "modalidade_id",
  "modalidade_nome",
  "modo_disputa",
  "portal_key",
  "portal_nome",
  "status",
  "srp",
  "orcamento_sigiloso",
  "valor_estimado",
  "data_abertura",
  "data_publicacao",
  "data_encerramento",
  "link_pncp",
  "link_sistema_origem",
  "slug",
  "esfera",
  "quantidade_itens",
].join(",");

/** Colunas completas (inclui `resumo`) — usadas apenas no DETALHE (1 linha). */
const SELECT_COLS_FULL = "resumo," + SELECT_COLS_LIST;

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapRow(r: any): Licitacao {
  return {
    id: r.numero_controle_pncp ?? "",
    titulo: r.titulo ?? "Sem título",
    resumo: r.resumo ?? null,
    orgao: r.orgao_entidade ?? null,
    uf: r.uf ?? null,
    municipio: r.municipio ?? null,
    modalidadeId: typeof r.modalidade_id === "number" ? r.modalidade_id : null,
    modalidadeNome: r.modalidade_nome ?? null,
    modoDisputa: r.modo_disputa ?? null,
    portalKey: r.portal_key ?? null,
    portalNome: r.portal_nome ?? null,
    status: r.status ?? null,
    srp: Boolean(r.srp),
    orcamentoSigiloso: Boolean(r.orcamento_sigiloso),
    valorEstimado: typeof r.valor_estimado === "number" ? r.valor_estimado : null,
    dataAbertura: r.data_abertura ?? null,
    dataPublicacao: r.data_publicacao ?? null,
    dataEncerramento: r.data_encerramento ?? null,
    linkPncp: r.link_pncp ?? null,
    linkSistemaOrigem: r.link_sistema_origem ?? null,
    slug: r.slug ?? null,
    esfera: r.esfera ?? null,
    quantidadeItens: typeof r.quantidade_itens === "number" ? r.quantidade_itens : null,
  };
}

function headers(extra?: Record<string, string>): HeadersInit {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    Accept: "application/json",
    ...extra,
  };
}

/** Sanitiza termo para uso seguro em padrões ilike do PostgREST. */
function ilike(term: string): string {
  return `*${term.replace(/[*(),%_\\]/g, " ").trim().replace(/\s+/g, " ")}*`;
}

/** Normaliza para full-text search: minúsculas, sem acentos, só letras/números/espaços. */
function normTerm(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N} ]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function supabaseGet(
  path: string,
  params: URLSearchParams,
  extraHeaders?: Record<string, string>,
): Promise<Response> {
  const url = `${REST}/${path}?${params.toString()}`;
  return fetch(url, {
    headers: headers(extraHeaders),
    signal: AbortSignal.timeout(15000),
    next: { revalidate: 60 },
  });
}

export async function searchLicitacoes(p: SearchParams): Promise<SearchResult> {
  try {
    return await searchAtlas(p);
  } catch (err) {
    console.error("[source] atlas falhou, usando fallback PNCP:", err);
    return searchPncp(p);
  }
}

async function searchAtlas(p: SearchParams): Promise<SearchResult> {
  try {
    return await queryAtlas(p);
  } catch {
    // 1 retry: a base é compartilhada e 5xx intermitentes (timeout) acontecem
    await new Promise((r) => setTimeout(r, 700));
    return queryAtlas(p);
  }
}

async function queryAtlas(p: SearchParams): Promise<SearchResult> {
  const params = new URLSearchParams();
  params.set("select", SELECT_COLS_LIST);

  if (p.uf) params.set("uf", `eq.${p.uf.toUpperCase()}`);
  if (p.municipio) params.set("municipio", `ilike.${ilike(p.municipio)}`);
  if (p.modalidades?.length) params.set("modalidade_id", `in.(${p.modalidades.join(",")})`);
  if (p.portais?.length) params.set("portal_key", `in.(${p.portais.join(",")})`);
  if (typeof p.valorMin === "number") params.set("valor_estimado", `gte.${p.valorMin}`);
  if (typeof p.valorMax === "number") params.set("valor_estimado", `lte.${p.valorMax}`);

  // Filtro de fim de recebimento de propostas
  const de = p.encerramentoDe ?? (p.apenasAbertas === false ? undefined : new Date().toISOString());
  if (de) params.set("data_encerramento", `gte.${de}`);
  if (p.encerramentoAte) {
    // PostgREST: múltiplos filtros na mesma coluna exigem parâmetros repetidos
    params.append("data_encerramento", `lte.${p.encerramentoAte}`);
  }

  if (p.q && p.q.trim()) {
    // full-text search indexada (GIN) em português + fallback ilike sem acento.
    // ilike direto em titulo/resumo causa seq-scan e timeout no PostgREST.
    const norm = normTerm(p.q);
    const parts: string[] = [];
    if (norm) parts.push(`search_vector.plfts(portuguese).${norm}`);
    parts.push(`titulo_normalizado.ilike.${ilike(norm || p.q)}`);
    // NOTA: sem ilike em orgao_entidade — coluna sem índice, seq-scan estoura o
    // statement timeout. O órgão já entra no search_vector (tsvector ponderado).
    params.set("or", `(${parts.join(",")})`);
  }

  switch (p.sort) {
    case "encerramento_desc":
      params.set("order", "data_encerramento.desc.nullslast");
      break;
    case "valor_desc":
      params.set("order", "valor_estimado.desc.nullslast");
      break;
    case "publicacao_desc":
      params.set("order", "data_publicacao.desc.nullslast");
      break;
    default:
      params.set("order", "data_encerramento.asc.nullslast");
  }

  const offset = (p.page - 1) * p.pageSize;
  params.set("limit", String(p.pageSize));
  params.set("offset", String(offset));

  const res = await supabaseGet("pncp_licitacoes", params, { Prefer: "count=exact" });
  if (!res.ok) throw new Error(`Supabase ${res.status}`);

  const range = res.headers.get("content-range") ?? "";
  const total = Number(range.split("/")[1] ?? 0) || 0;
  const rows = (await res.json()) as any[];

  return {
    total,
    page: p.page,
    pageSize: p.pageSize,
    totalPages: Math.max(1, Math.ceil(total / p.pageSize)),
    items: rows.map(mapRow),
    source: "atlas",
  };
}

/** Fallback: API pública oficial do PNCP (a mesma que o Atlas consome). */
async function searchPncp(p: SearchParams): Promise<SearchResult> {
  const params = new URLSearchParams();
  params.set("tipos_documento", "edital");
  params.set("status", "recebendo_proposta");
  params.set("pagina", String(p.page));
  params.set("tam_pagina", String(Math.min(p.pageSize, 100)));
  if (p.q) params.set("q", p.q);
  if (p.uf) params.set("uf", p.uf.toUpperCase());
  if (p.municipio) params.set("municipio_nome", p.municipio);
  if (p.modalidades?.length === 1)
    params.set("modalidade_licitacao_id", String(p.modalidades[0]));

  const res = await fetch(`https://pncp.gov.br/api/search/?${params}`, {
    headers: { Accept: "application/json", "User-Agent": "RadarLicitacoes/1.0" },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`PNCP ${res.status}`);
  const data = await res.json();
  const items: Licitacao[] = (data.items ?? []).map((it: any) => ({
    id: it.numero_controle_pncp ?? it.id ?? "",
    titulo: it.title ?? "Sem título",
    resumo: it.description ?? null,
    orgao: it.orgao_nome ?? null,
    uf: it.uf ?? null,
    municipio: it.municipio_nome ?? null,
    modalidadeId: it.modalidade_licitacao_id ? Number(it.modalidade_licitacao_id) : null,
    modalidadeNome: it.modalidade_licitacao_nome ?? null,
    modoDisputa: null,
    portalKey: null,
    portalNome: "PNCP",
    status: it.situacao_nome ?? null,
    srp: false,
    orcamentoSigiloso: false,
    valorEstimado: typeof it.valor_global === "number" ? it.valor_global : null,
    dataAbertura: it.data_inicio_vigencia ?? null,
    dataPublicacao: it.data_publicacao_pncp ?? null,
    dataEncerramento: it.data_fim_vigencia ?? null,
    linkPncp: it.item_url ? `https://pncp.gov.br/app${it.item_url.replace("/compras/", "/editais/")}` : null,
    linkSistemaOrigem: null,
    slug: null,
    esfera: it.esfera_id ?? null,
    quantidadeItens: null,
  }));
  const total = Number(data.total ?? items.length) || 0;
  return {
    total,
    page: p.page,
    pageSize: p.pageSize,
    totalPages: Math.max(1, Math.ceil(total / p.pageSize)),
    items,
    source: "pncp",
  };
}

export async function getLicitacaoDetail(id: string): Promise<LicitacaoDetail> {
  const params = new URLSearchParams();
  params.set("select", SELECT_COLS_FULL);
  params.set("numero_controle_pncp", `eq.${id}`);
  params.set("limit", "1");

  // Tenta carregar no Supabase
  let licitacao: Licitacao | null = null;
  try {
    const res = await supabaseGet("pncp_licitacoes", params);
    if (res.ok) {
      const rows = (await res.json()) as any[];
      if (rows.length > 0) {
        licitacao = mapRow(rows[0]);
      }
    }
  } catch (err) {
    console.warn("[source] Supabase inacessível para detalhe:", err);
  }

  // Parse dos parâmetros PNCP para consulta ou fallback
  const pncpParams = parsePncpControlNumber(id);

  // Se o Supabase falhou ou não encontrou, cria a licitação baseada nos parâmetros do PNCP
  if (!licitacao) {
    if (!pncpParams) {
      throw new Error("Licitação não encontrada");
    }
    const { cnpj, ano, sequencial } = pncpParams;
    licitacao = {
      id,
      titulo: `Licitação ${sequencial}/${ano}`,
      resumo: `Processo de contratação pública sob controle ${id}.`,
      orgao: `Órgão (CNPJ ${cnpj})`,
      uf: null,
      municipio: null,
      modalidadeId: null,
      modalidadeNome: "Contratação Pública",
      modoDisputa: null,
      portalKey: null,
      portalNome: "PNCP",
      status: "Em andamento",
      srp: false,
      orcamentoSigiloso: false,
      valorEstimado: null,
      dataAbertura: null,
      dataPublicacao: `${ano}-01-01T08:00:00Z`,
      dataEncerramento: null,
      linkPncp: `https://pncp.gov.br/app/editais/${cnpj}/${ano}/${sequencial}`,
      linkSistemaOrigem: null,
      slug: null,
      esfera: null,
      quantidadeItens: null,
    };
  }

  // Busca itens no Supabase
  const itParams = new URLSearchParams();
  itParams.set(
    "select",
    "numero_item,titulo,descricao,quantidade,unidade,valor_unitario,valor_total",
  );
  itParams.set("numero_controle_pncp", `eq.${id}`);
  itParams.set("order", "numero_item.asc.nullslast");
  itParams.set("limit", "500");

  let itens: LicitacaoItem[] = [];
  try {
    const itRes = await supabaseGet("pncp_licitacao_itens", itParams);
    if (itRes.ok) {
      const itRows = (await itRes.json()) as any[];
      itens = itRows.map((r) => ({
        numeroItem: r.numero_item ?? null,
        titulo: r.titulo ?? null,
        descricao: r.descricao ?? null,
        quantidade: typeof r.quantidade === "number" ? r.quantidade : null,
        unidade: r.unidade ?? null,
        valorUnitario: typeof r.valor_unitario === "number" ? r.valor_unitario : null,
        valorTotal: typeof r.valor_total === "number" ? r.valor_total : null,
      }));
    }
  } catch (err) {
    console.warn("[source] Falha ao consultar itens no Supabase:", err);
  }

  // Busca documentos no Supabase (se existir a tabela pncp_licitacao_documentos ou pncp_licitacao_arquivos)
  let documentos: LicitacaoDocumento[] = [];
  try {
    const docParams = new URLSearchParams();
    docParams.set("numero_controle_pncp", `eq.${id}`);
    docParams.set("limit", "100");
    const docRes = await supabaseGet("pncp_licitacao_documentos", docParams);
    if (docRes.ok) {
      const docRows = (await docRes.json()) as any[];
      documentos = docRows.map((d) => ({
        id: d.id ?? d.sequencial_documento,
        sequencial: d.sequencial_documento ?? d.sequencial,
        titulo: d.titulo ?? d.nome ?? "Documento",
        tipoNome: d.tipo_documento_nome ?? d.tipo_nome ?? null,
        url: d.url ?? d.uri ?? null,
        dataPublicacao: d.data_publicacao_pncp ?? d.data_publicacao ?? null,
      }));
    }
  } catch {
    // tabela pode não existir no supabase, ignora
  }

  // Parse dos parâmetros PNCP para consulta direta aos endpoints oficiais do PNCP
  // Exemplo de id: "13230982000150-1-000107/2023" ou linkPncp: ".../editais/13230982000150/2023/107"
  const pncp = pncpParams ?? parsePncpControlNumber(licitacao.id, licitacao.linkPncp);

  let unidadeCompradora: string | null = null;
  if (pncp) {
    const { cnpj, ano, sequencial } = pncp;

    try {
      const compRes = await fetch(
        `https://pncp.gov.br/api/pncp/v1/orgaos/${cnpj}/compras/${ano}/${sequencial}`,
        {
          headers: { Accept: "application/json", "User-Agent": "RadarLicitacoes/1.0" },
          signal: AbortSignal.timeout(5000),
        },
      );
      if (compRes.ok) {
        const dComp = await compRes.json();
        const u = dComp.unidadeOrgao || dComp.unidadeSubrogada || {};
        const cod = u.codigoUnidade || dComp.codigoUnidadeCompradora || "";
        const nom = u.nomeUnidade || dComp.nomeUnidadeCompradora || "";
        if (cod || nom) {
          unidadeCompradora = `${cod ? `UASG ${cod} - ` : ""}${nom || ""}`.trim();
        }
      }
    } catch {
      // Ignora falha de consulta direta
    }

    // Se itens vieram vazios do banco, tenta buscar direto na API do PNCP
    if (itens.length === 0) {
      try {
        const pncpItensRes = await fetch(
          `https://pncp.gov.br/api/pncp/v1/orgaos/${cnpj}/compras/${ano}/${sequencial}/itens?pagina=1&tamanhoPagina=100`,
          {
            headers: { Accept: "application/json", "User-Agent": "RadarLicitacoes/1.0" },
            signal: AbortSignal.timeout(5000),
          },
        );
        if (pncpItensRes.ok) {
          const pncpItensData = await pncpItensRes.json();
          const list = Array.isArray(pncpItensData)
            ? pncpItensData
            : Array.isArray(pncpItensData?.data)
              ? pncpItensData.data
              : [];
          if (list.length > 0) {
            itens = list.map((it: any) => ({
              numeroItem: it.numeroItem ?? null,
              titulo: it.descricao ?? it.descricaoItem ?? it.especificacao ?? it.titulo ?? null,
              descricao: it.descricao ?? it.descricaoItem ?? it.especificacao ?? it.titulo ?? null,
              quantidade: typeof it.quantidade === "number" ? it.quantidade : null,
              unidade: it.unidadeMedida ?? null,
              valorUnitario:
                typeof it.valorUnitarioEstimado === "number" ? it.valorUnitarioEstimado : null,
              valorTotal: typeof it.valorTotal === "number" ? it.valorTotal : null,
            }));
          }
        }
      } catch (err) {
        console.warn("[source] Falha na consulta de itens PNCP direta:", err);
      }
    }

    // Se documentos vieram vazios, tenta buscar na API de arquivos do PNCP
    if (documentos.length === 0) {
      try {
        const pncpDocsRes = await fetch(
          `https://pncp.gov.br/api/pncp/v1/orgaos/${cnpj}/compras/${ano}/${sequencial}/arquivos?pagina=1&tamanhoPagina=50`,
          {
            headers: { Accept: "application/json", "User-Agent": "RadarLicitacoes/1.0" },
            signal: AbortSignal.timeout(5000),
          },
        );
        if (pncpDocsRes.ok) {
          const pncpDocsData = await pncpDocsRes.json();
          const list = Array.isArray(pncpDocsData)
            ? pncpDocsData
            : Array.isArray(pncpDocsData?.data)
              ? pncpDocsData.data
              : [];
          if (list.length > 0) {
            documentos = list.map((doc: any) => ({
              id: doc.sequencialDocumento ?? doc.id,
              sequencial: doc.sequencialDocumento ?? null,
              titulo: doc.titulo ?? doc.tipoDocumentoNome ?? "Documento",
              tipoNome: doc.tipoDocumentoNome ?? null,
              url: doc.url ?? `https://pncp.gov.br/api/pncp/v1/orgaos/${cnpj}/compras/${ano}/${sequencial}/arquivos/${doc.sequencialDocumento}`,
              dataPublicacao: doc.dataPublicacaoPncp ?? null,
            }));
          }
        }
      } catch (err) {
        console.warn("[source] Falha na consulta de documentos PNCP direta:", err);
      }
    }
  }

  // Se itens continuam vazios mas temos quantidadeItens ou valorEstimado da licitacao,
  // ou se itens não foram cadastrados separadamente, criamos o Item Geral / Objeto Principal
  if (itens.length === 0 && (licitacao.resumo || licitacao.titulo)) {
    itens = [
      {
        numeroItem: 1,
        titulo: licitacao.titulo,
        descricao: licitacao.resumo ?? licitacao.titulo,
        quantidade: licitacao.quantidadeItens ?? 1,
        unidade: "UN",
        valorUnitario: licitacao.valorEstimado,
        valorTotal: licitacao.valorEstimado,
      },
    ];
  }

  // Se documentos continuam vazios e temos linkPncp ou linkSistemaOrigem,
  // fornecemos o Edital e Anexos oficiais referenciados
  if (documentos.length === 0) {
    if (licitacao.linkPncp) {
      documentos.push({
        titulo: "Edital e Anexos (Página Oficial PNCP)",
        tipoNome: "Edital / Anexos",
        url: licitacao.linkPncp,
        dataPublicacao: licitacao.dataPublicacao,
      });
    }
    if (licitacao.linkSistemaOrigem) {
      documentos.push({
        titulo: `Acesso no ${licitacao.portalNome ?? "Sistema de Origem"}`,
        tipoNome: "Portal de Disputa",
        url: licitacao.linkSistemaOrigem,
        dataPublicacao: licitacao.dataPublicacao,
      });
    }
  }

  return {
    licitacao,
    itens,
    documentos,
    unidadeCompradora,
  };
}

/** Extrai CNPJ, Ano e Sequencial do número de controle PNCP ou linkPncp */
function parsePncpControlNumber(
  numeroControle: string,
  linkPncp?: string | null,
): { cnpj: string; ano: string; sequencial: string } | null {
  // Padrão 1: 13230982000150-1-000107/2023 ou 13230982000150-1-107/2023
  const matchCtrl = (numeroControle || "").match(/^(\d{14})-[0-9]+-(\d+)\/(\d{4})/);
  if (matchCtrl) {
    const [, cnpj, seqRaw, ano] = matchCtrl;
    const sequencial = String(parseInt(seqRaw, 10)); // sem zeros à esquerda
    return { cnpj, ano, sequencial };
  }

  // Padrão 2: linkPncp ex: https://pncp.gov.br/app/editais/13230982000150/2023/107
  if (linkPncp) {
    const matchLink = linkPncp.match(/(?:editais|compras)\/(\d{14})\/(\d{4})\/(\d+)/);
    if (matchLink) {
      const [, cnpj, ano, seqRaw] = matchLink;
      const sequencial = String(parseInt(seqRaw, 10));
      return { cnpj, ano, sequencial };
    }
  }

  return null;
}

/** Facetas dinâmicas: quais UFs / modalidades / portais existem nas abertas agora. */
export async function getFacets(): Promise<Facets> {
  const now = new Date().toISOString();
  const base = `data_encerramento=gte.${encodeURIComponent(now)}&limit=1000`;

  const [ufsRes, modsRes, portalsRes] = await Promise.all([
    supabaseGet("pncp_licitacoes", new URLSearchParams(`select=uf&${base}&uf=not.is.null`)),
    supabaseGet(
      "pncp_licitacoes",
      new URLSearchParams(`select=modalidade_id,modalidade_nome&${base}&modalidade_id=not.is.null`),
    ),
    supabaseGet(
      "pncp_licitacoes",
      new URLSearchParams(`select=portal_key,portal_nome&${base}&portal_key=not.is.null`),
    ),
  ]);

  const safeJson = async (r: Response) => (r.ok ? ((await r.json()) as any[]) : []);
  const [ufs, mods, portals] = await Promise.all([safeJson(ufsRes), safeJson(modsRes), safeJson(portalsRes)]);

  const uniq = <T,>(arr: T[], key: (t: T) => string) => {
    const m = new Map<string, T>();
    for (const x of arr) m.set(key(x), x);
    return [...m.values()];
  };

  return {
    ufs: uniq(ufs.filter((u) => u.uf), (u) => u.uf)
      .map((u) => u.uf as string)
      .sort(),
    modalidades: uniq(mods.filter((m) => m.modalidade_id), (m) => String(m.modalidade_id))
      .map((m) => ({ id: m.modalidade_id as number, nome: m.modalidade_nome as string }))
      .sort((a, b) => a.id - b.id),
    portais: uniq(portals.filter((p) => p.portal_key), (p) => p.portal_key)
      .map((p) => ({ key: p.portal_key as string, nome: (p.portal_nome as string) ?? p.portal_key }))
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
  };
}

/** Sugestões de municípios para autocomplete (deduplicadas). */
export async function getMunicipios(uf: string | undefined, q: string): Promise<string[]> {
  const params = new URLSearchParams();
  params.set("select", "municipio");
  params.set("data_encerramento", `gte.${new Date().toISOString()}`);
  params.set("municipio", "not.is.null");
  if (uf) params.append("uf", `eq.${uf.toUpperCase()}`);
  if (q) params.append("municipio", `ilike.${ilike(q)}`);
  params.set("limit", "300");

  const res = await supabaseGet("pncp_licitacoes", params);
  if (!res.ok) return [];
  const rows = (await res.json()) as any[];
  const set = new Set<string>();
  for (const r of rows) if (r.municipio) set.add(r.municipio as string);
  return [...set].sort((a, b) => a.localeCompare(b, "pt-BR")).slice(0, 40);
}
