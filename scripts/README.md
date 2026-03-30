# Scripts

## Seed do contrato Eddydata

### Opção 1: Importar planilha XLSX (recomendado para muitos itens, ex.: 1048)

1. Salve sua planilha como **XLSX** com:
   - **Coluna A:** número do item (1, 2, 3 … ou 1.1, 1.2 …)
   - **Coluna B:** descrição do item
   - **Coluna C:** (opcional) observação ou categoria
   - A primeira linha pode ser cabeçalho (será ignorada).

2. Coloque o arquivo em `scripts/planilha-eddydata.xlsx` ou passe o caminho como argumento.

3. Rode (use a `DATABASE_URL` do Railway ou do seu banco):

   ```bash
   DATABASE_URL="postgresql://..." node scripts/importar-eddydata-xlsx.js
   # ou com caminho explícito:
   DATABASE_URL="postgresql://..." node scripts/importar-eddydata-xlsx.js /caminho/para/sua-planilha.xlsx
   ```

   Ou: `DATABASE_URL="..." npm run db:import-eddydata-xlsx`

O script cria o contrato e o módulo "Requisitos do Projeto" se não existirem e importa todos os itens (criando ou atualizando por número).

### Opção 2: Seed via JSON (poucos itens, deploy automático)

Os itens em `dados-eddydata.json` são carregados **no deploy (Railway)** pelo `seed-eddydata.js`.

- **Localmente:** `DATABASE_URL="sua_url" npm run db:seed-eddydata`

Formato de `dados-eddydata.json`: array com `numero`, `descricao`, `categoria`, `valor`.

## Contrato datacenter — base para medição (8 linhas do edital)

Após aplicar as migrations de datacenter, você pode **ajustar o contrato atual** ou **criar um contrato só de infraestrutura** com as oito categorias previstas (sem obrigar quantidade/valor).

1. **Atualizar um contrato existente pelo ID** (copie o ID na URL `/contratos/[id]`):

   ```bash
   DATABASE_URL="postgresql://..." SEED_CONTRATO_ID="seu_cuid_aqui" node scripts/seed-contrato-datacenter-base.js
   ```

2. **Criar (ou reaproveitar) pelo número** `DC-BASE-MEDICAO-001`:

   ```bash
   DATABASE_URL="postgresql://..." node scripts/seed-contrato-datacenter-base.js
   ```

Opcionais: `SEED_DC_NUMERO`, `SEED_DC_NOME`, `SEED_DC_FORNECEDOR`. O contrato de **software** Eddydata não é alterado por este script, exceto se você passar explicitamente o `SEED_CONTRATO_ID` dele (não recomendado).

**Deploy (Docker/Railway):** após `prisma migrate deploy`, o `docker-start.sh` executa este seed. Defina `SEED_CONTRATO_ID` nas variáveis do ambiente para ajustar um contrato já existente; sem isso, é criado ou atualizado o número `DC-BASE-MEDICAO-001`.
