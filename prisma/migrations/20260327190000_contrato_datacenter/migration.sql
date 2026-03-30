-- Tipo de contrato (software vs datacenter) e recursos de infraestrutura

CREATE TYPE "TipoContrato" AS ENUM ('SOFTWARE', 'DATACENTER');

ALTER TABLE "contratos" ADD COLUMN "tipo_contrato" "TipoContrato" NOT NULL DEFAULT 'SOFTWARE';

CREATE TABLE "contratos_datacenter" (
    "id" TEXT NOT NULL,
    "contrato_id" TEXT NOT NULL,
    "vcpus_contratados" DECIMAL(14,4),
    "ram_gb" DECIMAL(18,4),
    "disco_ssd_gb" DECIMAL(18,4),
    "disco_backup_gb" DECIMAL(18,4),
    "rack_u" DECIMAL(10,4),
    "observacoes" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contratos_datacenter_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "contratos_datacenter_contrato_id_key" ON "contratos_datacenter"("contrato_id");

ALTER TABLE "contratos_datacenter" ADD CONSTRAINT "contratos_datacenter_contrato_id_fkey" FOREIGN KEY ("contrato_id") REFERENCES "contratos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "contratos_links_metropolitanos" (
    "id" TEXT NOT NULL,
    "contrato_id" TEXT NOT NULL,
    "descricao_velocidade" VARCHAR(200) NOT NULL,
    "velocidade_mbps" INTEGER,
    "quantidade" INTEGER NOT NULL DEFAULT 1,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contratos_links_metropolitanos_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "contratos_links_metropolitanos_contrato_id_idx" ON "contratos_links_metropolitanos"("contrato_id");

ALTER TABLE "contratos_links_metropolitanos" ADD CONSTRAINT "contratos_links_metropolitanos_contrato_id_fkey" FOREIGN KEY ("contrato_id") REFERENCES "contratos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
