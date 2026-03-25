import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { canRecurso } from "@/lib/permissions";
import { PerfilUsuario, RecursoPermissao } from "@prisma/client";
import { DashboardShell } from "@/components/layout/dashboard-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const podeRelatorioExecutivo = await canRecurso(
    session.perfil as PerfilUsuario,
    RecursoPermissao.DASHBOARD,
    "visualizar"
  );
  const podeIntegracaoGlpi = await canRecurso(
    session.perfil as PerfilUsuario,
    RecursoPermissao.CUSTOMIZACAO,
    "visualizar"
  );
  const podeConfiguracaoGlpi = podeIntegracaoGlpi;

  return (
    <DashboardShell
      user={session}
      podeRelatorioExecutivo={podeRelatorioExecutivo}
      podeIntegracaoGlpi={podeIntegracaoGlpi}
      podeConfiguracaoGlpi={podeConfiguracaoGlpi}
    >
      {children}
    </DashboardShell>
  );
}
