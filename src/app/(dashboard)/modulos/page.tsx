import Link from "next/link";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
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
import { Button } from "@/components/ui/button";
import { ModuloCreateDialog } from "@/components/modulos/modulo-create-dialog";

export default async function ModulosPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const modulos = await prisma.modulo.findMany({
    orderBy: [{ contrato: { nome: "asc" } }, { nome: "asc" }],
    include: {
      contrato: { select: { id: true, nome: true } },
      _count: { select: { itens: true } },
    },
  });

  const contratos = await prisma.contrato.findMany({
    orderBy: { nome: "asc" },
    select: { id: true, nome: true },
  });

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Módulos" }]} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Módulos</h1>
          <p className="text-muted-foreground">
            Módulos por contrato
          </p>
        </div>
        <ModuloCreateDialog contratos={contratos} />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Listagem</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Contrato</TableHead>
                <TableHead>Itens</TableHead>
                <TableHead>Implantado</TableHead>
                <TableHead>Ativo</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {modulos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Nenhum módulo cadastrado.
                  </TableCell>
                </TableRow>
              ) : (
                modulos.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/modulos/${m.id}`}
                        className="hover:underline text-primary"
                      >
                        {m.nome}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/contratos/${m.contrato.id}`}
                        className="hover:underline text-muted-foreground"
                      >
                        {m.contrato.nome}
                      </Link>
                    </TableCell>
                    <TableCell>{m._count.itens}</TableCell>
                    <TableCell>
                      <Badge variant={m.implantado ? "default" : "secondary"}>
                        {m.implantado ? "Sim" : "Não"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={m.ativo ? "default" : "secondary"}>
                        {m.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/modulos/${m.id}`}>Ver</Link>
                      </Button>
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
