# Radar·Licitações

Buscador de licitações públicas brasileiras em tempo real, construído sobre as mesmas
fontes de dados descobertas por engenharia reversa no site atlaslicitacoes.com:

- Base pública `pncp_licitacoes` (Supabase/PostgREST do Atlas Licitações)
- Fallback automático na API pública oficial do **PNCP** (`pncp.gov.br/api/search`)

## Funcionalidades

- Filtro por **fim do recebimento de propostas** (período + atalhos Hoje/48h/7d/15d/30d),
  com contagem regressiva e semáforo de urgência em cada card
- Filtro por **UF** e **município** (autocompletar)
- Filtro por **modalidade** (Lei 14.133/2021: Pregão Eletrônico, Dispensa, Concorrência…)
- Filtro por **sistema fonte**: ComprasNet, BLL Compras, BNC, Licitanet, Portal de
  Compras Públicas, Licitações-e e outros
- Busca por palavra-chave, faixa de valor estimado, 4 ordenações
- Detalhe da licitação com itens do edital + links para PNCP e sistema de origem
- **Favoritos** e **buscas salvas** (persistidos em PostgreSQL via Drizzle ORM)
- Exportação CSV da página de resultados

## Stack

Next.js 16 (App Router) · React 19 · Tailwind CSS 4 · Framer Motion · Lucide Icons ·
Drizzle ORM · PostgreSQL

## Rodar localmente

```bash
npm install
cp .env.example .env        # edite DATABASE_URL apontando para seu Postgres
npx drizzle-kit push        # cria as tabelas no banco
npm run dev                 # http://localhost:3000
```

## Deploy

**Caminho fácil (recomendado):** há uma versão 100% estática em **`docs/index.html`** —
basta ativar o GitHub Pages apontando para a pasta `/docs` (Settings → Pages → Branch
`main` → pasta `/docs`). Sem banco, sem env vars, sem build.

**Versão fullstack** (com favoritos/buscas salvas em PostgreSQL): Vercel + Neon.
Passo a passo completo das duas opções em [`DEPLOY.md`](DEPLOY.md).
