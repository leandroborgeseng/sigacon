import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import Link from "next/link";
import { PerfilUsuario } from "@prisma/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Breadcrumb } from "@/components/layout/breadcrumb";
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
import { Users, Shield, FileText, Gauge, BookMarked } from "lucide-react";

export default async function AdminVisaoPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.perfil !== PerfilUsuario.ADMIN) {
    redirect("/dashboard");
  }

  const resumo = await getAdminResumo();

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Administração", href: "/admin" }, { label: "Visão geral" }]} />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Visão administrativa</h1>
          <p className="text-muted-foreground">
            Resumo da plataforma, uso de UST e trilha de auditoria recente
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
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Usuários ativos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{resumo.usuariosAtivos}</div>
            <p className="text-xs text-muted-foreground">Inativos: {resumo.usuariosInativos}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Lançamentos UST</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{resumo.lancamentosUstMes}</div>
            <p className="text-xs text-muted-foreground">Competência {resumo.competenciaUst}</p>
          </CardContent>
        </Card>
        <Card className="sm:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Contratos por status</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {resumo.contratosPorStatus.map((r) => (
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
                {resumo.perfilRows.map((r) => (
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
              {resumo.ultimasAuditorias.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    Nenhum registro ainda.
                  </TableCell>
                </TableRow>
              ) : (
                resumo.ultimasAuditorias.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="whitespace-nowrap text-xs">
                      {formatDateTime(a.criadoEm)}
                    </TableCell>
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
  );
}
