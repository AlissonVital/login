# Site Modelo — Sistema de Autenticação

Sistema web de autenticação pronto para reutilizar em outros projetos. Front-end em HTML/CSS/JavaScript, API serverless na Vercel e PostgreSQL no Neon. Este README descreve o estado **atual** do código (versões descartadas não devem ser usadas) e o passo a passo para implantar o mesmo modelo em qualquer site que ainda não tenha login.

**Deploy de referência:** [https://login-seven-flame.vercel.app](https://login-seven-flame.vercel.app)

---

## Visão geral

O modelo oferece:

- Cadastro de usuário (nome, e-mail, senha)
- Login com JWT salvo no `localStorage`
- Sessão validada no servidor (`/api/me`)
- Recuperação de senha por e-mail (link válido por **5 minutos**)
- Tela de nova senha acessível **somente** pelo link do e-mail
- Auditoria básica de acessos no banco
- Index com estados visitante (ENTRAR / CADASTRAR) e logado (primeiro nome + Sair)

Stack atual:

| Camada | Tecnologia |
|--------|------------|
| Front | HTML estático, CSS, JS modules (`type="module"`) |
| API | Funções serverless Vercel em `api/*.js` |
| Libs compartilhadas | `lib/db.js`, `lib/auth.js`, `lib/http.js`, `lib/mail.js` |
| Banco | Neon PostgreSQL (`@neondatabase/serverless`) |
| Senha | `bcryptjs` (custo 12) |
| Sessão | JWT com `jose` (HS256) |
| E-mail | `nodemailer` + SMTP (Gmail App Password no exemplo) |

---

## Estrutura atual do projeto (somente o que vale)

```text
login/
├── api/
│   ├── register.js          # POST cadastro
│   ├── login.js             # POST login → JWT
│   ├── me.js                # GET sessão (Bearer)
│   ├── recover.js           # POST solicita recuperação + e-mail
│   ├── validate-recovery.js # GET valida token (5 min)
│   ├── reset-password.js    # POST redefine senha
│   └── health.js            # GET diagnóstico de config/banco
├── lib/
│   ├── db.js                # getSql() via DATABASE_URL
│   ├── auth.js              # JWT create/verify + firstName
│   ├── http.js              # CORS, JSON, validação, mapServerError
│   └── mail.js              # token, URL, SMTP
├── js/
│   ├── api.js               # fetch /api/*
│   ├── auth.js              # localStorage token/user
│   ├── ui.js                # modais, toggle senha
│   ├── index.js
│   ├── cadastro.js
│   ├── login.js
│   └── recuperacao.js
├── css/styles.css
├── index.html
├── cadastro.html
├── login.html
├── recuperacao.html
├── sql/schema.sql
├── package.json             # "type": "module"
├── vercel.json
├── .env.example
└── .gitignore               # .env nunca vai pro Git
```

Não use pastas antigas como `api/_lib` (foram removidas). O código compartilhado fica em `/lib`.

---

## Telas e comportamento

| Arquivo | Função |
|---------|--------|
| `index.html` | Visitante: título `SITE MODELO!!!` centralizado + botões iguais ENTRAR (verde claro) e CADASTRAR (azul claro) no topo direito. Logado: primeiro nome em negrito/itálico + botão Sair vermelho 3D. |
| `cadastro.html` | Nome, e-mail, senha. E-mail duplicado limpa campos. Sucesso → login. |
| `login.html` | Login + modal “Recuperar senha”. |
| `recuperacao.html` | Nova senha. Só abre com `?token=...` válido e não expirado. |

Fluxo de recuperação:

1. Usuário informa e-mail cadastrado.
2. API gera token hex (32 bytes), salva em `usuarios.recovery_token` com `recovery_token_expires = now + 5 minutes`.
3. E-mail SMTP envia link: `{APP_URL ou host da request}/recuperacao.html?token=...`
4. Ao abrir a página, o front chama `GET /api/validate-recovery?token=...`.
5. Se inválido/expirado/ausente → bloqueia formulário e redireciona ao login.
6. Ao salvar, `POST /api/reset-password` confere expiração de novo, troca `senha_hash`, zera o token.

---

## API

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/register` | Cadastro |
| POST | `/api/login` | Login → `{ token, user }` |
| GET | `/api/me` | Sessão atual (header `Authorization: Bearer ...`) |
| POST | `/api/recover` | Solicita recuperação e envia e-mail |
| GET | `/api/validate-recovery?token=` | Valida link (5 minutos) |
| POST | `/api/reset-password` | Redefine senha |
| GET | `/api/health` | Checa env + tabelas |

Respostas usam JSON no formato `{ ok: true|false, error?, code?, ... }`.

Códigos úteis: `EMAIL_EXISTS`, `EMAIL_NOT_FOUND`, `WRONG_PASSWORD`, `EMAIL_NOT_SENT`, `TOKEN_MISSING`, `TOKEN_INVALID`, `TOKEN_EXPIRED`, `PASSWORD_MISMATCH`, `MISSING_DATABASE_URL`, `SCHEMA_MISSING`, `DB_CONNECTION`.

---

## Banco de dados

Arquivo: `sql/schema.sql`

Tabelas:

- `usuarios` — `id`, `nome`, `email` (unique), `senha_hash`, `recovery_token`, `recovery_token_expires`, `status` (`ativo`/`inativo`/`suspenso`), `login_attempts`, `last_login`, timestamps
- `auditoria_acessos` — `usuario_id`, `acao`, `ip_address`, `user_agent`, `created_at`

Ações de auditoria usadas: `cadastro`, `login_sucesso`, `login_falha`, `recuperacao_solicitada`, `senha_redefinida`.

No Neon SQL Editor, execute o `schema.sql` completo antes do primeiro cadastro.

---

## Variáveis de ambiente

Copie `.env.example` → `.env` (local) e configure as **mesmas chaves** na Vercel → Settings → Environment Variables (Production + Preview).

| Variável | Obrigatória | Função |
|----------|-------------|--------|
| `DATABASE_URL` | Sim | Connection string Neon (`?sslmode=require`) |
| `JWT_SECRET` | Sim | Chave longa e aleatória do JWT |
| `JWT_EXPIRES_HOURS` | Não | Default `24` |
| `APP_URL` | Sim (prod) | URL pública **exata** do site, sem barra final |
| `SMTP_HOST` | Sim (e-mail) | Ex.: `smtp.gmail.com` |
| `SMTP_PORT` | Sim | Ex.: `587` |
| `SMTP_SECURE` | Sim | `false` para 587 |
| `SMTP_USER` | Sim | Conta SMTP remetente |
| `SMTP_PASS` | Sim | Senha de app (Gmail), **não** a senha normal |
| `SMTP_FROM` | Sim | Nome + e-mail exibidos no remetente |
| `DEV_RETURN_RECOVERY_LINK` | Não | `true` só em teste local; em produção `false` |

### Ponto de atenção — e-mail do projeto

Neste modelo de exemplo aparecem:

- `SMTP_USER=alissonferreiravital@gmail.com`
- `SMTP_FROM="Site Modelo <alissonferreiravital@gmail.com>"`

Isso é **apenas de desenvolvimento/teste**. Em qualquer outro projeto ou empresa você **deve trocar** por um e-mail institucional (ou da conta do projeto), por exemplo:

```env
SMTP_USER=noreply@suaempresa.com
SMTP_PASS=sua-senha-de-app-ou-smtp
SMTP_FROM="Nome do Projeto <noreply@suaempresa.com>"
```

Onde alterar:

1. Arquivo local `.env`
2. Variáveis na Vercel (e Redeploy)
3. Assunto/textos em `lib/mail.js` (hoje: “Site Modelo”)
4. Textos de marca no HTML/CSS (`SITE MODELO!!!`, títulos das páginas)

Se usar Gmail pessoal só para testes: ative 2FA e crie [Senha de app](https://myaccount.google.com/apppasswords). Em produção, prefira domínio próprio (Google Workspace, Microsoft 365, Resend, SendGrid, etc.).

### Ponto de atenção — `APP_URL`

Use o domínio real do deploy, por exemplo:

```env
APP_URL=https://login-seven-flame.vercel.app
```

**Não** use placeholders como `https://login.vercel.app`. Link errado gera 404 na recuperação. O código atual também tenta montar a URL pelo host da requisição (`resolveAppUrl`), mas `APP_URL` correta continua importante como fallback.

### Ponto de atenção — chaves do `localStorage`

Em `js/auth.js` as chaves são `site_modelo_token` e `site_modelo_user`. Em outro projeto, renomeie para evitar conflito entre sites no mesmo domínio/navegador.

---

## Passo a passo: implementar este modelo em outro projeto pronto

Use esta sequência quando o projeto destino **ainda não tem autenticação**.

### 1) Decidir a hospedagem

O front estático sozinho (ex.: GitHub Pages) **não** executa `api/`. Para manter o modelo igual, hospede na **Vercel** (ou equivalente com Node serverless). Se o projeto já está em outra stack (Next, Express, etc.), adapte as rotas de `api/` para o runtime daquele stack, mantendo a mesma lógica.

### 2) Copiar os arquivos do modelo

Para um site HTML semelhante, copie:

- pastas `api/`, `lib/`, `js/`, `css/` (ou só as partes de auth/UI)
- páginas `login.html`, `cadastro.html`, `recuperacao.html`
- ajuste `index.html` (ou a home do projeto) para os estados visitante/logado
- `sql/schema.sql`, `package.json` (dependências), `vercel.json`, `.env.example`

Dependências necessárias:

```json
"@neondatabase/serverless": "^0.10.4",
"bcryptjs": "^2.4.3",
"jose": "^5.9.6",
"nodemailer": "^6.9.16"
```

`package.json` deve ter `"type": "module"`.

### 3) Criar o banco no Neon

1. Crie um projeto no Neon.
2. Crie o database (ex.: `modelo_login` ou o nome do seu projeto).
3. Copie a connection string com `sslmode=require`.
4. No SQL Editor, rode `sql/schema.sql`.
5. Confirme existência das tabelas `usuarios` e `auditoria_acessos`.

### 4) Configurar e-mail SMTP do **projeto/empresa**

1. Defina a conta remetente oficial (não reutilize e-mail pessoal de exemplo).
2. Gere credencial SMTP (senha de app ou API key do provedor).
3. Preencha `SMTP_*` e `SMTP_FROM` com a marca do projeto.
4. Edite textos do e-mail em `lib/mail.js` (assunto e corpo).

### 5) Gerar segredos

```bash
# exemplo
openssl rand -base64 48
```

Use o resultado em `JWT_SECRET`. Nunca committe `.env`.

### 6) Ajustar marca e rotas do front

- Troque “Site Modelo” / `SITE MODELO!!!` pelo nome do produto.
- Garanta que links apontem para as páginas certas do projeto destino.
- Em `js/api.js`, `API_BASE` permanece `'/api'` se front e API estiverem no mesmo domínio Vercel.
- Proteja páginas internas: no carregamento, chame `/api/me` com o token; se falhar, redirecione ao login.

### 7) Variáveis na Vercel

Cadastre todas as variáveis da tabela acima. Depois:

1. Faça deploy / Redeploy.
2. Teste `GET /api/health` → deve retornar `ok: true`.
3. Cadastre um usuário de teste.
4. Faça login.
5. Teste recuperação e abra o link do e-mail (domínio correto + validade 5 min).

### 8) Checklist de atenção ao reutilizar

- [ ] E-mail `alissonferreiravital@gmail.com` **removido** e substituído pelo e-mail do projeto/empresa
- [ ] `SMTP_FROM` com nome da marca correta
- [ ] `APP_URL` = URL real do deploy (sem barra final)
- [ ] `DEV_RETURN_RECOVERY_LINK=false` em produção
- [ ] `JWT_SECRET` novo e forte (não copie o de outro projeto)
- [ ] Schema SQL executado no banco do **novo** projeto
- [ ] Chaves `localStorage` renomeadas se necessário
- [ ] Textos/CSS de marca atualizados
- [ ] `.env` no `.gitignore`
- [ ] Após mudar env na Vercel, sempre Redeploy

---

## Configuração local (opcional)

```bash
cp .env.example .env
# edite .env
npm install
npx vercel dev
```

---

## Segurança (regras atuais do modelo)

- Senha nunca é salva em texto puro (`senha_hash` com bcrypt).
- Credenciais do banco e SMTP só em variáveis de ambiente.
- Token de recuperação de uso único prático: após reset ou expiração, campos são limpos.
- Link de recuperação expira em 5 minutos (banco + validação na abertura da página + validação no submit).
- JWT no `localStorage` (simples para front estático; em apps mais sensíveis, considere cookie HttpOnly).
- CORS liberado com `*` neste modelo; em produção corporativa, restrinja origens se necessário.

---

## Diagnóstico rápido

| Sintoma | Causa provável | Ação |
|---------|----------------|------|
| Cadastro 500 “Erro ao cadastrar” | Env/banco/tabelas | Abra `/api/health` e confira Vercel + schema |
| E-mail de recuperação não chega | SMTP vazio/errado | Confira `SMTP_*` e senha de app; veja spam |
| Link do e-mail dá 404 | `APP_URL` errada | Use o domínio real do projeto e Redeploy |
| “Link expirado” | Passou de 5 min | Solicite novo link |
| Login ok, home sem nome | Token/user no storage | Confira `js/auth.js` e resposta de `/api/login` |

---

## Contexto para outra IA (copiar e colar)

Se for pedir ajuda a outra IA (ex.: [Qwen Chat](https://chat.qwen.ai/)) para portar este modelo a outro projeto, envie o texto da seção abaixo junto com o README e, se possível, os arquivos atuais de `api/`, `lib/`, `js/` e `sql/schema.sql`.

> Você vai ajudar a implementar, em um projeto já existente sem autenticação, o mesmo modelo de login/cadastro/recuperação usado no repositório “login-modelo” (deploy de referência https://login-seven-flame.vercel.app). Stack alvo do modelo: HTML/CSS/JS estático + API serverless Vercel (`api/*.js` com `export default async function handler`) + libs em `/lib` + Neon PostgreSQL + bcryptjs + jose (JWT HS256) + nodemailer. Front chama sempre `/api/...` via `js/api.js`. Sessão: JWT e user no localStorage (`site_modelo_token`, `site_modelo_user`). Cadastro: POST `/api/register` com nome/email/senha (senha mín. 6, hash bcrypt 12). Login: POST `/api/login` devolve token + user com `primeiroNome`. Sessão: GET `/api/me` com Bearer. Recuperação: POST `/api/recover` gera token hex, grava `recovery_token` e `recovery_token_expires = now()+5 minutes`, monta URL com host da request (`resolveAppUrl`) para `/recuperacao.html?token=...`, envia e-mail SMTP; GET `/api/validate-recovery` bloqueia página se token ausente/inválido/expirado (e limpa token expirado); POST `/api/reset-password` exige senha==confirmar, revalida expiração, atualiza hash e zera token. Há `/api/health` para diagnosticar env/tabelas. Schema em `sql/schema.sql` com tabelas `usuarios` e `auditoria_acessos`. Variáveis: DATABASE_URL, JWT_SECRET, JWT_EXPIRES_HOURS, APP_URL, SMTP_HOST/PORT/SECURE/USER/PASS/FROM, DEV_RETURN_RECOVERY_LINK. No exemplo de desenvolvimento SMTP_USER/FROM usam alissonferreiravital@gmail.com — em qualquer projeto real isso DEVE ser trocado pelo e-mail da empresa/projeto. APP_URL deve ser a URL pública exata do deploy (nunca login.vercel.app). Em produção DEV_RETURN_RECOVERY_LINK=false. Não reutilize código antigo de `api/_lib`; use apenas `/lib`. Objetivo: adaptar este modelo ao meu projeto destino, preservando a lógica de segurança e apontando claramente o que personalizar (marca, e-mail SMTP, APP_URL, chaves localStorage, schema no banco do projeto).
