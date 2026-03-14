import Link from "next/link";
import { getSession } from "@/lib/session";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { ModuloItensStatus } from "@/components/modulos/modulo-itens-status";

export default async function ModuloDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const { id } = await params;

  const modulo = await prisma.modulo.findUnique({
    where: { id },
    include: {
      contrato: true,
      itens: { orderBy: { numeroItem: "asc" } },
      _count: { select: { itens: true } },
    },
  });

  if (!modulo) notFound();

  const atendidos = modulo.itens.filter((i) => i.statusAtual === "ATENDE").length;
  const percentual =
    modulo.itens.length > 0
      ? ((atendidos / modulo.itens.length) * 100).toFixed(1)
      : "0";

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Módulos", href: "/modulos" },
          { label: modulo.nome },
        ]}
      />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{modulo.nome}</h1>
          <p className="text-muted-foreground">
            <Link href={`/contratos/${modulo.contrato.id}`} className="hover:underline">
              {modulo.contrato.nome}
            </Link>
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href={`/itens?moduloId=${id}`}>Ver itens</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Resumo</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-6 flex-wrap">
          <div>
            <p className="text-sm text-muted-foreground">Total de itens</p>
            <p className="text-2xl font-bold">{modulo._count.itens}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Atendidos</p>
            <p className="text-2xl font-bold">{atendidos}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Percentual</p>
            <p className="text-2xl font-bold">{percentual}%</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Status</p>
            <Badge variant={modulo.ativo ? "default" : "secondary"}>
              {modulo.ativo ? "Ativo" : "Inativo"}
            </Badge>
            <Badge variant={modulo.implantado ? "default" : "outline"} className="ml-2">
              {modulo.implantado ? "Implantado" : "Não implantado"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {modulo.descricao && (
        <Card>
          <CardHeader>
            <CardTitle>Descrição</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{modulo.descricao}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Itens ({modulo.itens.length})</CardTitle>
          <p className="text-sm text-muted-foreground">
            Altere o status de cada item (Cumprido, Não cumprido, Inconclusivo, etc.) no dropdown.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <ModuloItensStatus
            itens={(modulo.itens ?? []).map((i) => ({
              id: i.id,
              numeroItem: i.numeroItem,
              descricao: i.descricao ?? "",
              statusAtual: i.statusAtual,
            }))}
          />
          <p className="p-2 text-center text-sm text-muted-foreground border-t">
            <Link href={`/itens?moduloId=${id}`} className="underline">
              Ver todos os itens na listagem completa
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
