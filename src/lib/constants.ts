export const UFS = [
  "AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT",
  "PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO",
] as const;

/** Modalidades conforme Lei 14.133/2021 (códigos oficiais PNCP). */
export const MODALIDADES = [
  { id: 6, nome: "Pregão - Eletrônico" },
  { id: 7, nome: "Pregão - Presencial" },
  { id: 4, nome: "Concorrência - Eletrônica" },
  { id: 5, nome: "Concorrência - Presencial" },
  { id: 8, nome: "Dispensa" },
  { id: 9, nome: "Inexigibilidade" },
  { id: 1, nome: "Leilão - Eletrônico" },
  { id: 13, nome: "Leilão - Presencial" },
  { id: 12, nome: "Credenciamento" },
  { id: 11, nome: "Pré-qualificação" },
  { id: 15, nome: "Chamada pública" },
  { id: 3, nome: "Concurso" },
  { id: 2, nome: "Diálogo Competitivo" },
] as const;

/** Sistemas fonte (portais de disputa) observados no payload do Atlas/PNCP. */
export const PORTAIS = [
  { key: "comprasnet", nome: "ComprasNet", cor: "#38bdf8" },
  { key: "bll-compras", nome: "BLL Compras", cor: "#a78bfa" },
  { key: "bnc", nome: "BNC", cor: "#f472b6" },
  { key: "licitanet", nome: "Licitanet", cor: "#fb923c" },
  { key: "portal-compras-publicas", nome: "Portal de Compras Públicas", cor: "#34d399" },
  { key: "licitacoes-e", nome: "Licitações-e (BB)", cor: "#facc15" },
  { key: "petronect", nome: "Petronect", cor: "#22d3ee" },
  { key: "compras-minas-gerais", nome: "Compras MG", cor: "#4ade80" },
  { key: "pe-integrado", nome: "PE Integrado", cor: "#e879f9" },
  { key: "compras-bahia", nome: "Compras Bahia", cor: "#f87171" },
  { key: "compras-rs", nome: "Compras RS", cor: "#93c5fd" },
  { key: "compras-rj", nome: "Compras RJ", cor: "#fda4af" },
  { key: "compras-recife", nome: "Compras Recife", cor: "#fdba74" },
  { key: "banrisul", nome: "Banrisul", cor: "#67e8f9" },
  { key: "sistema-s", nome: "Transparência SESI/SENAI", cor: "#bef264" },
  { key: "sebrae", nome: "Sebrae", cor: "#c4b5fd" },
  { key: "outros-pncp", nome: "Outros Portais", cor: "#94a3b8" },
] as const;

export const PORTAL_COR: Record<string, string> = Object.fromEntries(
  PORTAIS.map((p) => [p.key, p.cor]),
);

/** Presets de prazo de encerramento (em dias a partir de hoje). */
export const PRESETS_PRAZO = [
  { label: "Hoje", dias: 0 },
  { label: "48h", dias: 2 },
  { label: "7 dias", dias: 7 },
  { label: "15 dias", dias: 15 },
  { label: "30 dias", dias: 30 },
] as const;

export const PAGE_SIZE = 24;
