import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { canRecurso } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { GlpiKanbanClient } from "@/components/integracao/glpi-kanban-client";
import { PerfilUsuario, RecursoPermissao } from "@prisma/client";

export default async function IntegracaoGlpiPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const pode = await canRecurso(
    session.perfil as PerfilUsuario,
    RecursoPermissao.CUSTOMIZACAO,
    "visualizar"
  );
  if (!pode) redirect("/dashboard");

  const contratos = await prisma.contrato.findMany({
    orderBy: { nome: "asc" },
    select: { id: true, nome: true, fornecedor: true },
  });

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Integração GLPI" }]} />
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Kanban de chamados GLPI</h1>
        <p className="text-muted-foreground">
          MVP para testes: sincronização manual, cache local e atualização bidirecional de status.
        </p>
      </div>
      <GlpiKanbanClient contratos={contratos} />
    </div>
  );
}
