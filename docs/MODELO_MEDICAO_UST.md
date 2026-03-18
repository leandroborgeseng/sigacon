# Modelo de medição: UST + catálogo + checklist

## Visão

- **Checklist (itens contratuais):** já existente na **Medição mensal** — percentual e valor proporcional por competência.
- **UST:** atividades com **UST fixa** por tipo (catálogo auditável). Cada lançamento exige **evidência** (ID ticket GLPI, URL ou descrição ≥10 caracteres; opcional anexo).
- **Catálogo de serviços:** por contrato — nome, unidade (UST, hora, unidade, fornecimento), valor unitário, SLA, forma de comprovação.

## Valores a pagar

- **Checklist:** `valorDevidoMes` (já calculado).
- **UST:** soma dos `valorMonetario` dos lançamentos do mês (congelado no registro).
- **Consolidado:** `valorTotalConsolidadoMes` = checklist + UST (atualizado ao recalcular medição ou ao alterar lançamentos).

Preço UST:

- Se o lançamento referencia um **serviço do catálogo**, usa a regra da unidade (ex.: UST → `totalUst × valorUnitario`; fornecimento → `quantidade × valorUnitario`).
- Senão, usa **`valorUnitarioUst`** do contrato × `totalUst`.

## GLPI

Hoje: campo **ID do ticket** + URL manual. Integração API (sincronização automática) pode usar `GLPI_BASE_URL` + token em variáveis de ambiente em evolução futura.

## Catálogo de serviços (UST fixa)

O seed carrega as seções **4.1 a 4.11** (Manutenção Corretiva/Evolutiva, BI, Integrações, BD, DevOps, Documentação, Testes SERPRO, Segurança, UX, Sustentação), cada linha com **complexidade** (Baixa/Média/Alta) e **UST** conforme contrato-tipo.

## Deploy (Railway)

Após `prisma db push`, rodar **seed** para criar/atualizar o catálogo UST.

Tabelas removidas em relação ao modelo antigo: pontos/função (`tipos_funcao_customizacao`, `tarefas_customizacao`). Coluna removida: `horas_por_ponto`. Novas: `valor_unitario_ust`, catálogo, lançamentos UST, campos na `medicoes_mensais`.
