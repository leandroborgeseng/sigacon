import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { canRecurso } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { GlpiKanbanClient } from "@/components/integracao/glpi-kanban-client";
import { PerfilUsuario, RecursoPermissao } from "@prisma/client";

export default async function KanbanStandalonePage() {
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
    <div className="h-screen p-2 bg-background">
      <GlpiKanbanClient contratos={contratos} />
    </div>
  );
}
