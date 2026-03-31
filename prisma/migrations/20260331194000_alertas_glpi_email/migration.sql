ALTER TABLE "glpi_usuarios_cache"
  ADD COLUMN "nome_completo" VARCHAR(500),
  ADD COLUMN "login" VARCHAR(255),
  ADD COLUMN "email" VARCHAR(320);

CREATE TYPE "TipoAlertaGlpi" AS ENUM ('SEM_ATRIBUICAO', 'SLA_ESTOURADO');
CREATE TYPE "StatusAlerta" AS ENUM ('ABERTO', 'RESOLVIDO');

CREATE TABLE "config_alerta_glpi" (
  "id" TEXT NOT NULL,
  "ativo" BOOLEAN NOT NULL DEFAULT true,
  "prazo_sla_horas_padrao" INTEGER NOT NULL DEFAULT 48,
  "somente_chamados_abertos" BOOLEAN NOT NULL DEFAULT true,
  "notificar_por_email" BOOLEAN NOT NULL DEFAULT false,
  "atualizado_em" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "config_alerta_glpi_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "alertas_glpi_chamados" (
  "id" TEXT NOT NULL,
  "chamado_id" TEXT NOT NULL,
  "tipo" "TipoAlertaGlpi" NOT NULL,
  "status" "StatusAlerta" NOT NULL DEFAULT 'ABERTO',
  "titulo" VARCHAR(300) NOT NULL,
  "descricao" TEXT,
  "primeira_deteccao_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ultima_deteccao_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvido_em" TIMESTAMP(3),
  "email_enviado_em" TIMESTAMP(3),
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizado_em" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "alertas_glpi_chamados_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "alertas_glpi_chamados_status_tipo_idx" ON "alertas_glpi_chamados"("status", "tipo");
CREATE INDEX "alertas_glpi_chamados_chamado_id_status_idx" ON "alertas_glpi_chamados"("chamado_id", "status");

ALTER TABLE "alertas_glpi_chamados"
  ADD CONSTRAINT "alertas_glpi_chamados_chamado_id_fkey"
  FOREIGN KEY ("chamado_id") REFERENCES "glpi_chamados"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "config_alerta_glpi" ("id", "ativo", "prazo_sla_horas_padrao", "somente_chamados_abertos", "notificar_por_email", "atualizado_em")
VALUES ('default', true, 48, true, false, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
