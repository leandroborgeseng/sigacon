# Deploy no Railway

## Estrutura do banco no repositório

As **informações do banco** (estrutura das tabelas, enums, relações) ficam no repositório em:

- **`prisma/schema.prisma`** – schema único do Prisma (modelos, enums, mapeamentos).

Não é necessário commitar a `DATABASE_URL` nem arquivos `.env` com senha. O Railway preenche a conexão com o Postgres na hora do deploy.

## O que acontece no deploy

1. O Railway faz o build (Dockerfile ou Nixpacks).
2. A imagem inclui o `prisma/schema.prisma` e o CLI do Prisma.
3. No **start** do serviço, o comando que sobe a aplicação executa, em ordem:
   - **`prisma db push`** – aplica o `schema.prisma` no banco (cria/atualiza tabelas e colunas).
   - **Seeds** (se existirem e estiverem no comando).
   - **Início da aplicação** (ex.: `node server.js`).

Ou seja: a cada deploy, o schema que está no GitHub é aplicado no banco do Railway automaticamente. Não é preciso rodar migrações nem `db push` na sua máquina.

## Configuração no Railway

1. **PostgreSQL**
   - Crie um serviço **PostgreSQL** no mesmo projeto (ou use um banco já existente).
   - Vincule esse serviço ao serviço da aplicação (ou use variáveis de referência).

2. **Variável `DATABASE_URL`**
   - Se o Postgres foi adicionado como plugin/link no projeto, o Railway costuma criar a variável **`DATABASE_URL`** automaticamente para o serviço da aplicação.
   - Caso contrário, defina manualmente em **Variables** no painel do serviço da aplicação, no formato:
     ```bash
     DATABASE_URL=postgresql://usuario:senha@host:porta/nome_do_banco?schema=public
     ```
     (os valores corretos aparecem no painel do serviço PostgreSQL.)

3. **Build e start**
   - Se usar o **Dockerfile** do repositório, o build e o start já estão configurados para rodar `prisma db push` antes da aplicação.
   - Se usar **railway.json** com `startCommand`, mantenha esse comando para que o `db push` continue sendo executado no deploy.

## Resumo

| Onde fica | O que é |
|-----------|--------|
| GitHub    | `prisma/schema.prisma` (estrutura do banco) |
| Railway   | `DATABASE_URL` (preenchida pelo link do Postgres ou manualmente) |
| No deploy | `prisma db push` aplica o schema no banco e depois a aplicação sobe |

Assim, as informações do banco vão no repositório (schema) e são aplicadas a partir do deploy da aplicação, sem precisar rodar nada manualmente no seu ambiente.
