export interface Licitacao {
  id: string;
  titulo: string;
  resumo: string | null;
  orgao: string | null;
  uf: string | null;
  municipio: string | null;
  modalidadeId: number | null;
  modalidadeNome: string | null;
  modoDisputa: string | null;
  portalKey: string | null;
  portalNome: string | null;
  status: string | null;
  srp: boolean;
  orcamentoSigiloso: boolean;
  valorEstimado: number | null;
  dataAbertura: string | null;
  dataPublicacao: string | null;
  dataEncerramento: string | null;
  linkPncp: string | null;
  linkSistemaOrigem: string | null;
  slug: string | null;
  esfera: string | null;
  quantidadeItens: number | null;
}

export interface LicitacaoItem {
  numeroItem: number | null;
  titulo: string | null;
  descricao: string | null;
  quantidade: number | null;
  unidade: string | null;
  valorUnitario: number | null;
  valorTotal: number | null;
}

export interface LicitacaoDocumento {
  id?: string | number | null;
  sequencial?: number | null;
  titulo: string;
  tipoNome?: string | null;
  url?: string | null;
  dataPublicacao?: string | null;
}

export interface LicitacaoDetail {
  licitacao: Licitacao;
  itens: LicitacaoItem[];
  documentos: LicitacaoDocumento[];
  unidadeCompradora?: string | null;
  uasg?: string | null;
}

export interface SearchResult {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  items: Licitacao[];
  source: "atlas" | "pncp";
}

export interface Facets {
  ufs: string[];
  modalidades: { id: number; nome: string }[];
  portais: { key: string; nome: string }[];
}

export interface FilterState {
  q: string;
  uf: string;
  municipio: string;
  modalidades: number[];
  portais: string[];
  encerramentoDe: string; // yyyy-mm-dd ou ""
  encerramentoAte: string;
  valorMin: string;
  valorMax: string;
  sort: "encerramento_asc" | "encerramento_desc" | "valor_desc" | "publicacao_desc";
}

export const EMPTY_FILTERS: FilterState = {
  q: "",
  uf: "",
  municipio: "",
  modalidades: [],
  portais: [],
  encerramentoDe: "",
  encerramentoAte: "",
  valorMin: "",
  valorMax: "",
  sort: "encerramento_asc",
};
