-- Configuração GLPI persistida e vínculo contrato ↔ grupos técnicos

CREATE TABLE "glpi_config" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "base_url" VARCHAR(2000),
    "app_token" TEXT,
    "user_token" TEXT,
    "campo_busca_grupo_tecnico" INTEGER NOT NULL DEFAULT 71,
    "criterios_extra_json" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "glpi_config_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "contratos_glpi_grupos_tecnicos" (
    "id" TEXT NOT NULL,
    "contrato_id" TEXT NOT NULL,
    "glpi_group_id" INTEGER NOT NULL,
    "nome" VARCHAR(500),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contratos_glpi_grupos_tecnicos_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "contratos_glpi_grupos_tecnicos_contrato_id_glpi_group_id_key" ON "contratos_glpi_grupos_tecnicos"("contrato_id", "glpi_group_id");

CREATE INDEX "contratos_glpi_grupos_tecnicos_glpi_group_id_idx" ON "contratos_glpi_grupos_tecnicos"("glpi_group_id");

CREATE INDEX "contratos_glpi_grupos_tecnicos_contrato_id_idx" ON "contratos_glpi_grupos_tecnicos"("contrato_id");

ALTER TABLE "contratos_glpi_grupos_tecnicos" ADD CONSTRAINT "contratos_glpi_grupos_tecnicos_contrato_id_fkey" FOREIGN KEY ("contrato_id") REFERENCES "contratos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
