/**
 * Conteúdo do manual do SIGACON — manter alinhado às funcionalidades reais.
 */
export function ManualSistemaContent() {
  return (
    <div className="manual-prose max-w-3xl space-y-10 text-sm leading-relaxed text-foreground">
      <section className="space-y-3">
        <h2 className="text-xl font-semibold tracking-tight border-b pb-2">
          1. Visão geral
        </h2>
        <p>
          O <strong>SIGACON</strong> apoia o acompanhamento de contratos administrativos:
          módulos e itens do edital, medição mensal, pendências, atas, lançamentos em UST com
          evidências e trilha de auditoria. O acesso depende do <strong>perfil</strong> e das{" "}
          <strong>permissões por recurso</strong> configuradas para cada perfil.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold tracking-tight border-b pb-2">
          2. Perfis, permissões e login
        </h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong>Login:</strong> e-mail e senha; sessão em cookie seguro. Use &quot;Sair&quot; no
            topo para encerrar.
          </li>
          <li>
            <strong>Perfis base:</strong> Leitor, Avaliador, Gestor e Administrador — hierarquia
            crescente de escopo.
          </li>
          <li>
            <strong>Recursos:</strong> Dashboard, Contratos, Módulos, Itens, Medição, Atas,
            Pendências, Importação, UST &amp; catálogo, Usuários. Cada recurso pode permitir só
            visualizar ou também editar (definido em <strong>Perfis e permissões</strong>, apenas
            admin).
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold tracking-tight border-b pb-2">
          3. Dashboard
        </h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            Resumo de contratos ativos, itens por status (atende / parcial / não atende),
            percentual geral, pendências abertas e valores do <strong>mês corrente</strong>{" "}
            (devido e glosado na medição).
          </li>
          <li>
            Filtro por <strong>contrato</strong>: restrige indicadores e gráficos ao contrato
            escolhido.
          </li>
          <li>
            Gráficos: pizza (distribuição por status) e barras (atendimento por módulo).
          </li>
          <li>
            <strong>Alertas:</strong> contratos com vigência terminando em até{" "}
            <strong>90 dias</strong>; contratos com teto de UST ou valor UST no ano em{" "}
            <strong>≥85%</strong> ou estourado. Links levam à ficha do contrato.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold tracking-tight border-b pb-2">
          4. Contratos
        </h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>Cadastro e listagem; abertura da ficha por contrato.</li>
          <li>
            <strong>Editar contrato:</strong> dados gerais, vigência, valores, forma de medição,
            lei de licitação, gestor, observações, <strong>valor R$ por UST</strong> (referência
            quando não há preço no catálogo).
          </li>
          <li>
            <strong>Limites anuais (UST):</strong> opcionalmente defina{" "}
            <strong>limite de UST no ano</strong> e/ou <strong>limite em R$</strong> da medição UST
            no ano civil. Lançamentos que ultrapassem o teto são bloqueados.
          </li>
          <li>
            <strong>Reajustes:</strong> histórico e inclusão de reajuste (valor anterior/novo,
            percentual, índice). O sistema alerta se o acumulado em 12 meses passar de 25%.
          </li>
          <li>
            <strong>Últimas medições e atas</strong> vinculadas ao contrato.
          </li>
          <li>
            <strong>Gestão ampliada</strong> (com permissão de editar contratos):
            <ul className="list-circle pl-5 mt-2 space-y-1">
              <li>
                <strong>Aditivos:</strong> número, data, objeto, valores e vigências antes/depois.
              </li>
              <li>
                <strong>Marcos de implantação:</strong> título, datas prevista/realizada, status,
                ordem.
              </li>
              <li>
                <strong>Parcelas de pagamento:</strong> competência (ano/mês), valores previsto e
                pago, vencimento, NF, status e observações.
              </li>
            </ul>
          </li>
          <li>
            <strong>Histórico de alterações:</strong> auditoria das mudanças no cadastro do
            contrato.
          </li>
          <li>
            Contratos podem ser <strong>inativados</strong> (fluxo na área de ações; regras por
            perfil).
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold tracking-tight border-b pb-2">
          5. Módulos
        </h2>
        <p>
          Agrupam itens contratuais por contrato. Crie edite ou desative módulos conforme a
          estrutura do edital. Itens são associados a um módulo.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold tracking-tight border-b pb-2">
          6. Itens contratuais
        </h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            Cada item tem descrição, módulo, peso (se aplicável), flags de cabeçalho e de
            participação na medição.
          </li>
          <li>
            <strong>Status atual</strong> (atende, parcial, não atende, etc.) alimenta o dashboard
            e a medição.
          </li>
          <li>
            Detalhe do item permite evolução de status e vínculo com pendências.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold tracking-tight border-b pb-2">
          7. Pendências
        </h2>
        <p>
          Registro de pendências ligadas a itens: abertura, acompanhamento e encerramento. Contam
          nos indicadores do dashboard e por módulo.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold tracking-tight border-b pb-2">
          8. UST &amp; catálogo (execução técnica)
        </h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            Escolha <strong>contrato</strong> e <strong>competência</strong> (ano/mês).
          </li>
          <li>
            <strong>Catálogo de serviços:</strong> serviços do contrato com unidade (UST, hora,
            etc.), valor unitário, SLA e forma de comprovação.
          </li>
          <li>
            <strong>Lançamentos UST:</strong> tipo de atividade (UST fixa do catálogo global),
            quantidade, serviço opcional do catálogo (senão usa valor UST do contrato).{" "}
            <strong>Evidência obrigatória:</strong> ID de ticket GLPI, URL ou descrição (mín. 10
            caracteres); após criar, é possível <strong>anexar arquivo</strong> como evidência.
          </li>
          <li>
            Barra <strong>consumo UST no ano</strong> quando o contrato tem teto: mostra uso vs
            limite (alerta visual próximo ou acima de 100%).
          </li>
          <li>
            Aba <strong>Relatório mensal:</strong> consolida checklist (KPIs), UST do mês e valor
            total; botão para recalcular a partir dos itens; link para a tela de medição;{" "}
            <strong>Baixar XLSX</strong> exporta resumo e lançamentos UST da competência.
          </li>
          <li>
            <strong>Tipos UST (admin):</strong> manutenção do catálogo global de atividades/UST.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold tracking-tight border-b pb-2">
          9. Medição mensal
        </h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            Por contrato e competência: percentual cumprido com base nos itens válidos, valor
            devido e glosado.
          </li>
          <li>
            Integração com o relatório UST: o fluxo de execução técnica pode disparar recálculo e
            a exportação XLSX reflete a competência.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold tracking-tight border-b pb-2">
          10. Atas de reunião
        </h2>
        <p>
          Cadastro de atas com data, participantes e conteúdo; anexos e vínculo a itens quando
          aplicável.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold tracking-tight border-b pb-2">
          11. Importação XLSX
        </h2>
        <p>
          Importação em lote (estrutura definida pelo sistema) para contratos/módulos/itens,
          conforme permissão de importação.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold tracking-tight border-b pb-2">
          12. Usuários e perfis (administrador)
        </h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong>Usuários:</strong> criação, edição e desativação de contas.
          </li>
          <li>
            <strong>Perfis e permissões:</strong> matriz visualizar/editar por recurso para cada
            perfil do sistema.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold tracking-tight border-b pb-2">
          13. Integração GLPI (opcional)
        </h2>
        <p>
          Se o ambiente tiver <code className="rounded bg-muted px-1">GLPI_URL</code>,{" "}
          <code className="rounded bg-muted px-1">GLPI_APP_TOKEN</code> e{" "}
          <code className="rounded bg-muted px-1">GLPI_USER_TOKEN</code>, a API pode consultar
          dados de um ticket pelo ID (uso interno / validação). Sem essas variáveis, a
          integração aparece como não configurada.
        </p>
      </section>

      <section className="space-y-3 rounded-lg border bg-muted/30 p-4">
        <h2 className="text-lg font-semibold">Dúvidas ou melhorias</h2>
        <p className="text-muted-foreground">
          Em caso de divergência entre este manual e a tela, prevalece o comportamento do sistema
          na versão em uso. Sugestões de documentação podem ser registradas com a equipe de
          gestão do contrato ou TI.
        </p>
      </section>
    </div>
  );
}
