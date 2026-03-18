# SIGACON – Sistema de Gestão e Acompanhamento Contratual

Sistema para acompanhamento de contratos administrativos, com foco em contratos públicos de software, tecnologia e serviços. Permite medição mensal, acompanhamento de requisitos do edital, avaliação por módulo, cálculo proporcional do valor a pagar e trilha de auditoria.

## Stack

- **Next.js 15** (App Router)
- **TypeScript**
- **PostgreSQL**
- **Prisma ORM**
- **Tailwind CSS** + **shadcn/ui** (Radix)
- **TanStack Table**, **React Hook Form**, **Zod**, **Recharts**
- Autenticação própria (email/senha, sessão em cookie httpOnly, bcrypt)

## Pré-requisitos

- Node.js 20+
- PostgreSQL
- npm ou yarn

## Instalação local

```bash
# Clone e entre na pasta
cd gestao_de_contratos

# Instale as dependências (use --legacy-peer-deps se houver conflito de peer)
npm install
# ou: npm install --legacy-peer-deps

# Configure o ambiente
cp .env.example .env
# Edite .env e preencha DATABASE_URL e SESSION_SECRET (mín. 32 caracteres)
```

### Variáveis de ambiente (.env)

| Variável         | Descrição |
|------------------|-----------|
| `DATABASE_URL`   | URL de conexão PostgreSQL (ex.: `postgresql://user:pass@localhost:5432/sigacon`) |
| `SESSION_SECRET` | Chave para sessão (gere com `openssl rand -base64 32`) |
| `PORT`           | Porta do servidor (opcional; padrão 3000) |
| `NEXT_PUBLIC_APP_URL` | URL base da aplicação (opcional) |
| `GLPI_URL`, `GLPI_APP_TOKEN`, `GLPI_USER_TOKEN` | Opcional: API REST do GLPI (`/api/integracao/glpi/ticket?id=`) |

## Banco de dados

```bash
# Criar banco e aplicar migrações
npm run db:migrate

# Seed (usuário admin inicial)
npm run db:seed
```

**Usuário inicial (trocar em produção):**

- **E-mail:** `admin@sigacon.local`
- **Senha:** `admin123`

Em produção, altere a senha do admin imediatamente após o primeiro acesso.

## Executando localmente

```bash
# Desenvolvimento
npm run dev

# Build e start (produção local)
npm run build
npm start
```

Acesse: `http://localhost:3000`. Redirecionamento: raiz → login ou dashboard conforme sessão.

## Deploy no Railway

### 1. Projeto e PostgreSQL

1. Crie um projeto no [Railway](https://railway.app).
2. Adicione o serviço **PostgreSQL**.
3. Copie a `DATABASE_URL` das variáveis do serviço PostgreSQL.

### 2. Deploy do app

1. Conecte o repositório GitHub ao Railway.
2. Adicione um novo serviço a partir do repositório (monorepo: selecione a pasta do app, se aplicável).
3. Nas variáveis do serviço, defina:
   - `DATABASE_URL` (geralmente injetada ao vincular o PostgreSQL)
   - `SESSION_SECRET` (gere com `openssl rand -base64 32`)
   - Opcional: `NEXT_PUBLIC_APP_URL` = URL do app no Railway (ex.: `https://seu-app.up.railway.app`)

4. O Railway usa o **Dockerfile** do repositório. O build:
   - Instala dependências
   - Gera o Prisma Client
   - Gera o build Next.js em modo `standalone`

5. O comando de start (no Dockerfile ou em **railway.json**) executa:
   - `npx prisma migrate deploy`
   - `node server.js`

6. A porta é definida pela variável `PORT` que o Railway define automaticamente.

### Deploy automático via GitHub

- Com a conexão GitHub ativa, cada push na branch configurada dispara um novo build e deploy.
- Garanta que `DATABASE_URL` e `SESSION_SECRET` estejam configurados nas variáveis do serviço no Railway.

### Checklist antes de testar em produção

1. `npm run build` sem erros localmente.
2. Aplicar schema no banco: `npx prisma migrate deploy` (ou `db push` só se não usar migrações formais).
3. `SESSION_SECRET` forte e único no ambiente de produção.
4. Trocar senha do usuário admin inicial.
5. Conferir logs do servidor se o dashboard ficar vazio (erros aparecem como `[dashboard] indicadores:` no console).

## Medição mensal e valor devido

- O sistema considera apenas **itens válidos** (não cabeçalho e “considerar na medição” ativo).
- No MVP, todos os itens válidos têm **peso igual** (percentual por item = 100 / total de itens válidos).
- **Percentual cumprido no mês** = (itens com status ATENDE na competência) / total de itens válidos.
- **Valor mensal de referência** = valor anual do contrato / 12.
- **Valor devido no mês** = valor mensal de referência × (percentual cumprido / 100).
- **Valor glosado** = valor mensal de referência − valor devido no mês.

O histórico de medições fica salvo por contrato/competência (ano/mês).

## Estrutura principal

- `prisma/` – schema e seed
- `src/app/` – rotas (auth, dashboard, contratos, módulos, itens, pendências, medições, atas, importação) e API
- `src/components/` – UI (shadcn), layout, e componentes por domínio
- `src/lib/` – prisma, auth, session, permissions, validators, finance, utils
- `src/server/` – services (audit, medicao, indicators), storage, importers

## Scripts úteis

| Script        | Descrição                    |
|---------------|------------------------------|
| `npm run dev` | Servidor de desenvolvimento   |
| `npm run build` | Gera Prisma + build Next.js |
| `npm start`   | Inicia o app (standalone)     |
| `npm run db:migrate` | Migrações em dev      |
| `npm run db:deploy`  | Migrações em produção |
| `npm run db:seed`    | Executa o seed        |
| `npm run db:studio`  | Abre Prisma Studio   |

## Observações

- **PostgreSQL** é obrigatório; não use SQLite em produção.
- Anexos no MVP usam armazenamento em memória; a estrutura está preparada para trocar por S3/R2/MinIO no futuro.
- A aplicação não depende de filesystem persistente para dados definitivos; uploads são processados de forma compatível com Railway.
