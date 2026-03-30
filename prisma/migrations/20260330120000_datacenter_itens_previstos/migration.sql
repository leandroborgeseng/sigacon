-- Itens de recurso previstos no contrato datacenter (medição / valor mensal futuro)

CREATE TYPE "TipoRecursoDatacenter" AS ENUM (
  'VCPU',
  'MEMORIA_RAM_GB',
  'DISCO_SSD_RAPIDO_GB',
  'DISCO_BACKUP_GB',
  'COLOCATION_RACK_U',
  'LINK_METROPOLITANO'
);

CREATE TABLE "contratos_datacenter_itens_previstos" (
    "id" TEXT NOT NULL,
    "contrato_id" TEXT NOT NULL,
    "tipo" "TipoRecursoDatacenter" NOT NULL,
    "quantidade_contratada" DECIMAL(18,4),
    "valor_unitario_mensal" DECIMAL(18,4),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contratos_datacenter_itens_previstos_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "contratos_datacenter_itens_previstos_contrato_id_tipo_key" ON "contratos_datacenter_itens_previstos"("contrato_id", "tipo");

CREATE INDEX "contratos_datacenter_itens_previstos_contrato_id_idx" ON "contratos_datacenter_itens_previstos"("contrato_id");

ALTER TABLE "contratos_datacenter_itens_previstos" ADD CONSTRAINT "contratos_datacenter_itens_previstos_contrato_id_fkey" FOREIGN KEY ("contrato_id") REFERENCES "contratos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
