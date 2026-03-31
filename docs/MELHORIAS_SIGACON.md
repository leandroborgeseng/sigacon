# LeX – Análise e melhorias para um sistema realmente útil e funcional

Documento gerado a partir da análise do código e do modelo de dados. As sugestões estão organizadas por impacto e esforço.

---

## 1. Melhorias de uso no dia a dia (alta prioridade)

### 1.1 Pendências: cadastrar e alterar pela tela
- **Hoje:** Só existe listagem de pendências e link para o item. A API permite criar (POST) e alterar (PATCH), mas não há tela para isso.
- **Sugestão:**
  - Na **detalhe do item** (aba Pendências): botão **“Nova pendência”** abrindo um formulário (descrição, responsável, prazo, status, origem, tipo). Ao salvar, chamar `POST /api/pendencias` e atualizar a lista.
  - Na mesma aba (ou na listagem de pendências): permitir **editar** (descrição, responsável, prazo, status) e **concluir** pendência, usando `PATCH /api/pendencias/[id]`.
- **Benefício:** Resolver e acompanhar pendências sem sair do contexto do item ou da lista.

### 1.2 Contratos: editar e (opcional) encerrar
- **Hoje:** Contrato tem apenas criação (dialog) e visualização (detalhe). Existe `PATCH /api/contratos/[id]`, mas não há tela de edição.
- **Sugestão:**
  - Na **página de detalhe do contrato**: botão **“Editar”** abrindo um formulário (nome, número, fornecedor, vigência, valor, status, gestor, observações) que chama o PATCH. Reaproveitar o mesmo schema do create dialog.
  - Opcional: **“Encerrar contrato”** (alterar status para ENCERRADO) com confirmação.
- **Benefício:** Ajustar dados do contrato e encerrar quando não for mais vigente.

### 1.3 Itens contratuais: filtro “Com pendência”
- **Hoje:** A API de itens já aceita `comPendencia=true` (itens com pelo menos uma pendência ABERTA), mas a **ItensTable** não expõe esse filtro.
- **Sugestão:** No topo da listagem de itens, adicionar um **checkbox ou toggle “Somente com pendência”** que, quando marcado, envia `comPendencia=true` na requisição.
- **Benefício:** Foco rápido nos itens que exigem ação.

### 1.4 Pendencias: filtros e “limpar”
- **Hoje:** Listagem única (todas as pendências), sem filtro por contrato, status ou vencidas.
- **Sugestão:**
  - Filtros: **Contrato**, **Status** (Aberta, Em andamento, Concluída, Vencida), opção **“Só vencidas”**.
  - Exibir **“Filtros aplicados”** (como no dashboard) com badges e botão **“Limpar filtros”**.
- **Benefício:** Encontrar pendências por contrato ou por situação e limpar filtros de forma clara.

### 1.5 Anexos / evidências no item
- **Hoje:** Na aba “Evidências” do item só há listagem (nome, tipo, data). Não há upload pela aplicação (modelo Anexo existe e tem `urlArquivo`).
- **Sugestão:**
  - Botão **“Enviar evidência”** na aba Evidências: upload de arquivo (PDF, imagens), tipo (evidência cumprimento/descumprimento, etc.), descrição opcional.
  - Salvar arquivo no filesystem ou em storage (S3/Storage) e gravar registro em `Anexo` com `itemId` e `urlArquivo`.
- **Benefício:** Centralizar provas de cumprimento/descumprimento no próprio item.

---

## 2. Relatórios e exportação (média prioridade)

### 2.1 Exportar listagem de itens (Excel/CSV)
- **Hoje:** Nenhuma exportação.
- **Sugestão:** Na tela **Itens Contratuais**, botão **“Exportar”** que gera planilha (XLSX ou CSV) com as colunas visíveis (contrato, módulo, número, descrição, status, pendências, etc.), respeitando filtros e paginação (ou “exportar tudo” com limite razoável).
- **Benefício:** Análise em Excel e compartilhamento com outras áreas.

### 2.2 Relatório resumido por contrato (PDF ou tela)
- **Sugestão:** Na **detalhe do contrato** (ou no dashboard ao filtrar por contrato), botão **“Relatório”** que gera um resumo: dados do contrato, totais de itens por status, percentual de conclusão, pendências abertas/vencidas, últimas medições. Pode ser só uma tela de impressão (window.print) ou geração de PDF no backend.
- **Benefício:** Documento único para reuniões e auditoria.

### 2.3 Dashboard: período e comparação
- **Hoje:** Indicadores e valores são “mês atual” e totais.
- **Sugestão:** Filtro opcional de **competência (mês/ano)** para ver indicadores e valores de um mês passado; opcionalmente, “comparar com mês anterior” (variação de percentual e valor).
- **Benefício:** Acompanhamento histórico e tendências.

---

## 3. UX e consistência (média prioridade)

### 3.1 Breadcrumb em todas as telas
- **Hoje:** Várias páginas já usam `<Breadcrumb>`; garantir que todas as páginas do dashboard tenham breadcrumb (Dashboard, Contratos, Contrato X, Módulos, Módulo Y, Itens, Item Z, Pendências, Medição, Atas, Importação).
- **Benefício:** Navegação clara e “voltar” mental.

### 3.2 Mensagens de sucesso e erro
- **Hoje:** Muitas ações (salvar item, criar contrato, etc.) só fazem `router.refresh()` ou redirecionam, sem toast ou aviso.
- **Sugestão:** Usar um sistema de **toast** (ex.: sonner ou Radix Toast) para “Salvo com sucesso”, “Pendência criada”, “Erro ao salvar” após formulários e ações.
- **Benefício:** Feedback imediato e confiança no uso.

### 3.3 Confirmação em ações destrutivas
- **Hoje:** Exclusão de módulo usa `window.confirm`.
- **Sugestão:** Padronizar com um **AlertDialog** (shadcn) para “Excluir contrato?”, “Excluir módulo?”, “Encerrar contrato?”, com botões “Cancelar” e “Excluir”/“Encerrar”.
- **Benefício:** Menos risco de exclusão acidental e UX mais consistente.

### 3.4 Paginação e “total de itens”
- **Hoje:** Itens já têm paginação; outras listagens (contratos, módulos, pendências, atas) carregam tudo de uma vez.
- **Sugestão:** Se o volume crescer, adicionar paginação (ou “carregar mais”) em Contratos, Módulos, Pendências e Atas; manter sempre visível o “Total: X itens” (ou equivalente).
- **Benefício:** Performance e clareza em bases grandes.

---

## 4. Segurança e perfil (média prioridade)

### 4.1 Usar permissões nas APIs e na UI
- **Hoje:** `lib/permissions.ts` define `canEditContract`, `canEditItems`, `canCloseMedicao`, etc., mas as rotas da API não checam perfil; a UI não esconde botões por perfil.
- **Sugestão:**
  - Em cada `PATCH`/`POST`/`DELETE` relevante, verificar o perfil (ex.: só GESTOR pode editar contrato; só AVALIADOR pode alterar status de item e criar pendência).
  - Na interface: desabilitar ou ocultar “Editar”, “Excluir”, “Nova pendência”, “Fechar medição” conforme o perfil do usuário logado.
- **Benefício:** Contratos e itens protegidos conforme papel (Leitor, Avaliador, Gestor, Admin).

### 4.2 Tela de usuários (admin)
- **Hoje:** Só existe um usuário (seed admin); não há CRUD de usuários nem tela “Usuários”.
- **Sugestão:** Para perfil ADMIN: menu **“Usuários”**, listagem (nome, e-mail, perfil, ativo) e formulário para criar/editar usuário (senha apenas na criação ou “alterar senha”).
- **Benefício:** Múltiplos usuários e papéis no mesmo ambiente.

---

## 5. Funcionalidades adicionais (expandir depois)

- **Alertas no dashboard:** Destaque para “X pendências vencidas”, “Contrato Y com percentual abaixo de Z%”, “Vigência do contrato W termina em 30 dias”.
- **Medição:** Na tela de medição mensal, permitir “recalcular” a medição do mês a partir dos status atuais dos itens (já existe lógica em `server/services/medicao.ts`); botão “Fechar medição” com confirmação.
- **Atas:** Edição da ata (hoje só criação e listagem/detalhe); vínculo explícito com medição quando aplicável.
- **Contrato:** Campo “Próxima data de revisão” ou “Alertar em” e exibir no dashboard ou em lista.
- **Itens:** Histórico de alterações de status (já existe `AvaliacaoItem` e auditoria); exibir linha do tempo “Item passou de INCONCLUSIVO → ATENDE em dd/mm” na aba de histórico/auditoria do item.

---

## 6. Resumo sugerido de ordem de implementação

| Ordem | Melhoria                                      | Impacto   | Esforço |
|-------|-----------------------------------------------|-----------|--------|
| 1     | Pendências: criar/editar na tela do item      | Alto      | Médio   |
| 2     | Contratos: editar (e opcional encerrar)        | Alto      | Baixo   |
| 3     | Itens: filtro “Somente com pendência”        | Alto      | Baixo   |
| 4     | Pendências: filtros + “Filtros aplicados”    | Médio     | Baixo   |
| 5     | Toast em ações (sucesso/erro)                 | Médio     | Baixo   |
| 6     | Anexos: upload de evidência no item           | Alto      | Médio   |
| 7     | Exportar itens (XLSX/CSV)                     | Médio     | Médio   |
| 8     | Permissões nas APIs e na UI                   | Alto      | Médio   |
| 9     | Confirmação (AlertDialog) em exclusões        | Médio     | Baixo   |
| 10    | Dashboard: competência (mês/ano)              | Médio     | Médio   |

Com isso, o sistema fica mais **usável** (criar/editar pendências e contratos na tela), **visível** (filtros e filtros aplicados), **confiável** (feedback e confirmações) e **preparado** para múltiplos usuários e relatórios.
