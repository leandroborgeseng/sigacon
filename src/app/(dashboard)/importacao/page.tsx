import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { ImportacaoClient } from "@/components/importacao/importacao-client";

export default async function ImportacaoPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const contratos = await prisma.contrato.findMany({
    orderBy: { nome: "asc" },
    select: { id: true, nome: true },
  });

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Importação XLSX" }]} />
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Importação XLSX</h1>
        <p className="text-muted-foreground">
          Importar itens e avaliações a partir de planilha Excel
        </p>
      </div>
      <ImportacaoClient contratos={contratos} />
    </div>
  );
}
