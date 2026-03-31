-- Licenças de software no contrato datacenter + consumo mensal para faturamento

CREATE TABLE "contratos_datacenter_licencas_software" (
    "id" TEXT NOT NULL,
    "contrato_id" TEXT NOT NULL,
    "nome" VARCHAR(200) NOT NULL,
    "quantidade_maxima" DECIMAL(18,4),
    "valor_unitario_mensal" DECIMAL(18,4),
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contratos_datacenter_licencas_software_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "medicoes_datacenter_consumo_itens" (
    "id" TEXT NOT NULL,
    "medicao_mensal_id" TEXT NOT NULL,
    "item_previsto_id" TEXT NOT NULL,
    "quantidade_usada" DECIMAL(18,4) NOT NULL DEFAULT 0,

    CONSTRAINT "medicoes_datacenter_consumo_itens_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "medicoes_datacenter_consumo_licencas" (
    "id" TEXT NOT NULL,
    "medicao_mensal_id" TEXT NOT NULL,
    "licenca_id" TEXT NOT NULL,
    "quantidade_usada" DECIMAL(18,4) NOT NULL DEFAULT 0,

    CONSTRAINT "medicoes_datacenter_consumo_licencas_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "contratos_datacenter_licencas_software_contrato_id_idx" ON "contratos_datacenter_licencas_software"("contrato_id");

ALTER TABLE "contratos_datacenter_licencas_software" ADD CONSTRAINT "contratos_datacenter_licencas_software_contrato_id_fkey" FOREIGN KEY ("contrato_id") REFERENCES "contratos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "medicoes_datacenter_consumo_itens_medicao_mensal_id_idx" ON "medicoes_datacenter_consumo_itens"("medicao_mensal_id");

CREATE UNIQUE INDEX "medicoes_datacenter_consumo_itens_medicao_mensal_id_item_previsto_id_key" ON "medicoes_datacenter_consumo_itens"("medicao_mensal_id", "item_previsto_id");

ALTER TABLE "medicoes_datacenter_consumo_itens" ADD CONSTRAINT "medicoes_datacenter_consumo_itens_medicao_mensal_id_fkey" FOREIGN KEY ("medicao_mensal_id") REFERENCES "medicoes_mensais"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "medicoes_datacenter_consumo_itens" ADD CONSTRAINT "medicoes_datacenter_consumo_itens_item_previsto_id_fkey" FOREIGN KEY ("item_previsto_id") REFERENCES "contratos_datacenter_itens_previstos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "medicoes_datacenter_consumo_licencas_medicao_mensal_id_idx" ON "medicoes_datacenter_consumo_licencas"("medicao_mensal_id");

CREATE UNIQUE INDEX "medicoes_datacenter_consumo_licencas_medicao_mensal_id_licenca_id_key" ON "medicoes_datacenter_consumo_licencas"("medicao_mensal_id", "licenca_id");

ALTER TABLE "medicoes_datacenter_consumo_licencas" ADD CONSTRAINT "medicoes_datacenter_consumo_licencas_medicao_mensal_id_fkey" FOREIGN KEY ("medicao_mensal_id") REFERENCES "medicoes_mensais"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "medicoes_datacenter_consumo_licencas" ADD CONSTRAINT "medicoes_datacenter_consumo_licencas_licenca_id_fkey" FOREIGN KEY ("licenca_id") REFERENCES "contratos_datacenter_licencas_software"("id") ON DELETE CASCADE ON UPDATE CASCADE;
