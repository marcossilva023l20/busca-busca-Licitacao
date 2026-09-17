# Guia completo: GitHub + Hospedagem

> **Duas versões do app:**
>
> 1. **`docs/index.html` — versão 100% estática** (um único arquivo, sem back-end).
>    Funciona até com duplo clique, no GitHub Pages, Netlify Drop etc. Busca os dados
>    direto do navegador na fonte pública (CORS aberto). Favoritos e buscas salvas
>    ficam no `localStorage` do navegador (sem sincronizar entre dispositivos).
>    → veja a **Opção A** abaixo.
>
> 2. **Versão fullstack** (Next.js + PostgreSQL na raiz do projeto). Precisa de
>    hospedagem com Node — GitHub Pages **não** serve. → veja a **Opção B**.

---

## Opção A — Versão estática no GitHub Pages (a mais fácil)

O arquivo `docs/index.html` já está no repositório. Depois do `git push`:

1. No GitHub, abra o repositório → **Settings** → **Pages** (menu lateral)
2. Em **Source**, escolha **Deploy from a branch**
3. Em **Branch**: selecione `main` e a pasta **`/docs`** → **Save**
4. Aguarde ~1 minuto. O site fica em:
   `https://SEU-USUARIO.github.io/radar-licitacoes/`

Sem variáveis de ambiente, sem banco, sem build. Pronto.

**Alternativas ainda mais rápidas para o arquivo `docs/index.html`:**

| Serviço | Como |
|---|---|
| **Netlify Drop** | Arraste o arquivo em [app.netlify.com/drop](https://app.netlify.com/drop) |
| **Vercel** | `npx vercel docs` na pasta do projeto |
| **Cloudflare Pages** | Upload direto do arquivo |
| **Local** | Basta abrir o `index.html` no navegador (funciona offline de back-end — as APIs externas são públicas) |

---

## Opção B — Versão fullstack (Vercel + Neon)

---

## Passo 1 — Criar o repositório no GitHub

O código já está commitado localmente (git inicializado). Falta enviar:

1. Acesse [github.com/new](https://github.com/new)
2. Nome do repositório: `radar-licitacoes` · visibilidade: sua escolha · **não** marque
   "Add README" (já existe um)
3. Clique em **Create repository**
4. No terminal do projeto, rode (substituindo `SEU-USUARIO`):

```bash
git remote add origin https://github.com/SEU-USUARIO/radar-licitacoes.git
git branch -M main
git push -u origin main
```

Pronto — o código estará no GitHub.

> ⚠️ O arquivo `.env` **não** é enviado (está no `.gitignore`). Seus segredos ficam fora
> do repositório. O `.env.example` vai no lugar, como referência.

---

## Passo 2 — Criar o banco PostgreSQL na nuvem (Neon, grátis)

1. Acesse [neon.tech](https://neon.tech) e crie uma conta (login com GitHub funciona)
2. Clique em **New Project** → nome: `radar-licitacoes` → região: qualquer uma
3. Copie a **connection string** exibida, no formato:
   `postgresql://usuario:senha@ep-xxxxx.sa-east-1.aws.neon.tech/neondb?sslmode=require`
4. No seu computador, crie as tabelas nesse banco:

```bash
cp .env.example .env
# edite o .env e cole a connection string do Neon em DATABASE_URL
npx drizzle-kit push
```

Isso cria as tabelas `saved_searches` e `favorites`.

---

## Passo 3 — Hospedar na Vercel (grátis, integra com GitHub)

1. Acesse [vercel.com/new](https://vercel.com/new) e entre com sua conta do GitHub
2. Clique em **Import** no repositório `radar-licitacoes`
3. A Vercel detecta Next.js automaticamente — não mude nada em Build Settings
4. Em **Environment Variables**, adicione:

| Nome | Valor |
|---|---|
| `DATABASE_URL` | a connection string do Neon (Passo 2) |
| `ATLAS_SUPABASE_URL` | `https://kkudnnbuzljloenwcjsa.supabase.co` |
| `ATLAS_SUPABASE_ANON_KEY` | a chave pública que está em `.env.example` |

5. Clique em **Deploy** → em ~2 minutos seu site estará no ar em
   `https://radar-licitacoes.vercel.app` (dá para trocar o nome ou ligar um domínio próprio)

### Daí em diante é automático

Cada `git push` na branch `main` dispara um novo deploy sozinho. Cada Pull Request gera
uma URL de preview separada.

---

## Alternativas à Vercel (se preferir)

| Plataforma | Como funciona | Plano grátis |
|---|---|---|
| **Render** | Cria um "Web Service" a partir do repo com `npm run build && npm run start`, e tem Postgres gerenciado | Sim (app hiberna sem uso) |
| **Railway** | Deploy do repo + Postgres como serviço interno | Créditos mensais |
| **Netlify** | Suporta Next.js via plugin oficial | Sim |
| **VPS (Hetzner/DigitalOcean)** | `git clone` + `npm run build` + `pm2 start npm -- start` + nginx | Pago (~US$ 5/mês) |

Em todas: configure `DATABASE_URL` + as variáveis `ATLAS_*` e rode
`npx drizzle-kit push` uma vez contra o banco de produção.

---

## Checklist final

- [ ] `git push` para o GitHub feito
- [ ] Banco Neon criado + `drizzle-kit push` executado
- [ ] Env vars configuradas na Vercel (`DATABASE_URL`, `ATLAS_SUPABASE_URL`, `ATLAS_SUPABASE_ANON_KEY`)
- [ ] Deploy concluído + home respondendo
- [ ] Testar: buscar com filtro de UF + sistema fonte e favoritar uma licitação

## Problemas comuns

- **"DATABASE_URL is required"** → a env não foi configurada na Vercel (Project → Settings → Environment Variables) e é preciso fazer **Redeploy**
- **Favoritos/buscas salvas dão erro 500** → faltou rodar `npx drizzle-kit push` contra o banco de produção
- **Busca de licitações retorna dados, mas sem "sistema fonte"** → entrou no fallback da API oficial do PNCP (a base Atlas pode estar instável); volta sozinho
