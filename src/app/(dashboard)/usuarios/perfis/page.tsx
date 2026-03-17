import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { PerfilUsuario } from "@prisma/client";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PerfisPermissoesClient } from "./perfis-permissoes-client";

export default async function PerfisPermissoesPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.perfil !== PerfilUsuario.ADMIN) redirect("/dashboard");

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Usuários", href: "/usuarios" },
          { label: "Perfis e permissões" },
        ]}
      />
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Perfis e permissões</h1>
        <p className="text-muted-foreground">
          Defina para cada perfil se pode apenas visualizar ou também editar cada tela do sistema
        </p>
      </div>
      <PerfisPermissoesClient />
    </div>
  );
}
