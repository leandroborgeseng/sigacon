CREATE INDEX "glpi_chamados_status_glpi_data_modificacao_idx" ON "glpi_chamados"("status_glpi", "data_modificacao");
CREATE INDEX "glpi_chamados_titulo_idx" ON "glpi_chamados"("titulo");
CREATE INDEX "glpi_chamados_tecnico_responsavel_nome_idx" ON "glpi_chamados"("tecnico_responsavel_nome");
