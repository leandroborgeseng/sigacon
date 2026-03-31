-- Módulo de projetos com tarefas opcionais vinculadas a chamados GLPI

CREATE TYPE "StatusProjeto" AS ENUM ('NAO_INICIADO', 'EM_ANDAMENTO', 'CONCLUIDO', 'BLOQUEADO');

CREATE TABLE "projetos" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "status" "StatusProjeto" NOT NULL DEFAULT 'NAO_INICIADO',
    "inicio_previsto" TIMESTAMP(3),
    "fim_previsto" TIMESTAMP(3),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projetos_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "projetos_tarefas" (
    "id" TEXT NOT NULL,
    "projeto_id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "status" "StatusProjeto" NOT NULL DEFAULT 'NAO_INICIADO',
    "responsavel" VARCHAR(200),
    "prazo" TIMESTAMP(3),
    "glpi_chamado_id" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projetos_tarefas_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "projetos_tarefas_projeto_id_idx" ON "projetos_tarefas"("projeto_id");
CREATE INDEX "projetos_tarefas_glpi_chamado_id_idx" ON "projetos_tarefas"("glpi_chamado_id");

ALTER TABLE "projetos_tarefas" ADD CONSTRAINT "projetos_tarefas_projeto_id_fkey" FOREIGN KEY ("projeto_id") REFERENCES "projetos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "projetos_tarefas" ADD CONSTRAINT "projetos_tarefas_glpi_chamado_id_fkey" FOREIGN KEY ("glpi_chamado_id") REFERENCES "glpi_chamados"("id") ON DELETE SET NULL ON UPDATE CASCADE;
