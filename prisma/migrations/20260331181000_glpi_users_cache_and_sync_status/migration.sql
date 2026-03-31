CREATE TABLE "glpi_usuarios_cache" (
  "id" INTEGER NOT NULL,
  "nome" VARCHAR(500) NOT NULL,
  "nome_busca" VARCHAR(500) NOT NULL,
  "ativo" BOOLEAN NOT NULL DEFAULT true,
  "atualizado_glpi_em" TIMESTAMP(3),
  "sincronizado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "glpi_usuarios_cache_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "glpi_usuarios_cache_nome_busca_idx" ON "glpi_usuarios_cache"("nome_busca");
CREATE INDEX "glpi_usuarios_cache_ativo_idx" ON "glpi_usuarios_cache"("ativo");

CREATE TABLE "glpi_sync_status" (
  "chave" TEXT NOT NULL,
  "ultimo_inicio_em" TIMESTAMP(3),
  "ultimo_fim_em" TIMESTAMP(3),
  "ultimo_sucesso_em" TIMESTAMP(3),
  "ultimo_erro" TEXT,
  "ultimo_processados" INTEGER NOT NULL DEFAULT 0,
  "ultimo_erros_contagem" INTEGER NOT NULL DEFAULT 0,
  "ultima_duracao_ms" INTEGER,
  "atualizado_em" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "glpi_sync_status_pkey" PRIMARY KEY ("chave")
);
