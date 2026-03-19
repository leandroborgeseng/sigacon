import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { canRecurso } from "@/lib/permissions";
import { PerfilUsuario, RecursoPermissao } from "@prisma/client";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { ExecutivoImpressaoClient } from "@/components/relatorios/executivo-impressao-client";

export default async function ExecutivoImpressaoPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const pode = await canRecurso(
    session.perfil as PerfilUsuario,
    RecursoPermissao.DASHBOARD,
    "visualizar"
  );
  if (!pode) redirect("/dashboard");

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Relatório executivo" }]} />
      <ExecutivoImpressaoClient />
    </div>
  );
}
