import Link from "next/link";
import { getSession } from "@/lib/session";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { ContratoEditDialog } from "@/components/contratos/contrato-edit-dialog";
import { ReajusteAddDialog } from "@/components/contratos/reajuste-add-dialog";
import { ContratoDangerZone } from "@/components/contratos/contrato-danger-zone";
import { formatCurrency, formatDate, formatPercent, formatDateTime } from "@/lib/utils";
import {
  labelLeiLicitacao,
  podeRenovar,
  limiteRenovacoes,
  reajusteAcumuladoUltimos12Meses,
} from "@/lib/licitacao";
import { canRecurso } from "@/lib/permissions";
import { PerfilUsuario, RecursoPermissao, TipoContrato } from "@prisma/client";
import { ContratoGestaoExtendida } from "@/components/contratos/contrato-gestao-extendida";
import {
  LABEL_TIPO_RECURSO_DATACENTER,
  indiceOrdenacaoTipoDatacenter,
  somaValorMensalPrevistoDatacenter,
} from "@/lib/datacenter-recursos";

export default async function ContratoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const { id } = await params;

  const contrato = await prisma.contrato.findUnique({
    where: { id },
    include: {
      modulos: true,
      glpiGruposTecnicos: true,
      medicoes: { orderBy: [{ ano: "desc" }, { mes: "desc" }], take: 12 },
      atas: { orderBy: { dataReuniao: "desc" }, take: 5 },
      reajustes: { orderBy: { dataReajuste: "desc" } },
      aditivos: { orderBy: { dataRegistro: "desc" } },
      marcosImplantacao: { orderBy: [{ ordem: "asc" }, { dataPrevista: "asc" }] },
      parcelasPagamento: {
        orderBy: [{ competenciaAno: "desc" }, { competenciaMes: "desc" }],
        take: 48,
      },
      datacenter: true,
      linksMetropolitanos: { orderBy: { ordem: "asc" } },
      datacenterItensPrevistos: { orderBy: { tipo: "asc" } },
      _count: { select: { itens: true } },
    },
  });

  if (!contrato) notFound();

  const itensDatacenterOrdenados =
    contrato.tipoContrato === TipoContrato.DATACENTER
      ? [...contrato.datacenterItensPrevistos].sort(
          (a, b) => indiceOrdenacaoTipoDatacenter(a.tipo) - indiceOrdenacaoTipoDatacenter(b.tipo)
        )
      : [];
  const valorMensalSomaPrevista =
    contrato.tipoContrato === TipoContrato.DATACENTER
      ? somaValorMensalPrevistoDatacenter(contrato.datacenterItensPrevistos)
      : null;

  const podeEditarGestao = await canRecurso(
    session.perfil as PerfilUsuario,
    RecursoPermissao.CONTRATOS,
    "editar"
  );

  const historico = await prisma.historicoAuditoria.findMany({
    where: { entidade: "Contrato", entidadeId: id },
    orderBy: { criadoEm: "desc" },
    take: 50,
    include: { usuario: { select: { nome: true } } },
  });

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Contratos", href: "/contratos" },
          { label: contrato.nome },
        ]}
      />
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{contrato.nome}</h1>
          <p className="text-muted-foreground">
            {contrato.numeroContrato} • {contrato.fornecedor}
          </p>
          {contrato.ativo === false && (
            <p className="text-sm text-amber-700 dark:text-amber-400">
              Contrato inativo: somente consulta.
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {contrato.ativo !== false && <ContratoEditDialog contrato={contrato} />}
          <Button variant="outline" asChild>
            <Link href={`/medicoes?contratoId=${id}`}>Medição mensal</Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ações</CardTitle>
        </CardHeader>
        <CardContent>
          <ContratoDangerZone
            contratoId={id}
            contratoNome={contrato.nome}
            ativo={contrato.ativo !== false}
            canToggleAtivo={session.perfil === "ADMIN" || session.perfil === "GESTOR"}
            canDelete={session.perfil === "ADMIN"}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dados do contrato</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p>
            <span className="font-medium">Objeto:</span>{" "}
            {contrato.objeto || "—"}
          </p>
          <p>
            <span className="font-medium">Vigência:</span>{" "}
            {formatDate(contrato.vigenciaInicio)} a{" "}
            {formatDate(contrato.vigenciaFim)}
          </p>
          <p>
            <span className="font-medium">Valor anual:</span>{" "}
            {formatCurrency(contrato.valorAnual)}
          </p>
          <p>
            <span className="font-medium">Valor mensal referência:</span>{" "}
            {formatCurrency(
              contrato.valorMensalReferencia ??
                Number(contrato.valorAnual) / 12
            )}
          </p>
          <p>
            <span className="font-medium">Status:</span>{" "}
            <Badge variant="secondary">{contrato.status}</Badge>
          </p>
          <p>
            <span className="font-medium">Tipo:</span>{" "}
            <Badge variant="outline">
              {contrato.tipoContrato === TipoContrato.DATACENTER
                ? "Datacenter"
                : "Software"}
            </Badge>
          </p>
          {contrato.gestorContrato && (
            <p>
              <span className="font-medium">Gestor:</span>{" "}
              {contrato.gestorContrato}
            </p>
          )}
          <p>
            <span className="font-medium">Total de itens:</span>{" "}
            {contrato._count.itens}
          </p>
          <div>
            <span className="font-medium">Grupos técnicos GLPI:</span>{" "}
            {contrato.glpiGruposTecnicos.length === 0 ? (
              <span className="text-muted-foreground">Nenhum — edite o contrato para vincular.</span>
            ) : (
              <span className="text-sm">
                {contrato.glpiGruposTecnicos.map((g) => (
                  <Badge key={g.id} variant="outline" className="mr-1 font-normal">
                    #{g.glpiGroupId} {g.nome ?? ""}
                  </Badge>
                ))}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {contrato.tipoContrato === TipoContrato.DATACENTER && (
        <Card>
          <CardHeader>
            <CardTitle>Infraestrutura contratada (datacenter)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <p className="font-medium mb-1">Itens previstos (medição e valor mensal)</p>
              {contrato.datacenterItensPrevistos.length === 0 ? (
                <p className="text-muted-foreground">
                  Nenhum item previsto. Em <strong>Editar contrato</strong>, marque as oito linhas do
                  objeto (colocation, licença Windows, processadores VPS, RAM, SSD, HD, fibra, etc.).
                </p>
              ) : (
                <>
                  <div className="flex flex-wrap gap-1">
                    {itensDatacenterOrdenados.map((item) => (
                      <Badge key={item.tipo} variant="secondary" className="font-normal">
                        {LABEL_TIPO_RECURSO_DATACENTER[item.tipo]}
                      </Badge>
                    ))}
                  </div>
                  {valorMensalSomaPrevista != null && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Soma mensal estimada (onde há quantidade e valor unitário):{" "}
                      <span className="font-medium text-foreground">
                        {formatCurrency(valorMensalSomaPrevista)}
                      </span>
                    </p>
                  )}
                  <p className="text-[11px] text-muted-foreground mt-2">
                    Quantidades e preços unitários mensais poderão ser preenchidos depois para fechar o
                    cálculo linha a linha.
                  </p>
                </>
              )}
            </div>
            <div className="border-t pt-4">
              <p className="font-medium mb-2">Capacidades detalhadas (opcional)</p>
            </div>
            {!contrato.datacenter ? (
              <p className="text-muted-foreground">
                Nenhuma capacidade registrada ainda. Use <strong>Editar contrato</strong> para informar vCPU,
                RAM, discos, rack (U) e links.
              </p>
            ) : (
              <>
                <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2">
                  <div>
                    <dt className="text-muted-foreground text-xs">vCPUs</dt>
                    <dd className="font-medium">
                      {contrato.datacenter.vcpusContratados != null
                        ? Number(contrato.datacenter.vcpusContratados).toLocaleString("pt-BR")
                        : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground text-xs">RAM (GB)</dt>
                    <dd className="font-medium">
                      {contrato.datacenter.ramGb != null
                        ? Number(contrato.datacenter.ramGb).toLocaleString("pt-BR")
                        : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground text-xs">SSD (GB)</dt>
                    <dd className="font-medium">
                      {contrato.datacenter.discoSsdGb != null
                        ? Number(contrato.datacenter.discoSsdGb).toLocaleString("pt-BR")
                        : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground text-xs">Disco backup (GB)</dt>
                    <dd className="font-medium">
                      {contrato.datacenter.discoBackupGb != null
                        ? Number(contrato.datacenter.discoBackupGb).toLocaleString("pt-BR")
                        : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground text-xs">Colocation (U)</dt>
                    <dd className="font-medium">
                      {contrato.datacenter.rackU != null
                        ? Number(contrato.datacenter.rackU).toLocaleString("pt-BR")
                        : "—"}
                    </dd>
                  </div>
                </dl>
                {contrato.datacenter.observacoes && (
                  <p>
                    <span className="font-medium">Observações:</span> {contrato.datacenter.observacoes}
                  </p>
                )}
              </>
            )}
            <div>
              <p className="font-medium mb-2">Links metropolitanos</p>
              {contrato.linksMetropolitanos.length === 0 ? (
                <p className="text-muted-foreground">Nenhum link cadastrado.</p>
              ) : (
                <ul className="list-disc pl-5 space-y-1">
                  {contrato.linksMetropolitanos.map((l) => (
                    <li key={l.id}>
                      <span className="font-medium">{l.descricaoVelocidade}</span>
                      {l.velocidadeMbps != null && (
                        <span className="text-muted-foreground">
                          {" "}
                          ({l.velocidadeMbps.toLocaleString("pt-BR")} Mbps)
                        </span>
                      )}
                      {" — "}
                      quantidade: {l.quantidade}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Regime e renovação</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p>
            <span className="font-medium">Lei de licitação:</span>{" "}
            {labelLeiLicitacao(contrato.leiLicitacao)}
          </p>
          <p>
            <span className="font-medium">Data de assinatura:</span>{" "}
            {contrato.dataAssinatura
              ? formatDate(contrato.dataAssinatura)
              : "—"}
          </p>
          <p>
            <span className="font-medium">Renovações já realizadas:</span>{" "}
            {contrato.numeroRenovacoes} (máx. {limiteRenovacoes(contrato.leiLicitacao)} para esta lei)
          </p>
          <p>
            <span className="font-medium">Pode renovar?</span>{" "}
            {podeRenovar(contrato.leiLicitacao, contrato.numeroRenovacoes) ? (
              <Badge variant="default">Sim</Badge>
            ) : (
              <Badge variant="destructive">Necessário nova licitação</Badge>
            )}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Módulos</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
            {contrato.modulos.length === 0 ? (
              <p className="p-4 text-muted-foreground">
                Nenhum módulo cadastrado.
              </p>
            ) : (
              <ul className="divide-y">
                {contrato.modulos.map((m) => (
                  <li key={m.id} className="flex items-center justify-between p-4">
                    <div>
                      <Link
                        href={`/modulos/${m.id}`}
                        className="font-medium hover:underline text-primary"
                      >
                        {m.nome}
                      </Link>
                      {m.descricao && (
                        <p className="text-sm text-muted-foreground">
                          {m.descricao}
                        </p>
                      )}
                    </div>
                    <Badge variant={m.ativo ? "default" : "secondary"}>
                      {m.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Últimas medições</CardTitle>
        </CardHeader>
        <CardContent>
          {contrato.medicoes.length === 0 ? (
            <p className="text-muted-foreground">Nenhuma medição registrada.</p>
          ) : (
            <ul className="space-y-2">
              {contrato.medicoes.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center justify-between rounded border p-2"
                >
                  <span>
                    {m.mes}/{m.ano}
                  </span>
                  <span>
                    {Number(m.percentualCumprido).toFixed(2)}% •{" "}
                    {formatCurrency(m.valorDevidoMes)} devido
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {(() => {
        const acumulado12m = reajusteAcumuladoUltimos12Meses(contrato.reajustes);
        const valorAtualReajuste =
          contrato.reajustes.length > 0
            ? Number(contrato.reajustes[0].valorNovo)
            : Number(contrato.valorAnual);
        return (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle>Histórico de reajustes</CardTitle>
              <ReajusteAddDialog
                contratoId={id}
                valorAtual={valorAtualReajuste}
              />
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Reajuste acumulado nos últimos 12 meses:{" "}
                <strong>{formatPercent(acumulado12m)}</strong>
                {acumulado12m > 25 && (
                  <Badge variant="destructive" className="ml-2">
                    Atenção: acima do limite de 25% ao ano
                  </Badge>
                )}
              </p>
              {contrato.reajustes.length === 0 ? (
                <p className="text-muted-foreground">
                  Nenhum reajuste registrado.
                </p>
              ) : (
                <ul className="space-y-2">
                  {contrato.reajustes.map((r) => (
                    <li
                      key={r.id}
                      className="flex items-center justify-between rounded border p-3"
                    >
                      <span>{formatDate(r.dataReajuste)}</span>
                      <span>
                        {formatCurrency(r.valorAnterior)} →{" "}
                        {formatCurrency(r.valorNovo)}
                      </span>
                      <span>{formatPercent(Number(r.percentualAplicado))}</span>
                      {r.indiceReferencia && (
                        <span className="text-muted-foreground text-sm">
                          {r.indiceReferencia}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        );
      })()}

      <ContratoGestaoExtendida
        contratoId={id}
        podeEditar={podeEditarGestao}
        aditivosInicial={contrato.aditivos.map((a) => ({
          ...a,
          dataRegistro: a.dataRegistro.toISOString(),
          vigenciaFimAnterior: a.vigenciaFimAnterior?.toISOString() ?? null,
          vigenciaFimNova: a.vigenciaFimNova?.toISOString() ?? null,
        }))}
        marcosInicial={contrato.marcosImplantacao.map((m) => ({
          ...m,
          dataPrevista: m.dataPrevista.toISOString(),
          dataRealizada: m.dataRealizada?.toISOString() ?? null,
        }))}
        parcelasInicial={contrato.parcelasPagamento.map((p) => ({
          ...p,
          dataVencimento: p.dataVencimento?.toISOString() ?? null,
          dataPagamento: p.dataPagamento?.toISOString() ?? null,
        }))}
      />

      <Card>
        <CardHeader>
          <CardTitle>Histórico de alterações</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {historico.length === 0 ? (
            <p className="p-4 text-muted-foreground">
              Nenhuma alteração registrada. As correções feitas pelo botão &quot;Editar contrato&quot; aparecem aqui.
            </p>
          ) : (
            <ul className="divide-y">
              {historico.map((h) => {
                const acaoLabel =
                  h.acao === "CRIACAO"
                    ? "Criação do contrato"
                    : h.acao === "ATUALIZACAO"
                      ? "Alteração"
                      : h.acao;
                const anterior = (h.valorAnterior as Record<string, unknown> | null) ?? {};
                const novo = (h.valorNovo as Record<string, unknown> | null) ?? {};
                const camposAlterados =
                  h.acao === "ATUALIZACAO"
                    ? Object.keys(novo).filter(
                        (k) =>
                          JSON.stringify(anterior[k]) !== JSON.stringify(novo[k]) &&
                          !["atualizadoEm", "criadoEm"].includes(k)
                      )
                    : [];
                return (
                  <li key={h.id} className="p-4">
                    <p className="font-medium">{acaoLabel}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDateTime(h.criadoEm)} • {h.usuario?.nome ?? "Sistema"}
                    </p>
                    {camposAlterados.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Campos: {camposAlterados.join(", ")}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Últimas atas</CardTitle>
        </CardHeader>
        <CardContent>
          {contrato.atas.length === 0 ? (
            <p className="text-muted-foreground">Nenhuma ata registrada.</p>
          ) : (
            <ul className="space-y-2">
              {contrato.atas.map((a) => (
                <li key={a.id}>
                  <Link
                    href={`/atas/${a.id}`}
                    className="hover:underline text-primary"
                  >
                    {a.titulo} – {formatDate(a.dataReuniao)}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
