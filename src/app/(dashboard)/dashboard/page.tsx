import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getDashboardIndicators, getIndicadoresPorModulo } from "@/server/services/indicators";
import { DashboardClient } from "./dashboard-client";

type PageProps = {
  searchParams?: Promise<{ contratoId?: string }>;
};

export default async function DashboardPage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/login");

  let contratoId: string | undefined;
  try {
    const sp = searchParams ? await searchParams : {};
    contratoId = (sp as { contratoId?: string }).contratoId;
  } catch {
    contratoId = undefined;
  }

  const contratos = await prisma.contrato.findMany({
    where: { status: "ATIVO" },
    orderBy: { nome: "asc" },
    select: { id: true, nome: true },
  });

  let indicators = null;
  let porModulo: Awaited<ReturnType<typeof getIndicadoresPorModulo>> = [];
  try {
    [indicators, porModulo] = await Promise.all([
      getDashboardIndicators(contratoId),
      getIndicadoresPorModulo(contratoId),
    ]);
  } catch {
    // sem dados ainda
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          {contratoId
            ? "Indicadores do contrato selecionado"
            : "Visão geral dos contratos e indicadores de acompanhamento"}
        </p>
      </div>
      <DashboardClient
          contratos={contratos}
          contratoId={contratoId}
          indicators={indicators}
          porModulo={porModulo.map((m) => ({
            nome: m.nome,
            contratoNome: m.contratoNome,
            totalItens: m.totalItens,
            atendidos: m.atendidos,
            percentualAtendimento: m.percentualAtendimento,
            pendenciasAbertas: m.pendenciasAbertas,
          }))}
        />
    </div>
  );
}
