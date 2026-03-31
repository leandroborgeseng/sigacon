import Link from "next/link";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  getDashboardIndicators,
  getIndicadoresPorModulo,
  getDashboardAlertas,
  getDashboardInsights,
  getDashboardGlpiResumo,
} from "@/server/services/indicators";
import {
  getDashboardTarefasMes,
  getDashboardSerieTempo,
} from "@/server/services/dashboard-extras";
import { DashboardClient } from "./dashboard-client";
import { PerfilUsuario } from "@prisma/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { getAdminResumo } from "@/server/services/admin-resumo";
import { PERFIL_LABELS } from "@/lib/permissions";
import { formatDateTime } from "@/lib/utils";
import { Users, Shield, FileText, Gauge, BookMarked, ScrollText, Printer } from "lucide-react";
import { RecalcMedicaoLote } from "@/components/admin/recalc-medicao-lote";

type PageProps = {
  searchParams?: Promise<{ contratoId?: string }>;
};

export default async function DashboardPage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/login");

  let contratoId: string | undefined;
  try {
    const sp = searchParams ? await searchParams : {};
    contratoId = (sp as { contratoId?: string }).contratoId;
  } catch {
    contratoId = undefined;
  }

  const contratos = await prisma.contrato.findMany({
    where: { status: "ATIVO" },
    orderBy: { nome: "asc" },
    select: { id: true, nome: true },
  });

  let indicators = null;
  let porModulo: Awaited<ReturnType<typeof getIndicadoresPorModulo>> = [];
  let insights: Awaited<ReturnType<typeof getDashboardInsights>> | null = null;
  let alertas: Awaited<ReturnType<typeof getDashboardAlertas>> = {
    vencendo90Dias: [],
    ustProximoTeto: [],
  };
  let tarefasMes: Awaited<ReturnType<typeof getDashboardTarefasMes>> = [];
  let serieTempo: Awaited<ReturnType<typeof getDashboardSerieTempo>> = [];
  let glpiResumo: Awaited<ReturnType<typeof getDashboardGlpiResumo>> = {
    totalAbertos: 0,
    porContrato: [],
    semInteracao: [],
  };
  try {
    insights = await getDashboardInsights(contratoId);
  } catch (e) {
    console.error("[dashboard] insights:", e);
  }
  try {
    tarefasMes = await getDashboardTarefasMes(contratoId, 14);
    serieTempo = await getDashboardSerieTempo(contratoId, 12);
  } catch (e) {
    console.error("[dashboard] tarefas/serie:", e);
  }
  try {
    glpiResumo = await getDashboardGlpiResumo(contratoId);
  } catch (e) {
    console.error("[dashboard] glpiResumo:", e);
  }
  try {
    [indicators, porModulo, alertas] = await Promise.all([
      getDashboardIndicators(contratoId),
      getIndicadoresPorModulo(contratoId),
      getDashboardAlertas(contratoId),
    ]);
  } catch (e) {
    console.error("[dashboard] indicadores:", e);
    try {
      alertas = await getDashboardAlertas(contratoId);
    } catch (e2) {
      console.error("[dashboard] alertas:", e2);
    }
  }

  const isAdmin = session.perfil === PerfilUsuario.ADMIN;
  const adminResumo = isAdmin ? await getAdminResumo() : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Visão geral do sistema</h1>
        <p className="text-muted-foreground">
          {contratoId
            ? "Indicadores do contrato selecionado"
            : "Visão consolidada de contratos, operação e gestão"}
        </p>
      </div>

      <DashboardClient
        contratos={contratos}
        contratoId={contratoId}
        indicators={indicators}
        insights={insights}
        alertas={alertas}
        porModulo={porModulo.map((m) => ({
          nome: m.nome,
          contratoNome: m.contratoNome,
          totalItens: m.totalItens,
          atendidos: m.atendidos,
          percentualAtendimento: m.percentualAtendimento,
          pendenciasAbertas: m.pendenciasAbertas,
        }))}
        tarefasMes={tarefasMes}
        serieTempo={serieTempo}
        glpiResumo={glpiResumo}
      />

      {isAdmin && adminResumo && (
        <div className="space-y-6">
          <div className="border-t pt-6">
            <h2 className="text-2xl font-semibold tracking-tight">Gestão administrativa</h2>
            <p className="text-sm text-muted-foreground">
              Resumo da plataforma, uso de UST e trilha de auditoria.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/usuarios">
                <Users className="mr-2 h-4 w-4" />
                Usuários
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/usuarios/perfis">
                <Shield className="mr-2 h-4 w-4" />
                Permissões
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/manual">
                <BookMarked className="mr-2 h-4 w-4" />
                Manual
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/auditoria">
                <ScrollText className="mr-2 h-4 w-4" />
                Auditoria
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/relatorios/executivo-impressao">
                <Printer className="mr-2 h-4 w-4" />
                Relatório executivo
              </Link>
            </Button>
          </div>

          <RecalcMedicaoLote />

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Usuários ativos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{adminResumo.usuariosAtivos}</div>
                <p className="text-xs text-muted-foreground">Inativos: {adminResumo.usuariosInativos}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Lançamentos UST</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{adminResumo.lancamentosUstMes}</div>
                <p className="text-xs text-muted-foreground">Competência {adminResumo.competenciaUst}</p>
              </CardContent>
            </Card>
            <Card className="sm:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Contratos por status</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {adminResumo.contratosPorStatus.map((r) => (
                  <Badge key={r.status} variant="secondary" className="text-sm py-1 px-2">
                    {r.label}: {r.count}
                  </Badge>
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Usuários por perfil (ativos)</CardTitle>
                <CardDescription>Distribuição de contas habilitadas</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Perfil</TableHead>
                      <TableHead className="text-right">Quantidade</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {adminResumo.perfilRows.map((r) => (
                      <TableRow key={r.perfil}>
                        <TableCell>{PERFIL_LABELS[r.perfil]}</TableCell>
                        <TableCell className="text-right font-medium">{r.count}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Atalhos</CardTitle>
                <CardDescription>Gestão do sistema</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                <Button variant="outline" className="justify-start" asChild>
                  <Link href="/contratos">
                    <FileText className="mr-2 h-4 w-4" />
                    Todos os contratos
                  </Link>
                </Button>
                <Button variant="outline" className="justify-start" asChild>
                  <Link href="/execucao-tecnica">
                    <Gauge className="mr-2 h-4 w-4" />
                    UST &amp; catálogo
                  </Link>
                </Button>
                <Button variant="outline" className="justify-start" asChild>
                  <Link href="/importacao">Importação XLSX</Link>
                </Button>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Últimas alterações (auditoria)</CardTitle>
              <CardDescription>Registros recentes de criação e atualização no sistema</CardDescription>
            </CardHeader>
            <CardContent className="p-0 max-h-[420px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Quando</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Entidade</TableHead>
                    <TableHead>Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {adminResumo.ultimasAuditorias.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        Nenhum registro ainda.
                      </TableCell>
                    </TableRow>
                  ) : (
                    adminResumo.ultimasAuditorias.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="whitespace-nowrap text-xs">{formatDateTime(a.criadoEm)}</TableCell>
                        <TableCell className="text-sm">{a.usuario}</TableCell>
                        <TableCell className="text-sm font-mono text-muted-foreground">{a.entidade}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-normal">
                            {a.acao}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
