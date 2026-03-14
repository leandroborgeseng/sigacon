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
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { formatDate } from "@/lib/utils";
import { AtaCreateDialog } from "@/components/atas/ata-create-dialog";

export default async function AtasPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [atas, contratos] = await Promise.all([
    prisma.ataReuniao.findMany({
      orderBy: { dataReuniao: "desc" },
      include: { contrato: { select: { nome: true, id: true } } },
    }),
    prisma.contrato.findMany({
      orderBy: { nome: "asc" },
      select: { id: true, nome: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Atas de reunião" }]} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Atas de reunião</h1>
          <p className="text-muted-foreground">
            Registro de reuniões com fornecedores
          </p>
        </div>
        <AtaCreateDialog contratos={contratos} />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Listagem</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Contrato</TableHead>
                <TableHead>Local</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {atas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    Nenhuma ata cadastrada.
                  </TableCell>
                </TableRow>
              ) : (
                atas.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/atas/${a.id}`}
                        className="hover:underline text-primary"
                      >
                        {a.titulo}
                      </Link>
                    </TableCell>
                    <TableCell>{formatDate(a.dataReuniao)}</TableCell>
                    <TableCell>
                      <Link
                        href={`/contratos/${a.contrato.id}`}
                        className="hover:underline text-muted-foreground"
                      >
                        {a.contrato.nome}
                      </Link>
                    </TableCell>
                    <TableCell>{a.local ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`/atas/${a.id}`}
                        className="text-sm text-primary hover:underline"
                      >
                        Ver
                      </Link>
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
