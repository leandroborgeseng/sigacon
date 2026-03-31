import Link from "next/link";

function TocItem({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <a href={href} className="text-primary hover:underline">
        {children}
      </a>
    </li>
  );
}

function Sub({ children }: { children: React.ReactNode }) {
  return <h3 className="mt-5 text-base font-semibold text-foreground">{children}</h3>;
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="mt-2 text-muted-foreground leading-relaxed">{children}</p>;
}

function Ul({ children }: { children: React.ReactNode }) {
  return <ul className="mt-2 list-disc space-y-1.5 pl-5 text-muted-foreground">{children}</ul>;
}

function Li({ children }: { children: React.ReactNode }) {
  return <li className="leading-relaxed">{children}</li>;
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono text-foreground">
      {children}
    </code>
  );
}

/**
 * Manual do SIGACON — referência detalhada alinhada ao código e às telas.
 */
export function ManualSistemaContent() {
  return (
    <div className="manual-prose max-w-4xl space-y-12 text-sm leading-relaxed">
      <nav
        className="rounded-xl border bg-card p-5 shadow-sm"
        aria-label="Sumário do manual"
      >
        <h2 className="text-lg font-semibold border-none pb-0 mb-3">Sumário</h2>
        <ol className="grid gap-1.5 sm:grid-cols-2 text-muted-foreground list-decimal list-inside text-sm marker:text-primary marker:font-medium">
          <TocItem href="#intro">Introdução e conceitos</TocItem>
          <TocItem href="#acesso">Acesso, perfis e permissões</TocItem>
          <TocItem href="#navegacao">Navegação (menu)</TocItem>
          <TocItem href="#dashboard">Dashboard e insights</TocItem>
          <TocItem href="#gestoes">Gestões: contratos, metas e projetos</TocItem>
          <TocItem href="#contratos">Contratos</TocItem>
          <TocItem href="#modulos">Módulos</TocItem>
          <TocItem href="#itens">Itens contratuais</TocItem>
          <TocItem href="#pendencias">Pendências</TocItem>
          <TocItem href="#medicao">Medição mensal (checklist)</TocItem>
          <TocItem href="#ust">UST, catálogo e execução técnica</TocItem>
          <TocItem href="#relatorio">Relatório mensal e exportação XLSX</TocItem>
          <TocItem href="#atas">Atas de reunião</TocItem>
          <TocItem href="#importacao">Importação XLSX</TocItem>
          <TocItem href="#admin">Administração</TocItem>
          <TocItem href="#auditoria">Auditoria e histórico</TocItem>
          <TocItem href="#glpi">GLPI e ambiente</TocItem>
          <TocItem href="#visao-holistica">Visão holística e dados consolidados</TocItem>
          <TocItem href="#alertas-glpi">Alertas GLPI e notificações</TocItem>
          <TocItem href="#glossario">Glossário</TocItem>
        </ol>
      </nav>

      {/* 1 */}
      <section id="intro" className="scroll-mt-24 space-y-2 border-b pb-10">
        <h2 className="text-2xl font-bold tracking-tight">1. Introdução e conceitos</h2>
        <P>
          O <strong className="text-foreground">SIGACON</strong> (Sistema de Gestão e Acompanhamento
          Contratual) centraliza o acompanhamento de <strong>contratos administrativos</strong>,
          especialmente de tecnologia e serviços, alinhado a editais e medições. Dois eixos se
          complementam:
        </P>
        <Ul>
          <Li>
            <strong className="text-foreground">Checklist (itens contratuais):</strong> requisitos do
            edital organizados em módulos e itens, com status de cumprimento. A{" "}
            <strong>medição mensal</strong> calcula percentual e valor proporcional (devido/glosado)
            por competência.
          </Li>
          <Li>
            <strong className="text-foreground">Execução técnica (UST):</strong> serviços medidos em{" "}
            <strong>Unidades de Serviço Técnico</strong>, com catálogo por contrato, tipos de
            atividade (UST fixa) e <strong>evidências obrigatórias</strong> (GLPI, URL ou texto).
            Valores consolidam com o checklist na medição do mês.
          </Li>
        </Ul>
        <P>
          Toda alteração relevante pode gerar registro em <strong>auditoria</strong>. O acesso às
          telas obedece a <strong>perfil</strong> (Leitor, Avaliador, Gestor, Administrador) e à
          matriz <strong>visualizar / editar</strong> por recurso, configurável pelo administrador.
        </P>
      </section>

      {/* 2 */}
      <section id="acesso" className="scroll-mt-24 space-y-2 border-b pb-10">
        <h2 className="text-2xl font-bold tracking-tight">2. Acesso, perfis e permissões</h2>
        <Sub>Login e sessão</Sub>
        <Ul>
          <Li>
            Acesse com <strong>e-mail</strong> e <strong>senha</strong>. A sessão fica em cookie
            httpOnly. Use <strong>Manual</strong> e <strong>Sair</strong> no topo quando terminar.
          </Li>
          <Li>
            Sem sessão, rotas do painel redirecionam para a tela de login.
          </Li>
        </Ul>
        <Sub>Perfis (hierarquia)</Sub>
        <Ul>
          <Li>
            <strong>Leitor:</strong> menor escopo na hierarquia interna; o que pode fazer depende
            quase só das permissões por recurso.
          </Li>
          <Li>
            <strong>Avaliador:</strong> típico para quem atualiza itens e pendências.
          </Li>
          <Li>
            <strong>Gestor:</strong> típico para quem fecha medição, gerencia contrato em nível
            operacional.
          </Li>
          <Li>
            <strong>Administrador:</strong> usuários, perfis, visão admin; costuma ter edição em
            todos os recursos se a matriz permitir.
          </Li>
        </Ul>
        <Sub>Recursos e ações</Sub>
        <P>
          Cada recurso do sistema pode ter duas capacidades independentes no banco de permissões:
        </P>
        <Ul>
          <Li>
            <strong>Visualizar:</strong> abrir a tela/listagens e consultar dados (leitura).
          </Li>
          <Li>
            <strong>Editar:</strong> criar, alterar ou excluir naquele módulo. Só é concedida se
            também puder visualizar o recurso.
          </Li>
        </Ul>
        <P>
          <strong>Recursos controlados:</strong> Dashboard, Contratos, Módulos, Itens contratuais,
          Medição mensal, Atas, Pendências, Importação XLSX, UST &amp; catálogo de serviços,
          Usuários. A configuração fica em <strong>Perfis e permissões</strong> (menu lateral,
          somente admin).
        </P>
        <P>
          Algumas ações extras usam regra por perfil no código: por exemplo,{" "}
          <strong>inativar contrato</strong> costuma restringir a Gestor/Admin;{" "}
          <strong>excluir contrato</strong> costuma ser só Admin. A aba de tipos UST global na
          execução técnica é restrita a <strong>Admin</strong>.
        </P>
      </section>

      {/* 3 */}
      <section id="navegacao" className="scroll-mt-24 space-y-2 border-b pb-10">
        <h2 className="text-2xl font-bold tracking-tight">3. Navegação (menu lateral)</h2>
        <P>
          O menu foi organizado em grupos. Em <strong>Visão geral</strong>, ficam{" "}
          <strong>Dashboard</strong>, <strong>Kanban</strong>, <strong>Metas</strong> e{" "}
          <strong>Projetos</strong>. Em <strong>Contratos e entregas</strong>, ficam contratos,
          módulos, itens, pendências, medições, atas e UST. Os grupos{" "}
          <strong>Dados e apoio</strong>, <strong>Integrações e relatórios</strong> e{" "}
          <strong>Administração</strong> aparecem conforme permissão/perfil.
        </P>
      </section>

      {/* 4 */}
      <section id="dashboard" className="scroll-mt-24 space-y-2 border-b pb-10">
        <h2 className="text-2xl font-bold tracking-tight">4. Dashboard e insights</h2>
        <Sub>Filtro por contrato</Sub>
        <P>
          No topo, selecione <strong>Todos os contratos</strong> ou um contrato ativo. Os números e
          gráficos passam a considerar só o escopo filtrado (itens, módulos, medições do mês atual,
          pendências).
        </P>
        <Sub>Cards principais</Sub>
        <Ul>
          <Li>
            <strong>Contratos ativos</strong> e quantidade de <strong>módulos</strong> no filtro.
          </Li>
          <Li>
            <strong>Itens válidos:</strong> itens com &quot;considerar na medição&quot; e que não são
            cabeçalho; breakdown atendidos / parciais / não atendidos (na prática: Atende, Parcial,
            Não atende + Inconclusivo).
          </Li>
          <Li>
            <strong>Percentual geral:</strong> proporção de itens válidos em status{" "}
            <strong>Atende</strong>. <strong>Pendências abertas</strong> no escopo.
          </Li>
          <Li>
            <strong>Valores (mês atual):</strong> soma do <strong>valor devido</strong> e{" "}
            <strong>glosado</strong> das medições já registradas para o mês corrente; referência
            mensal agregada.
          </Li>
        </Ul>
        <Sub>Gráficos</Sub>
        <Ul>
          <Li>
            <strong>Pizza:</strong> distribuição dos itens válidos por status (Atende, Parcial, Não
            atende, Outros).
          </Li>
          <Li>
            <strong>Barras:</strong> até 10 módulos com percentual de itens &quot;Atende&quot; e
            indício de pendências.
          </Li>
        </Ul>
        <Sub>Insights operacionais</Sub>
        <Ul>
          <Li>
            <strong>Sem medição no mês:</strong> contratos ativos (no filtro) que ainda não têm
            registro de medição na competência atual — link direto para Medição mensal.
          </Li>
          <Li>
            <strong>UST no mês:</strong> quantidade de lançamentos, total de UST e valor em R$;
            atalho para execução técnica.
          </Li>
          <Li>
            <strong>Carteira:</strong> barras horizontais com quantidade de contratos por{" "}
            <strong>status cadastral</strong> (Ativo, Encerrado, Suspenso, etc.).
          </Li>
          <Li>
            <strong>Módulos críticos:</strong> módulos com pelo menos 2 itens e menor % de
            atendimento; links para a ficha do módulo.
          </Li>
        </Ul>
        <Sub>Alertas</Sub>
        <Ul>
          <Li>
            Contratos com <strong>vigência terminando em até 90 dias</strong>.
          </Li>
          <Li>
            Contratos com <strong>teto de UST ou valor UST no ano</strong> em ≥85% ou estourado
            (quando limites estão preenchidos no contrato).
          </Li>
        </Ul>
      </section>

      {/* 4.1 */}
      <section id="gestoes" className="scroll-mt-24 space-y-2 border-b pb-10">
        <h2 className="text-2xl font-bold tracking-tight">4.1 Gestões: contratos, metas e projetos</h2>
        <P>
          O sistema possui três frentes de gestão operacional com alternância direta por botões:
          <strong> Gestão de contratos</strong>, <strong>Gestão de metas</strong> e{" "}
          <strong>Gestão de projetos</strong>.
        </P>
        <Ul>
          <Li>
            <strong>Contratos:</strong> cadastro e acompanhamento administrativo, incluindo visão
            detalhada por tipo de contrato (software e datacenter).
          </Li>
          <Li>
            <strong>Metas:</strong> planejamento anual, desdobramentos, filtros, visão tabela/kanban,
            vínculo com chamados GLPI e exportação CSV/ODS.
          </Li>
          <Li>
            <strong>Projetos:</strong> cadastro de projetos com tarefas, responsável, prazo, status e
            vínculo opcional de cada tarefa com chamado GLPI.
          </Li>
        </Ul>
      </section>

      {/* 5 */}
      <section id="contratos" className="scroll-mt-24 space-y-2 border-b pb-10">
        <h2 className="text-2xl font-bold tracking-tight">5. Contratos</h2>
        <Sub>Listagem</Sub>
        <P>
          Tabela com nome, número, fornecedor, vigência, valor anual, status. Ações <strong>Ver</strong>{" "}
          e <strong>Editar</strong> levam à ficha. Cadastro novo via diálogo na própria listagem
          (permissão de editar contratos).
        </P>
        <Sub>Ficha do contrato</Sub>
        <Ul>
          <Li>
            <strong>Dados resumidos:</strong> objeto, vigência, valores, gestor, total de itens, lei
            de licitação, renovações, data de assinatura.
          </Li>
          <Li>
            <strong>Editar contrato</strong> (diálogo): nome, número, fornecedor, objeto, vigências,
            valor anual, valor mensal de referência, status, gestor, observações, forma de cálculo
            da medição (hoje: peso igual por item), lei, data de assinatura, número de renovações,{" "}
            <strong>valor R$ por UST</strong> (usado quando o lançamento UST não referencia serviço
            do catálogo), <strong>limite de UST no ano</strong> e <strong>limite R$ UST no ano</strong>{" "}
            (opcionais; bloqueiam novos lançamentos que estourariam o teto).
          </Li>
          <Li>
            <strong>Reajustes:</strong> histórico e inclusão (valor anterior/novo, %, índice,
            observação). Alerta se reajuste acumulado em 12 meses ultrapassar 25%.
          </Li>
          <Li>
            <strong>Últimas medições</strong> e <strong>últimas atas</strong> com links.
          </Li>
        </Ul>
        <Sub>Gestão ampliada (abas)</Sub>
        <P>Visível na ficha; edição exige permissão de <strong>editar Contratos</strong>.</P>
        <Ul>
          <Li>
            <strong>Aditivos:</strong> número do aditivo, data de registro, objeto, valores
            anterior/novo, vigências fim anterior e nova, observações.
          </Li>
          <Li>
            <strong>Marcos de implantação:</strong> título, descrição, data prevista, data realizada,
            status (planejado, em andamento, concluído, atrasado), ordem de exibição.
          </Li>
          <Li>
            <strong>Parcelas de pagamento:</strong> competência ano/mês, valor previsto e pago,
            vencimento, pagamento, NF, status (previsto, pago, atrasado, parcial), observação.
          </Li>
        </Ul>
        <Sub>Contratos Datacenter (itens, licenças e consumo mensal)</Sub>
        <Ul>
          <Li>
            É possível cadastrar <strong>itens previstos</strong> com quantidade máxima e valor
            unitário mensal.
          </Li>
          <Li>
            Também é possível cadastrar <strong>licenças de software adicionais</strong>, com
            quantidade máxima e valor unitário mensal por licença.
          </Li>
          <Li>
            Na medição mensal do contrato datacenter, o sistema permite lançar{" "}
            <strong>quantidade usada no mês</strong> para itens e licenças, calculando o faturamento
            datacenter e o valor consolidado.
          </Li>
        </Ul>
        <Sub>Ações e zona de risco</Sub>
        <P>
          Área para <strong>inativar/reativar</strong> contrato e exclusão (conforme perfil). Contrato
          inativo: consulta preservada; edição pode ficar restrita a administrador.
        </P>
        <Sub>Histórico de alterações</Sub>
        <P>
          Lista auditoria de mudanças no cadastro do contrato (criação e atualizações), com data e
          usuário.
        </P>
      </section>

      {/* 6 */}
      <section id="modulos" className="scroll-mt-24 space-y-2 border-b pb-10">
        <h2 className="text-2xl font-bold tracking-tight">6. Módulos</h2>
        <P>
          Cada módulo pertence a <strong>um contrato</strong>, tem nome e flag <strong>ativo</strong>.
          Agrupa itens contratuais conforme a estrutura do edital (ex.: &quot;Infraestrutura&quot;,
          &quot;Desenvolvimento&quot;). Na listagem é possível criar, filtrar por contrato e abrir o
          detalhe do módulo.
        </P>
      </section>

      {/* 7 */}
      <section id="itens" className="scroll-mt-24 space-y-2 border-b pb-10">
        <h2 className="text-2xl font-bold tracking-tight">7. Itens contratuais</h2>
        <P>
          Representam linhas verificáveis do edital. Campos relevantes: descrição, módulo, ordem,
          criticidade, <strong>considerar na medição</strong>, <strong>cabeçalho lógico</strong>{" "}
          (não entra no cálculo), <strong>status atual</strong>.
        </P>
        <Sub>Status e efeito na medição</Sub>
        <Ul>
          <Li>
            <strong>Atende:</strong> conta como cumprido integralmente no percentual do mês.
          </Li>
          <Li>
            <strong>Parcial:</strong> meio ponto no numerador da fórmula de cumprimento.
          </Li>
          <Li>
            <strong>Não atende</strong> e <strong>Inconclusivo:</strong> não cumpridos para efeito
            de percentual.
          </Li>
          <Li>
            <strong>Cabeçalho, Desconsiderado, Não se aplica:</strong> em geral excluídos do conjunto
            de itens válidos da medição.
          </Li>
        </Ul>
        <P>
          Por competência, o sistema pode usar a <strong>última avaliação registrada</strong> naquele
          mês para cada item; na falta dela, usa o <strong>status atual</strong> do item.
        </P>
        <P>
          Na ficha do item: histórico de avaliações, pendências vinculadas e atualização de dados
          conforme permissão de <strong>Itens</strong>.
        </P>
      </section>

      {/* 8 */}
      <section id="pendencias" className="scroll-mt-24 space-y-2 border-b pb-10">
        <h2 className="text-2xl font-bold tracking-tight">8. Pendências</h2>
        <P>
          Registradas por <strong>item contratual</strong>, com tipo, origem, criticidade, prazo,
          status (aberta, em andamento, concluída, etc.) e descrição. Alimentam contadores no
          dashboard e por módulo. Fechamento e acompanhamento dependem de permissão em{" "}
          <strong>Pendências</strong>.
        </P>
      </section>

      {/* 9 */}
      <section id="medicao" className="scroll-mt-24 space-y-2 border-b pb-10">
        <h2 className="text-2xl font-bold tracking-tight">9. Medição mensal (checklist)</h2>
        <Sub>Competência</Sub>
        <P>
          Escolha <strong>contrato</strong>, <strong>ano</strong> e <strong>mês</strong>. O sistema
          calcula ou atualiza o registro único por contrato/competência.
        </P>
        <Sub>Lógica de cálculo (resumo)</Sub>
        <Ul>
          <Li>
            <strong>Itens válidos</strong> = consideram na medição, não cabeçalho, e status não
            excluído (ex.: não entram &quot;não se aplica&quot; da mesma forma que cabeçalho).
          </Li>
          <Li>
            Pontos no numerador: cada <strong>Atende</strong> = 1; cada <strong>Parcial</strong> = 0,5;
            demais válidos contam como 0 para o numerador de cumprimento.
          </Li>
          <Li>
            <strong>Percentual cumprido</strong> = (pontos / total de itens válidos) × 100.
          </Li>
          <Li>
            <strong>Valor mensal de referência</strong> = valor anual ÷ 12 (ou o campo de referência
            do contrato quando preenchido).
          </Li>
          <Li>
            <strong>Valor devido no mês</strong> = referência mensal × (percentual / 100).{" "}
            <strong>Valor glosado</strong> = referência − devido.
          </Li>
        </Ul>
        <Sub>UST e consolidado</Sub>
        <P>
          Ao recalcular ou ao alterar lançamentos UST, a medição pode atualizar totais de{" "}
          <strong>UST do mês</strong>, <strong>valor financeiro UST</strong> e{" "}
          <strong>valor consolidado</strong> (checklist + UST), conforme regras do sistema.
        </P>
        <Sub>Status de fechamento</Sub>
        <P>
          Medições podem evoluir de aberta para fechada/revisada/homologada conforme fluxo e perfil
          (ex.: gestor fechando competência).
        </P>
      </section>

      {/* 10 */}
      <section id="ust" className="scroll-mt-24 space-y-2 border-b pb-10">
        <h2 className="text-2xl font-bold tracking-tight">10. UST, catálogo e execução técnica</h2>
        <Sub>Permissão</Sub>
        <P>
          Tela <strong>UST &amp; catálogo</strong> usa o recurso{" "}
          <strong>CUSTOMIZACAO (UST &amp; catálogo)</strong>: visualizar para consultar; editar para
          criar serviços, lançamentos e anexos.
        </P>
        <Sub>Catálogo de serviços (por contrato)</Sub>
        <Ul>
          <Li>
            Nome, descrição, <strong>unidade de medição</strong> (UST, hora, unidade, fornecimento),
            <strong> valor unitário (R$)</strong>, SLA em texto, forma de comprovação.
          </Li>
          <Li>
            O valor monetário de um lançamento que referencia o serviço segue a unidade: ex. UST →
            totalUst × valor unitário; fornecimento → quantidade × valor; hora/unidade similar.
          </Li>
        </Ul>
        <Sub>Tipos de atividade UST (catálogo global)</Sub>
        <P>
          Tabela de tipos com nome, categoria, complexidade e <strong>UST fixa</strong> por linha.
          O seed pode carregar faixas tipo edital (ex. seções 4.1–4.11). Administradores podem
          incluir novos tipos na aba dedicada.
        </P>
        <Sub>Lançamento UST (passo a passo)</Sub>
        <Ol>
          <li>Selecione contrato e competência (ano/mês).</li>
          <li>Escolha o <strong>tipo de atividade</strong> (define UST por unidade de quantidade).</li>
          <li>
            Opcional: <strong>serviço do catálogo</strong> — se vazio, o preço usa{" "}
            <Code>valorUnitarioUst</Code> do contrato × total de UST do lançamento.
          </li>
          <li>
            <strong>Quantidade</strong> (repetições): total UST = quantidade × UST fixa do tipo.
          </li>
          <li>
            <strong>Evidência (obrigatória):</strong> ID de ticket GLPI, ou URL, ou descrição com
            mínimo de 10 caracteres. Sem isso o sistema recusa o POST.
          </li>
          <li>
            Após criar, é possível <strong>anexar arquivo</strong> como evidência (um anexo por
            lançamento, em regra).
          </li>
        </Ol>
        <Sub>Limites anuais</Sub>
        <P>
          Se o contrato tiver limite de UST e/ou limite em R$ no ano civil, cada novo lançamento ou
          alteração é validada contra o acumulado do ano; estouro retorna erro claro na API.
        </P>
        <Sub>Consumo no ano (faixa na tela)</Sub>
        <P>
          Com limites definidos, a tela mostra consumo acumulado no ano vs teto, com destaque visual
          próximo ou acima de 100%.
        </P>
      </section>

      {/* 11 */}
      <section id="relatorio" className="scroll-mt-24 space-y-2 border-b pb-10">
        <h2 className="text-2xl font-bold tracking-tight">11. Relatório mensal e exportação XLSX</h2>
        <P>
          Na mesma tela de execução técnica, aba <strong>Relatório mensal</strong>: consolida
          checklist (itens atendidos, %, valor devido checklist), bloco UST do mês (total UST e valor)
          e <strong>valor consolidado</strong> do mês com fórmula explicada.
        </P>
        <Ul>
          <Li>
            <strong>Recalcular checklist:</strong> reprocessa a partir dos itens e grava/atualiza a
            medição da competência.
          </Li>
          <Li>
            <strong>Baixar XLSX:</strong> planilha com abas de resumo e lançamentos UST da
            competência selecionada.
          </Li>
          <Li>
            Atalho para a tela de <Link href="/medicoes" className="text-primary underline">Medição mensal</Link>.
          </Li>
        </Ul>
      </section>

      {/* 12 */}
      <section id="atas" className="scroll-mt-24 space-y-2 border-b pb-10">
        <h2 className="text-2xl font-bold tracking-tight">12. Atas de reunião</h2>
        <P>
          Cadastro por contrato: título, data, local, participantes, texto da ata. É possível
          anexar arquivos e vincular itens contratuais à ata. Permissões pelo recurso{" "}
          <strong>Atas</strong>.
        </P>
      </section>

      {/* 13 */}
      <section id="importacao" className="scroll-mt-24 space-y-2 border-b pb-10">
        <h2 className="text-2xl font-bold tracking-tight">13. Importação XLSX</h2>
        <P>
          Importação em lote de <strong>contratos</strong> e de <strong>itens</strong>, com modelos
          disponíveis para download. Exige permissão no recurso <strong>Importação</strong>. Use após
          validar o arquivo em ambiente de teste quando possível.
        </P>
      </section>

      {/* 14 */}
      <section id="admin" className="scroll-mt-24 space-y-2 border-b pb-10">
        <h2 className="text-2xl font-bold tracking-tight">14. Administração</h2>
        <Sub>Gestão administrativa no Dashboard</Sub>
        <P>
          A visão administrativa foi incorporada ao topo do <strong>Dashboard</strong> e é exibida
          para perfil Administrador.
        </P>
        <Ul>
          <Li>Contagem de usuários ativos e inativos.</Li>
          <Li>Lançamentos UST no mês corrente (volume global).</Li>
          <Li>Distribuição de contratos por status cadastral.</Li>
          <Li>Tabela de usuários ativos por perfil.</Li>
          <Li>Atalhos para contratos, UST, importação.</Li>
          <Li>
            <strong>Últimas linhas de auditoria</strong> (entidade, ação, usuário, data).
          </Li>
        </Ul>
        <Sub>Usuários</Sub>
        <P>
          CRUD de contas: nome, e-mail, senha (na criação/edição), perfil, ativo/inativo. Só
          administrador acessa.
        </P>
        <Sub>Perfis e permissões</Sub>
        <P>
          Para cada perfil (Admin, Gestor, Avaliador, Leitor), marque quais recursos o perfil pode{" "}
          <strong>visualizar</strong> e <strong>editar</strong>. Alterações valem no próximo acesso
          do usuário.
        </P>
      </section>

      {/* 15 */}
      <section id="auditoria" className="scroll-mt-24 space-y-2 border-b pb-10">
        <h2 className="text-2xl font-bold tracking-tight">15. Auditoria e histórico</h2>
        <P>
          Diversas operações gravam eventos em <strong>histórico de auditoria</strong> (entidade,
          id, ação CRIACAO/ATUALIZACAO/EXCLUSAO, JSON anterior/novo, usuário, data). Na ficha do
          contrato há histórico específico do cadastro; na Visão admin há amostra global recente.
        </P>
      </section>

      {/* 16 */}
      <section id="glpi" className="scroll-mt-24 space-y-2 border-b pb-10">
        <h2 className="text-2xl font-bold tracking-tight">16. GLPI e ambiente</h2>
        <P>
          Nos lançamentos UST, o campo <strong>ID do ticket GLPI</strong> documenta a evidência. A
          API opcional <Code>GET /api/integracao/glpi/ticket?id=</Code> consulta o ticket no GLPI
          quando configurado <Code>GLPI_URL</Code>, <Code>GLPI_APP_TOKEN</Code> e{" "}
          <Code>GLPI_USER_TOKEN</Code>. Exige permissão de visualizar UST &amp; catálogo. Em produção,
          o schema do banco deve estar alinhado ao Prisma (deploy com <Code>db push</Code> conforme
          documentação de implantação).
        </P>
        <Sub>Kanban integrado (chamados + projetos)</Sub>
        <Ul>
          <Li>
            O Kanban fica em <strong>Visão geral</strong>, abaixo de Dashboard no menu lateral.
          </Li>
          <Li>
            O board exibe <strong>chamados GLPI</strong> e também <strong>tarefas de projetos</strong>{" "}
            na mesma visão por colunas.
          </Li>
          <Li>
            Para chamados, há filtros por contrato e metas (incluindo visão por meta específica).
          </Li>
          <Li>
            Para tarefas de projeto, a coluna é definida pelo status da tarefa e pode ser alterada no
            próprio board.
          </Li>
        </Ul>
      </section>

      {/* 16.1 */}
      <section id="visao-holistica" className="scroll-mt-24 space-y-2 border-b pb-10">
        <h2 className="text-2xl font-bold tracking-tight">16.1 Visão holística e dados consolidados</h2>
        <P>
          Para gestão integrada de TI, a leitura ideal cruza quatro dimensões:{" "}
          <strong>contratos</strong>, <strong>chamados GLPI</strong>, <strong>metas</strong> e{" "}
          <strong>projetos</strong>. O SIGACON já concentra essas dimensões no Kanban e nos módulos
          de gestão.
        </P>
        <Sub>Dados essenciais para decisão executiva</Sub>
        <Ul>
          <Li>
            <strong>Contrato:</strong> vigência, consumo financeiro, medição, risco de estouro de
            limite e pendências críticas.
          </Li>
          <Li>
            <strong>Operação (GLPI):</strong> chamados abertos, sem atribuição, envelhecimento por
            status e volume por fornecedor/contrato.
          </Li>
          <Li>
            <strong>Planejamento (Metas):</strong> metas por ano, desdobramentos, progresso e vínculos
            com chamados.
          </Li>
          <Li>
            <strong>Execução (Projetos):</strong> tarefas, responsáveis GLPI, prazos e bloqueios.
          </Li>
        </Ul>
        <P>
          Recomendação operacional: instituir rotina semanal com painel único contendo indicadores de
          backlog, SLA, pendências contratuais e avanço de metas/projetos.
        </P>
      </section>

      {/* 16.2 */}
      <section id="alertas-glpi" className="scroll-mt-24 space-y-2 border-b pb-10">
        <h2 className="text-2xl font-bold tracking-tight">16.2 Alertas GLPI e notificações</h2>
        <Sub>Tipos de alerta já suportados</Sub>
        <Ul>
          <Li>
            <strong>Sem atribuição:</strong> chamado aberto sem técnico responsável.
          </Li>
          <Li>
            <strong>SLA estourado:</strong> chamado aberto acima do prazo padrão configurado.
          </Li>
        </Ul>
        <Sub>Configuração e processamento</Sub>
        <Ul>
          <Li>
            Configuração persistida em <Code>config_alerta_glpi</Code> (prazo SLA padrão, ativo,
            notificação por e-mail e escopo de chamados abertos).
          </Li>
          <Li>
            Processamento via API <Code>POST /api/integracao/glpi/alertas/processar</Code>.
          </Li>
          <Li>
            Configuração dos parâmetros via <Code>GET/PATCH /api/integracao/glpi/alertas/config</Code>.
          </Li>
          <Li>
            Consulta de alertas via <Code>GET /api/integracao/glpi/alertas</Code>.
          </Li>
          <Li>
            Resumo operacional via <Code>GET /api/integracao/glpi/alertas/resumo</Code>.
          </Li>
          <Li>
            Status de sincronização via <Code>GET /api/integracao/glpi/sync/status</Code>.
          </Li>
        </Ul>
        <Sub>Notificação por e-mail (API externa)</Sub>
        <P>
          O envio usa integração HTTP com provedor externo via variáveis{" "}
          <Code>ALERT_EMAIL_API_URL</Code> e <Code>ALERT_EMAIL_API_KEY</Code>. O sistema notifica
          perfis internos (Admin/Gestor) e pode evoluir para regras por contrato/equipe.
        </P>
        <Sub>Usuários GLPI para atribuição e comunicação</Sub>
        <P>
          O cache local de usuários GLPI armazena ID, nome, nome completo, login e e-mail para
          pesquisa rápida e suporte a notificações futuras por responsável.
        </P>
      </section>

      {/* 17 */}
      <section id="glossario" className="scroll-mt-24 space-y-2 border-b pb-10">
        <h2 className="text-2xl font-bold tracking-tight">17. Glossário</h2>
        <dl className="mt-3 space-y-3 text-muted-foreground">
          <dt className="font-semibold text-foreground">UST</dt>
          <dd>Unidade de Serviço Técnico — unidade de esforço usada para medir serviços técnicos.</dd>
          <dt className="font-semibold text-foreground">Checklist</dt>
          <dd>Conjunto de itens contratuais com status de cumprimento; base da medição proporcional.</dd>
          <dt className="font-semibold text-foreground">Competência</dt>
          <dd>Par ano/mês usado em medição e lançamentos UST.</dd>
          <dt className="font-semibold text-foreground">Valor devido / glosado</dt>
          <dd>Parte do valor mensal de referência paga ou retida conforme % de cumprimento do checklist.</dd>
          <dt className="font-semibold text-foreground">Consolidado</dt>
          <dd>Soma da visão checklist + valores UST do mês na medição.</dd>
        </dl>
      </section>

      <section className="rounded-xl border bg-muted/40 p-6">
        <h2 className="text-lg font-semibold text-foreground">Suporte ao manual</h2>
        <P>
          Este texto descreve o comportamento pretendido do SIGACON na versão em que foi escrito.
          Telas e regras podem evoluir; em dúvida, combine com TI ou gestão contratual. Sugestões de
          melhoria do manual podem ser registradas junto ao administrador do sistema.
        </P>
      </section>
    </div>
  );
}

function Ol({ children }: { children: React.ReactNode }) {
  return (
    <ol className="mt-2 list-decimal space-y-2 pl-5 text-muted-foreground">{children}</ol>
  );
}
