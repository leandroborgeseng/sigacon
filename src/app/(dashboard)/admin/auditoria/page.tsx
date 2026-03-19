import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import Link from "next/link";
import { PerfilUsuario } from "@prisma/client";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { Button } from "@/components/ui/button";
import { AuditoriaClient } from "@/components/admin/auditoria-client";

export default async function AuditoriaPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.perfil !== PerfilUsuario.ADMIN) redirect("/dashboard");

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Admin", href: "/admin" },
          { label: "Auditoria" },
        ]}
      />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Auditoria do sistema</h1>
          <p className="text-muted-foreground">
            Filtre registros e exporte CSV para análise externa
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/admin">Voltar à visão admin</Link>
        </Button>
      </div>
      <AuditoriaClient />
    </div>
  );
}
