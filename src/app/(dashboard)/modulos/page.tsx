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
import { ModuloFilterSelect } from "@/components/modulos/modulo-filter-select";
import { ModuloEditDialog } from "@/components/modulos/modulo-edit-dialog";
import { ModuloDeleteButton } from "@/components/modulos/modulo-delete-button";
import { ModulosAccordion } from "@/components/modulos/modulos-accordion";
import { canRecurso } from "@/lib/permissions";
import { PerfilUsuario, RecursoPermissao } from "@prisma/client";

type PageProps = {
  searchParams?: Promise<{ contratoId?: string }>;
};

export default async function ModulosPage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/login");

  const podeEditar = await canRecurso(
    session.perfil as PerfilUsuario,
    RecursoPermissao.CONTRATOS,
    "editar"
  );

  let contratoId: string | undefined;
  try {
    const sp = searchParams ? await searchParams : {};
    contratoId = (sp as { contratoId?: string }).contratoId;
  } catch {
    contratoId = undefined;
  }

  const modulos = await prisma.modulo.findMany({
    where: contratoId ? { contratoId } : undefined,
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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Módulos</h1>
          <p className="text-muted-foreground">
            Módulos por contrato. Cadastre módulos manualmente ou use a importação de planilha no contrato.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ModuloFilterSelect contratos={contratos} contratoId={contratoId} />
          <ModuloCreateDialog contratos={contratos} podeEditar={podeEditar} />
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Listagem</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {modulos.length === 0 ? (
            <p className="p-4 text-muted-foreground">
              Nenhum módulo cadastrado.
              {contratoId && " Tente outro filtro ou limpe o filtro por contrato."}
            </p>
          ) : (
            <ModulosAccordion modulos={JSON.parse(JSON.stringify(modulos))} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
