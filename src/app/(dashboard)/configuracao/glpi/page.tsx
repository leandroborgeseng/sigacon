import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { canRecurso } from "@/lib/permissions";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { GlpiConfigClient } from "@/components/configuracao/glpi-config-client";
import { PerfilUsuario, RecursoPermissao } from "@prisma/client";

export default async function ConfiguracaoGlpiPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const podeVer = await canRecurso(
    session.perfil as PerfilUsuario,
    RecursoPermissao.CUSTOMIZACAO,
    "visualizar"
  );
  if (!podeVer) redirect("/dashboard");

  const podeEditar = await canRecurso(
    session.perfil as PerfilUsuario,
    RecursoPermissao.CUSTOMIZACAO,
    "editar"
  );

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Configuração GLPI" }]} />
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Integração GLPI</h1>
        <p className="text-muted-foreground">
          Credenciais e parâmetros de busca persistidos no banco (com fallback para variáveis de ambiente).
        </p>
      </div>
      <GlpiConfigClient podeEditar={podeEditar} />
    </div>
  );
}
