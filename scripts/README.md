# Scripts

## Seed do contrato Eddydata

Os itens do contrato **Eddydata** (projeto de implantação da solução de gestão de contratos) são carregados a partir de `dados-eddydata.json`.

- **No deploy (Railway):** o script `seed-eddydata.js` roda automaticamente no startup do container. O contrato "Eddydata" é criado (se não existir) e os itens de `dados-eddydata.json` são inseridos ou atualizados.
- **Localmente:** use `DATABASE_URL="sua_url" npm run db:seed-eddydata` para rodar só o seed do Eddydata.

### Formato de `dados-eddydata.json`

Array de objetos com:

- `numero`: número/código do item (ex.: "1.0", "1.1.1") — aparece na descrição.
- `descricao`: texto do requisito/item.
- `categoria`: opcional (ex.: "Front-end", "Back-end") — vai para observação.
- `valor`: opcional (ex.: esforço ou peso).

Para incluir novos itens ou alterar textos, edite `dados-eddydata.json` e faça um novo deploy (ou rode o script localmente com a `DATABASE_URL` de produção).
