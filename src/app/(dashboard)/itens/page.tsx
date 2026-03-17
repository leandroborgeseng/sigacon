import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { ItensList } from "@/components/itens/itens-list";

export default async function ItensPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [contratos, modulos] = await Promise.all([
    prisma.contrato.findMany({
      orderBy: { nome: "asc" },
      select: { id: true, nome: true },
    }),
    prisma.modulo.findMany({
      orderBy: { nome: "asc" },
      select: { id: true, nome: true, contratoId: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Itens Contratuais" }]} />
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Itens Contratuais</h1>
        <p className="text-muted-foreground">
          Listagem de todos os itens cadastrados. Sem filtro são exibidos itens de todos os contratos; use os filtros por contrato e módulo para refinar.
        </p>
      </div>
      <ItensList contratos={contratos} modulosIniciais={modulos} />
    </div>
  );
}
