import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { canRecurso } from "@/lib/permissions";
import { PerfilUsuario, RecursoPermissao } from "@prisma/client";
import { MetasClient } from "@/components/metas/metas-client";

export default async function MetasPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const podeVisualizar = await canRecurso(
    session.perfil as PerfilUsuario,
    RecursoPermissao.CUSTOMIZACAO,
    "visualizar"
  );
  if (!podeVisualizar) redirect("/dashboard");

  const podeEditar = await canRecurso(
    session.perfil as PerfilUsuario,
    RecursoPermissao.CUSTOMIZACAO,
    "editar"
  );

  return <MetasClient podeEditar={podeEditar} />;
}
