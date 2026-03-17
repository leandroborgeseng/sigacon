import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { ItensTable } from "@/components/itens/itens-table";

export default async function ItensPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Itens Contratuais" }]} />
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Itens Contratuais</h1>
        <p className="text-muted-foreground">
          Todos os itens cadastrados. Use os filtros por contrato e módulo para refinar; sem filtro são exibidos itens de todos os contratos.
        </p>
      </div>
      <ItensTable />
    </div>
  );
}
