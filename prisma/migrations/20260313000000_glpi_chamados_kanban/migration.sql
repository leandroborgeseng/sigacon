-- CreateEnum
CREATE TYPE "GlpiKanbanColuna" AS ENUM ('BACKLOG', 'EM_ANDAMENTO', 'AGUARDANDO', 'RESOLVIDO', 'FECHADO');

-- CreateTable
CREATE TABLE "glpi_chamados" (
    "id" TEXT NOT NULL,
    "glpi_ticket_id" INTEGER NOT NULL,
    "contrato_id" TEXT,
    "fornecedor_nome" VARCHAR(500),
    "titulo" TEXT NOT NULL,
    "conteudo_preview" TEXT,
    "urgencia" INTEGER,
    "prioridade" INTEGER,
    "status_glpi" INTEGER NOT NULL,
    "status_label" VARCHAR(160),
    "coluna_kanban" "GlpiKanbanColuna" NOT NULL,
    "data_abertura" TIMESTAMP(3),
    "data_modificacao" TIMESTAMP(3),
    "sincronizado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "glpi_chamados_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "glpi_chamados_glpi_ticket_id_key" ON "glpi_chamados"("glpi_ticket_id");

-- CreateIndex
CREATE INDEX "glpi_chamados_contrato_id_idx" ON "glpi_chamados"("contrato_id");

-- CreateIndex
CREATE INDEX "glpi_chamados_coluna_kanban_idx" ON "glpi_chamados"("coluna_kanban");

-- CreateIndex
CREATE INDEX "glpi_chamados_fornecedor_nome_idx" ON "glpi_chamados"("fornecedor_nome");

-- AddForeignKey
ALTER TABLE "glpi_chamados" ADD CONSTRAINT "glpi_chamados_contrato_id_fkey" FOREIGN KEY ("contrato_id") REFERENCES "contratos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
