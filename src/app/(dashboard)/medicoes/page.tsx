import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { MedicoesClient } from "@/components/medicoes/medicoes-client";

export default async function MedicoesPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const contratos = await prisma.contrato.findMany({
    orderBy: { nome: "asc" },
    select: { id: true, nome: true },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Medição mensal</h1>
        <p className="text-muted-foreground">
          Cálculo do percentual cumprido e valor devido por competência
        </p>
      </div>
      <MedicoesClient contratos={contratos} />
    </div>
  );
}
