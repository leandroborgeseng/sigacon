import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { canRecurso } from "@/lib/permissions";
import { PerfilUsuario, RecursoPermissao } from "@prisma/client";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

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
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        user={session}
        podeRelatorioExecutivo={podeRelatorioExecutivo}
        podeIntegracaoGlpi={podeIntegracaoGlpi}
        podeConfiguracaoGlpi={podeConfiguracaoGlpi}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header user={session} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
