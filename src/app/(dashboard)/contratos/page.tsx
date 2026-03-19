import Link from "next/link";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
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
import { formatCurrency, formatDate } from "@/lib/utils";
import { ContratoCreateDialog } from "@/components/contratos/contrato-create-dialog";
import { canRecurso } from "@/lib/permissions";
import { PerfilUsuario, RecursoPermissao } from "@prisma/client";

export default async function ContratosPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const podeCriarContrato = await canRecurso(
    session.perfil as PerfilUsuario,
    RecursoPermissao.CONTRATOS,
    "editar"
  );

  const contratos = await prisma.contrato.findMany({
    orderBy: { nome: "asc" },
    include: { _count: { select: { modulos: true, itens: true } } },
  });

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Contratos" }]} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Contratos</h1>
          <p className="text-muted-foreground">
            Gerencie os contratos administrativos
          </p>
        </div>
        <ContratoCreateDialog podeCriar={podeCriarContrato} />
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
                  <TableHead>Número</TableHead>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>Vigência</TableHead>
                  <TableHead>Valor anual</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contratos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      Nenhum contrato cadastrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  contratos.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">
                        <Link
                          href={`/contratos/${c.id}`}
                          className="hover:underline text-primary"
                        >
                          {c.nome}
                        </Link>
                      </TableCell>
                      <TableCell>{c.numeroContrato}</TableCell>
                      <TableCell>{c.fornecedor}</TableCell>
                      <TableCell>
                        {formatDate(c.vigenciaInicio)} - {formatDate(c.vigenciaFim)}
                      </TableCell>
                      <TableCell>{formatCurrency(c.valorAnual)}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{c.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/contratos/${c.id}`}>Ver</Link>
                        </Button>
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/contratos/${c.id}`}>Editar</Link>
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
