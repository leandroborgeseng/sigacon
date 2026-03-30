-- Alinha tipos às 8 linhas do edital de serviços de datacenter (ex.: contrato objeto 1.2).
-- 1) vCPU passa a nome explícito de locação de processador VPS.
-- 2) Linha legada "link metropolitano" unifica com conectividade fibra quando não há duplicata.

ALTER TYPE "TipoRecursoDatacenter" RENAME VALUE 'VCPU' TO 'LOCACAO_PROCESSADOR_VPS';

UPDATE "contratos_datacenter_itens_previstos" AS t
SET tipo = 'CONECTIVIDADE_FIBRA_OPTICA'
WHERE t.tipo::text = 'LINK_METROPOLITANO'
  AND NOT EXISTS (
    SELECT 1
    FROM "contratos_datacenter_itens_previstos" AS x
    WHERE x.contrato_id = t.contrato_id
      AND x.tipo::text = 'CONECTIVIDADE_FIBRA_OPTICA'
  );
