import Link from "next/link";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

export default async function PendenciasPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const pendencias = await prisma.pendencia.findMany({
    orderBy: [{ status: "asc" }, { prazo: "asc" }],
    include: {
      item: {
        select: {
          id: true,
          descricao: true,
          numeroItem: true,
          statusAtual: true,
          modulo: {
            select: {
              nome: true,
              contrato: { select: { nome: true, id: true } },
            },
          },
        },
      },
    },
  });

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Pendências" }]} />
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Pendências</h1>
        <p className="text-muted-foreground">
          Itens com pendências abertas ou em andamento
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Listagem</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item / Módulo</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead>Prazo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendencias.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Nenhuma pendência cadastrada.
                  </TableCell>
                </TableRow>
              ) : (
                pendencias.map((p) => {
                  const prazoDate = p.prazo ? new Date(p.prazo) : null;
                  prazoDate?.setHours(0, 0, 0, 0);
                  const vencida =
                    p.status === "ABERTA" &&
                    prazoDate &&
                    prazoDate < hoje;
                  return (
                    <TableRow
                      key={p.id}
                      className={cn(vencida && "bg-destructive/5")}
                    >
                      <TableCell>
                        <div>
                          <Link
                            href={`/itens/${p.item.id}`}
                            className="font-medium hover:underline text-primary"
                          >
                            Item {p.item.numeroItem}
                          </Link>
                          <p className="text-xs text-muted-foreground">
                            {p.item.modulo.contrato.nome} • {p.item.modulo.nome}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {p.descricao}
                      </TableCell>
                      <TableCell>{p.responsavel ?? "—"}</TableCell>
                      <TableCell>
                        {p.prazo ? formatDate(p.prazo) : "—"}
                        {vencida && (
                          <Badge variant="destructive" className="ml-2">
                            Vencida
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            p.status === "CONCLUIDA"
                              ? "secondary"
                              : p.status === "VENCIDA"
                                ? "destructive"
                                : "default"
                          }
                        >
                          {p.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Link
                          href={`/itens/${p.item.id}`}
                          className="text-sm text-primary hover:underline"
                        >
                          Ver item
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
