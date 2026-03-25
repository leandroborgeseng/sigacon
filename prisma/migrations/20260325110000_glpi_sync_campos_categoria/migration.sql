-- Expand GLPI ticket mirror with categorization and sync control fields
ALTER TABLE "glpi_chamados"
ADD COLUMN "categoria_id_glpi" INTEGER,
ADD COLUMN "categoria_nome" VARCHAR(500),
ADD COLUMN "grupo_tecnico_id_glpi" INTEGER,
ADD COLUMN "grupo_tecnico_nome" VARCHAR(500),
ADD COLUMN "tecnico_responsavel_id_glpi" INTEGER,
ADD COLUMN "tecnico_responsavel_nome" VARCHAR(500),
ADD COLUMN "ultimo_pull_em" TIMESTAMP(3),
ADD COLUMN "ultimo_push_em" TIMESTAMP(3),
ADD COLUMN "sync_status" VARCHAR(30),
ADD COLUMN "sync_erro" TEXT;

CREATE INDEX "glpi_chamados_data_modificacao_idx" ON "glpi_chamados"("data_modificacao");
