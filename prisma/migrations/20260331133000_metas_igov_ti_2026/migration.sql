-- Metas iGOV-TI / IEGM 2026 com desdobramentos e vínculo a chamados GLPI

CREATE TYPE "StatusMeta" AS ENUM ('NAO_INICIADA', 'EM_ANDAMENTO', 'CONCLUIDA', 'BLOQUEADA');

CREATE TABLE "metas_planejamento" (
    "id" TEXT NOT NULL,
    "ano" INTEGER NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "contexto_origem" TEXT,
    "status" "StatusMeta" NOT NULL DEFAULT 'NAO_INICIADA',
    "prazo" TIMESTAMP(3),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "metas_planejamento_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "metas_desdobramentos" (
    "id" TEXT NOT NULL,
    "meta_id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "responsavel" VARCHAR(200),
    "status" "StatusMeta" NOT NULL DEFAULT 'NAO_INICIADA',
    "percentual_concluido" INTEGER NOT NULL DEFAULT 0,
    "prazo_inicio" TIMESTAMP(3),
    "prazo_fim" TIMESTAMP(3),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "metas_desdobramentos_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "metas_desdobramentos_glpi_chamados" (
    "id" TEXT NOT NULL,
    "desdobramento_id" TEXT NOT NULL,
    "glpi_chamado_id" TEXT NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "metas_desdobramentos_glpi_chamados_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "metas_planejamento_ano_idx" ON "metas_planejamento"("ano");
CREATE INDEX "metas_desdobramentos_meta_id_idx" ON "metas_desdobramentos"("meta_id");
CREATE INDEX "metas_desdobramentos_glpi_chamados_glpi_chamado_id_idx" ON "metas_desdobramentos_glpi_chamados"("glpi_chamado_id");

CREATE UNIQUE INDEX "metas_desdobramentos_glpi_chamados_desdobramento_id_glpi_chamado_id_key" ON "metas_desdobramentos_glpi_chamados"("desdobramento_id", "glpi_chamado_id");

ALTER TABLE "metas_desdobramentos" ADD CONSTRAINT "metas_desdobramentos_meta_id_fkey" FOREIGN KEY ("meta_id") REFERENCES "metas_planejamento"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "metas_desdobramentos_glpi_chamados" ADD CONSTRAINT "metas_desdobramentos_glpi_chamados_desdobramento_id_fkey" FOREIGN KEY ("desdobramento_id") REFERENCES "metas_desdobramentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "metas_desdobramentos_glpi_chamados" ADD CONSTRAINT "metas_desdobramentos_glpi_chamados_glpi_chamado_id_fkey" FOREIGN KEY ("glpi_chamado_id") REFERENCES "glpi_chamados"("id") ON DELETE CASCADE ON UPDATE CASCADE;
