import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { canRecurso } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { PerfilUsuario, RecursoPermissao } from "@prisma/client";
import { ProjetosClient } from "@/components/projetos/projetos-client";

export default async function ProjetosPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const podeVisualizar = await canRecurso(
    session.perfil as PerfilUsuario,
    RecursoPermissao.CONTRATOS,
    "visualizar"
  );
  if (!podeVisualizar) redirect("/dashboard");

  const podeEditar = await canRecurso(
    session.perfil as PerfilUsuario,
    RecursoPermissao.CONTRATOS,
    "editar"
  );

  const projetosIniciais = await prisma.projeto.findMany({
    orderBy: [{ status: "asc" }, { fimPrevisto: "asc" }, { criadoEm: "asc" }],
    include: {
      tarefas: {
        orderBy: [{ status: "asc" }, { prazo: "asc" }, { criadoEm: "asc" }],
        include: {
          glpiChamado: { select: { id: true, glpiTicketId: true, titulo: true } },
        },
      },
    },
  });

  return (
    <ProjetosClient
      projetosIniciais={JSON.parse(JSON.stringify(projetosIniciais))}
      podeEditar={podeEditar}
    />
  );
}
