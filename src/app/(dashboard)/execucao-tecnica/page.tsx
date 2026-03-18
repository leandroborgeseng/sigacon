import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canRecurso, isAdmin } from "@/lib/permissions";
import { PerfilUsuario, RecursoPermissao } from "@prisma/client";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { ExecucaoTecnicaClient } from "@/components/execucao-tecnica/execucao-tecnica-client";

export default async function ExecucaoTecnicaPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const podeVer = await canRecurso(session.perfil as PerfilUsuario, RecursoPermissao.CUSTOMIZACAO, "visualizar");
  if (!podeVer) redirect("/dashboard");
  const podeEditar = await canRecurso(session.perfil as PerfilUsuario, RecursoPermissao.CUSTOMIZACAO, "editar");

  const contratos = await prisma.contrato.findMany({
    where: { ativo: true },
    orderBy: { nome: "asc" },
    select: {
      id: true,
      nome: true,
      numeroContrato: true,
      valorUnitarioUst: true,
    },
  });

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "UST & catálogo de serviços" }]} />
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Medição técnica (UST)</h1>
        <p className="text-muted-foreground max-w-3xl">
          Modelo híbrido: <strong>UST</strong> com evidência obrigatória (GLPI, URL ou documento),{" "}
          <strong>catálogo de serviços</strong> (unidade, SLA, comprovação, valor) e{" "}
          <strong>checklist contratual</strong> na{" "}
          <Link href="/medicoes" className="text-primary underline">
            medição mensal
          </Link>
          . Valores consolidados por competência.
        </p>
      </div>
      <ExecucaoTecnicaClient
        contratos={contratos.map((c) => ({
          ...c,
          valorUnitarioUst: c.valorUnitarioUst != null ? Number(c.valorUnitarioUst) : null,
        }))}
        podeEditar={podeEditar}
        isAdmin={isAdmin(session.perfil as PerfilUsuario)}
      />
    </div>
  );
}
