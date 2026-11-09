# Site Modelo — Sistema de Autenticação

Sistema web de autenticação com HTML, CSS e JavaScript no front-end, API serverless na Vercel e PostgreSQL (Neon).

## Telas

| Arquivo | Função |
|---------|--------|
| `index.html` | Página inicial (botões Entrar/Cadastrar ou primeiro nome logado) |
| `cadastro.html` | Registro de usuário |
| `login.html` | Autenticação + recuperação de senha |
| `recuperacao.html` | Redefinição de senha via link (válido por 5 minutos) |

## Segurança

- Credenciais do banco **nunca** vão no front-end
- Senhas armazenadas com **bcrypt** (`senha_hash`)
- Sessão com **JWT** no `localStorage`
- Token de recuperação único com expiração de 5 minutos

> **Importante:** a connection string do Neon foi compartilhada em texto puro. **Rotacione a senha do banco no painel da Neon** e atualize `DATABASE_URL`. O arquivo `.env` está no `.gitignore` e não deve ser commitado.

## Configuração

1. Copie o exemplo de variáveis:

```bash
cp .env.example .env
```

2. Preencha no `.env` (e também no painel da Vercel → Settings → Environment Variables):

- `DATABASE_URL` — connection string Neon
- `JWT_SECRET` — chave longa e aleatória
- `APP_URL` — URL pública do site (ex.: `https://seu-projeto.vercel.app`)
- `SMTP_*` — opcional, para envio real de e-mail de recuperação
- `DEV_RETURN_RECOVERY_LINK=true` — em testes, devolve o link na resposta da API

## Deploy na Vercel (recomendado)

O GitHub Pages serve só arquivos estáticos e **não** executa a API. Use a Vercel:

1. Envie o repositório ao GitHub
2. Importe o projeto em [vercel.com](https://vercel.com)
3. Configure as variáveis de ambiente
4. Deploy

A Vercel instala as dependências e publica as funções em `/api/*` junto com as páginas HTML.

### Teste local (opcional)

Se tiver Node.js:

```bash
npm install
npx vercel dev
```

## API

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/register` | Cadastro |
| POST | `/api/login` | Login |
| GET | `/api/me` | Sessão atual (Bearer token) |
| POST | `/api/recover` | Solicita recuperação |
| GET | `/api/validate-recovery?token=` | Valida link (5 minutos) |
| POST | `/api/reset-password` | Redefine senha com token |

## Banco

O schema usado está em `sql/schema.sql` (tabelas `usuarios` e `auditoria_acessos`).
